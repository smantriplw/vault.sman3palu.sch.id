import { getLatestActiveKeyMaterial, getKeyMaterialForKeyVersion, isVaultLikeConfigured } from "./key-manager";

const CIPHERTEXT_PREFIX = "smantivault";
const SEPARATOR = ":";
const ALGORITHM = "AES-GCM";
const NONCE_LENGTH = 12;

async function aesEncrypt(plaintext: string, keyMaterial: Uint8Array): Promise<{ ciphertext: string; nonce: string }> {
  const key = await (crypto as any).subtle.importKey("raw", keyMaterial, ALGORITHM, false, ["encrypt"]);
  const nonce = (crypto as any).getRandomValues(new Uint8Array(NONCE_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await (crypto as any).subtle.encrypt(
    { name: ALGORITHM, iv: nonce },
    key,
    encoded
  );
  return {
    ciphertext: Buffer.from(encrypted).toString("base64"),
    nonce: Buffer.from(nonce).toString("base64"),
  };
}

async function aesDecrypt(ciphertextB64: string, nonceB64: string, keyMaterial: Uint8Array): Promise<string> {
  const key = await (crypto as any).subtle.importKey("raw", keyMaterial, ALGORITHM, false, ["decrypt"]);
  const nonce = Buffer.from(nonceB64, "base64");
  const data = Buffer.from(ciphertextB64, "base64");
  const decrypted = await (crypto as any).subtle.decrypt(
    { name: ALGORITHM, iv: nonce },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}

export function isTransitCiphertext(ciphertext: string): boolean {
  return ciphertext.startsWith(CIPHERTEXT_PREFIX + SEPARATOR);
}

export function parseTransitCiphertext(
  ct: string
): { keyName: string; version: number; ciphertext: string; nonce: string } | null {
  if (!ct.startsWith(CIPHERTEXT_PREFIX + SEPARATOR)) return null;
  const parts = ct.split(SEPARATOR);
  if (parts.length !== 5) return null;
  return {
    keyName: parts[1],
    version: parseInt(parts[2], 10),
    ciphertext: parts[3],
    nonce: parts[4],
  };
}

function buildCiphertext(keyName: string, version: number, ciphertext: string, nonce: string): string {
  return [CIPHERTEXT_PREFIX, keyName, String(version), ciphertext, nonce].join(SEPARATOR);
}

export async function transitEncrypt(
  plaintext: string,
  keyName = "smantivault"
): Promise<{ ciphertext: string; nonce: string }> {
  const { keyMaterial, version } = await getLatestActiveKeyMaterial(keyName);
  const result = await aesEncrypt(plaintext, keyMaterial);
  const fullCiphertext = buildCiphertext(keyName, version, result.ciphertext, result.nonce);
  return { ciphertext: fullCiphertext, nonce: "" };
}

export async function transitDecrypt(fullCiphertext: string): Promise<string> {
  const parsed = parseTransitCiphertext(fullCiphertext);
  if (!parsed) throw new Error("Invalid smantivault ciphertext format");

  const { keyMaterial } = await getKeyMaterialForKeyVersion(parsed.keyName, parsed.version);
  return aesDecrypt(parsed.ciphertext, parsed.nonce, keyMaterial);
}

export { isVaultLikeConfigured };
