import { db, schema } from "../db/client";
import { sql, and, gte } from "drizzle-orm";

export async function checkRateLimit(
  apiKeyId: string,
  limitPerMin: number
): Promise<boolean> {
  const [result] = await db.execute(
    sql`
      SELECT COUNT(*) as count
      FROM ${schema.requestLogs}
      WHERE api_key_id = ${apiKeyId}
        AND created_at > NOW() - INTERVAL '1 minute'
    `
  );
  const count = Number(result.count || 0);
  return count < limitPerMin;
}

const authAttemptCache = new Map<string, { count: number; resetAt: number }>();

export function checkAuthRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 60_000; // 1 minute
  const maxAttempts = 10;

  const entry = authAttemptCache.get(ip);

  if (!entry || now > entry.resetAt) {
    authAttemptCache.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  entry.count++;

  if (entry.count > maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: maxAttempts - entry.count };
}

// Periodic cleanup to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of authAttemptCache) {
    if (now > entry.resetAt) authAttemptCache.delete(ip);
  }
}, 60_000);
