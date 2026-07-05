# better-auth-admin-ui

Pages-based admin UI for managing Better Auth users and sessions.

## Scope

This app will provide:
- Admin sign-in gate
- User list/search/filter
- Role management
- Ban/unban
- Session revocation

## Auth backend dependency

This UI uses the Better Auth worker service:
- Dev: https://auth-dev.example.com
- Prod: https://auth.example.com

All user/session operations are performed through Better Auth admin endpoints.

## Next implementation step

Scaffold the Pages app (React/Vite or Next-on-Pages) and wire Better Auth client + admin client.
