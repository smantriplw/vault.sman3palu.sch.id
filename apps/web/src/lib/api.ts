const API = "";

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
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
  me: () =>
    request<{
      id: string;
      email: string;
      name: string;
      avatarUrl: string | null;
      role: string;
    }>("/api/auth/me"),
  logout: () =>
    request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  // Entries
  listEntries: (params?: { category?: string }) =>
    request<
      Array<{
        id: string;
        issuer: string;
        label: string;
        code: null;
        algorithm: string;
        digits: number;
        period: number;
        category: string;
        iconUrl: string | null;
        sortOrder: number;
        shared: boolean;
        canEdit: boolean;
        createdAt: string;
        updatedAt: string;
      }>
    >(`/api/entries${params?.category ? `?category=${params.category}` : ""}`),

  getEntry: (id: string) =>
    request<{
      id: string;
      issuer: string;
      label: string;
      algorithm: string;
      category: string;
      digits: number;
      period: number;
      iconUrl: string | null;
      sortOrder: number;
      createdAt: string;
      updatedAt: string;
    }>(`/api/entries/${id}`),

  revealEntry: (id: string) =>
    request<{ code: string }>(`/api/entries/${id}/reveal`, { method: "POST" }),

  createEntry: (data: {
    issuer: string;
    label: string;
    secret: string;
    algorithm?: string;
    digits?: number;
    period?: number;
    category?: string;
    iconUrl?: string;
  }) =>
    request<{ id: string }>("/api/entries", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateEntry: (id: string, data: Record<string, any>) =>
    request<{ ok: boolean }>(`/api/entries/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteEntry: (id: string) =>
    request<{ ok: boolean }>(`/api/entries/${id}`, { method: "DELETE" }),

  importEntries: (uris: string[]) =>
    request<{
      imported: number;
      results: Array<{ success: boolean; id?: string; error?: string }>;
    }>("/api/entries/import", {
      method: "POST",
      body: JSON.stringify({ uris }),
    }),

  importGoogleAuth: (body: { uri?: string; data?: string }) =>
    request<{
      imported: number;
      total: number;
      results: Array<{
        success: boolean;
        id?: string;
        error?: string;
        name?: string;
      }>;
      meta: {
        version: number;
        batchSize: number;
        batchIndex: number;
        batchId: number;
      };
    }>("/api/entries/import-google-auth", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  exportEntries: () => request<{ uris: string[] }>("/api/entries/export/all"),

  // Shares
  listShares: (entryId: string) => request<any[]>(`/api/shares/${entryId}`),
  createShare: (entryId: string, userId: string, canEdit: boolean) =>
    request<any>(`/api/shares/${entryId}`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, can_edit: canEdit }),
    }),
  deleteShare: (shareId: string) =>
    request<{ ok: boolean }>(`/api/shares/${shareId}`, { method: "DELETE" }),

  // Secrets
  listSecrets: (params?: { category?: string }) =>
    request<
      Array<{
        id: string;
        name: string;
        category: string;
        data: null;
        fieldsSchema: Array<{
          key: string;
          label: string;
          type: string;
        }> | null;
        notes: string | null;
        iconUrl: string | null;
        sortOrder: number;
        shared: boolean;
        canEdit: boolean;
        createdAt: string;
        updatedAt: string;
      }>
    >(`/api/secrets${params?.category ? `?category=${params.category}` : ""}`),

  getSecret: (id: string) =>
    request<{
      id: string;
      name: string;
      category: string;
      data: any;
      fieldsSchema: Array<{ key: string; label: string; type: string }> | null;
      iconUrl: string | null;
      sortOrder: number;
      shared: boolean;
      canEdit: boolean;
      createdAt: string;
      updatedAt: string;
    }>(`/api/secrets/${id}`),

  revealSecret: (id: string) =>
    request<{ data: Record<string, string> }>(`/api/secrets/${id}/reveal`, {
      method: "POST",
    }),

  createSecret: (data: {
    name: string;
    category?: string;
    data: Record<string, string>;
    fields_schema?: Array<{ key: string; label: string; type: string }>;
    iconUrl?: string;
  }) =>
    request<{ id: string }>("/api/secrets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateSecret: (id: string, data: Record<string, any>) =>
    request<{ ok: boolean }>(`/api/secrets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateSecretData: (id: string, data: Record<string, string>) =>
    request<{ ok: boolean }>(`/api/secrets/${id}/data`, {
      method: "PUT",
      body: JSON.stringify({ data }),
    }),

  deleteSecret: (id: string) =>
    request<{ ok: boolean }>(`/api/secrets/${id}`, { method: "DELETE" }),

  importSecrets: (
    items: Array<{
      name: string;
      category: string;
      data: Record<string, string>;
      fields_schema?: Array<{ key: string; label: string; type: string }>;
    }>,
  ) =>
    request<{
      imported: number;
      results: Array<{ success: boolean; id?: string; error?: string }>;
    }>("/api/secrets/import", { method: "POST", body: JSON.stringify(items) }),

  exportSecrets: () => request<any[]>("/api/secrets/export/all"),

  // Secret Shares
  listSecretShares: (secretId: string) =>
    request<any[]>(`/api/secret-shares/${secretId}`),
  createSecretShare: (secretId: string, userId: string, canEdit: boolean) =>
    request<any>(`/api/secret-shares/${secretId}`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, can_edit: canEdit }),
    }),
  deleteSecretShare: (shareId: string) =>
    request<{ ok: boolean }>(`/api/secret-shares/${shareId}`, {
      method: "DELETE",
    }),

  // Admin
  listServices: () => request<any[]>("/api/admin/services"),
  createService: (data: any) =>
    request<any>("/api/admin/services", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  rotateKey: (id: string) =>
    request<any>(`/api/admin/services/${id}/rotate`, { method: "POST" }),
  deleteService: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/services/${id}`, { method: "DELETE" }),
  getRequestLogs: (
    params: {
      page?: number;
      limit?: number;
      ip?: string;
      path?: string;
      method?: string;
      status_min?: number;
      status_max?: number;
      start_date?: string;
      end_date?: string;
      min_duration?: number;
      max_duration?: number;
    } = {},
  ) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) q.set(k, String(v));
    });
    return request<{ logs: any[]; total: number; page: number; limit: number }>(
      `/api/admin/requests?${q.toString()}`,
    );
  },
  getRequestStats: () => request<any>("/api/admin/requests/stats"),
  listUsers: () =>
    request<
      Array<{
        id: string;
        email: string;
        name: string;
        role: string;
        isSuspended: boolean;
        createdAt: string;
        avatarUrl: string | null;
      }>
    >("/api/admin/users"),
  updateUserRole: (id: string, role: string) =>
    request<{ ok: boolean }>(`/api/admin/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),
  suspendUser: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/users/${id}/suspend`, {
      method: "POST",
    }),
  unsuspendUser: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/users/${id}/unsuspend`, {
      method: "POST",
    }),
  deleteUser: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/users/${id}`, { method: "DELETE" }),

  // Service access restriction
  getServiceAccess: (id: string) =>
    request<{ entries: string[]; secrets: string[] }>(
      `/api/admin/services/${id}/access`,
    ),
  setServiceAccess: (
    id: string,
    data: { entries?: string[]; secrets?: string[] },
  ) =>
    request<{ ok: boolean }>(`/api/admin/services/${id}/access`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Visibility management
  getEntryVisibility: (entryId: string) =>
    request<
      Array<{
        id: string;
        user: { id: string; email: string; name: string };
        canEdit: boolean;
      }>
    >(`/api/admin/visibility/entries/${entryId}`),
  grantEntryAccess: (entryId: string, userId: string, canEdit?: boolean) =>
    request<any>(`/api/admin/visibility/entries/${entryId}`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, can_edit: canEdit ?? false }),
    }),
  revokeEntryAccess: (entryId: string, userId: string) =>
    request<{ ok: boolean }>(
      `/api/admin/visibility/entries/${entryId}/${userId}`,
      { method: "DELETE" },
    ),

  getSecretVisibility: (secretId: string) =>
    request<
      Array<{
        id: string;
        user: { id: string; email: string; name: string };
        canEdit: boolean;
      }>
    >(`/api/admin/visibility/secrets/${secretId}`),
  grantSecretAccess: (secretId: string, userId: string, canEdit?: boolean) =>
    request<any>(`/api/admin/visibility/secrets/${secretId}`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, can_edit: canEdit ?? false }),
    }),
  revokeSecretAccess: (secretId: string, userId: string) =>
    request<{ ok: boolean }>(
      `/api/admin/visibility/secrets/${secretId}/${userId}`,
      { method: "DELETE" },
    ),

  // Transit (Vault-like encryption keys)
  listTransitKeys: () => request<any[]>("/api/vault/keys"),
  createTransitKey: (data: {
    name: string;
    algorithm?: string;
    auto_rotate_period?: string;
  }) =>
    request<any>("/api/vault/keys", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getTransitKey: (name: string) => request<any>(`/api/vault/keys/${name}`),
  rotateTransitKey: (name: string) =>
    request<any>(`/api/vault/keys/${name}/rotate`, { method: "POST" }),
  updateTransitKey: (
    name: string,
    data: { deletion_allowed?: boolean; auto_rotate_period?: string | null },
  ) =>
    request<any>(`/api/vault/keys/${name}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteTransitKey: (name: string) =>
    request<{ ok: boolean }>(`/api/vault/keys/${name}`, { method: "DELETE" }),
};
