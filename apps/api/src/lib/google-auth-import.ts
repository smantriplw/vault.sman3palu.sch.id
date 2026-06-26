const ALGORITHM_MAP: Record<number, string> = {
  0: "SHA1",
  1: "SHA1",
};

const DIGITS_MAP: Record<number, number> = {
  0: 6,
  1: 6,
  2: 8,
};

const TYPE_MAP: Record<number, string> = {
  1: "hotp",
  2: "totp",
};

function readVarint(buf: Uint8Array, offset: number): { value: number; offset: number } {
  let value = 0;
  let shift = 0;
  let pos = offset;

  while (pos < buf.length) {
    const b = buf[pos++];
    value |= (b & 0x7f) << shift;
    if (!(b & 0x80)) return { value, offset: pos };
    shift += 7;
    if (shift > 70) throw new Error("Varint too long");
  }

  throw new Error("Truncated varint");
}

function decodeFields(buf: Uint8Array): Array<{ fieldNum: number; wireType: number; value: Uint8Array | number }> {
  const fields: Array<{ fieldNum: number; wireType: number; value: Uint8Array | number }> = [];
  let pos = 0;

  while (pos < buf.length) {
    const { value: key, offset } = readVarint(buf, pos);
    pos = offset;
    const fieldNum = key >> 3;
    const wireType = key & 7;

    if (wireType === 0) {
      const { value: varintVal, offset: newOffset } = readVarint(buf, pos);
      pos = newOffset;
      fields.push({ fieldNum, wireType, value: varintVal });
    } else if (wireType === 2) {
      const { value: len, offset: newOffset } = readVarint(buf, pos);
      pos = newOffset;
      const val = buf.slice(pos, pos + len);
      pos += len;
      fields.push({ fieldNum, wireType, value: val });
    } else if (wireType === 5) {
      const val = buf.slice(pos, pos + 4);
      pos += 4;
      fields.push({ fieldNum, wireType, value: new DataView(val.buffer, val.byteOffset, 4).getUint32(0, true) });
    } else if (wireType === 1) {
      pos += 8;
      // Skip fixed64 fields (not used in this schema)
    } else {
      throw new Error(`Unsupported wire type: ${wireType}`);
    }
  }

  return fields;
}

export interface OtpAccount {
  secret: string;
  name: string;
  issuer: string;
  algorithm: string;
  digits: number;
  type: string;
  counter: number;
}

function parseOtpParameters(msg: Uint8Array): OtpAccount {
  const fields = decodeFields(msg);
  const account: OtpAccount = {
    secret: "",
    name: "",
    issuer: "",
    algorithm: "SHA1",
    digits: 6,
    type: "totp",
    counter: 0,
  };

  for (const f of fields) {
    switch (f.fieldNum) {
      case 1: {
        const raw = f.value as Uint8Array;
        account.secret = base32Encode(raw);
        break;
      }
      case 2:
        account.name = new TextDecoder().decode(f.value as Uint8Array);
        break;
      case 3:
        account.issuer = new TextDecoder().decode(f.value as Uint8Array);
        break;
      case 4:
        account.algorithm = ALGORITHM_MAP[f.value as number] || "SHA1";
        break;
      case 5:
        account.digits = DIGITS_MAP[f.value as number] || 6;
        break;
      case 6:
        account.type = TYPE_MAP[f.value as number] || "totp";
        break;
      case 7:
        account.counter = f.value as number;
        break;
    }
  }

  if (!account.secret) throw new Error("OTP entry has no secret");
  return account;
}

export interface MigrationPayload {
  otpParameters: OtpAccount[];
  version: number;
  batchSize: number;
  batchIndex: number;
  batchId: number;
}

export function decodeGoogleAuthMigration(dataBase64: string): MigrationPayload {
  // Normalize base64
  let b64 = dataBase64.replace(/\s/g, "");
  // URL-safe base64 → standard base64
  b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding
  b64 += "=".concat("").repeat((4 - (b64.length % 4)) % 4);

  const buf = new Uint8Array(Buffer.from(b64, "base64"));
  const fields = decodeFields(buf);

  const result: MigrationPayload = {
    otpParameters: [],
    version: 0,
    batchSize: 0,
    batchIndex: 0,
    batchId: 0,
  };

  for (const f of fields) {
    switch (f.fieldNum) {
      case 1:
        result.otpParameters.push(parseOtpParameters(f.value as Uint8Array));
        break;
      case 2:
        result.version = f.value as number;
        break;
      case 3:
        result.batchSize = f.value as number;
        break;
      case 4:
        result.batchIndex = f.value as number;
        break;
      case 5:
        result.batchId = f.value as number;
        break;
    }
  }

  return result;
}

export function extractDataFromMigrationURI(uri: string): string {
  const s = uri.trim();
  const dataParam = "data=";
  const idx = s.indexOf(dataParam);
  if (idx === -1) throw new Error("No data= parameter found in migration URI");
  let data = s.slice(idx + dataParam.length);
  // Strip anything after & or #
  const ampIdx = data.indexOf("&");
  const hashIdx = data.indexOf("#");
  const endIdx = ampIdx === -1 ? (hashIdx === -1 ? data.length : hashIdx) : hashIdx === -1 ? ampIdx : Math.min(ampIdx, hashIdx);
  data = data.slice(0, endIdx);
  return decodeURIComponent(data);
}

export function buildOtpauthURI(account: OtpAccount): string {
  const params = new URLSearchParams();
  params.set("secret", account.secret);
  params.set("algorithm", account.algorithm);
  params.set("digits", String(account.digits));
  if (account.issuer) params.set("issuer", account.issuer);
  if (account.type === "hotp") {
    params.set("counter", String(account.counter));
  } else {
    params.set("period", "30");
  }

  const label = account.issuer
    ? `${account.issuer}:${account.name}`
    : account.name;

  return `otpauth://${account.type}/${encodeURIComponent(label)}?${params.toString()}`;
}

// Minimal base32 encoding for raw bytes (RFC 4648)
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(data: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  return output;
}
