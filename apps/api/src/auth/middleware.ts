import { createHash } from "crypto";
import { createMiddleware } from "hono/factory";
import { sign as jwtSign, verify as jwtVerify } from "hono/jwt";
import { db, schema } from "../db/client";
import { eq } from "drizzle-orm";
import CIDR from "ip-cidr";
import { checkRateLimit } from "../lib/rate-limit";

export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return secret;
}

export type AuthContext = {
  userId: string;
  email: string;
  name: string;
  role: "user" | "admin";
  authType: "jwt" | "api_key";
  apiKeyId?: string;
  scopes?: string[];
};

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader?.startsWith("Bearer vk_")) {
    return apiKeyAuth(c, next, authHeader.slice(7));
  }

  if (authHeader?.startsWith("Bearer ")) {
    return jwtAuth(c, next, authHeader.slice(7));
  }

  return c.json({ error: "Missing or invalid authorization header" }, 401);
});

async function jwtAuth(c: any, next: any, token: string) {
  try {
    const payload = await jwtVerify(token, getJWTSecret(), "HS256");
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, payload.sub as string),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    c.set("auth", {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authType: "jwt",
    });

    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
}

async function apiKeyAuth(c: any, next: any, rawKey: string) {
  const hash = createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(schema.apiKeys.keyHash, hash),
    with: { whitelists: true },
  });

  if (!apiKey) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  if (!apiKey.isActive) {
    return c.json({ error: "API key is revoked" }, 401);
  }

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return c.json({ error: "API key expired" }, 401);
  }

  // Grace period check: old key still works within grace window
  if (apiKey.rotatedAt) {
    const graceMs = apiKey.gracePeriodSeconds * 1000;
    const rotatedAt = new Date(apiKey.rotatedAt).getTime();
    if (Date.now() - rotatedAt > graceMs) {
      return c.json({ error: "API key grace period expired" }, 401);
    }
    c.header("X-Key-Deprecated", "true");
  }

  const clientIp =
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
    c.req.header("X-Real-IP") ||
    "";

  // IP whitelist check
  if (apiKey.whitelists.length > 0 && clientIp) {
    const allowed = apiKey.whitelists.some((w) => {
      try {
        const cidr = new CIDR(w.cidr);
        return cidr.contains(clientIp);
      } catch {
        return false;
      }
    });
    if (!allowed) {
      return c.json({ error: "IP not whitelisted" }, 403);
    }
  }

  // Rate limit check
  const withinLimit = await checkRateLimit(apiKey.id, apiKey.rateLimit);
  if (!withinLimit) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, apiKey.userId),
  });

  if (!user) {
    return c.json({ error: "Associated user not found" }, 401);
  }

  c.set("auth", {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    authType: "api_key",
    apiKeyId: apiKey.id,
    scopes: apiKey.scopes,
  });

  // Fire-and-forget last used update
  db.update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, apiKey.id))
    .catch(() => {});

  await next();
}

export async function signJWT(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return jwtSign(
    {
      sub: userId,
      iat: now,
      exp: now + 60 * 60, // 1 hour — forces session refresh
    },
    getJWTSecret()
  );
}

export async function signRefreshJWT(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return jwtSign(
    {
      sub: userId,
      typ: "refresh",
      iat: now,
      exp: now + 30 * 24 * 60 * 60, // 30 days
    },
    getJWTSecret()
  );
}

export function requireScope(scope: string) {
  return createMiddleware(async (c, next) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "Not authenticated" }, 401);
    }
    if (auth.authType === "jwt") return next();
    if (!auth.scopes?.includes(scope)) {
      return c.json({ error: `Missing scope: ${scope}` }, 403);
    }
    await next();
  });
}

export function requireAdmin() {
  return createMiddleware(async (c, next) => {
    const auth = c.get("auth");
    if (!auth || auth.role !== "admin") {
      return c.json({ error: "Admin access required" }, 403);
    }
    await next();
  });
}
