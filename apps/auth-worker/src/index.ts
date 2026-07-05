import { createAuth } from "./auth";

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  ENVIRONMENT: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  ALLOWED_ORIGINS?: string;
}

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
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": reqHeaders || "content-type,authorization,x-migration-token"
        }
      });
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
        routes: ["GET /health", "GET /auth/users/count", "ALL /api/auth/*"],
        note: "Use /api/auth endpoints for Better Auth; schema is managed with D1 migrations."
      },
      200
    );
  }
};
