import { createAuth } from "./auth";

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  ENVIRONMENT: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  ALLOWED_ORIGINS?: string;
}

interface GroupRecord {
  id: string;
  slug: string;
  name: string;
  kind: "org" | "team";
  parentGroupId: string | null;
}

interface SessionIdentity {
  userId: string;
  email: string;
  roles: string[];
  groups: Array<GroupRecord & { membershipRole: string }>;
}

const GLOBAL_ADMIN_ROLE_ALIASES = ["admin", "platform_admin", "system_admin", "internal_admin"];

function parseOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function matchesOrigin(origin: string, pattern: string): boolean {
  if (!pattern) return false;
  if (pattern === "*") return true;
  if (!pattern.includes("*")) return pattern === origin;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(origin);
}

function getCorsAllowOrigin(request: Request, env: Env): string | null {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) return null;
  const serverOrigin = new URL(request.url).origin;
  const allowed = Array.from(new Set([serverOrigin, ...parseOrigins(env.ALLOWED_ORIGINS)]));
  return allowed.some((pattern) => matchesOrigin(requestOrigin, pattern)) ? requestOrigin : null;
}

function applyCors(request: Request, env: Env, response: Response): Response {
  const allowOrigin = getCorsAllowOrigin(request, env);
  if (!allowOrigin) return response;
  const next = new Response(response.body, response);
  next.headers.set("access-control-allow-origin", allowOrigin);
  next.headers.set("access-control-allow-credentials", "true");
  next.headers.set("vary", "origin");
  return next;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

function toSlug(value: string): string {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "group";
}

function parseSessionShape(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return null;

  const typedPayload = payload as {
    session?: unknown;
    user?: unknown;
    data?: unknown;
  };

  if (typedPayload.session && typedPayload.user) {
    return payload;
  }

  return typedPayload.data ?? payload;
}

function parseIdentity(session: unknown): { userId: string; email: string } | null {
  if (!session || typeof session !== "object") return null;

  const user = (session as { user?: unknown }).user;
  if (!user || typeof user !== "object") return null;

  const typedUser = user as { id?: unknown; userId?: unknown; email?: unknown };
  const userId = typeof typedUser.id === "string"
    ? typedUser.id
    : typeof typedUser.userId === "string"
      ? typedUser.userId
      : "";
  const email = typeof typedUser.email === "string" ? typedUser.email : "";

  if (!userId || !email) return null;
  return { userId, email };
}

function parseRoles(session: unknown): string[] {
  if (!session || typeof session !== "object") return [];

  const maybeUser = (session as { user?: unknown }).user;
  if (!maybeUser || typeof maybeUser !== "object") return [];

  const user = maybeUser as { role?: unknown; roles?: unknown; claims?: { roles?: unknown } };
  const fromUserRoles = user.roles;
  const fromUserRole = user.role;
  const fromClaimRoles = user.claims?.roles;

  if (Array.isArray(fromUserRoles)) return fromUserRoles.map((value) => String(value).toLowerCase());
  if (typeof fromUserRoles === "string") return [fromUserRoles.toLowerCase()];
  if (typeof fromUserRole === "string") return [fromUserRole.toLowerCase()];
  if (Array.isArray(fromClaimRoles)) return fromClaimRoles.map((value) => String(value).toLowerCase());
  if (typeof fromClaimRoles === "string") return [fromClaimRoles.toLowerCase()];

  return [];
}

function isGlobalAdmin(roles: string[]): boolean {
  const normalized = new Set(roles.map((role) => String(role).toLowerCase()));
  return GLOBAL_ADMIN_ROLE_ALIASES.some((alias) => normalized.has(alias));
}

async function getGroupsForUser(env: Env, userId: string): Promise<Array<GroupRecord & { membershipRole: string }>> {
  const rows = await env.DB.prepare(`
    SELECT
      g.id,
      g.slug,
      g.name,
      g.kind,
      g.parent_group_id AS parentGroupId,
      gm.role AS membershipRole
    FROM group_memberships gm
    INNER JOIN groups g ON g.id = gm.group_id
    WHERE gm.user_id = ?
    ORDER BY g.kind ASC, g.name ASC
  `).bind(userId).all<GroupRecord & { membershipRole: string }>();

  return rows.results || [];
}

async function resolveSessionIdentity(request: Request, env: Env): Promise<SessionIdentity | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const authHeader = request.headers.get("authorization") ?? "";
  if (!cookieHeader && !authHeader) return null;

  const sessionHeaders = new Headers({ accept: "application/json" });
  if (cookieHeader) sessionHeaders.set("cookie", cookieHeader);
  if (authHeader) sessionHeaders.set("authorization", authHeader);

  const sessionRequest = new Request(new URL("/api/auth/session", request.url).toString(), {
    method: "GET",
    headers: sessionHeaders
  });

  const auth = createAuth(env, request);
  const response = await auth.handler(sessionRequest);
  if (!response.ok) return null;

  const payload = (await response.json()) as unknown;
  const session = parseSessionShape(payload);
  const identity = parseIdentity(session);
  if (!identity) return null;

  const roles = parseRoles(session);
  const groups = await getGroupsForUser(env, identity.userId);

  return {
    userId: identity.userId,
    email: identity.email,
    roles,
    groups
  };
}

async function canManageGroup(env: Env, identity: SessionIdentity, groupId: string): Promise<boolean> {
  if (isGlobalAdmin(identity.roles)) return true;

  const membership = await env.DB.prepare(`
    SELECT role
    FROM group_memberships
    WHERE group_id = ? AND user_id = ?
    LIMIT 1
  `).bind(groupId, identity.userId).first<{ role: string }>();

  if (!membership?.role) return false;
  return ["owner", "admin"].includes(String(membership.role).toLowerCase());
}

async function parseJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object") return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const allowOrigin = getCorsAllowOrigin(request, env);

    if (request.method === "OPTIONS") {
      const reqHeaders = request.headers.get("access-control-request-headers");
      return new Response(null, {
        status: 204,
        headers: {
          ...(allowOrigin ? { "access-control-allow-origin": allowOrigin } : {}),
          ...(allowOrigin ? { "access-control-allow-credentials": "true" } : {}),
          ...(allowOrigin ? { vary: "origin" } : {}),
          "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
          "access-control-allow-headers": reqHeaders || "content-type,authorization,x-migration-token"
        }
      });
    }

    if (url.pathname === "/api/auth/me/entitlements" && request.method === "GET") {
      const identity = await resolveSessionIdentity(request, env);
      if (!identity) {
        return applyCors(request, env, json({ ok: false, message: "Unauthorized" }, 401));
      }

      return applyCors(request, env, json({
        ok: true,
        user: {
          id: identity.userId,
          email: identity.email
        },
        roles: identity.roles,
        groups: identity.groups
      }));
    }

    if (url.pathname === "/api/groups" && request.method === "GET") {
      const identity = await resolveSessionIdentity(request, env);
      if (!identity) {
        return applyCors(request, env, json({ ok: false, message: "Unauthorized" }, 401));
      }

      const kind = (url.searchParams.get("kind") || "").trim().toLowerCase();
      const q = (url.searchParams.get("q") || "").trim();
      const filters: string[] = [];
      const bindValues: unknown[] = [];

      if (kind === "org" || kind === "team") {
        filters.push("g.kind = ?");
        bindValues.push(kind);
      }

      if (q) {
        filters.push("(g.name LIKE ? OR g.slug LIKE ?)");
        const qLike = `%${q}%`;
        bindValues.push(qLike, qLike);
      }

      let query = `
        SELECT
          g.id,
          g.slug,
          g.name,
          g.kind,
          g.parent_group_id AS parentGroupId
        FROM groups g
      `;

      if (!isGlobalAdmin(identity.roles)) {
        query += " INNER JOIN group_memberships gm ON gm.group_id = g.id AND gm.user_id = ? ";
        bindValues.unshift(identity.userId);
      }

      if (filters.length > 0) {
        query += ` WHERE ${filters.join(" AND ")} `;
      }

      query += " ORDER BY g.kind ASC, g.name ASC ";

      const rows = await env.DB.prepare(query).bind(...bindValues).all<GroupRecord>();
      return applyCors(request, env, json({ ok: true, items: rows.results || [] }));
    }

    if (url.pathname === "/api/groups" && request.method === "POST") {
      const identity = await resolveSessionIdentity(request, env);
      if (!identity) {
        return applyCors(request, env, json({ ok: false, message: "Unauthorized" }, 401));
      }

      const body = await parseJsonBody(request);
      if (!body) {
        return applyCors(request, env, json({ ok: false, message: "Body must be a JSON object." }, 400));
      }

      const name = typeof body.name === "string" ? body.name.trim() : "";
      const kind = typeof body.kind === "string" ? body.kind.trim().toLowerCase() : "";
      const parentGroupId = typeof body.parentGroupId === "string" ? body.parentGroupId.trim() : "";
      const rawSlug = typeof body.slug === "string" ? body.slug.trim() : "";

      if (!name) {
        return applyCors(request, env, json({ ok: false, message: "name is required." }, 400));
      }
      if (kind !== "org" && kind !== "team") {
        return applyCors(request, env, json({ ok: false, message: "kind must be org or team." }, 400));
      }

      const slug = toSlug(rawSlug || name);
      const now = Date.now();
      const groupId = `grp_${crypto.randomUUID()}`;

      try {
        await env.DB.prepare(`
          INSERT INTO groups (id, slug, name, kind, parent_group_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(groupId, slug, name, kind, parentGroupId || null, now, now).run();

        await env.DB.prepare(`
          INSERT INTO group_memberships (group_id, user_id, role, created_at)
          VALUES (?, ?, 'owner', ?)
        `).bind(groupId, identity.userId, now).run();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error.";
        return applyCors(request, env, json({ ok: false, message: `Unable to create group: ${message}` }, 409));
      }

      return applyCors(request, env, json({
        ok: true,
        group: {
          id: groupId,
          slug,
          name,
          kind,
          parentGroupId: parentGroupId || null,
          createdAt: now,
          updatedAt: now
        }
      }, 201));
    }

    const updateGroupMatch = url.pathname.match(/^\/api\/groups\/([^/]+)$/);
    if (updateGroupMatch && request.method === "PATCH") {
      const identity = await resolveSessionIdentity(request, env);
      if (!identity) {
        return applyCors(request, env, json({ ok: false, message: "Unauthorized" }, 401));
      }

      const groupId = decodeURIComponent(updateGroupMatch[1]);
      const canManage = await canManageGroup(env, identity, groupId);
      if (!canManage) {
        return applyCors(request, env, json({ ok: false, message: "Forbidden" }, 403));
      }

      const body = await parseJsonBody(request);
      if (!body) {
        return applyCors(request, env, json({ ok: false, message: "Body must be a JSON object." }, 400));
      }

      const updates: string[] = [];
      const bindValues: unknown[] = [];

      if ("name" in body) {
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name) {
          return applyCors(request, env, json({ ok: false, message: "name must be a non-empty string." }, 400));
        }
        updates.push("name = ?");
        bindValues.push(name);
      }

      if ("slug" in body) {
        const rawSlug = typeof body.slug === "string" ? body.slug.trim() : "";
        if (!rawSlug) {
          return applyCors(request, env, json({ ok: false, message: "slug must be a non-empty string." }, 400));
        }
        updates.push("slug = ?");
        bindValues.push(toSlug(rawSlug));
      }

      if ("parentGroupId" in body) {
        const parentGroupId = typeof body.parentGroupId === "string" ? body.parentGroupId.trim() : "";
        if (parentGroupId === groupId) {
          return applyCors(request, env, json({ ok: false, message: "group cannot be its own parent." }, 400));
        }
        updates.push("parent_group_id = ?");
        bindValues.push(parentGroupId || null);
      }

      if (updates.length === 0) {
        return applyCors(request, env, json({ ok: false, message: "No updatable fields provided." }, 400));
      }

      updates.push("updated_at = ?");
      bindValues.push(Date.now());

      try {
        await env.DB.prepare(`
          UPDATE groups
          SET ${updates.join(", ")}
          WHERE id = ?
        `).bind(...bindValues, groupId).run();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error.";
        return applyCors(request, env, json({ ok: false, message: `Unable to update group: ${message}` }, 409));
      }

      const group = await env.DB.prepare(`
        SELECT
          id,
          slug,
          name,
          kind,
          parent_group_id AS parentGroupId
        FROM groups
        WHERE id = ?
        LIMIT 1
      `).bind(groupId).first<GroupRecord>();

      return applyCors(request, env, json({ ok: true, group }));
    }

    const listMembersMatch = url.pathname.match(/^\/api\/groups\/([^/]+)\/members$/);
    if (listMembersMatch && request.method === "GET") {
      const identity = await resolveSessionIdentity(request, env);
      if (!identity) {
        return applyCors(request, env, json({ ok: false, message: "Unauthorized" }, 401));
      }

      const groupId = decodeURIComponent(listMembersMatch[1]);
      const canManage = await canManageGroup(env, identity, groupId);
      if (!canManage) {
        return applyCors(request, env, json({ ok: false, message: "Forbidden" }, 403));
      }

      const rows = await env.DB.prepare(`
        SELECT
          gm.group_id AS groupId,
          gm.user_id AS userId,
          gm.role,
          gm.created_at AS createdAt,
          u.email
        FROM group_memberships gm
        LEFT JOIN user u ON u.id = gm.user_id
        WHERE gm.group_id = ?
        ORDER BY gm.role ASC, u.email ASC, gm.user_id ASC
      `).bind(groupId).all<{ groupId: string; userId: string; role: string; createdAt: number; email: string | null }>();

      return applyCors(request, env, json({ ok: true, items: rows.results || [] }));
    }

    const addMemberMatch = url.pathname.match(/^\/api\/groups\/([^/]+)\/members$/);
    if (addMemberMatch && request.method === "POST") {
      const identity = await resolveSessionIdentity(request, env);
      if (!identity) {
        return applyCors(request, env, json({ ok: false, message: "Unauthorized" }, 401));
      }

      const groupId = decodeURIComponent(addMemberMatch[1]);
      const canManage = await canManageGroup(env, identity, groupId);
      if (!canManage) {
        return applyCors(request, env, json({ ok: false, message: "Forbidden" }, 403));
      }

      const body = await parseJsonBody(request);
      if (!body) {
        return applyCors(request, env, json({ ok: false, message: "Body must be a JSON object." }, 400));
      }

      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      const role = typeof body.role === "string" ? body.role.trim().toLowerCase() : "member";
      if (!userId) {
        return applyCors(request, env, json({ ok: false, message: "userId is required." }, 400));
      }

      const roleValue = role || "member";
      const now = Date.now();

      try {
        await env.DB.prepare(`
          INSERT INTO group_memberships (group_id, user_id, role, created_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(group_id, user_id)
          DO UPDATE SET role = excluded.role
        `).bind(groupId, userId, roleValue, now).run();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown database error.";
        return applyCors(request, env, json({ ok: false, message: `Unable to add member: ${message}` }, 409));
      }

      return applyCors(request, env, json({
        ok: true,
        membership: {
          groupId,
          userId,
          role: roleValue
        }
      }));
    }

    const removeMemberMatch = url.pathname.match(/^\/api\/groups\/([^/]+)\/members\/([^/]+)$/);
    if (removeMemberMatch && request.method === "DELETE") {
      const identity = await resolveSessionIdentity(request, env);
      if (!identity) {
        return applyCors(request, env, json({ ok: false, message: "Unauthorized" }, 401));
      }

      const groupId = decodeURIComponent(removeMemberMatch[1]);
      const userId = decodeURIComponent(removeMemberMatch[2]);
      const canManage = await canManageGroup(env, identity, groupId);
      if (!canManage) {
        return applyCors(request, env, json({ ok: false, message: "Forbidden" }, 403));
      }

      await env.DB.prepare(`
        DELETE FROM group_memberships
        WHERE group_id = ? AND user_id = ?
      `).bind(groupId, userId).run();

      return applyCors(request, env, json({ ok: true }));
    }

    if (url.pathname.startsWith("/api/auth")) {
      try {
        const auth = createAuth(env, request);
        const response = await auth.handler(request);
        return applyCors(request, env, response);
      } catch (error) {
        return applyCors(request, env, json(
          {
            error: "auth_init_failed",
            message: error instanceof Error ? error.message : "Unknown error"
          },
          500
        ));
      }
    }

    if (url.pathname === "/health") {
      const dbCheck = await env.DB.prepare("SELECT 1 as ok").first<{ ok: number }>();
      const authTable = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user'"
      ).first<{ name: string }>();
      const kvKey = "health:last";
      await env.SESSIONS.put(kvKey, new Date().toISOString(), { expirationTtl: 300 });
      const kvValue = await env.SESSIONS.get(kvKey);

      return json({
        ok: true,
        environment: env.ENVIRONMENT,
        d1: dbCheck?.ok === 1,
        kv: Boolean(kvValue),
        authSchemaReady: Boolean(authTable)
      });
    }

    if (url.pathname === "/auth/users/count") {
      const row = await env.DB.prepare("SELECT COUNT(*) as count FROM user").first<{ count: number }>();
      return json({ count: row?.count ?? 0 });
    }

    return json(
      {
        service: "betterauth-worker",
        routes: [
          "GET /health",
          "GET /auth/users/count",
          "GET /api/auth/me/entitlements",
          "GET /api/groups",
          "POST /api/groups",
          "PATCH /api/groups/:groupId",
          "GET /api/groups/:groupId/members",
          "POST /api/groups/:groupId/members",
          "DELETE /api/groups/:groupId/members/:userId",
          "ALL /api/auth/*"
        ],
        note: "Use /api/auth endpoints for Better Auth; schema is managed with D1 migrations."
      },
      200
    );
  }
};
