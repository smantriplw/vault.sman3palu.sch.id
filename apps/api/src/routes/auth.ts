import { Hono } from "hono";
import { createLoginUrl, handleCallback } from "../auth/zitadel";
import { getJWTSecret, signJWT, signRefreshJWT } from "../auth/middleware";
import { db, schema } from "../db/client";
import { eq } from "drizzle-orm";
import { verify as jwtVerify } from "hono/jwt";
import { getCookie, setCookie } from "../lib/cookie";
import { checkAuthRateLimit } from "../lib/rate-limit";
import { logSecurityEvent } from "../lib/security-audit";

const auth = new Hono();

function getClientIp(c: any): string {
  return (
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
    c.req.header("X-Real-IP") ||
    "unknown"
  );
}

auth.get("/login", (c) => {
  const { url, state, codeVerifier } = createLoginUrl();
  const secure = process.env.ENVIRONMENT === "prod";

  setCookie(c, "zitadel_state", state, {
    maxAge: 600,
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "Lax",
  });
  setCookie(c, "zitadel_verifier", codeVerifier, {
    maxAge: 600,
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "Lax",
  });

  return c.redirect(url.toString());
});

auth.get("/callback", async (c) => {
  const ip = getClientIp(c);
  const rateCheck = checkAuthRateLimit(ip);
  if (!rateCheck.allowed) {
    await logSecurityEvent("auth.brute_force_blocked", { ip, endpoint: "callback" });
    return c.json({ error: "Too many requests. Try again later." }, 429);
  }

  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "zitadel_state");
  const codeVerifier = getCookie(c, "zitadel_verifier");

  if (!code || !state || !storedState || !codeVerifier) {
    return c.json({ error: "Missing callback params" }, 400);
  }

  try {
    const { jwt, user } = await handleCallback(code, state, storedState, codeVerifier);
    const refresh = await signRefreshJWT(user.id);
    const secure = process.env.ENVIRONMENT === "prod";

    setCookie(c, "session", jwt, {
      maxAge: 60 * 60, // 1h
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "Lax",
    });
    setCookie(c, "refresh_token", refresh, {
      maxAge: 30 * 24 * 60 * 60, // 30d
      path: "/api/auth/refresh",
      httpOnly: true,
      secure,
      sameSite: "Strict",
    });

    return c.redirect(process.env.APP_URL || "http://localhost:5173");
  } catch (err: any) {
    return c.redirect(
      `${process.env.APP_URL || "http://localhost:5173"}/login?error=${encodeURIComponent(err.message)}`
    );
  }
});

auth.post("/refresh", async (c) => {
  const ip = getClientIp(c);
  const rateCheck = checkAuthRateLimit(ip);
  if (!rateCheck.allowed) {
    return c.json({ error: "Too many requests" }, 429);
  }

  const refreshToken = getCookie(c, "refresh_token");
  if (!refreshToken) {
    return c.json({ error: "No refresh token" }, 401);
  }

  try {
    const payload = (await jwtVerify(refreshToken, getJWTSecret(), "HS256")) as any;
    if (payload.typ !== "refresh") {
      return c.json({ error: "Invalid token type" }, 401);
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, payload.sub),
      columns: { id: true },
    });

    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    const newJwt = await signJWT(user.id);
    const now = Math.floor(Date.now() / 1000);
    const secure = process.env.ENVIRONMENT === "prod";

    // Rotate refresh token (old one still valid briefly)
    const newRefresh = await signRefreshJWT(user.id);

    setCookie(c, "session", newJwt, {
      maxAge: 60 * 60,
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "Lax",
    });
    setCookie(c, "refresh_token", newRefresh, {
      maxAge: 30 * 24 * 60 * 60,
      path: "/api/auth/refresh",
      httpOnly: true,
      secure,
      sameSite: "Strict",
    });

    await logSecurityEvent("session.refresh", {}, user.id);

    return c.json({ ok: true });
  } catch {
    return c.json({ error: "Invalid refresh token" }, 401);
  }
});

auth.post("/logout", (c) => {
  const secure = process.env.ENVIRONMENT === "prod";
  setCookie(c, "session", "", { maxAge: 0, path: "/", httpOnly: true, secure, sameSite: "Lax" });
  setCookie(c, "refresh_token", "", { maxAge: 0, path: "/api/auth/refresh", httpOnly: true, secure, sameSite: "Strict" });
  return c.json({ ok: true });
});

auth.get("/me", async (c) => {
  const sessionCookie = getCookie(c, "session");
  if (!sessionCookie) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  try {
    const payload = (await jwtVerify(sessionCookie, getJWTSecret(), "HS256")) as any;

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, payload.sub),
      columns: { id: true, email: true, name: true, avatarUrl: true, role: true },
    });

    if (!user) return c.json({ error: "User not found" }, 401);
    return c.json(user);
  } catch {
    return c.json({ error: "Invalid session" }, 401);
  }
});

export default auth;
