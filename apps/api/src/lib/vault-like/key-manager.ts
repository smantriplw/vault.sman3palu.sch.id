import { db, schema } from "../../db/client";
import { eq, and, desc } from "drizzle-orm";

const ALGORITHM = "AES-GCM";
const NONCE_LENGTH = 12;

function getMasterKeyB64(): string {
  const hex = process.env.MASTER_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("MASTER_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const raw = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    raw[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return raw;
}

async function importMasterKey(): Promise<CryptoKey> {
  const raw = hexToBytes(getMasterKeyB64());
  return (crypto as any).subtle.importKey("raw", raw, ALGORITHM, false, ["encrypt", "decrypt"]);
}

export async function wrapKeyMaterial(keyMaterial: Uint8Array): Promise<{ wrapped: string; nonce: string }> {
  const key = await importMasterKey();
  const nonce = (crypto as any).getRandomValues(new Uint8Array(NONCE_LENGTH));
  const encrypted = await (crypto as any).subtle.encrypt(
    { name: ALGORITHM, iv: nonce },
    key,
    keyMaterial
  );
  return {
    wrapped: Buffer.from(encrypted).toString("base64"),
    nonce: Buffer.from(nonce).toString("base64"),
  };
}

export async function unwrapKeyMaterial(wrappedB64: string, nonceB64: string): Promise<Uint8Array> {
  const key = await importMasterKey();
  const nonce = Buffer.from(nonceB64, "base64");
  const data = Buffer.from(wrappedB64, "base64");
  const decrypted = await (crypto as any).subtle.decrypt(
    { name: ALGORITHM, iv: nonce },
    key,
    data
  );
  return new Uint8Array(decrypted);
}

export type KeyInfo = {
  id: string;
  name: string;
  algorithm: string;
  supportsEncryption: boolean;
  supportsDecryption: boolean;
  deletionAllowed: boolean;
  autoRotatePeriod: string | null;
  versions: Array<{
    id: string;
    versionNumber: number;
    status: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

export async function createKey(
  name: string,
  algorithm = "aes256-gcm96",
  autoRotatePeriod?: string
): Promise<KeyInfo> {
  const existing = await db.query.encryptionKeys.findFirst({
    where: eq(schema.encryptionKeys.name, name),
  });
  if (existing) throw new Error(`Key "${name}" already exists`);

  const [key] = await db
    .insert(schema.encryptionKeys)
    .values({ name, algorithm, autoRotatePeriod: autoRotatePeriod || null })
    .returning();

  const keyMaterial = (crypto as any).getRandomValues(new Uint8Array(32));
  const { wrapped, nonce } = await wrapKeyMaterial(keyMaterial);

  await db.insert(schema.encryptionKeyVersions).values({
    keyId: key.id,
    versionNumber: 1,
    encryptedKeyMaterial: wrapped,
    nonce,
    status: "active",
  });

  return getKeyInfo(key.id);
}

export async function getKey(name: string): Promise<KeyInfo | null> {
  const key = await db.query.encryptionKeys.findFirst({
    where: eq(schema.encryptionKeys.name, name),
    with: {
      versions: {
        orderBy: desc(schema.encryptionKeyVersions.versionNumber),
      },
    },
  });
  if (!key) return null;
  return mapKeyInfo(key);
}

export async function listKeys(): Promise<KeyInfo[]> {
  const keys = await db.query.encryptionKeys.findMany({
    with: {
      versions: {
        orderBy: desc(schema.encryptionKeyVersions.versionNumber),
      },
    },
    orderBy: desc(schema.encryptionKeys.createdAt),
  });
  return keys.map(mapKeyInfo);
}

export async function rotateKey(name: string): Promise<KeyInfo> {
  const key = await db.query.encryptionKeys.findFirst({
    where: eq(schema.encryptionKeys.name, name),
  });
  if (!key) throw new Error(`Key "${name}" not found`);

  const [latestVersion] = await db
    .select({ versionNumber: schema.encryptionKeyVersions.versionNumber })
    .from(schema.encryptionKeyVersions)
    .where(eq(schema.encryptionKeyVersions.keyId, key.id))
    .orderBy(desc(schema.encryptionKeyVersions.versionNumber))
    .limit(1);

  const newVersion = (latestVersion?.versionNumber || 0) + 1;

  const keyMaterial = (crypto as any).getRandomValues(new Uint8Array(32));
  const { wrapped, nonce } = await wrapKeyMaterial(keyMaterial);

  await db.insert(schema.encryptionKeyVersions).values({
    keyId: key.id,
    versionNumber: newVersion,
    encryptedKeyMaterial: wrapped,
    nonce,
    status: "active",
  });

  await db
    .update(schema.encryptionKeys)
    .set({ updatedAt: new Date() })
    .where(eq(schema.encryptionKeys.id, key.id));

  return getKeyInfo(key.id);
}

export async function deleteKey(name: string): Promise<void> {
  const key = await db.query.encryptionKeys.findFirst({
    where: eq(schema.encryptionKeys.name, name),
  });
  if (!key) throw new Error(`Key "${name}" not found`);
  if (!key.deletionAllowed) throw new Error(`Key "${name}" does not allow deletion`);

  await db
    .delete(schema.encryptionKeys)
    .where(eq(schema.encryptionKeys.id, key.id));
}

export async function getKeyMaterialForKeyVersion(
  keyName: string,
  version: number
): Promise<{ keyMaterial: Uint8Array; algorithm: string }> {
  const key = await db.query.encryptionKeys.findFirst({
    where: eq(schema.encryptionKeys.name, keyName),
  });
  if (!key) throw new Error(`Key "${keyName}" not found`);

  const [kv] = await db
    .select()
    .from(schema.encryptionKeyVersions)
    .where(and(
      eq(schema.encryptionKeyVersions.keyId, key.id),
      eq(schema.encryptionKeyVersions.versionNumber, version),
    ))
    .limit(1);

  if (!kv) throw new Error(`Version ${version} of key "${keyName}" not found`);

  const keyMaterial = await unwrapKeyMaterial(kv.encryptedKeyMaterial, kv.nonce);
  return { keyMaterial, algorithm: key.algorithm };
}

export async function getLatestActiveKeyMaterial(
  keyName: string
): Promise<{ keyMaterial: Uint8Array; version: number; algorithm: string }> {
  const key = await db.query.encryptionKeys.findFirst({
    where: eq(schema.encryptionKeys.name, keyName),
  });
  if (!key) throw new Error(`Key "${keyName}" not found`);

  const [latest] = await db
    .select()
    .from(schema.encryptionKeyVersions)
    .where(and(
      eq(schema.encryptionKeyVersions.keyId, key.id),
      eq(schema.encryptionKeyVersions.status, "active"),
    ))
    .orderBy(desc(schema.encryptionKeyVersions.versionNumber))
    .limit(1);

  if (!latest) throw new Error(`No active version found for key "${keyName}"`);

  const keyMaterial = await unwrapKeyMaterial(latest.encryptedKeyMaterial, latest.nonce);
  return { keyMaterial, version: latest.versionNumber, algorithm: key.algorithm };
}

function mapKeyInfo(key: any): KeyInfo {
  return {
    id: key.id,
    name: key.name,
    algorithm: key.algorithm,
    supportsEncryption: key.supportsEncryption,
    supportsDecryption: key.supportsDecryption,
    deletionAllowed: key.deletionAllowed,
    autoRotatePeriod: key.autoRotatePeriod || null,
    versions: (key.versions || []).map((v: any) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      status: v.status,
      createdAt: v.createdAt,
    })),
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
  };
}

async function getKeyInfo(keyId: string): Promise<KeyInfo> {
  const key = await db.query.encryptionKeys.findFirst({
    where: eq(schema.encryptionKeys.id, keyId),
    with: {
      versions: {
        orderBy: desc(schema.encryptionKeyVersions.versionNumber),
      },
    },
  });
  if (!key) throw new Error("Key not found");
  return mapKeyInfo(key);
}

export function isVaultLikeConfigured(): boolean {
  return !!process.env.MASTER_ENCRYPTION_KEY;
}
