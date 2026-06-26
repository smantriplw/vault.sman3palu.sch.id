import {
  OAuth2Client,
  CodeChallengeMethod,
  generateCodeVerifier,
} from "arctic";
import { db, schema } from "../db/client";
import { eq } from "drizzle-orm";
import { signJWT } from "./middleware";
import { AuthUserSchema } from "@vault/shared";

function getConfig() {
  const issuer = process.env.ZITADEL_ISSUER;
  if (!issuer) throw new Error("ZITADEL_ISSUER not set");
  return {
    issuer,
    clientId: process.env.ZITADEL_CLIENT_ID!,
    redirectURI: process.env.ZITADEL_REDIRECT_URI!,
  };
}

let _client: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  if (!_client) {
    const { clientId, redirectURI } = getConfig();
    _client = new OAuth2Client(clientId, null, redirectURI);
  }
  return _client;
}

export function createLoginUrl() {
  const client = getClient();
  const { issuer } = getConfig();
  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();

  const url = client.createAuthorizationURLWithPKCE(
    `${issuer}/oauth/v2/authorize`,
    state,
    CodeChallengeMethod.S256,
    codeVerifier,
    ["openid", "profile", "email"]
  );

  return { url, state, codeVerifier };
}

export async function handleCallback(
  code: string,
  state: string,
  storedState: string,
  codeVerifier: string
) {
  if (state !== storedState) {
    throw new Error("Invalid state parameter");
  }

  const client = getClient();
  const { issuer } = getConfig();

  const tokens = await client.validateAuthorizationCode(
    `${issuer}/oauth/v2/token`,
    code,
    codeVerifier
  );

  const accessToken = tokens.accessToken();

  const res = await fetch(`${issuer}/oidc/v1/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user info: ${res.status}`);
  }

  const raw = await res.json();
  const userData = AuthUserSchema.parse(raw);

  let user = await db.query.users.findFirst({
    where: eq(schema.users.zitadelId, userData.sub),
  });

  if (!user) {
    const [created] = await db
      .insert(schema.users)
      .values({
        zitadelId: userData.sub,
        email: userData.email,
        name: userData.name,
        avatarUrl: userData.picture ?? null,
      })
      .returning();
    user = created;
  } else {
    await db
      .update(schema.users)
      .set({
        name: userData.name,
        avatarUrl: userData.picture ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));
  }

  const jwt = await signJWT(user.id);
  return { jwt, user };
}
