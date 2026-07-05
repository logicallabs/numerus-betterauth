# better-auth-worker monorepo

Generic monorepo template for Better Auth services and admin interfaces on Cloudflare.

## Apps

- apps/auth-worker: Better Auth backend on Cloudflare Worker (D1 + KV)
- apps/admin-ui: standalone admin UI (work in progress)

## Account configuration

Before deploying to any account, set tenant-specific values in apps/auth-worker/wrangler.toml:

- Worker names
- D1 database IDs
- KV namespace IDs
- BETTER_AUTH_URL and ALLOWED_ORIGINS
- Optional routes and zone names

## Root commands

After `npm install` in repository root:

- `npm run dev:auth`
- `npm run typecheck:auth`
- `npm run db:migrate:local`
- `npm run db:migrate:dev`
- `npm run db:migrate:remote`
- `npm run deploy:auth:dev`
- `npm run deploy:auth`

## Auth worker details

See [apps/auth-worker/README.md](apps/auth-worker/README.md) for environment setup, CORS, migrations, and deployment details.

## Deployment onboarding

Use [docs/deployment-setup.md](docs/deployment-setup.md) for account-by-account setup steps, Cloudflare resource provisioning, and tenant rollout guidance.
