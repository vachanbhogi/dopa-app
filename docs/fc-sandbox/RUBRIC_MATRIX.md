# Rubric closure matrix

This matrix separates repository completeness from evidence that can only be
produced in Alibaba Cloud or in the submission video. A code check is not a
substitute for provider-observed evidence.

## Scored dimensions

| Dimension | Repository implementation | Automated check | Remaining live or human gate |
| --- | --- | --- | --- |
| Scenario realism and user value | Real creative validation -> approval wait -> TRIBE v2 scoring loop | Golden-path lifecycle test and live harness | Show a real score and explain who pays for the decision |
| UX and ease of use | Anonymous `/demo`, visible stages, pause timer, one approval, result and evidence ledger | Next.js build plus browser walkthrough | Deploy a public no-login URL and record the first-success flow |
| Stable FC execution | Durable state machine, optimistic claims, bounded retries/timeouts, expiry, exact cleanup trace | Lifecycle transition and security tests | Run timeout, failed-resume, and cleanup drills on AgentRun |
| End-to-end observability | One trace ID across app, gateway, sandbox, and TRIBE headers; structured JSON telemetry; signed callbacks | Strict observability evidence validator | Configure SLS logs/metrics/alert and retain the real drill query |
| Extensible agent skills | `FcSandboxProvider` boundary plus gateway OpenAPI contract; model/scorer is behind one method | Type check/build | Demonstrate one tool/model swap without lifecycle changes |
| Core FC capabilities | Separate strict validators for 6.1-6.6 and non-downgradable evidence rows | `bun run test:fc-sandbox` | Complete the provider gates below |
| Security and least privilege | Server-only credentials, no-egress sandbox, renewable demo identity, HMAC tokens, one-time approval, RLS/no browser grants, CSP and origin checks | Security test plus Supabase migration review | Review RAM scope and rotate credentials after proof |
| Delivery completeness | Demo, proof ledger, migrations, OpenAPI contract, runbooks, rollback, video script, one-command repository verification | `bun run verify:submission` | Configure live services, deploy the reviewed checkout, and record the three-minute video |
| Cost and efficiency | Active/paused/wake timing plus bill-backed cost calculator and strict evidence schema | Cost calculation tests | Export settled bill/rates and record measured savings |
| Continuity and reusability | Versioned checkpoints, session/mount/snapshot evidence, configurable deep/light policy, reusable provider adapter | Digest and lifecycle tests | Resume after the configured proof interval with matching mount digests |

## Core capability gates

| Core item | Verification rule in code | Current provider evidence |
| --- | --- | --- |
| 6.1 Extreme elasticity | Exactly 100,000 requested; at least 100,000/min and 5,000/s; attempted/success/failed and p50/p95 required; explicit `--stress` and spend cap | Pending quota and approved paid test |
| 6.2 Strong isolation | VM-level evidence plus compute, network, and storage denial, separate sessions, and exact cleanup | Provider-observed probe recorded on 2026-07-29 |
| 6.3 E2B compatibility | Same source digest and normalized output digest, pinned runtime/SDK, demonstrably separate endpoints | Pending independent E2B credential |
| 6.4 Stateful session | Session affinity, dynamic mount, snapshot, long paused interval, and exact pre/post mount digest match | Session affinity observed; full resume proof pending |
| 6.5 Hibernation and wake | Authoritative `PAUSED`, deep/light mode, minimum proof interval, matching checkpoint, measured wake latency, bill-backed savings | Blocked by `PauseSessionForbidden` until Alibaba enablement |
| 6.6 Observability | SLS project/logstore/query, four-service trace, metric, fired alert, controlled failure, root cause, and recovery time | Pending live SLS configuration and drill |

## Live closure status on 2026-07-29

| Gate | Status | Verified result or exact blocker |
| --- | --- | --- |
| Branch and repository | Pass | The reviewed submission work is committed on `main` as `b0fc1c00afa41b48d8891263f83e997a3773c951` and pushed to `origin/main`. |
| Repository verification | Pass | `bun run verify:submission` passed the Denver, Google Ads, security, and FC Sandbox tests, ESLint, TypeScript, and the Next.js production build. |
| Supabase schema | Pass with follow-up | The three FC migrations were applied to project `bdqieraaueobnrjcxwtf`; the remote migration ledger assigned versions `20260729165000`, `20260729165002`, and `20260729165004`, which differ from the local filename versions and must be reconciled before a future CLI migration push. |
| Supabase security | Pass with advisories | The public FC tables have RLS enabled and no `anon` or `authenticated` table DML; service-role RPCs are present. Catalog inspection still reports `anon`/`authenticated` execute privilege on the two trigger functions, so an explicit least-privilege revoke remains a follow-up. Advisors also report intentional deny-all FC RLS, the authenticated quota RPC, and disabled leaked-password protection for operator review. |
| Current production | Deployed; live run blocked | Vercel production deployment `dpl_3mVHqSSvr8zziN2fgDtWN1VbRdFF` is ready from commit `b0fc1c00afa41b48d8891263f83e997a3773c951`. Public `/demo` and `/fc-proof` render without login and the security headers are active, but starting the demo safely returns 503 because `FC_DEMO_TOKEN_SECRET` is not configured. |
| Production environment | Pending | The production project does not yet expose the required FC provider, FC secrets, Supabase server secret, Alibaba lifecycle, TRIBE demo-identity, or SLS configuration. |
| Hibernation | Blocked | The provider returned `PauseSessionForbidden`; do not repeat the scored lifecycle until Alibaba confirms pause/resume enablement for the account/template. |
| SLS drill | Pending | No SLS project, logstore, alert, or deployable gateway credentials are available in the audited environment, so no controlled failure drill was claimed. |
| E2B parity | Pending | The Alibaba E2B-compatible credential is present locally, but an independent E2B-hosted credential is not available for the required dual-platform comparison. |
| Elasticity | Approval required | No paid stress call was made. Account quota, billing plan, bounded cleanup duration, coupon deduction, and maximum approved spend remain unconfirmed. |
| Cost proof | Pending | A settled Alibaba bill export and enabled hibernation are still required; timing or public list prices alone are not scored cost evidence. |

### Elasticity cost gate

Alibaba's [public preview price list](https://help.aliyun.com/en/functioncompute/pay-as-you-go-of-fc-agent-sandbox)
currently quotes mainland-China active-state rates in CNY per vCPU/GiB/hour:

| Plan | vCPU | Memory | 100,000 sandboxes at the one-second billing minimum | 100,000 sandboxes active for 60 seconds |
| --- | ---: | ---: | ---: | ---: |
| Eco | 0.060 | 0.030 | 5 CNY | 300 CNY |
| Std | 0.078 | 0.039 | 6.5 CNY | 390 CNY |
| Pro | 0.120 | 0.060 | 10 CNY | 600 CNY |

These calculations assume the provider-observed 2 vCPU / 2 GiB shape, no
billable disk above the 15 GiB active-state allowance, one-second billing
granularity, and exact cleanup. They exclude any request, snapshot, network, or
gateway charges. Independent FC Agent Sandbox billing remains invite-only, so
the account console, activation terms, and settled bill override the public
preview list. Do not set `FC_STRESS_MAX_SPEND_CNY` or run `--stress` until the
account's actual billing model and plan, quota, coupon deduction, a finite
cleanup timeout, and the resulting maximum charge are confirmed and explicitly
approved.

## Commands

```bash
# Repository checks; no cloud resources or charges
bun run verify:submission

# Live lifecycle; waits 60 seconds by default and does not write evidence
FC_DEMO_BASE_URL=https://your-deployment.example \
bun run verify:fc-sandbox

# Write reviewed live evidence
FC_DEMO_BASE_URL=https://your-deployment.example \
bun run verify:fc-sandbox --record

# Paid scored elasticity; run only after quota and cost approval
FC_DEMO_BASE_URL=https://your-deployment.example \
FC_ELASTICITY_TARGET=100000 \
FC_STRESS_ACK=I_ACCEPT_ALIBABA_CLOUD_CHARGES \
FC_STRESS_MAX_SPEND_CNY=<approved-cap> \
bun run verify:fc-sandbox --stress
```
