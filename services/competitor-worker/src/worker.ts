import MNSClient from "@alicloud/mns";
import {
  isCompetitorResearchJob,
} from "../../../lib/competitor-intelligence/validation";
import {
  RESEARCH_CONTRACT_VERSION,
  type CompetitorResearchJob,
  type ResearchProgressPayload,
  type WorkerHeartbeatPayload,
} from "../../../lib/competitor-intelligence/types";
import {
  isKeywordResearchJob,
} from "../../../lib/keyword-intelligence/validation";
import {
  KEYWORD_RESEARCH_CONTRACT_VERSION,
  KEYWORD_RESEARCH_JOB_TYPE,
  type KeywordResearchJob,
  type KeywordResearchProgressPayload,
} from "../../../lib/keyword-intelligence/types";
import { isJsonObject, stringValue } from "../../../lib/validation";
import { isPermanentCallbackError, postSigned } from "./callback";
import type { WorkerConfig } from "./config";
import { researchKeywords } from "./keyword-qwen";
import { QwenRequestError, researchCompetitors } from "./qwen";

const VISIBILITY_SECONDS = 15 * 60;
const VISIBILITY_REFRESH_MS = 5 * 60_000;

type ReceivedMessage = {
  job: CompetitorResearchJob | KeywordResearchJob;
  receiptHandle: string;
  dequeueCount: number;
};

type WorkerTiming = {
  visibilitySeconds?: number;
  visibilityRefreshMs?: number;
};

export class CompetitorWorker {
  private readonly mns: MNSClient;
  private stopped = false;
  private readonly stopController = new AbortController();
  private readonly visibilitySeconds: number;
  private readonly visibilityRefreshMs: number;

  constructor(
    private readonly config: WorkerConfig,
    mns?: MNSClient,
    timing: WorkerTiming = {},
  ) {
    this.mns =
      mns ??
      new MNSClient(config.accountId, {
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        securityToken: config.securityToken,
        refreshSTSToken: config.refreshCredentials,
        refreshSTSTokenInterval: 5 * 60_000,
        region: config.region,
        endpoint: config.endpoint,
        secure: true,
        internal: Boolean(config.endpoint?.includes("-internal")),
        vpc: Boolean(config.endpoint?.includes("-internal-vpc")),
      });
    this.visibilitySeconds =
      timing.visibilitySeconds ?? VISIBILITY_SECONDS;
    this.visibilityRefreshMs =
      timing.visibilityRefreshMs ?? VISIBILITY_REFRESH_MS;
  }

  stop() {
    this.stopped = true;
    this.stopController.abort();
  }

  async run() {
    await this.heartbeat("starting");
    await Promise.all([
      this.consumeLoop(),
      this.schedulerLoop(),
      this.heartbeatLoop(),
    ]);
  }

  private async consumeLoop() {
    while (!this.stopped) {
      try {
        const message = await this.receive();
        if (message) await this.process(message);
      } catch (error) {
        console.error("MNS consume loop error:", safeError(error));
        await wait(2_000, this.stopController.signal);
      }
    }
  }

  private async schedulerLoop() {
    while (!this.stopped) {
      try {
        await postSigned(
          this.config,
          "/api/internal/competitors/enqueue-due",
          {
            version: RESEARCH_CONTRACT_VERSION,
            worker_id: this.config.workerId,
            observed_at: new Date().toISOString(),
          },
        );
      } catch (error) {
        console.error("Scheduler callback error:", safeError(error));
      }
      await wait(60_000, this.stopController.signal);
    }
  }

  private async heartbeatLoop() {
    while (!this.stopped) {
      await wait(5 * 60_000, this.stopController.signal);
      if (this.stopped) break;
      await this.heartbeat("healthy");
    }
  }

  private async heartbeat(status: WorkerHeartbeatPayload["status"]) {
    try {
      await postSigned(
        this.config,
        "/api/internal/competitors/heartbeat",
        {
          version: RESEARCH_CONTRACT_VERSION,
          worker_id: this.config.workerId,
          status,
          worker_version: this.config.workerVersion,
          queue_name: this.config.queueName,
          metadata: {
            node_version: process.version,
            uptime_seconds: Math.floor(process.uptime()),
          },
          observed_at: new Date().toISOString(),
        } satisfies WorkerHeartbeatPayload,
      );
    } catch (error) {
      console.error("Heartbeat callback error:", safeError(error));
    }
  }

  private async receive(): Promise<ReceivedMessage | null> {
    try {
      const response = await this.mns.receiveMessage(this.config.queueName, 30);
      const body = response.body;
      if (!body) return null;
      const messageBody = stringValue(body.MessageBody, 100_000);
      const receiptHandle = stringValue(body.ReceiptHandle, 10_000);
      const dequeueCount = Math.max(
        1,
        Math.floor(Number(body.DequeueCount) || 1),
      );
      if (!messageBody || !receiptHandle) return null;

      let decoded: unknown;
      try {
        decoded = JSON.parse(
          Buffer.from(messageBody, "base64").toString("utf8"),
        );
      } catch {
        await this.mns.deleteMessage(this.config.queueName, receiptHandle);
        return null;
      }
      if (
        !isCompetitorResearchJob(decoded) &&
        !isKeywordResearchJob(decoded)
      ) {
        await this.mns.deleteMessage(this.config.queueName, receiptHandle);
        return null;
      }
      return { job: decoded, receiptHandle, dequeueCount };
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name.includes("MessageNotExist")) return null;
      throw error;
    }
  }

  private async process(message: ReceivedMessage) {
    const keywordJob = isKeywordResearchJob(message.job);
    const callbackPrefix = keywordJob
      ? "/api/internal/keywords"
      : "/api/internal/competitors";
    const receipt = { value: message.receiptHandle, extending: false };
    const visibilityTimer = setInterval(async () => {
      if (receipt.extending) return;
      receipt.extending = true;
      try {
        const response = await this.mns.changeMessageVisibility(
          this.config.queueName,
          receipt.value,
          this.visibilitySeconds,
        );
        const replacement = stringValue(
          response.body?.ReceiptHandle,
          10_000,
        );
        if (replacement) receipt.value = replacement;
      } catch (error) {
        console.error("MNS visibility extension error:", safeError(error));
      } finally {
        receipt.extending = false;
      }
    }, this.visibilityRefreshMs);

    try {
      const onStage = async (
        stage: "searching" | "synthesizing" | "finalizing",
      ) => {
        const progress: ResearchProgressPayload | KeywordResearchProgressPayload =
          keywordJob
            ? {
                version: KEYWORD_RESEARCH_CONTRACT_VERSION,
                job_type: KEYWORD_RESEARCH_JOB_TYPE,
                run_id: message.job.run_id,
                worker_id: this.config.workerId,
                stage,
              }
            : {
                version: RESEARCH_CONTRACT_VERSION,
                run_id: message.job.run_id,
                worker_id: this.config.workerId,
                stage,
              };
        try {
          await postSigned(
            this.config,
            `${callbackPrefix}/progress`,
            progress,
          );
        } catch (error) {
          if (isPermanentCallbackError(error)) throw error;
          console.error("Progress callback error:", safeError(error));
        }
      };
      const result = isKeywordResearchJob(message.job)
        ? await researchKeywords(this.config, message.job, onStage)
        : await researchCompetitors(this.config, message.job, onStage);

      await postSigned(
        this.config,
        `${callbackPrefix}/results`,
        result,
      );
      await this.mns.deleteMessage(this.config.queueName, receipt.value);
    } catch (error) {
      const permanent =
        (error instanceof QwenRequestError && error.permanent) ||
        isPermanentCallbackError(error);
      const exhausted = message.dequeueCount >= 3;
      console.error(
        `Research run ${message.job.run_id} failed:`,
        safeError(error),
      );
      if (permanent || exhausted) {
        const progress: ResearchProgressPayload | KeywordResearchProgressPayload =
          keywordJob
            ? {
                version: KEYWORD_RESEARCH_CONTRACT_VERSION,
                job_type: KEYWORD_RESEARCH_JOB_TYPE,
                run_id: message.job.run_id,
                worker_id: this.config.workerId,
                stage: "failed",
                error_code: permanent
                  ? "permanent_provider_error"
                  : "retry_exhausted",
                error_message: permanent
                  ? "The research provider rejected the request. Check worker configuration."
                  : "Research failed after three attempts.",
              }
            : {
                version: RESEARCH_CONTRACT_VERSION,
                run_id: message.job.run_id,
                worker_id: this.config.workerId,
                stage: "failed",
                error_code: permanent
                  ? "permanent_provider_error"
                  : "retry_exhausted",
                error_message: permanent
                  ? "The research provider rejected the request. Check worker configuration."
                  : "Research failed after three attempts.",
              };
        try {
          await postSigned(
            this.config,
            `${callbackPrefix}/progress`,
            progress,
          );
          await this.mns.deleteMessage(this.config.queueName, receipt.value);
        } catch (callbackError) {
          console.error("Failure callback error:", safeError(callbackError));
        }
      }
    } finally {
      clearInterval(visibilityTimer);
    }
  }
}

function wait(milliseconds: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function safeError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (isJsonObject(error)) return stringValue(error.message, 500) ?? "Unknown error";
  return "Unknown error";
}
