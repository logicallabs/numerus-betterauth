# Repository Structure

The repository now uses a workspace-oriented app layout.

## Current layout

- apps/auth-worker: production Better Auth backend
- apps/admin-ui: standalone admin interface workspace

## Root role

- Root package.json manages workspaces and orchestration scripts.
- App-specific runtime/deploy config lives inside each app directory.

## Next implementation priority

1. Scaffold apps/admin-ui as a Pages project.
2. Wire Better Auth admin client to apps/auth-worker endpoints.
3. Add separate CI deploy jobs per app path.
