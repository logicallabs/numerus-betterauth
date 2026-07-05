import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/d1";
import { authSchema } from "./schema";

export interface AuthEnv {
  DB: D1Database;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  ALLOWED_ORIGINS?: string;
}

function getRequiredSecret(env: AuthEnv): string {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is missing. Set it with wrangler secret put BETTER_AUTH_SECRET.");
  }
  return env.BETTER_AUTH_SECRET;
}

function parseOrigins(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function getAuthOptions(env: AuthEnv, request: Request) {
  const db = drizzle(env.DB);
  const origin = new URL(request.url).origin;
  const trustedOrigins = Array.from(new Set([origin, ...parseOrigins(env.ALLOWED_ORIGINS)]));

  return {
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: authSchema
    }),
    secret: getRequiredSecret(env),
    baseURL: env.BETTER_AUTH_URL || origin,
    basePath: "/api/auth",
    trustedOrigins,
    emailAndPassword: {
      enabled: true
    }
  };
}

export function createAuth(env: AuthEnv, request: Request) {
  return betterAuth(getAuthOptions(env, request));
}