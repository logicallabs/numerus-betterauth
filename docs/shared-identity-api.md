# Shared Identity API Guide

This guide is for downstream apps that need identity, group membership, or entitlement data from the Better Auth worker.

Use this as the primary reference when integrating numerus-nuwebkit, asset registry, or any other client that needs to adapt its UI or authorization rules based on the current user.

## What This API Is For

The Better Auth worker owns authentication and shared identity data.

Downstream apps should use this service to:

- resolve the current authenticated user
- read that user’s roles
- read group memberships and membership roles
- adapt UI or authorization behavior based on those claims
- manage groups when the current user is allowed to do so

Downstream apps should not create their own session or group source of truth.

## Base Paths

- Better Auth session and sign-in routes: `/api/auth/*`
- Shared identity and group routes: `/api/v1/*`

## Authentication

Clients must send either:

- a session cookie from Better Auth, or
- an authorization header if the client uses bearer-style auth

The shared identity endpoints are read from the authenticated user context. The current user is inferred from the session or token that already exists for the request.

## Read Current Identity

Endpoint:

- `GET /api/v1/me/entitlements`

Typical response:

```json
{
  "ok": true,
  "user": {
    "id": "usr_123",
    "email": "user@example.com"
  },
  "roles": ["admin"],
  "groups": [
    {
      "id": "grp_123",
      "slug": "platform-team",
      "name": "Platform Team",
      "kind": "team",
      "parentGroupId": "grp_001",
      "membershipRole": "member"
    }
  ]
}
```

How to use this response:

- Use `user.id` as the stable user identifier.
- Use `user.email` for display only.
- Use `roles` for global platform permissions.
- Use `groups` to decide which areas or records the user should see.
- Use `membershipRole` to distinguish owner/admin/member behavior within a group.

## Group Management

Available endpoints:

- `GET /api/v1/groups`
- `POST /api/v1/groups`
- `PATCH /api/v1/groups/:groupId`
- `GET /api/v1/groups/:groupId/members`
- `POST /api/v1/groups/:groupId/members`
- `DELETE /api/v1/groups/:groupId/members/:userId`

Use these endpoints when a client needs to create groups, rename them, or manage membership.

Important rules:

- `group.kind` is metadata only.
- Valid kinds are `org` and `team`.
- Do not hardcode product behavior purely from the kind value.
- Group management is allowed for global admins and group owners/admins.

## Shared API Usage Pattern

The recommended flow for a downstream app is:

1. Authenticate the user through Better Auth.
2. Call `GET /api/v1/me/entitlements`.
3. Use the returned groups and roles to shape the UI.
4. Store app-specific resource ACLs in the downstream app, not here.
5. Re-check entitlements when a user refreshes or signs in again.

Example client behavior:

- If the user belongs to a `team`, show team-scoped navigation.
- If the user has `admin`, enable admin-only actions.
- If the user lacks a matching group, hide or disable that section.

## What Downstream Apps Should Not Do

- Do not treat this API as the source of truth for app-specific resource permissions.
- Do not create a duplicate user table or group model in the downstream app.
- Do not assume `org` and `team` carry business meaning beyond UI or policy hints.
- Do not rely on legacy unversioned paths.

## Utility Endpoint

The worker also exposes a utility count endpoint:

- `GET /api/v1/users/count`

This is mainly for operational checks and should not be treated as a core integration dependency.

## References

- [Better Auth worker README](../apps/auth-worker/README.md)
- [Generic integration contract](auth-integration-contract.md)