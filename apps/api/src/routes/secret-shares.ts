import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { authMiddleware, requireScope } from "../auth/middleware";
import { CreateShareSchema } from "@vault/shared";
import { HTTPException } from "hono/http-exception";

const secretShares = new Hono();

secretShares.use("*", authMiddleware, requireScope("secrets:share"));

secretShares.get("/:secretId", async (c) => {
  const auth = c.get("auth");
  const secretId = c.req.param("secretId");

  const secret = await db.query.secrets.findFirst({
    where: eq(schema.secrets.id, secretId),
  });
  if (!secret) throw new HTTPException(404, { message: "Secret not found" });
  if (secret.userId !== auth.userId) throw new HTTPException(403, { message: "Forbidden" });

  const shareList = await db.query.secretShares.findMany({
    where: eq(schema.secretShares.secretId, secretId),
    with: { sharedWithUser: { columns: { id: true, email: true, name: true } } },
  });

  return c.json(shareList);
});

secretShares.post("/:secretId", async (c) => {
  const auth = c.get("auth");
  const secretId = c.req.param("secretId");
  const body = await c.req.json();
  const parsed = CreateShareSchema.parse(body);

  const secret = await db.query.secrets.findFirst({
    where: eq(schema.secrets.id, secretId),
  });
  if (!secret) throw new HTTPException(404, { message: "Secret not found" });
  if (secret.userId !== auth.userId) throw new HTTPException(403, { message: "Forbidden" });

  const [share] = await db
    .insert(schema.secretShares)
    .values({ secretId, sharedWithUserId: parsed.user_id, canEdit: parsed.can_edit })
    .onConflictDoNothing()
    .returning();

  return c.json(share, 201);
});

secretShares.delete("/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");

  const share = await db.query.secretShares.findFirst({
    where: eq(schema.secretShares.id, id),
    with: { secret: { columns: { userId: true } } },
  });
  if (!share) throw new HTTPException(404, { message: "Share not found" });
  if (share.secret.userId !== auth.userId) throw new HTTPException(403, { message: "Forbidden" });

  await db.delete(schema.secretShares).where(eq(schema.secretShares.id, id));
  return c.json({ ok: true });
});

export default secretShares;
