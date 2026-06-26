import { z } from "zod";

export const UserRole = z.enum(["user", "admin"]);
export type UserRole = z.infer<typeof UserRole>;

export const Scope = z.enum([
  "entries:read",
  "entries:write",
  "entries:share",
  "secrets:read",
  "secrets:write",
  "secrets:share",
  "vault:export",
  "audit:read",
]);
export type Scope = z.infer<typeof Scope>;

export const TOTPAlgorithm = z.enum(["SHA1", "SHA256", "SHA512"]);
export type TOTPAlgorithm = z.infer<typeof TOTPAlgorithm>;

export const AuthType = z.enum(["api_key", "jwt"]);
export type AuthType = z.infer<typeof AuthType>;

export const EntryCategory = z.enum([
  "general",
  "email",
  "social",
  "finance",
  "vpn",
  "server",
  "api",
  "other",
]);
export type EntryCategory = z.infer<typeof EntryCategory>;

export const SecretCategory = z.enum([
  "general",
  "email",
  "database",
  "api_key",
  "ssh",
  "social",
  "finance",
  "server",
]);
export type SecretCategory = z.infer<typeof SecretCategory>;

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
});

export const CreateEntrySchema = z.object({
  issuer: z.string().min(1).max(255),
  label: z.string().min(1).max(255),
  secret: z.string().min(1),
  algorithm: TOTPAlgorithm.default("SHA1"),
  digits: z.number().int().min(4).max(10).default(6),
  period: z.number().int().min(10).max(120).default(30),
  category: EntryCategory.default("general"),
  iconUrl: z.string().url().optional(),
});

export const UpdateEntrySchema = CreateEntrySchema.partial().omit({
  secret: true,
});

export const ImportEntriesSchema = z.object({
  uris: z
    .array(z.string().regex(/^otpauth:\/\/totp\//))
    .min(1)
    .max(50),
});

export const CreateApiKeySchema = z.object({
  service_name: z.string().min(1).max(255),
  scopes: z.array(Scope).min(1),
  rate_limit: z.number().int().min(1).max(10000).default(100),
  expires_at: z.string().datetime().optional(),
  whitelist: z
    .array(
      z.object({
        cidr: z.string(),
        description: z.string().max(255).optional(),
      }),
    )
    .optional(),
});

export const CreateShareSchema = z.object({
  user_id: z.string().uuid(),
  can_edit: z.boolean().default(false),
});

export const AuthUserSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  name: z.string(),
  picture: z.string().url().optional(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

export const FieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "password", "email", "url", "textarea", "note"]),
});

export const CreateSecretSchema = z.object({
  name: z.string().min(1).max(255),
  category: SecretCategory.default("general"),
  data: z.record(z.string()),
  fields_schema: z.array(FieldSchema).optional(),
  iconUrl: z.string().url().optional(),
});

export const UpdateSecretSchema = CreateSecretSchema.partial().omit({
  data: true,
});

export const UpdateSecretDataSchema = z.object({
  data: z.record(z.string()),
});
