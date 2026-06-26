const ITERATIONS = 600_000;
const KEY_LENGTH = 256;

function base64ToBuf(b64: string): ArrayBuffer {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
}

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptExport(data: unknown, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  return JSON.stringify({
    encrypted: true,
    salt: bufToBase64(salt.buffer),
    iv: bufToBase64(iv.buffer),
    ciphertext: bufToBase64(ciphertext),
    iterations: ITERATIONS,
  });
}

export async function decryptExport(jsonStr: string, passphrase: string): Promise<unknown> {
  const pkg = JSON.parse(jsonStr);
  if (!pkg.encrypted) {
    return JSON.parse(jsonStr);
  }

  const salt = new Uint8Array(base64ToBuf(pkg.salt));
  const iv = new Uint8Array(base64ToBuf(pkg.iv));
  const ciphertext = base64ToBuf(pkg.ciphertext);
  const key = await deriveKey(passphrase, salt);

  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

export function isEncryptedExport(str: string): boolean {
  try {
    const pkg = JSON.parse(str);
    return pkg.encrypted === true;
  } catch {
    return false;
  }
}