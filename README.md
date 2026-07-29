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

The dashboard accepts MP4/MOV ads up to 250 MB and 60 seconds. Results are real
model responses; there is no browser mock path.

## Checks

```bash
bun run lint
bunx tsc --noEmit
bun run build
```
