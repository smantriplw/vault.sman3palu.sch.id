import * as OTPAuth from "otpauth";

export type TOTPConfig = {
  secret: string;
  algorithm?: "SHA1" | "SHA256" | "SHA512";
  digits?: number;
  period?: number;
  issuer?: string;
  label?: string;
};

export function generateTOTP(config: TOTPConfig): string {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(normalizeSecret(config.secret)),
    algorithm: config.algorithm ?? "SHA1",
    digits: config.digits ?? 6,
    period: config.period ?? 30,
    issuer: config.issuer,
    label: config.label,
  });
  return totp.generate();
}

export function parseOTPURI(uri: string): TOTPConfig {
  const totp = OTPAuth.URI.parse(uri) as OTPAuth.TOTP;
  return {
    secret: totp.secret.base32,
    algorithm: totp.algorithm as TOTPConfig["algorithm"],
    digits: totp.digits,
    period: totp.period,
    issuer: totp.issuer,
    label: totp.label,
  };
}

export function buildOTPURI(config: TOTPConfig): string {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(normalizeSecret(config.secret)),
    algorithm: config.algorithm ?? "SHA1",
    digits: config.digits ?? 6,
    period: config.period ?? 30,
    issuer: config.issuer,
    label: config.label,
  });
  return totp.toString();
}

function normalizeSecret(secret: string): string {
  return secret.replace(/\s/g, "").toUpperCase();
}
