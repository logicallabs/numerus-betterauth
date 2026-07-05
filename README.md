# numerus-betterauth monorepo

Monorepo for Numerus authentication services and admin interfaces.

## Apps

- apps/auth-worker: Better Auth backend on Cloudflare Worker (D1 + KV)
- apps/admin-ui: standalone admin UI (work in progress)

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
