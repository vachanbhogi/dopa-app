# Evidence and failure runbook

## Golden-path evidence

Run `bun run verify:fc-sandbox` first without `--record`. The harness rejects
local mode, requires `PAUSED -> READY/RUNNING`, checks the checkpoint digest,
requires the complete lifecycle plus exact cleanup, waits at least
`FC_HIBERNATION_PROOF_MS` (60 seconds by default), and rejects a non-TRIBE
result. The harness uses the same create-then-prepare split as the browser so
provisioning and validation remain visible while the prepare request is active.

`--record` writes a capability as verified only with a source reference,
SHA-256 source digest, observation time, and structured metrics. The harness
accepts gateway evidence only when its bounded raw body has a fresh
HMAC-SHA256 signature from `AGENTRUN_EVIDENCE_SIGNING_SECRET`. It filters
weaker updates and the database rejects any status downgrade, so a later
pending probe cannot erase stronger evidence.

## 6.1 Extreme elasticity

The handbook baseline is 100,000 creations/minute and a 5,000/second peak.
That test can create material cost. The gateway must require all of:

```text
FC_ELASTICITY_TARGET=100000
FC_STRESS_ACK=I_ACCEPT_ALIBABA_CLOUD_CHARGES
FC_STRESS_MAX_SPEND_CNY=<approved amount>
```

The harness never calls the elasticity endpoint during an ordinary verification.
The scored probe additionally requires an explicit `--stress` CLI flag:

```bash
bun run verify:fc-sandbox --stress
```

The gateway must enforce the same target, acknowledgement, and spend cap rather
than trusting the client. Run a separately labeled low-volume rehearsal first.
For the scored run, export attempted,
successful, failed, creations/minute, peak/second, and p50/p95 response time.
Do not label a 100-request smoke test as near-peak proof.

## 6.2 Strong isolation

Create sandboxes A and B with separate sessions and mounts. Write unique
sentinels in A, then show B fails to:

1. inspect A's process/memory sentinel;
2. connect to A's private port/network sentinel;
3. read A's dynamic-mount/storage sentinel.

Record the denied operation, error class, sandbox IDs in masked form, template
version, and trace IDs. Clean up both exact IDs.

## 6.3 E2B compatibility

Run one pinned source payload through the E2B adapter and the AgentRun adapter.
The evidence must include:

- one source digest;
- both normalized stdout/result digests;
- dependency and runtime versions;
- endpoint-only adapter difference.

The checkout now has a gitignored Alibaba FC Sandbox key for the
E2B-compatible endpoint. An independent E2B-hosted credential is still needed
for the dual-platform comparison, so this proof remains pending.

## 6.4 Stateful sessions

At the approval checkpoint, capture the in-sandbox checkpoint digest, dynamic
mount digest, session ID, and snapshot ID. Resume after a long enough interval
to demonstrate a real wait. The harness compares the pre-pause and post-resume
mount digests exactly and rejects a missing or changed value before marking the
capability verified.

## 6.5 Hibernation and cost

Confirm the provider reaches `PAUSED`; a request returning 200 is insufficient.
Record pause-to-resume duration and measured wake latency. Export current bill
rates and calculate:

```text
kept-active cost = average_wait_hours * active_hourly_rate
deep cost        = average_wait_hours * deep_disk_hourly_rate
saving percent   = (kept-active - deep) / kept-active * 100
```

Include request/snapshot charges if present. Do not say deep hibernation is
free: current FC Agent Sandbox rules can charge for disk.

The cost probe is verified only when its calculated savings match the reported
savings and the evidence includes a settled bill-export SHA-256, billing period,
currency `CNY`, and pricing source. Timing alone remains `configured`.

The first live call on 2026-07-29 returned `PauseSessionForbidden`; see
`LIVE_EVIDENCE_2026-07-29.md`. Do not rerun the scored hibernation path until
Alibaba confirms that pause/resume is enabled for the account or template.

## 6.6 Observability and debugging story

Wire SLS logs, a cross-service trace, latency/error metrics, and an alert before
the run. Inject one controlled failure, use the trace ID to identify its exact
stage, fix it, and retain before/after evidence.

Controlled drill:

1. Set `FC_DEMO_FAILURE_MODE=resume_checkpoint_mismatch` and restart/deploy.
2. Run the golden path. The orchestration injects the mismatch after the
   provider resume response, transitions to `failed` with
   `FAULT_INJECTED_CHECKPOINT_MISMATCH`, skips scoring, and cleans up the exact
   sandbox.
3. Find the run in SLS by its trace ID and capture the query, alert rule,
   failure event, root cause, span count, and recovery time.
4. Restore `FC_DEMO_FAILURE_MODE=none`, restart/deploy, and rerun successfully.

The observability probe refuses verification unless the correlated evidence
contains an SLS project/logstore/query, at least four trace spans, a metric,
an alert that fired, the failure event, root cause, and measured recovery.
Do not call this a real debugging story until that live drill has happened.

## Other failure drills

- Expired approval nonce -> 409 and no provider call.
- Duplicate approval -> one resume effect.
- Gateway timeout -> bounded retry, then locatable failed run.
- Scoring 5xx -> failed run, safe public code, provider details only in logs.
- Callback with a bad signature -> 401 and no durable event.
- Cleanup failure -> committed result retained and cleanup error logged.
