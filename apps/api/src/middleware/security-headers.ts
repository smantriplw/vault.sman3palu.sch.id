import { createMiddleware } from "hono/factory";

function getEnv() {
  return process.env.ENVIRONMENT || "dev";
}

const isProd = () => getEnv() === "prod";

export const securityHeaders = createMiddleware(async (c, next) => {
  // HSTS — only in production
  if (isProd()) {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  // Prevent MIME sniffing
  c.header("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  c.header("X-Frame-Options", "DENY");

  // XSS filter (legacy, but harmless)
  c.header("X-XSS-Protection", "0");

  // Referrer policy
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy — restrict browser features
  c.header(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=(), sync-xhr=()"
  );

  // Content Security Policy
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const csp = [
    "default-src 'self'",
    `connect-src 'self' ${appUrl} https://*.zitadel.cloud`,
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  c.header("Content-Security-Policy", csp.join("; "));

  // Remove Server header leak
  c.header("Server", "");

  await next();
});
