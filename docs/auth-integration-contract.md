# BetterAuth Integration Contract (Generic)

This document defines the reusable identity and group contract intended for any project using this auth worker.

## Design goals

- Keep identity and membership generic (no product-specific semantics)
- Keep resource authorization in downstream services
- Make claims stable for cross-project reuse
- Support multiple clients, such as numerus-nuwebkit, asset registry, or future internal apps

## Core concepts

- `user`: authenticated identity
- `roles`: global platform roles (optional)
- `group`: reusable share boundary (for org/team style structures)
- `group_membership`: mapping of user to group with a role

`group.kind` is metadata only:

- `org`
- `team`

Downstream services should not hardcode business behavior to kind values; use them for UI/policy where needed.

## Entitlements response

Endpoint:

- `GET /api/v1/me/entitlements`

Response shape:

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

## Group management endpoints

- `GET /api/v1/groups`
- `POST /api/v1/groups`
- `PATCH /api/v1/groups/:groupId`
- `GET /api/v1/groups/:groupId/members`
- `POST /api/v1/groups/:groupId/members`
- `DELETE /api/v1/groups/:groupId/members/:userId`

## Authorization model (auth worker scope)

- Any authenticated user can read their own entitlements.
- Group management is allowed for:
  - global admins (`admin`, `platform_admin`, `system_admin`, plus compatibility alias `internal_admin`)
  - group members with role `owner` or `admin`

## What belongs in downstream services

Downstream services (for example numerus-nuwebkit, asset registry, or any other consumer) should:

- accept principals as `user` or `group`
- store resource ACLs locally
- evaluate access using entitlements from this service

This service does not own resource ACLs for external domains.
