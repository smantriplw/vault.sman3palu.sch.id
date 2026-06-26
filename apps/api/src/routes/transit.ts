import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { authMiddleware, requireAdmin } from "../auth/middleware";
import { logSecurityEvent } from "../lib/security-audit";
import {
  createKey,
  getKey,
  listKeys,
  rotateKey,
  deleteKey,
} from "../lib/vault-like";
import { isVaultLikeConfigured, transitEncrypt, transitDecrypt } from "../lib/vault-like";
import { HTTPException } from "hono/http-exception";

const vault = new Hono();

vault.use("*", authMiddleware);

// Key management (admin only)
const keyRoutes = new Hono();
keyRoutes.use("*", requireAdmin() as any);

// Create key
keyRoutes.post("/keys", async (c) => {
  const auth = c.get("auth");
  if (!isVaultLikeConfigured()) {
    throw new HTTPException(400, { message: "MASTER_ENCRYPTION_KEY not configured. Set it in .env to enable Transit." });
  }

  const body = await c.req.json();
  const parsed = z.object({
    name: z.string().min(1).max(255),
    algorithm: z.string().default("aes256-gcm96"),
    auto_rotate_period: z.string().optional(),
  }).parse(body);

  const key = await createKey(parsed.name, parsed.algorithm, parsed.auto_rotate_period);
  await logSecurityEvent("transit.key.created", { name: key.name, algorithm: key.algorithm }, auth.userId);

  return c.json(key, 201);
});

// List keys
keyRoutes.get("/keys", async (c) => {
  if (!isVaultLikeConfigured()) {
    return c.json([]);
  }
  const keys = await listKeys();
  return c.json(keys);
});

// Read key
keyRoutes.get("/keys/:name", async (c) => {
  const name = c.req.param("name");
  const key = await getKey(name);
  if (!key) throw new HTTPException(404, { message: "Key not found" });
  return c.json(key);
});

// Rotate key
keyRoutes.post("/keys/:name/rotate", async (c) => {
  const auth = c.get("auth");
  const name = c.req.param("name");
  const key = await rotateKey(name);
  await logSecurityEvent("transit.key.rotated", { name: key.name, versions: key.versions.length }, auth.userId);
  return c.json(key);
});

// Update key config
keyRoutes.patch("/keys/:name", async (c) => {
  const auth = c.get("auth");
  const name = c.req.param("name");
  const body = await c.req.json();
  const parsed = z.object({
    deletion_allowed: z.boolean().optional(),
    auto_rotate_period: z.string().nullable().optional(),
  }).parse(body);

  const update: Record<string, any> = {};
  if (parsed.deletion_allowed !== undefined) update.deletionAllowed = parsed.deletion_allowed;
  if (parsed.auto_rotate_period !== undefined) update.autoRotatePeriod = parsed.auto_rotate_period;
  update.updatedAt = new Date();

  const [existing] = await db
    .select({ id: schema.encryptionKeys.id })
    .from(schema.encryptionKeys)
    .where(eq(schema.encryptionKeys.name, name))
    .limit(1);

  if (!existing) throw new HTTPException(404, { message: "Key not found" });

  await db
    .update(schema.encryptionKeys)
    .set(update)
    .where(eq(schema.encryptionKeys.id, existing.id));

  await logSecurityEvent("transit.key.updated", { name, ...parsed }, auth.userId);
  const key = await getKey(name);
  return c.json(key);
});

// Delete key
keyRoutes.delete("/keys/:name", async (c) => {
  const auth = c.get("auth");
  const name = c.req.param("name");
  await deleteKey(name);
  await logSecurityEvent("transit.key.deleted", { name }, auth.userId);
  return c.json({ ok: true });
});

// Transit encrypt/decrypt (authenticated, not admin-only)
vault.post("/encrypt/:name", async (c) => {
  if (!isVaultLikeConfigured()) {
    throw new HTTPException(400, { message: "MASTER_ENCRYPTION_KEY not configured. Set it in .env to enable Transit." });
  }

  const name = c.req.param("name");
  const body = await c.req.json();
  const parsed = z.object({
    plaintext: z.string(),
  }).parse(body);

  const result = await transitEncrypt(parsed.plaintext, name);
  return c.json({
    data: { ciphertext: result.ciphertext },
  });
});

vault.post("/decrypt/:name", async (c) => {
  if (!isVaultLikeConfigured()) {
    throw new HTTPException(400, { message: "MASTER_ENCRYPTION_KEY not configured." });
  }

  const body = await c.req.json();
  const parsed = z.object({
    ciphertext: z.string(),
  }).parse(body);

  const plaintext = await transitDecrypt(parsed.ciphertext);
  return c.json({
    data: { plaintext: Buffer.from(plaintext).toString("base64") },
  });
});

vault.route("/", keyRoutes);

export default vault;
