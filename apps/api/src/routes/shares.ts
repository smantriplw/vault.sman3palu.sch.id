import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { authMiddleware, requireScope } from "../auth/middleware";
import { CreateShareSchema } from "@vault/shared";
import { HTTPException } from "hono/http-exception";

const shares = new Hono();

shares.use("*", authMiddleware, requireScope("entries:share"));

// List shares for an entry
shares.get("/:entryId", async (c) => {
  const auth = c.get("auth");
  const entryId = c.req.param("entryId");

  const entry = await db.query.vaultEntries.findFirst({
    where: eq(schema.vaultEntries.id, entryId),
  });

  if (!entry) throw new HTTPException(404, { message: "Entry not found" });
  if (entry.userId !== auth.userId) throw new HTTPException(403, { message: "Forbidden" });

  const shareList = await db.query.shares.findMany({
    where: eq(schema.shares.entryId, entryId),
    with: {
      sharedWithUser: { columns: { id: true, email: true, name: true } },
    },
  });

  return c.json(shareList);
});

// Share entry with user
shares.post("/:entryId", async (c) => {
  const auth = c.get("auth");
  const entryId = c.req.param("entryId");
  const body = await c.req.json();
  const parsed = CreateShareSchema.parse(body);

  const entry = await db.query.vaultEntries.findFirst({
    where: eq(schema.vaultEntries.id, entryId),
  });

  if (!entry) throw new HTTPException(404, { message: "Entry not found" });
  if (entry.userId !== auth.userId) throw new HTTPException(403, { message: "Forbidden" });

  const [share] = await db
    .insert(schema.shares)
    .values({
      entryId,
      sharedWithUserId: parsed.user_id,
      canEdit: parsed.can_edit,
    })
    .onConflictDoNothing()
    .returning();

  return c.json(share, 201);
});

// Remove share
shares.delete("/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");

  const share = await db.query.shares.findFirst({
    where: eq(schema.shares.id, id),
    with: { entry: { columns: { userId: true } } },
  });

  if (!share) throw new HTTPException(404, { message: "Share not found" });
  if (share.entry.userId !== auth.userId) throw new HTTPException(403, { message: "Forbidden" });

  await db.delete(schema.shares).where(eq(schema.shares.id, id));
  return c.json({ ok: true });
});

export default shares;
