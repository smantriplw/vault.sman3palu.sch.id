import { Hono } from "hono";
import { z } from "zod";
import { eq, desc, and, sql, ilike, gte, lte, inArray } from "drizzle-orm";
import { db, schema } from "../db/client";
import { authMiddleware, requireAdmin } from "../auth/middleware";
import { generateApiKey } from "../lib/api-keys";
import { CreateApiKeySchema } from "@vault/shared";
import { HTTPException } from "hono/http-exception";
import { logSecurityEvent } from "../lib/security-audit";

const admin = new Hono();

admin.use("*", authMiddleware, requireAdmin() as any);

// ─── Services ─────────────────────────────────────────────

admin.get("/services", async (c) => {
  const keys = await db.query.apiKeys.findMany({
    with: {
      whitelists: true,
      user: { columns: { id: true, email: true, name: true } },
    },
    orderBy: desc(schema.apiKeys.createdAt),
  });

  return c.json(
    keys.map((k) => ({
      id: k.id,
      serviceName: k.serviceName,
      keyPrefix: k.keyPrefix,
      userId: k.userId,
      user: k.user,
      scopes: k.scopes,
      rateLimit: k.rateLimit,
      isActive: k.isActive,
      expiresAt: k.expiresAt,
      rotatedAt: k.rotatedAt,
      gracePeriodSeconds: k.gracePeriodSeconds,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
      whitelists: k.whitelists,
    })),
  );
});

admin.post("/services", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();
  const parsed = CreateApiKeySchema.parse(body);

  const { raw, hash, prefix } = generateApiKey(
    process.env.ENVIRONMENT || "prod",
  );

  const [apikey] = await db
    .insert(schema.apiKeys)
    .values({
      serviceName: parsed.service_name,
      keyHash: hash,
      keyPrefix: prefix,
      userId: auth.userId,
      scopes: parsed.scopes,
      rateLimit: parsed.rate_limit,
      expiresAt: parsed.expires_at ? new Date(parsed.expires_at) : null,
    })
    .returning();

  if (parsed.whitelist && parsed.whitelist.length > 0) {
    await db.insert(schema.apiKeyWhitelists).values(
      parsed.whitelist.map((w) => ({
        apiKeyId: apikey.id,
        cidr: w.cidr as any,
        description: w.description || null,
      })),
    );
  }

  await logSecurityEvent(
    "key.created",
    { serviceName: parsed.service_name, keyPrefix: prefix },
    auth.userId,
  );

  return c.json(
    {
      id: apikey.id,
      apiKey: raw,
      keyPrefix: prefix,
      serviceName: parsed.service_name,
      scopes: parsed.scopes,
      whitelist: parsed.whitelist || [],
    },
    201,
  );
});

admin.get("/services/:id", async (c) => {
  const id = c.req.param("id");
  const key = await db.query.apiKeys.findFirst({
    where: eq(schema.apiKeys.id, id),
    with: {
      whitelists: true,
      user: { columns: { id: true, email: true, name: true } },
    },
  });
  if (!key) throw new HTTPException(404, { message: "Service not found" });
  return c.json(key);
});

admin.put("/services/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const update: any = {};
  if (body.service_name) update.serviceName = body.service_name;
  if (body.scopes) update.scopes = body.scopes;
  if (body.rate_limit) update.rateLimit = body.rate_limit;
  if (body.is_active !== undefined) update.isActive = body.is_active;

  await db.update(schema.apiKeys).set(update).where(eq(schema.apiKeys.id, id));
  return c.json({ ok: true });
});

admin.post("/services/:id/rotate", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const key = await db.query.apiKeys.findFirst({
    where: eq(schema.apiKeys.id, id),
  });
  if (!key) throw new HTTPException(404, { message: "Service not found" });

  const { raw, hash, prefix } = generateApiKey(
    process.env.ENVIRONMENT || "prod",
  );

  await db
    .update(schema.apiKeys)
    .set({
      keyHash: hash,
      keyPrefix: prefix,
      rotatedAt: new Date(),
      lastUsedAt: null,
    })
    .where(eq(schema.apiKeys.id, id));

  await logSecurityEvent(
    "key.rotated",
    { serviceName: key.serviceName, keyId: id, oldPrefix: key.keyPrefix },
    auth.userId,
  );

  return c.json({ apiKey: raw, keyPrefix: prefix });
});

admin.delete("/services/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const key = await db.query.apiKeys.findFirst({
    where: eq(schema.apiKeys.id, id),
  });

  await db
    .update(schema.apiKeys)
    .set({ isActive: false })
    .where(eq(schema.apiKeys.id, id));

  if (key) {
    await logSecurityEvent(
      "key.revoked",
      { serviceName: key.serviceName, keyId: id },
      auth.userId,
    );
  }
  return c.json({ ok: true });
});

// ─── Whitelist management ─────────────────────────────────

admin.post("/services/:id/whitelist", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = z
    .object({
      cidr: z.string(),
      description: z.string().max(255).optional(),
    })
    .parse(body);

  const [w] = await db
    .insert(schema.apiKeyWhitelists)
    .values({
      apiKeyId: id,
      cidr: parsed.cidr as any,
      description: parsed.description || null,
    })
    .returning();

  return c.json(w, 201);
});

admin.delete("/services/:id/whitelist/:cid", async (c) => {
  const cid = c.req.param("cid");
  await db
    .delete(schema.apiKeyWhitelists)
    .where(eq(schema.apiKeyWhitelists.id, cid));
  return c.json({ ok: true });
});

// ─── Service Access Restriction (entries/secrets) ─────────

admin.get("/services/:id/access", async (c) => {
  const id = c.req.param("id");

  const entryAccess = await db.query.apiKeyEntryAccess.findMany({
    where: eq(schema.apiKeyEntryAccess.apiKeyId, id),
  });

  const secretAccess = await db.query.apiKeySecretAccess.findMany({
    where: eq(schema.apiKeySecretAccess.apiKeyId, id),
  });

  return c.json({
    entries: entryAccess.map((e) => e.entryId),
    secrets: secretAccess.map((s) => s.secretId),
  });
});

admin.put("/services/:id/access", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = z
    .object({
      entries: z.array(z.string().uuid()).optional(),
      secrets: z.array(z.string().uuid()).optional(),
    })
    .parse(body);

  if (parsed.entries !== undefined) {
    await db
      .delete(schema.apiKeyEntryAccess)
      .where(eq(schema.apiKeyEntryAccess.apiKeyId, id));
    if (parsed.entries.length > 0) {
      await db
        .insert(schema.apiKeyEntryAccess)
        .values(parsed.entries.map((entryId) => ({ apiKeyId: id, entryId })));
    }
  }

  if (parsed.secrets !== undefined) {
    await db
      .delete(schema.apiKeySecretAccess)
      .where(eq(schema.apiKeySecretAccess.apiKeyId, id));
    if (parsed.secrets.length > 0) {
      await db
        .insert(schema.apiKeySecretAccess)
        .values(parsed.secrets.map((secretId) => ({ apiKeyId: id, secretId })));
    }
  }

  return c.json({ ok: true });
});

// ─── User Visibility Management ───────────────────────────

admin.get("/visibility/entries/:entryId", async (c) => {
  const entryId = c.req.param("entryId");
  const shares = await db.query.shares.findMany({
    where: eq(schema.shares.entryId, entryId),
    with: {
      sharedWithUser: { columns: { id: true, email: true, name: true } },
    },
  });
  return c.json(
    shares.map((s) => ({
      id: s.id,
      user: s.sharedWithUser,
      canEdit: s.canEdit,
      createdAt: s.createdAt,
    })),
  );
});

admin.post("/visibility/entries/:entryId", async (c) => {
  const entryId = c.req.param("entryId");
  const body = await c.req.json();
  const parsed = z
    .object({
      user_id: z.string().uuid(),
      can_edit: z.boolean().default(false),
    })
    .parse(body);

  const existing = await db.query.shares.findFirst({
    where: and(
      eq(schema.shares.entryId, entryId),
      eq(schema.shares.sharedWithUserId, parsed.user_id),
    ),
  });
  if (existing)
    throw new HTTPException(409, { message: "User already has access" });

  const [share] = await db
    .insert(schema.shares)
    .values({
      entryId,
      sharedWithUserId: parsed.user_id,
      canEdit: parsed.can_edit,
    })
    .returning();

  return c.json(share, 201);
});

admin.delete("/visibility/entries/:entryId/:userId", async (c) => {
  const entryId = c.req.param("entryId");
  const userId = c.req.param("userId");
  await db
    .delete(schema.shares)
    .where(
      and(
        eq(schema.shares.entryId, entryId),
        eq(schema.shares.sharedWithUserId, userId),
      ),
    );
  return c.json({ ok: true });
});

admin.get("/visibility/secrets/:secretId", async (c) => {
  const secretId = c.req.param("secretId");
  const shares = await db.query.secretShares.findMany({
    where: eq(schema.secretShares.secretId, secretId),
    with: {
      sharedWithUser: { columns: { id: true, email: true, name: true } },
    },
  });
  return c.json(
    shares.map((s) => ({
      id: s.id,
      user: s.sharedWithUser,
      canEdit: s.canEdit,
      createdAt: s.createdAt,
    })),
  );
});

admin.post("/visibility/secrets/:secretId", async (c) => {
  const secretId = c.req.param("secretId");
  const body = await c.req.json();
  const parsed = z
    .object({
      user_id: z.string().uuid(),
      can_edit: z.boolean().default(false),
    })
    .parse(body);

  const existing = await db.query.secretShares.findFirst({
    where: and(
      eq(schema.secretShares.secretId, secretId),
      eq(schema.secretShares.sharedWithUserId, parsed.user_id),
    ),
  });
  if (existing)
    throw new HTTPException(409, { message: "User already has access" });

  const [share] = await db
    .insert(schema.secretShares)
    .values({
      secretId,
      sharedWithUserId: parsed.user_id,
      canEdit: parsed.can_edit,
    })
    .returning();

  return c.json(share, 201);
});

admin.delete("/visibility/secrets/:secretId/:userId", async (c) => {
  const secretId = c.req.param("secretId");
  const userId = c.req.param("userId");
  await db
    .delete(schema.secretShares)
    .where(
      and(
        eq(schema.secretShares.secretId, secretId),
        eq(schema.secretShares.sharedWithUserId, userId),
      ),
    );
  return c.json({ ok: true });
});

admin.get("/users", async (c) => {
  const users = await db.query.users.findMany({
    columns: { id: true, email: true, name: true, role: true },
    orderBy: desc(schema.users.createdAt),
  });
  return c.json(users);
});

// ─── Request Logs (filtered + paginated) ──────────────────

admin.get("/requests", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
  const offset = (page - 1) * limit;

  const conditions: any[] = [];

  const ip = c.req.query("ip");
  if (ip) conditions.push(ilike(schema.requestLogs.ipAddress, `%${ip}%`));

  const path = c.req.query("path");
  if (path) conditions.push(ilike(schema.requestLogs.path, `%${path}%`));

  const method = c.req.query("method");
  if (method)
    conditions.push(eq(schema.requestLogs.method, method.toUpperCase()));

  const statusMin = c.req.query("status_min");
  if (statusMin)
    conditions.push(gte(schema.requestLogs.statusCode, parseInt(statusMin)));

  const statusMax = c.req.query("status_max");
  if (statusMax)
    conditions.push(lte(schema.requestLogs.statusCode, parseInt(statusMax)));

  const start_date = c.req.query("start_date");
  if (start_date)
    conditions.push(gte(schema.requestLogs.createdAt, new Date(start_date)));

  const end_date = c.req.query("end_date");
  if (end_date)
    conditions.push(lte(schema.requestLogs.createdAt, new Date(end_date)));

  const min_duration = c.req.query("min_duration");
  if (min_duration)
    conditions.push(
      gte(schema.requestLogs.responseTimeMs, parseInt(min_duration)),
    );

  const max_duration = c.req.query("max_duration");
  if (max_duration)
    conditions.push(
      lte(schema.requestLogs.responseTimeMs, parseInt(max_duration)),
    );

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, countResult] = await Promise.all([
    db.query.requestLogs.findMany({
      where,
      limit,
      offset,
      orderBy: desc(schema.requestLogs.createdAt),
      with: {
        apiKey: { columns: { serviceName: true } },
        user: { columns: { email: true, name: true } },
      },
    }),
    db.$count(schema.requestLogs, where),
  ]);

  return c.json({ logs, total: countResult, page, limit });
});

admin.get("/requests/stats", async (c) => {
  const recent = await db.query.requestLogs.findMany({
    orderBy: desc(schema.requestLogs.createdAt),
    limit: 1000,
  });

  const total = recent.length;
  const errors = recent.filter((r) => (r.statusCode || 0) >= 400).length;
  const avgResponseTime =
    recent.reduce((sum, r) => sum + (r.responseTimeMs || 0), 0) / (total || 1);

  const byEndpoint: Record<string, number> = {};
  recent.forEach((r) => {
    byEndpoint[r.method + " " + r.path] =
      (byEndpoint[r.method + " " + r.path] || 0) + 1;
  });

  return c.json({
    total,
    errors,
    errorRate: total > 0 ? (errors / total) * 100 : 0,
    avgResponseTime: Math.round(avgResponseTime),
    topEndpoints: Object.entries(byEndpoint)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
  });
});

export default admin;
