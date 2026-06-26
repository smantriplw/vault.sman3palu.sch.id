import type { AuthUser } from "@vault/shared";

const API = "";

async function request<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  me: () => request<{ id: string; email: string; name: string; avatarUrl: string | null; role: string }>("/api/auth/me"),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  // Entries
  listEntries: () =>
    request<
      Array<{
        id: string;
        issuer: string;
        label: string;
        code: string | null;
        algorithm: string;
        digits: number;
        period: number;
        iconUrl: string | null;
        sortOrder: number;
        shared: boolean;
        canEdit: boolean;
        createdAt: string;
        updatedAt: string;
      }>
    >("/api/entries"),

  getEntry: (id: string) => request<any>(`/api/entries/${id}`),

  createEntry: (data: {
    issuer: string;
    label: string;
    secret: string;
    algorithm?: string;
    digits?: number;
    period?: number;
    iconUrl?: string;
  }) => request<{ id: string }>("/api/entries", { method: "POST", body: JSON.stringify(data) }),

  updateEntry: (id: string, data: Record<string, any>) =>
    request<{ ok: boolean }>(`/api/entries/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteEntry: (id: string) => request<{ ok: boolean }>(`/api/entries/${id}`, { method: "DELETE" }),

  importEntries: (uris: string[]) =>
    request<{ imported: number; results: Array<{ success: boolean; id?: string; error?: string }> }>(
      "/api/entries/import",
      { method: "POST", body: JSON.stringify({ uris }) }
    ),

  importGoogleAuth: (body: { uri?: string; data?: string }) =>
    request<{
      imported: number;
      total: number;
      preview?: Array<{ name: string; issuer: string; algorithm: string; digits: number }>;
      results: Array<{ success: boolean; id?: string; error?: string; name?: string }>;
      meta: { version: number; batchSize: number; batchIndex: number; batchId: number };
    }>("/api/entries/import-google-auth", { method: "POST", body: JSON.stringify(body) }),

  exportEntries: () => request<{ uris: string[] }>("/api/entries/export/all"),

  // Shares
  listShares: (entryId: string) => request<any[]>(`/api/shares/${entryId}`),
  createShare: (entryId: string, userId: string, canEdit: boolean) =>
    request<any>(`/api/shares/${entryId}`, { method: "POST", body: JSON.stringify({ user_id: userId, can_edit: canEdit }) }),
  deleteShare: (shareId: string) =>
    request<{ ok: boolean }>(`/api/shares/${shareId}`, { method: "DELETE" }),

  // Secrets
  listSecrets: () => request<any[]>("/api/secrets"),

  getSecret: (id: string) => request<any>(`/api/secrets/${id}`),

  createSecret: (data: {
    name: string;
    category?: string;
    data: Record<string, string>;
    fields_schema?: Array<{ key: string; label: string; type: string }>;
    iconUrl?: string;
  }) => request<{ id: string }>("/api/secrets", { method: "POST", body: JSON.stringify(data) }),

  updateSecret: (id: string, data: Record<string, any>) =>
    request<{ ok: boolean }>(`/api/secrets/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  updateSecretData: (id: string, data: Record<string, string>) =>
    request<{ ok: boolean }>(`/api/secrets/${id}/data`, { method: "PUT", body: JSON.stringify({ data }) }),

  deleteSecret: (id: string) => request<{ ok: boolean }>(`/api/secrets/${id}`, { method: "DELETE" }),

  importSecrets: (items: Array<{
    name: string;
    category: string;
    data: Record<string, string>;
    fields_schema?: Array<{ key: string; label: string; type: string }>;
  }>) => request<{ imported: number; results: Array<{ success: boolean; id?: string; error?: string }> }>(
    "/api/secrets/import",
    { method: "POST", body: JSON.stringify(items) }
  ),

  exportSecrets: () => request<any[]>("/api/secrets/export/all"),

  // Secret Shares
  listSecretShares: (secretId: string) => request<any[]>(`/api/secret-shares/${secretId}`),
  createSecretShare: (secretId: string, userId: string, canEdit: boolean) =>
    request<any>(`/api/secret-shares/${secretId}`, { method: "POST", body: JSON.stringify({ user_id: userId, can_edit: canEdit }) }),
  deleteSecretShare: (shareId: string) =>
    request<{ ok: boolean }>(`/api/secret-shares/${shareId}`, { method: "DELETE" }),

  // Admin
  listServices: () => request<any[]>("/api/admin/services"),
  createService: (data: any) => request<any>("/api/admin/services", { method: "POST", body: JSON.stringify(data) }),
  rotateKey: (id: string) => request<any>(`/api/admin/services/${id}/rotate`, { method: "POST" }),
  deleteService: (id: string) => request<{ ok: boolean }>(`/api/admin/services/${id}`, { method: "DELETE" }),
  getRequestLogs: (page = 1) => request<any>(`/api/admin/requests?page=${page}`),
  getRequestStats: () => request<any>("/api/admin/requests/stats"),
};
