import { eq, or, and } from "drizzle-orm";
import * as crypto from "crypto";

const KEY_PREFIX = "vk";

export function generateApiKey(env: string = "prod"): {
  raw: string;
  hash: string;
  prefix: string;
} {
  const random = crypto.randomBytes(36).toString("base64url");
  const raw = `${KEY_PREFIX}_${env}_${random}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}
