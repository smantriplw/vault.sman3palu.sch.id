const ALGORITHM = "AES-GCM";
const NONCE_LENGTH = 12;

function getKey(): Promise<any> {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  const raw = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    raw[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return (crypto as any).subtle.importKey("raw", raw, ALGORITHM, false, ["encrypt", "decrypt"]);
}

export async function encrypt(plaintext: string): Promise<{ ciphertext: string; nonce: string }> {
  const key = await getKey();
  const nonce = (crypto as any).getRandomValues(new Uint8Array(NONCE_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await (crypto as any).subtle.encrypt(
    { name: ALGORITHM, iv: nonce },
    key,
    encoded
  );
  const buf = Buffer.from(encrypted);
  return {
    ciphertext: buf.toString("base64"),
    nonce: Buffer.from(nonce).toString("base64"),
  };
}

export async function decrypt(ciphertext: string, nonceB64: string): Promise<string> {
  const key = await getKey();
  const nonce = Buffer.from(nonceB64, "base64");
  const data = Buffer.from(ciphertext, "base64");
  const decrypted = await (crypto as any).subtle.decrypt(
    { name: ALGORITHM, iv: nonce },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}

export async function secureWipe(): Promise<void> {
  const junk = (crypto as any).getRandomValues(new Uint8Array(4096));
  for (let i = 0; i < junk.length; i++) junk[i] = 0;
}
