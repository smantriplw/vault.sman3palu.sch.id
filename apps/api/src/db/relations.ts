import { relations } from "drizzle-orm";
import * as t from "./schema";

export const usersRelations = relations(t.users, ({ many }) => ({
  entries: many(t.vaultEntries),
  secrets: many(t.secrets),
  apiKeys: many(t.apiKeys),
  shares: many(t.shares),
  secretShares: many(t.secretShares),
  ownedShares: many(t.shares, { relationName: "sharedWithUser" }),
  ownedSecretShares: many(t.secretShares, { relationName: "sharedWithUser" }),
  requestLogs: many(t.requestLogs),
}));

export const vaultEntriesRelations = relations(t.vaultEntries, ({ one, many }) => ({
  user: one(t.users, { fields: [t.vaultEntries.userId], references: [t.users.id] }),
  shares: many(t.shares),
}));

export const secretsRelations = relations(t.secrets, ({ one, many }) => ({
  user: one(t.users, { fields: [t.secrets.userId], references: [t.users.id] }),
  secretShares: many(t.secretShares),
}));

export const sharesRelations = relations(t.shares, ({ one }) => ({
  entry: one(t.vaultEntries, { fields: [t.shares.entryId], references: [t.vaultEntries.id] }),
  sharedWithUser: one(t.users, {
    fields: [t.shares.sharedWithUserId],
    references: [t.users.id],
    relationName: "sharedWithUser",
  }),
}));

export const secretSharesRelations = relations(t.secretShares, ({ one }) => ({
  secret: one(t.secrets, { fields: [t.secretShares.secretId], references: [t.secrets.id] }),
  sharedWithUser: one(t.users, {
    fields: [t.secretShares.sharedWithUserId],
    references: [t.users.id],
    relationName: "sharedWithUser",
  }),
}));

export const apiKeysRelations = relations(t.apiKeys, ({ one, many }) => ({
  user: one(t.users, { fields: [t.apiKeys.userId], references: [t.users.id] }),
  whitelists: many(t.apiKeyWhitelists),
  requestLogs: many(t.requestLogs),
}));

export const apiKeyWhitelistsRelations = relations(t.apiKeyWhitelists, ({ one }) => ({
  apiKey: one(t.apiKeys, { fields: [t.apiKeyWhitelists.apiKeyId], references: [t.apiKeys.id] }),
}));

export const requestLogsRelations = relations(t.requestLogs, ({ one }) => ({
  apiKey: one(t.apiKeys, { fields: [t.requestLogs.apiKeyId], references: [t.apiKeys.id] }),
  user: one(t.users, { fields: [t.requestLogs.userId], references: [t.users.id] }),
}));
