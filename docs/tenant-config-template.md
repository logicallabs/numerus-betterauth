# Tenant Config Template

Copy this template for each tenant/account (for example logicallabs, numerus, edtr) and fill all values.

## Tenant Identity

- Tenant name:
- Cloudflare account ID:
- Cloudflare zone:
- Environment owner:

## Worker Naming

- Prod worker name: betterauth-worker
- Dev worker name: betterauth-worker-dev

## Domains

- Prod auth domain: https://auth.example.com
- Dev auth domain: https://auth-dev.example.com
- Prod app domain(s): https://app.example.com
- Dev app domain(s): https://app-dev.example.com
- Local app origins: http://localhost:8891,http://127.0.0.1:8891

## D1 Databases

- Prod DB name: betterauth_auth
- Prod DB ID:
- Dev DB name: betterauth_auth_dev
- Dev DB ID:
- Local preview DB ID (optional): local-betterauth-auth

## KV Namespaces

- Prod SESSIONS namespace ID:
- Dev SESSIONS namespace ID:
- Local preview KV ID (optional): local-sessions

## Wrangler Variables

Production vars:

- ENVIRONMENT: production
- BETTER_AUTH_URL:
- ALLOWED_ORIGINS:

Dev vars:

- ENVIRONMENT: development
- BETTER_AUTH_URL:
- ALLOWED_ORIGINS:

## Secrets

- BETTER_AUTH_SECRET (prod) set: yes/no
- BETTER_AUTH_SECRET (dev) set: yes/no
- Local .dev.vars configured: yes/no
- Secret rotation policy:

## Routes (Optional)

If using custom routes instead of workers.dev:

- Prod route pattern:
- Dev route pattern:

## Deployment Checklist

1. D1 databases created.
2. KV namespaces created.
3. wrangler.toml placeholders replaced.
4. Secrets set for dev and prod.
5. Migrations applied (local/dev/prod).
6. Dev deploy complete.
7. Prod deploy complete.
8. Health and CORS checks passed.

## Verification URLs

- Local health: http://localhost:8890/health
- Local users count: http://localhost:8890/auth/users/count
- Dev health:
- Prod health:

## Notes

- Sanitized tenant copies can be stored in docs/tenants.
- Never store secret values in git.
- Keep any sensitive notes in local-only files under docs/tenants/private.