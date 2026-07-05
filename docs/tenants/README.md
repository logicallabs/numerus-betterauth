# Tenant Records Convention

This folder stores non-sensitive tenant deployment records that are safe to keep in git.

## Purpose

Use this folder to track rollout state per tenant/account without storing secrets.

## Allowed in Git

- Tenant name and environment owner
- Cloudflare account ID and zone name
- Worker names
- Domain names and route patterns
- D1 and KV resource IDs
- Migration/deploy status and timestamps
- Incident/change notes that do not include credentials

## Never Commit

- BETTER_AUTH_SECRET or any secret value
- API keys, tokens, passwords, private keys
- Full .dev.vars content
- Raw command output that contains sensitive headers or credentials

## File Naming

Use one checked-in file per tenant:

- docs/tenants/<tenant>.md

Examples:

- docs/tenants/logicallabs.md
- docs/tenants/numerus.md
- docs/tenants/edtr.md

Optional local private working notes (ignored by git):

- docs/tenants/private/<tenant>.md
- docs/tenants/<tenant>.private.md
- docs/tenants/<tenant>.secrets.md

## Recommended Structure for Tenant Files

Use this section layout in each tenant file:

1. Tenant Identity
2. Domains and Routes
3. Cloudflare Resource IDs
4. Wrangler Variable Targets
5. Deployment Checklist and Status
6. Change Log

## Quick Start

1. Copy docs/tenant-config-template.md into docs/tenants/<tenant>.md.
2. Fill only non-sensitive values.
3. Keep secrets in local-only files or your secret manager.
4. Commit tenant status updates with deployment changes.
