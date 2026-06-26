import { createMiddleware } from "hono/factory";
import { db, schema } from "../db/client";

export const requestLogger = createMiddleware(async (c, next) => {
  const start = performance.now();

  await next();

  const duration = Math.round(performance.now() - start);
  const auth = c.get("auth");

  db.insert(schema.requestLogs)
    .values({
      apiKeyId: auth?.apiKeyId || null,
      userId: auth?.userId || null,
      authType: auth?.authType || "jwt",
      method: c.req.method,
      path: c.req.path,
      statusCode: c.res.status,
      ipAddress: c.req.header("X-Forwarded-For")?.split(",")[0]?.trim()
        ?? c.req.header("X-Real-IP")
        ?? null,
      userAgent: c.req.header("User-Agent") || null,
      responseTimeMs: duration,
      errorMessage: c.res.status >= 400 ? `HTTP ${c.res.status}` : null,
    })
    .catch(() => {});
});
