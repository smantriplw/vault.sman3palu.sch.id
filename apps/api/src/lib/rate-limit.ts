import { db, schema } from "../db/client";
import { sql } from "drizzle-orm";

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
