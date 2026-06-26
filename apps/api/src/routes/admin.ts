import { Hono } from "hono";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "../db/client";
import { authMiddleware, requireAdmin } from "../auth/middleware";
import { generateApiKey } from "../lib/api-keys";
import { CreateApiKeySchema } from "@vault/shared";
import { HTTPException } from "hono/http-exception";

const admin = new Hono();

admin.use("*", authMiddleware, requireAdmin);

// List services
admin.get("/services", async (c) => {
  const keys = await db.query.apiKeys.findMany({
    with: { whitelists: true, user: { columns: { id: true, email: true, name: true } } },
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
    }))
  );
});

// Create service
admin.post("/services", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();
  const parsed = CreateApiKeySchema.parse(body);

  const { raw, hash, prefix } = generateApiKey(
    process.env.ENVIRONMENT || "prod"
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
      }))
    );
  }

  return c.json(
    {
      id: apikey.id,
      apiKey: raw,
      keyPrefix: prefix,
      serviceName: parsed.service_name,
      scopes: parsed.scopes,
      whitelist: parsed.whitelist || [],
    },
    201
  );
});

// Get service detail
admin.get("/services/:id", async (c) => {
  const id = c.req.param("id");
  const key = await db.query.apiKeys.findFirst({
    where: eq(schema.apiKeys.id, id),
    with: { whitelists: true, user: { columns: { id: true, email: true, name: true } } },
  });
  if (!key) throw new HTTPException(404, { message: "Service not found" });
  return c.json(key);
});

// Update service
admin.put("/services/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const update: any = {};
  if (body.service_name) update.serviceName = body.service_name;
  if (body.scopes) update.scopes = body.scopes;
  if (body.rate_limit) update.rateLimit = body.rate_limit;
  if (body.is_active !== undefined) update.isActive = body.is_active;

  await db
    .update(schema.apiKeys)
    .set(update)
    .where(eq(schema.apiKeys.id, id));

  return c.json({ ok: true });
});

// Rotate API key
admin.post("/services/:id/rotate", async (c) => {
  const id = c.req.param("id");
  const key = await db.query.apiKeys.findFirst({
    where: eq(schema.apiKeys.id, id),
  });
  if (!key) throw new HTTPException(404, { message: "Service not found" });

  const { raw, hash, prefix } = generateApiKey(
    process.env.ENVIRONMENT || "prod"
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

  return c.json({ apiKey: raw, keyPrefix: prefix });
});

// Revoke service
admin.delete("/services/:id", async (c) => {
  const id = c.req.param("id");
  await db
    .update(schema.apiKeys)
    .set({ isActive: false })
    .where(eq(schema.apiKeys.id, id));
  return c.json({ ok: true });
});

// Whitelist management
admin.post("/services/:id/whitelist", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = z
    .object({ cidr: z.string(), description: z.string().max(255).optional() })
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
  const id = c.req.param("id");
  const cid = c.req.param("cid");

  await db
    .delete(schema.apiKeyWhitelists)
    .where(
      eq(schema.apiKeyWhitelists.id, cid)
    );

  return c.json({ ok: true });
});

// Request logs
admin.get("/requests", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = (page - 1) * limit;

  const logs = await db.query.requestLogs.findMany({
    limit,
    offset,
    orderBy: desc(schema.requestLogs.createdAt),
    with: {
      apiKey: { columns: { serviceName: true } },
      user: { columns: { email: true, name: true } },
    },
  });

  const total = await db.$count(schema.requestLogs);

  return c.json({ logs, total, page, limit });
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
