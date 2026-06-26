import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../db/client";
import { authMiddleware, requireScope } from "../auth/middleware";
import { encrypt, decrypt, secureWipe } from "../lib/encryption";
import { generateTOTP, parseOTPURI, buildOTPURI } from "../lib/totp";
import { CreateEntrySchema, UpdateEntrySchema, ImportEntriesSchema } from "@vault/shared";
import { HTTPException } from "hono/http-exception";
import { logSecurityEvent } from "../lib/security-audit";

const entries = new Hono();

entries.use("*", authMiddleware);

entries.get("/", async (c) => {
  const auth = c.get("auth");
  const ownEntries = await db.query.vaultEntries.findMany({
    where: eq(schema.vaultEntries.userId, auth.userId),
    orderBy: desc(schema.vaultEntries.sortOrder),
  });

  const sharedEntries = await db.query.shares.findMany({
    where: eq(schema.shares.sharedWithUserId, auth.userId),
    with: { entry: true },
  });

  const allEntries = [
    ...ownEntries.map((e) => ({ ...e, shared: false, canEdit: true })),
    ...sharedEntries.map((s: any) => ({
      ...s.entry,
      shared: true,
      canEdit: s.canEdit,
    })),
  ];

  const result = await Promise.all(
    allEntries.map(async (entry) => {
      try {
        const secret = await decrypt(entry.encryptedSecret, entry.encryptionNonce);
        const code = generateTOTP({
          secret,
          algorithm: entry.algorithm as any,
          digits: entry.digits,
          period: entry.period,
        });
        return {
          id: entry.id,
          issuer: entry.issuer,
          label: entry.label,
          algorithm: entry.algorithm,
          digits: entry.digits,
          period: entry.period,
          iconUrl: entry.iconUrl,
          sortOrder: entry.sortOrder,
          code,
          shared: entry.shared,
          canEdit: entry.canEdit,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        };
      } catch {
        return {
          id: entry.id,
          issuer: entry.issuer,
          label: entry.label,
          algorithm: entry.algorithm,
          digits: entry.digits,
          period: entry.period,
          iconUrl: entry.iconUrl,
          sortOrder: entry.sortOrder,
          code: null,
          shared: entry.shared,
          canEdit: entry.canEdit,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        };
      }
    })
  );

  return c.json(result);
});

entries.get("/export/all", requireScope("vault:export"), async (c) => {
  const auth = c.get("auth");
  const own = await db.query.vaultEntries.findMany({
    where: eq(schema.vaultEntries.userId, auth.userId),
  });

  const exported = await Promise.all(
    own.map(async (e) => {
      const secret = await decrypt(e.encryptedSecret, e.encryptionNonce);
      return buildOTPURI({
        secret,
        algorithm: e.algorithm as any,
        digits: e.digits,
        period: e.period,
        issuer: e.issuer,
        label: e.label,
      });
    })
  );

  await logSecurityEvent("export.downloaded",
    { type: "entries", count: exported.length }, auth.userId);

  return c.json({ uris: exported });
});

entries.get("/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");

  const entry = await db.query.vaultEntries.findFirst({
    where: eq(schema.vaultEntries.id, id),
  });

  if (!entry) throw new HTTPException(404, { message: "Entry not found" });

  if (entry.userId !== auth.userId) {
    const share = await db.query.shares.findFirst({
      where: and(
        eq(schema.shares.entryId, id),
        eq(schema.shares.sharedWithUserId, auth.userId)
      ),
    });
    if (!share) throw new HTTPException(403, { message: "Forbidden" });
  }

  const secret = await decrypt(entry.encryptedSecret, entry.encryptionNonce);
  const code = generateTOTP({
    secret,
    algorithm: entry.algorithm as any,
    digits: entry.digits,
    period: entry.period,
  });

  return c.json({
    id: entry.id,
    issuer: entry.issuer,
    label: entry.label,
    algorithm: entry.algorithm,
    digits: entry.digits,
    period: entry.period,
    iconUrl: entry.iconUrl,
    sortOrder: entry.sortOrder,
    code,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  });
});

entries.post("/", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();
  const parsed = CreateEntrySchema.parse(body);

  const { ciphertext, nonce } = await encrypt(parsed.secret);

  const [entry] = await db
    .insert(schema.vaultEntries)
    .values({
      userId: auth.userId,
      issuer: parsed.issuer,
      label: parsed.label,
      encryptedSecret: ciphertext,
      encryptionNonce: nonce,
      algorithm: parsed.algorithm,
      digits: parsed.digits,
      period: parsed.period,
      iconUrl: parsed.iconUrl,
    })
    .returning();

  return c.json({ id: entry.id }, 201);
});

entries.put("/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = UpdateEntrySchema.parse(body);

  const entry = await db.query.vaultEntries.findFirst({
    where: eq(schema.vaultEntries.id, id),
  });

  if (!entry) throw new HTTPException(404, { message: "Entry not found" });
  if (entry.userId !== auth.userId) throw new HTTPException(403, { message: "Forbidden" });

  await db
    .update(schema.vaultEntries)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(schema.vaultEntries.id, id));

  return c.json({ ok: true });
});

entries.delete("/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");

  const entry = await db.query.vaultEntries.findFirst({
    where: eq(schema.vaultEntries.id, id),
  });

  if (!entry) throw new HTTPException(404, { message: "Entry not found" });
  if (entry.userId !== auth.userId) throw new HTTPException(403, { message: "Forbidden" });

  // ISO 27002 8.10 — secure wipe before delete
  await secureWipe();
  await db.delete(schema.vaultEntries).where(eq(schema.vaultEntries.id, id));

  await logSecurityEvent("entry.deleted", { entryId: id, issuer: entry.issuer }, auth.userId);
  return c.json({ ok: true });
});

entries.post("/import", requireScope("entries:write"), async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();
  const parsed = ImportEntriesSchema.parse(body);

  const results = await Promise.all(
    parsed.uris.map(async (uri) => {
      try {
        const config = parseOTPURI(uri);
        const { ciphertext, nonce } = await encrypt(config.secret);
        const [entry] = await db
          .insert(schema.vaultEntries)
          .values({
            userId: auth.userId,
            issuer: config.issuer || "Unknown",
            label: config.label || "Imported",
            encryptedSecret: ciphertext,
            encryptionNonce: nonce,
            algorithm: config.algorithm || "SHA1",
            digits: config.digits || 6,
            period: config.period || 30,
          })
          .returning();
        return { success: true, id: entry.id };
      } catch (e: any) {
        return { success: false, error: e.message, uri };
      }
    })
  );

  return c.json({ imported: results.filter((r) => r.success).length, results });
});

export default entries;
