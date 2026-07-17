# Deployment Setup Guide

This guide makes the auth worker reusable across different Cloudflare accounts and domains.

Use docs/tenant-config-template.md to capture tenant values before editing wrangler.toml.
Use docs/tenants/README.md for the safe checked-in convention for tenant status records.

## Prerequisites

1. Cloudflare account access for the target tenant.
2. Wrangler authenticated for that account:

   npm install
   npx wrangler login

3. Decide tenant values before setup:
   - Worker names
   - Auth/API domains
   - Frontend app domains for CORS

## 1. Choose Naming Per Tenant

Example naming convention:

- Production worker: betterauth-worker
- Dev worker: betterauth-worker-dev
- Production D1 DB: betterauth_auth
- Dev D1 DB: betterauth_auth_dev
- KV namespace: betterauth_sessions
- Dev KV namespace: betterauth_sessions_dev

If a tenant needs custom names, keep them consistent across wrangler.toml and npm scripts.

## 2. Create Cloudflare Resources

Run these once per tenant account.

1. Create D1 databases:

   npx wrangler d1 create betterauth_auth
   npx wrangler d1 create betterauth_auth_dev

2. Create KV namespaces:

   npx wrangler kv namespace create SESSIONS
   npx wrangler kv namespace create SESSIONS --env dev

Copy all returned IDs.

## 3. Update wrangler.toml

Edit apps/auth-worker/wrangler.toml and replace placeholders:

- REPLACE_WITH_PROD_D1_DATABASE_ID
- REPLACE_WITH_DEV_D1_DATABASE_ID
- REPLACE_WITH_PROD_KV_NAMESPACE_ID
- REPLACE_WITH_DEV_KV_NAMESPACE_ID

Set tenant-specific URLs:

- vars.BETTER_AUTH_URL (for example https://auth.logicallabs.app)
- vars.ALLOWED_ORIGINS (for example https://app.logicallabs.app)
- env.dev.vars.BETTER_AUTH_URL
- env.dev.vars.ALLOWED_ORIGINS

Optional custom-domain routing:

If you deploy via routes, add routes blocks for production and dev using the tenant zone.

## 4. Configure Secrets

1. Local:
   - Copy apps/auth-worker/.dev.vars.example to apps/auth-worker/.dev.vars
   - Set BETTER_AUTH_SECRET to a strong random value

2. Remote dev:

   npx wrangler secret put BETTER_AUTH_SECRET --env dev

3. Remote prod:

   npx wrangler secret put BETTER_AUTH_SECRET

## 5. Apply Migrations

From repo root:

1. Local:

   npm run db:migrate:local

2. Dev remote:

   npm run db:migrate:dev

3. Prod remote:

   npm run db:migrate:remote

## 6. Deploy

From repo root:

1. Deploy dev:

   npm run deploy:auth:dev

2. Deploy prod:

   npm run deploy:auth

## 7. Validate

1. Local runtime:

   npm run dev:auth

   Expect ready on http://localhost:8890.

2. Health endpoint:

   curl -i http://localhost:8890/health

3. User count endpoint:

   curl -i http://localhost:8890/api/v1/users/count

4. CORS preflight example:

   curl -i -X OPTIONS http://localhost:8890/api/auth/sign-up/email -H "Origin: http://localhost:8891" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"

5. Entitlements example:

   curl -i http://localhost:8890/api/v1/me/entitlements -H "Cookie: <session-cookie>"

## 8. Multi-Tenant Rollout Pattern

For each new tenant account:

1. Re-run resource creation in that account.
2. Update wrangler.toml IDs and tenant URLs.
3. Set BETTER_AUTH_SECRET in dev and prod.
4. Apply migrations.
5. Deploy dev, validate, then deploy prod.

Keep secret values and credentials outside git, but keep non-sensitive tenant rollout records in docs/tenants.

Template option: copy docs/tenant-config-template.md and keep one sanitized copy per tenant in docs/tenants.