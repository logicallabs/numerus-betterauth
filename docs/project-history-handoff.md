# Project History Handoff

This document summarizes what has been completed so a new chat/session can continue without replaying prior history.

## Project Intent

Build a reusable Better Auth backend template on Cloudflare Workers with D1 + KV, designed for multi-account deployment.

## Major Milestones Completed

1. Initial auth worker scaffold created with Cloudflare Worker runtime.
2. Better Auth integrated with Drizzle adapter and explicit schema mapping.
3. D1 SQL migration flow established (migration files committed).
4. CORS support added for explicit allowlist and wildcard pattern matching.
5. Local + remote deploy flow validated (dev/prod pattern established).
6. Repository refactored to monorepo workspace layout:
   - apps/auth-worker
   - apps/admin-ui (placeholder)
7. Local dev port moved to 8890 to avoid conflicts.
8. Tenant-specific naming removed and genericized for reuse.
9. Deployment docs expanded for multi-account onboarding.
10. Tenant records convention added for safe checked-in status tracking.
11. Git remote parent moved to new canonical repo: logicallabs/betterauth.

## Key Technical Decisions

1. Better Auth + Drizzle on Workers requires explicit schema object keys:
   - user
   - session
   - account
   - verification
2. Better Auth Kysely migration helper is not used with Drizzle adapter.
3. Worker runtime requires node compatibility flag:
   - compatibility_flags = ["nodejs_compat"]
4. Workspace root scripts target path-based workspace selection (apps/auth-worker) to avoid future package-name coupling.

## Current Repository Shape

1. Root workspace scripts in package.json.
2. Auth backend app at apps/auth-worker.
3. Admin UI placeholder at apps/admin-ui.
4. Operational docs:
   - docs/deployment-setup.md
   - docs/tenant-config-template.md
   - docs/tenants/README.md

## Current Runtime Defaults

1. Local auth worker port: 8890.
2. Local UI/CORS example origin: 8891.
3. Wrangler config is template-style with placeholder IDs and example domains.

## Git and Remote State

1. Canonical origin remote:
   - git@github.com:logicallabs/betterauth.git
2. Legacy remote retained as secondary alias:
   - git@github.com:logicallabs/numerus-betterauth.git
   - remote name: numerus-origin

## Known Operational Notes

1. If local dev fails with address-in-use, check conflicting listeners and keep using port 8890 (or choose another free port).
2. Never commit secret values; only commit non-sensitive tenant rollout metadata.

## Suggested Next Work

1. Scaffold apps/admin-ui as real Pages app.
2. Add CI workflows for auth-worker deploy and docs validation.
3. Add first sanitized tenant record in docs/tenants for logicallabs.
