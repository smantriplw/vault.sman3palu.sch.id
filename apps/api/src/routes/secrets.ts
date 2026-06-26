import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "../db/client";
import { authMiddleware, requireScope } from "../auth/middleware";
import { encrypt, decrypt } from "../lib/encryption";
import { CreateSecretSchema, UpdateSecretSchema, UpdateSecretDataSchema } from "@vault/shared";
import { HTTPException } from "hono/http-exception";

const secrets = new Hono();

secrets.use("*", authMiddleware);

secrets.get("/", async (c) => {
  const auth = c.get("auth");

  const own = await db.query.secrets.findMany({
    where: eq(schema.secrets.userId, auth.userId),
    orderBy: desc(schema.secrets.sortOrder),
  });

  const shared = await db.query.secretShares.findMany({
    where: eq(schema.secretShares.sharedWithUserId, auth.userId),
    with: { secret: true },
  });

  const all = [
    ...own.map((s) => ({ ...s, shared: false, canEdit: true })),
    ...shared.map((s: any) => ({
      ...s.secret,
      shared: true,
      canEdit: s.canEdit,
    })),
  ];

  const result = await Promise.all(
    all.map(async (secret) => {
      try {
        const data = JSON.parse(
          await decrypt(secret.encryptedData, secret.encryptionNonce)
        );
        return {
          id: secret.id,
          name: secret.name,
          category: secret.category,
          data,
          fieldsSchema: secret.fieldsSchema,
          iconUrl: secret.iconUrl,
          sortOrder: secret.sortOrder,
          shared: secret.shared,
          canEdit: secret.canEdit,
          createdAt: secret.createdAt,
          updatedAt: secret.updatedAt,
        };
      } catch {
        return {
          id: secret.id,
          name: secret.name,
          category: secret.category,
          data: null,
          fieldsSchema: secret.fieldsSchema,
          iconUrl: secret.iconUrl,
          sortOrder: secret.sortOrder,
          shared: secret.shared,
          canEdit: secret.canEdit,
          createdAt: secret.createdAt,
          updatedAt: secret.updatedAt,
        };
      }
    })
  );

  return c.json(result);
});

secrets.get("/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");

  const secret = await db.query.secrets.findFirst({
    where: eq(schema.secrets.id, id),
  });

  if (!secret) throw new HTTPException(404, { message: "Secret not found" });

  if (secret.userId !== auth.userId) {
    const share = await db.query.secretShares.findFirst({
      where: and(
        eq(schema.secretShares.secretId, id),
        eq(schema.secretShares.sharedWithUserId, auth.userId)
      ),
    });
    if (!share) throw new HTTPException(403, { message: "Forbidden" });
  }

  const data = JSON.parse(await decrypt(secret.encryptedData, secret.encryptionNonce));

  return c.json({
    id: secret.id,
    name: secret.name,
    category: secret.category,
    data,
    fieldsSchema: secret.fieldsSchema,
    iconUrl: secret.iconUrl,
    sortOrder: secret.sortOrder,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt,
  });
});

secrets.post("/", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();
  const parsed = CreateSecretSchema.parse(body);

  const plaintext = JSON.stringify(parsed.data);
  const { ciphertext, nonce } = await encrypt(plaintext);

  const fieldsSchema = parsed.fields_schema ?? Object.keys(parsed.data).map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    type: "text" as const,
  }));

  const [secret] = await db
    .insert(schema.secrets)
    .values({
      userId: auth.userId,
      name: parsed.name,
      category: parsed.category,
      encryptedData: ciphertext,
      encryptionNonce: nonce,
      fieldsSchema,
      iconUrl: parsed.iconUrl,
    })
    .returning();

  return c.json({ id: secret.id }, 201);
});

secrets.put("/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = UpdateSecretSchema.parse(body);

  const secret = await db.query.secrets.findFirst({
    where: eq(schema.secrets.id, id),
  });

  if (!secret) throw new HTTPException(404, { message: "Secret not found" });
  if (secret.userId !== auth.userId) throw new HTTPException(403, { message: "Forbidden" });

  const update: any = { updatedAt: new Date() };
  if (parsed.name) update.name = parsed.name;
  if (parsed.category) update.category = parsed.category;
  if (parsed.fields_schema) update.fieldsSchema = parsed.fields_schema;
  if (parsed.iconUrl !== undefined) update.iconUrl = parsed.iconUrl;

  await db.update(schema.secrets).set(update).where(eq(schema.secrets.id, id));
  return c.json({ ok: true });
});

secrets.put("/:id/data", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = UpdateSecretDataSchema.parse(body);

  const secret = await db.query.secrets.findFirst({
    where: eq(schema.secrets.id, id),
  });

  if (!secret) throw new HTTPException(404, { message: "Secret not found" });
  if (secret.userId !== auth.userId) throw new HTTPException(403, { message: "Forbidden" });

  const plaintext = JSON.stringify(parsed.data);
  const { ciphertext, nonce } = await encrypt(plaintext);

  await db
    .update(schema.secrets)
    .set({ encryptedData: ciphertext, encryptionNonce: nonce, updatedAt: new Date() })
    .where(eq(schema.secrets.id, id));

  return c.json({ ok: true });
});

secrets.delete("/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");

  const secret = await db.query.secrets.findFirst({
    where: eq(schema.secrets.id, id),
  });

  if (!secret) throw new HTTPException(404, { message: "Secret not found" });
  if (secret.userId !== auth.userId) throw new HTTPException(403, { message: "Forbidden" });

  await db.delete(schema.secrets).where(eq(schema.secrets.id, id));
  return c.json({ ok: true });
});

secrets.post("/import", requireScope("secrets:write"), async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json();
  const parsed = CreateSecretSchema.array().parse(body);

  const results = await Promise.all(
    parsed.map(async (item) => {
      try {
        const plaintext = JSON.stringify(item.data);
        const { ciphertext, nonce } = await encrypt(plaintext);

        const fieldsSchema = item.fields_schema ?? Object.keys(item.data).map((key) => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          type: "text" as const,
        }));

        const [secret] = await db
          .insert(schema.secrets)
          .values({
            userId: auth.userId,
            name: item.name,
            category: item.category,
            encryptedData: ciphertext,
            encryptionNonce: nonce,
            fieldsSchema,
            iconUrl: item.iconUrl,
          })
          .returning();

        return { success: true, id: secret.id };
      } catch (e: any) {
        return { success: false, error: e.message, name: item.name };
      }
    })
  );

  return c.json({ imported: results.filter((r) => r.success).length, results });
});

secrets.get("/export/all", requireScope("vault:export"), async (c) => {
  const auth = c.get("auth");

  const own = await db.query.secrets.findMany({
    where: eq(schema.secrets.userId, auth.userId),
  });

  const exported = await Promise.all(
    own.map(async (s) => {
      const data = JSON.parse(await decrypt(s.encryptedData, s.encryptionNonce));
      return {
        name: s.name,
        category: s.category,
        data,
        fields_schema: s.fieldsSchema,
      };
    })
  );

  return c.json(exported);
});

export default secrets;
