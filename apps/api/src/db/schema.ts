import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  inet,
  cidr,
  pgEnum,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const authTypeEnum = pgEnum("auth_type", ["api_key", "jwt"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  zitadelId: varchar("zitadel_id", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const vaultEntries = pgTable("vault_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  issuer: varchar("issuer", { length: 255 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  encryptedSecret: text("encrypted_secret").notNull(),
  encryptionNonce: text("encryption_nonce").notNull(),
  algorithm: varchar("algorithm", { length: 10 }).default("SHA1").notNull(),
  digits: integer("digits").default(6).notNull(),
  period: integer("period").default(30).notNull(),
  category: varchar("category", { length: 50 }).default("general").notNull(),
  iconUrl: text("icon_url"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceName: varchar("service_name", { length: 255 }).notNull(),
    keyHash: varchar("key_hash", { length: 255 }).notNull(),
    keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scopes: text("scopes").array().notNull().default([]),
    rateLimit: integer("rate_limit").default(100).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
    gracePeriodSeconds: integer("grace_period_seconds").default(3600).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => ({
    userIdx: index("api_keys_user_idx").on(table.userId),
    keyHashIdx: index("api_keys_key_hash_idx").on(table.keyHash),
  }),
);

export const apiKeyWhitelists = pgTable(
  "api_key_whitelists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    cidr: cidr("cidr").notNull(),
    description: varchar("description", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    apiKeyIdx: index("api_key_whitelists_key_idx").on(table.apiKeyId),
  }),
);

export const apiKeyEntryAccess = pgTable(
  "api_key_entry_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => vaultEntries.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    apiKeyEntryUnique: index("akea_key_entry_idx").on(
      table.apiKeyId,
      table.entryId,
    ),
  }),
);

export const shares = pgTable(
  "shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => vaultEntries.id, { onDelete: "cascade" }),
    sharedWithUserId: uuid("shared_with_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    canEdit: boolean("can_edit").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    entryUserUnique: index("shares_entry_user_idx").on(
      table.entryId,
      table.sharedWithUserId,
    ),
  }),
);

export const requestLogs = pgTable(
  "request_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    authType: authTypeEnum("auth_type").notNull(),
    method: varchar("method", { length: 10 }).notNull(),
    path: varchar("path", { length: 512 }).notNull(),
    statusCode: integer("status_code"),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    responseTimeMs: integer("response_time_ms"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    createdAtIdx: index("request_logs_created_idx").on(table.createdAt),
    apiKeyIdx: index("request_logs_api_key_idx").on(table.apiKeyId),
    userIdx: index("request_logs_user_idx").on(table.userId),
  }),
);

export const secrets = pgTable(
  "secrets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 50 }).default("general").notNull(),
    encryptedData: text("encrypted_data").notNull(),
    encryptionNonce: text("encryption_nonce").notNull(),
    fieldsSchema: jsonb("fields_schema")
      .$type<Array<{ key: string; label: string; type: string }>>()
      .default([
        { key: "username", label: "Username", type: "text" },
        { key: "password", label: "Password", type: "password" },
      ])
      .notNull(),
    iconUrl: text("icon_url"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("secrets_user_idx").on(table.userId),
    categoryIdx: index("secrets_category_idx").on(table.category),
  }),
);

export const secretShares = pgTable(
  "secret_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    secretId: uuid("secret_id")
      .notNull()
      .references(() => secrets.id, { onDelete: "cascade" }),
    sharedWithUserId: uuid("shared_with_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    canEdit: boolean("can_edit").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    secretUserUnique: index("secret_shares_secret_user_idx").on(
      table.secretId,
      table.sharedWithUserId,
    ),
  }),
);

export const apiKeySecretAccess = pgTable(
  "api_key_secret_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    secretId: uuid("secret_id")
      .notNull()
      .references(() => secrets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    apiKeySecretUnique: index("aksa_key_secret_idx").on(
      table.apiKeyId,
      table.secretId,
    ),
  }),
);

export const encryptionKeys = pgTable(
  "encryption_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).unique().notNull(),
    algorithm: varchar("algorithm", { length: 50 })
      .default("aes256-gcm96")
      .notNull(),
    supportsEncryption: boolean("supports_encryption").default(true).notNull(),
    supportsDecryption: boolean("supports_decryption").default(true).notNull(),
    deletionAllowed: boolean("deletion_allowed").default(false).notNull(),
    autoRotatePeriod: text("auto_rotate_period"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    nameIdx: index("encryption_keys_name_idx").on(table.name),
  }),
);

export const encryptionKeyVersions = pgTable(
  "encryption_key_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keyId: uuid("key_id")
      .notNull()
      .references(() => encryptionKeys.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    encryptedKeyMaterial: text("encrypted_key_material").notNull(),
    nonce: text("nonce").notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    keyVersionUnique: index("ekv_key_version_idx").on(
      table.keyId,
      table.versionNumber,
    ),
  }),
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 50 }).notNull(),
    details: jsonb("details"),
    ipAddress: inet("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    createdAtIdx: index("audit_log_created_idx").on(table.createdAt),
    userIdx: index("audit_log_user_idx").on(table.userId),
  }),
);
