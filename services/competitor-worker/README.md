# Dopa research worker

Always-on Node 24 worker for evidence-backed competitor and keyword research.
It has no inbound HTTP port. The process long-polls one Alibaba MNS queue,
calls Qwen in US Virginia, and posts HMAC-signed progress/results to the
configured Dopa origin. Keyword jobs use the same queue and provider client,
then return through their own signed callback routes.

## Required environment

```dotenv
ALIBABA_MNS_ACCOUNT_ID=
ALIBABA_MNS_REGION=us-east-1
ALIBABA_MNS_QUEUE=dopa-competitor-research-v1
# Recommended on ECS. The worker uses IMDSv2 and refreshes STS credentials.
ALIBABA_ECS_RAM_ROLE_NAME=dopa-competitor-worker
DASHSCOPE_API_KEY=
QWEN_KEY_EXPIRES_AT=2026-08-19T17:09:02Z
QWEN_RESPONSES_ENDPOINT=https://dashscope-us.aliyuncs.com/compatible-mode/v1/responses
QWEN_MODEL=qwen3.7-max-2026-06-08
DOPA_CALLBACK_URL=https://itsdopa.vercel.app
DOPA_RESEARCH_HMAC_SECRET=
# Required only when the selected preview uses Vercel Deployment Protection.
VERCEL_AUTOMATION_BYPASS_SECRET=
DOPA_WORKER_ID=competitor-worker-us-virginia-1
DOPA_WORKER_VERSION=1.0.0
```

For local testing outside ECS, scoped `ALIBABA_MNS_ACCESS_KEY_ID` and
`ALIBABA_MNS_ACCESS_KEY_SECRET` can replace the instance role. The ECS consumer
identity needs only
`ReceiveMessage`, `DeleteMessage`, and `ChangeMessageVisibility` on
`dopa-competitor-research-v1`.

The files in `deploy/` contain the exact queue attributes and separate
least-privilege RAM policy templates. Replace `<account-id>` before creating
the policies. Attach the consumer policy to an ECS instance RAM role; do not
copy a long-lived worker key onto the instance. The Vercel producer policy is
the only identity that receives `SendMessage`.

Build from the repository root:

```bash
docker build -f services/competitor-worker/Dockerfile -t dopa-competitor-worker:1.0.0 .
```

Install the systemd unit at
`/etc/systemd/system/dopa-competitor-worker.service`, put secrets in
`/etc/dopa/competitor-worker.env` with mode `0600`, set `DOPA_WORKER_IMAGE` to
an immutable image digest, then enable the unit. The container exposes no port
and runs the Node process as the image's unprivileged `node` user.

## Provisioning gate

Before creating billable resources, confirm the live Virginia checkout price
for the cheapest pay-as-you-go instance with at least 2 vCPU, 4 GiB RAM, Ubuntu
22.04, a 40 GiB ESSD, and pay-by-traffic egress. Record the instance price,
disk, traffic rate, tax, coupon deduction, and final order total. Do not submit
the order until the operator approves that exact total.

After approval:

1. Create the queue using `deploy/queue-settings.json`.
2. Create the two RAM policies, issue a key only for the Vercel producer, and
   attach the worker policy through an ECS instance role with IMDSv2 required.
3. Allow SSH only from the operator IP or use Workbench. Do not add an inbound
   application port.
4. Point the worker at one Vercel preview, run a manual pilot, and inspect every
   candidate and source.
5. Only after a READY production deployment and one successful manual
   production run, change `DOPA_CALLBACK_URL` to
   `https://itsdopa.vercel.app` and enable daily monitoring.
