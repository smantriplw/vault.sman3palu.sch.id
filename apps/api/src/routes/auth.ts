import { Hono } from "hono";
import { createLoginUrl, handleCallback } from "../auth/zitadel";
import { getJWTSecret, signJWT } from "../auth/middleware";
import { db, schema } from "../db/client";
import { eq } from "drizzle-orm";
import { verify as jwtVerify } from "hono/jwt";
import { getCookie, setCookie } from "../lib/cookie";

const auth = new Hono();

auth.get("/login", (c) => {
  const { url, state, codeVerifier } = createLoginUrl();

  setCookie(c, "zitadel_state", state, { maxAge: 600, path: "/", httpOnly: true });
  setCookie(c, "zitadel_verifier", codeVerifier, { maxAge: 600, path: "/", httpOnly: true });

  return c.redirect(url.toString());
});

auth.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "zitadel_state");
  const codeVerifier = getCookie(c, "zitadel_verifier");

  if (!code || !state || !storedState || !codeVerifier) {
    return c.json({ error: "Missing callback params" }, 400);
  }

  try {
    const { jwt } = await handleCallback(code, state, storedState, codeVerifier);
    const secure = process.env.NODE_ENV === "production";
    setCookie(c, "session", jwt, {
      maxAge: 60 * 60 * 24,
      path: "/",
      httpOnly: true,
      secure,
    });
    return c.redirect(process.env.APP_URL || "http://localhost:5173");
  } catch (err: any) {
    return c.redirect(
      `${process.env.APP_URL || "http://localhost:5173"}/login?error=${encodeURIComponent(err.message)}`
    );
  }
});

auth.post("/logout", (c) => {
  const secure = process.env.NODE_ENV === "production";
  setCookie(c, "session", "", { maxAge: 0, path: "/", httpOnly: true, secure });
  return c.json({ ok: true });
});

auth.get("/me", async (c) => {
  const sessionCookie = getCookie(c, "session");
  if (!sessionCookie) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  try {
    const payload = (await jwtVerify(sessionCookie, getJWTSecret())) as any;

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
