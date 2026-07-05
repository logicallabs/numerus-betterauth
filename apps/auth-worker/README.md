# numerus-betterauth

Cloudflare Worker auth service foundation for Numerus projects with:
- Cloudflare D1 for relational auth data
- Cloudflare KV for session/cache style data
- TypeScript Worker runtime

## Why this scaffold

This gives you a local-first developer flow with production Cloudflare bindings.
The same Worker code runs locally and in Cloudflare. Differences are configured with Wrangler environments and resource IDs.

## Running commands

You can run commands in two ways:

1. From repository root using workspace scripts (recommended)
2. From this folder directly with `npm run ...`

## Quick start

1. Install dependencies:

   npm install

2. Authenticate Wrangler (first time only):

   npx wrangler login

3. Apply local D1 migration:

   npm run db:migrate:local

4. Run locally:

   npm run dev

Then test:
- http://127.0.0.1:8787/health
- http://127.0.0.1:8787/auth/users/count

## Better Auth setup

Set secrets first:

1. Local: create `.dev.vars` from `.dev.vars.example`
2. Remote dev:

    npx wrangler secret put BETTER_AUTH_SECRET --env dev

3. Remote prod:

    npx wrangler secret put BETTER_AUTH_SECRET

Apply Better Auth migrations:

- Local:

   npm run db:migrate:local

- Dev:

   npm run db:migrate:dev

- Prod:

   npm run db:migrate:remote

Auth API routes are served under `/api/auth/*`.

## CORS and Pages integration

This service supports credentialed cross-origin requests for allowed origins.

- Allowlist is controlled by `ALLOWED_ORIGINS` (comma-separated patterns)
- Wildcards are supported (for example `https://*.numerus.app`)
- Requests from non-allowed origins do not receive `Access-Control-Allow-Origin`

Example local `.dev.vars` value:

`ALLOWED_ORIGINS=http://localhost:8789,http://127.0.0.1:8789,https://*.numerus.app`

Quick preflight check:

`curl -i -X OPTIONS http://localhost:8788/api/auth/sign-up/email -H "Origin: http://localhost:8789" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"`

Expected headers include:

- `Access-Control-Allow-Origin: http://localhost:8789`
- `access-control-allow-credentials: true`
- `access-control-allow-methods: GET,POST,OPTIONS`

## Deploy

1. Apply remote dev migration:

   npm run db:migrate:dev

2. Deploy to dev environment:

   npm run deploy:dev

3. Apply remote production migration:

   npm run db:migrate:remote

4. Deploy production worker:

   npm run deploy

## Environments

- Local: wrangler dev with local emulation for D1 and KV.
- Dev: real Cloudflare D1/KV resources configured under env.dev.
- Production: same code, real Cloudflare D1/KV resources configured at top level.
- No separate dependency tree is needed; use one codebase with env-specific config.

## Better Auth integration status

The package is installed and ready. This scaffold intentionally starts with storage + Worker plumbing first, then adds Better Auth handlers on top of a stable base.

## Useful references

- Cloudflare C3 templates: https://developers.cloudflare.com/workers/get-started/guide/
- Better Auth docs: https://www.better-auth.com/docs
- Better Auth Cloudflare docs: https://www.better-auth.com/docs/integrations/cloudflare
