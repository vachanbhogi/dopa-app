# Dopa web app

## Local development

Copy the public browser configuration, provide the project’s Supabase
publishable key, and point the app at a reachable Dopa scoring API:

```bash
cp .env.example .env.local
# Edit NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY if it is not already configured.
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

`NEXT_PUBLIC_DOPA_API_URL` defaults to `http://localhost:8000`. The browser
sends the current Supabase access token to the API; no service-role key or JWT
signing secret belongs in this app.

Set `GROQ_API_KEY` in `.env.local` to enable Denver, Dopa's website agent.

## Competitor intelligence

The Competitors tab uses an Alibaba Cloud worker rather than generating
unsourced competitor guesses inside the web request. Configure the server-only
Supabase secret, MNS send-only credentials, callback HMAC secret, and VAPID
keys shown in `.env.example`. The same HMAC secret must be installed on the
worker.

The worker is in `services/competitor-worker`. It long-polls
`dopa-competitor-research-v1`, calls the Qwen Responses API in US Virginia, and
posts signed results back to Dopa. It exposes no public port. See the worker
README for its environment and Docker/systemd deployment.

Run the focused checks with:

```bash
bun run test:competitors
bun run worker:build
```
Denver's safe website knowledge is regenerated from current pages and
components before every `bun run dev` and `bun run build`. The development
command also watches interface files and refreshes Denver's knowledge while
the server is running.

The dashboard accepts MP4/MOV ads up to 250 MB and 60 seconds. Results are real
model responses; there is no browser mock path.

## Checks

```bash
bun run lint
bunx tsc --noEmit
bun run test:denver
bun run build
```
