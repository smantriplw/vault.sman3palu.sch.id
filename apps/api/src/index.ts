import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { securityHeaders } from "./middleware/security-headers";
import authRoutes from "./routes/auth";
import entriesRoutes from "./routes/entries";
import secretsRoutes from "./routes/secrets";
import adminRoutes from "./routes/admin";
import sharesRoutes from "./routes/shares";
import secretSharesRoutes from "./routes/secret-shares";
import { requestLogger } from "./middleware/request-logger";

const app = new Hono();

// ISO 27002 8.15 — security headers
app.use("*", securityHeaders);
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.APP_URL || "http://localhost:5173",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use("/api/*", requestLogger);

app.route("/api/auth", authRoutes);
app.route("/api/entries", entriesRoutes);
app.route("/api/secrets", secretsRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/shares", sharesRoutes);
app.route("/api/secret-shares", secretSharesRoutes);

app.get("/health", (c) => c.json({ ok: true }));

const port = parseInt(process.env.PORT || "3000");
console.log(`Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
