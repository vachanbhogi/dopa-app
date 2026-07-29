import "server-only";

import MNSClient from "@alicloud/mns";
import type { CompetitorResearchJob } from "@/lib/competitor-intelligence/types";
import type { KeywordResearchJob } from "@/lib/keyword-intelligence/types";

// MNS allows a 64 KiB message body. Leave headroom after base64 expansion.
const MAX_JOB_BYTES = 45 * 1024;

function getMnsConfig() {
  const accountId = process.env.ALIBABA_MNS_ACCOUNT_ID;
  const accessKeyId = process.env.ALIBABA_MNS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIBABA_MNS_ACCESS_KEY_SECRET;
  const queueName =
    process.env.ALIBABA_MNS_QUEUE ?? "dopa-competitor-research-v1";
  const region = process.env.ALIBABA_MNS_REGION ?? "us-east-1";
  const endpoint = process.env.ALIBABA_MNS_ENDPOINT;

  if (!accountId || !accessKeyId || !accessKeySecret) {
    throw new Error("Alibaba MNS producer credentials are not configured.");
  }

  return {
    accountId,
    accessKeyId,
    accessKeySecret,
    queueName,
    region,
    endpoint,
  };
}

type ResearchJob = CompetitorResearchJob | KeywordResearchJob;

async function enqueueResearch(job: ResearchJob): Promise<void> {
  const config = getMnsConfig();
  const raw = JSON.stringify(job);
  if (Buffer.byteLength(raw, "utf8") > MAX_JOB_BYTES) {
    throw new Error("Research job exceeds the MNS message limit.");
  }

  const client = new MNSClient(config.accountId, {
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    region: config.region,
    endpoint: config.endpoint,
    secure: true,
  });

  await client.sendMessage(config.queueName, {
    MessageBody: Buffer.from(raw, "utf8").toString("base64"),
  });
}

export async function enqueueCompetitorResearch(
  job: CompetitorResearchJob,
): Promise<void> {
  await enqueueResearch(job);
}

export async function enqueueKeywordResearch(
  job: KeywordResearchJob,
): Promise<void> {
  await enqueueResearch(job);
}
