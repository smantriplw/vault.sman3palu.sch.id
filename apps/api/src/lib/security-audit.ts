import { db, schema } from "../db/client";

export type SecurityAction =
  | "session.refresh"
  | "session.expired"
  | "auth.brute_force_blocked"
  | "decryption.failed"
  | "secret.deleted"
  | "entry.deleted"
  | "export.downloaded"
  | "key.created"
  | "key.rotated"
  | "key.revoked"
  | "share.created"
  | "share.revoked";

export async function logSecurityEvent(
  action: SecurityAction,
  details: Record<string, unknown>,
  userId?: string
) {
  try {
    await db.insert(schema.auditLog).values({
      userId: userId || null,
      action,
      details,
    });
  } catch {
    // Fire-and-forget; never let audit logging break the request
  }
}
