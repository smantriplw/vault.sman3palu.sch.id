import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";

function CreateServiceModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    service_name: "",
    scopes: ["entries:read"] as string[],
    rate_limit: 100,
    whitelist: [{ cidr: "", description: "" }],
  });

  const mutation = useMutation({
    mutationFn: () => api.createService(form),
    onSuccess: (data) => {
      alert(
        `API Key: ${data.apiKey}\n\nCopy this now — it won't be shown again.`,
      );
      queryClient.invalidateQueries({ queryKey: ["services"] });
      onClose();
    },
  });

  const toggleScope = (scope: string) => {
    setForm((f) => ({
      ...f,
      scopes: f.scopes.includes(scope)
        ? f.scopes.filter((s) => s !== scope)
        : [...f.scopes, scope],
    }));
  };

  const addWhitelist = () =>
    setForm((f) => ({
      ...f,
      whitelist: [...f.whitelist, { cidr: "", description: "" }],
    }));
  const setWhitelist = (i: number, key: string, val: string) => {
    const w = [...form.whitelist];
    (w[i] as any)[key] = val;
    setForm({ ...form, whitelist: w });
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Create Service
        </h2>

        <div className="space-y-4">
          <div>
            <label className="label">Service Name</label>
            <input
              type="text"
              value={form.service_name}
              onChange={(e) =>
                setForm({ ...form, service_name: e.target.value })
              }
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="label mb-2">Scopes</label>
            <div className="grid grid-cols-2 gap-1">
              {[
                "entries:read",
                "entries:write",
                "entries:share",
                "secrets:read",
                "secrets:write",
                "secrets:share",
                "vault:export",
                "audit:read",
              ].map((scope) => (
                <label
                  key={scope}
                  className="flex items-center gap-2 py-1 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">{scope}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Rate Limit (req/min)</label>
            <input
              type="number"
              value={form.rate_limit}
              onChange={(e) =>
                setForm({ ...form, rate_limit: parseInt(e.target.value) })
              }
              className="input-field"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">IP Whitelist</label>
              <button
                type="button"
                onClick={addWhitelist}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                + Add
              </button>
            </div>
            {form.whitelist.map((w, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={w.cidr}
                  onChange={(e) => setWhitelist(i, "cidr", e.target.value)}
                  placeholder="10.0.0.0/24"
                  className="input-field text-sm flex-1"
                />
                <input
                  type="text"
                  value={w.description}
                  onChange={(e) =>
                    setWhitelist(i, "description", e.target.value)
                  }
                  placeholder="desc"
                  className="input-field text-sm flex-1"
                />
              </div>
            ))}
          </div>
        </div>

        {mutation.isError && (
          <p className="text-red-500 text-sm mt-2">
            {(mutation.error as Error).message}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn-primary flex-1"
          >
            {mutation.isPending ? "Creating..." : "Create Service"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceAccessPanel({
  serviceId,
  onClose,
}: {
  serviceId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"entries" | "secrets">("entries");

  const { data: access, isLoading } = useQuery({
    queryKey: ["serviceAccess", serviceId],
    queryFn: () => api.getServiceAccess(serviceId),
  });

  const { data: allEntries = [] } = useQuery<any[]>({
    queryKey: ["entries"],
    queryFn: () => api.listEntries(),
  });

  const { data: allSecrets = [] } = useQuery<any[]>({
    queryKey: ["secrets"],
    queryFn: () => api.listSecrets(),
  });

  const mutation = useMutation({
    mutationFn: (payload: { entries: string[]; secrets: string[] }) =>
      api.setServiceAccess(serviceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceAccess", serviceId] });
    },
  });

  if (isLoading || !access) {
    return (
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-600 border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  const addEntry = (entryId: string) => {
    const next = [...access.entries, entryId];
    mutation.mutate({ entries: next, secrets: access.secrets });
  };

  const removeEntry = (entryId: string) => {
    mutation.mutate({
      entries: access.entries.filter((e) => e !== entryId),
      secrets: access.secrets,
    });
  };

  const addSecret = (secretId: string) => {
    const next = [...access.secrets, secretId];
    mutation.mutate({ entries: access.entries, secrets: next });
  };

  const removeSecret = (secretId: string) => {
    mutation.mutate({
      entries: access.entries,
      secrets: access.secrets.filter((s) => s !== secretId),
    });
  };

  const entryItems = allEntries.filter((e) => access.entries.includes(e.id));
  const secretItems = allSecrets.filter((s) => access.secrets.includes(s.id));
  const availableEntries = allEntries.filter(
    (e) => !access.entries.includes(e.id),
  );
  const availableSecrets = allSecrets.filter(
    (s) => !access.secrets.includes(s.id),
  );

  const tabBtn = (tab: "entries" | "secrets", label: string) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
        activeTab === tab
          ? "border-brand-600 text-brand-600 bg-brand-50"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Restricted Access
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          {tabBtn("entries", `Entries (${entryItems.length})`)}
          {tabBtn("secrets", `Secrets (${secretItems.length})`)}
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {activeTab === "entries" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Allowed entries</p>
                {availableEntries.length > 0 && (
                  <select
                    className="input-field text-sm py-1 max-w-[200px]"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) addEntry(e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">+ Add entry</option>
                    {availableEntries.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.issuer} — {e.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {entryItems.length === 0 && (
                <p className="text-sm text-gray-400 italic">
                  No entries restricted
                </p>
              )}
              {entryItems.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {e.issuer}
                    </p>
                    <p className="text-xs text-gray-500">{e.label}</p>
                  </div>
                  <button
                    onClick={() => removeEntry(e.id)}
                    className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === "secrets" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Allowed secrets</p>
                {availableSecrets.length > 0 && (
                  <select
                    className="input-field text-sm py-1 max-w-[200px]"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) addSecret(e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">+ Add secret</option>
                    {availableSecrets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {secretItems.length === 0 && (
                <p className="text-sm text-gray-400 italic">
                  No secrets restricted
                </p>
              )}
              {secretItems.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {s.name}
                    </p>
                    <p className="text-xs text-gray-500">{s.category}</p>
                  </div>
                  <button
                    onClick={() => removeSecret(s.id)}
                    className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {mutation.isError && (
          <p className="text-red-500 text-sm mt-2">
            {(mutation.error as Error).message}
          </p>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary text-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function ServicesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [rotateKey, setRotateKey] = useState<string | null>(null);
  const [accessServiceId, setAccessServiceId] = useState<string | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: api.listServices,
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => api.rotateKey(id),
    onSuccess: (data) => {
      setRotateKey(data.apiKey);
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteService(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  return (
    <Layout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Service API Keys
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage machine-to-machine access
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            New Service
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-600 border-t-transparent" />
          </div>
        )}

        {rotateKey && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800 mb-1">
              New API Key
            </p>
            <p className="text-xs text-amber-700 mb-2">
              Copy this now — it won't be shown again. Old key expires in 1
              hour.
            </p>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-1.5 bg-amber-100 rounded text-sm font-mono text-amber-900 break-all">
                {rotateKey}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rotateKey);
                  setRotateKey(null);
                }}
                className="btn-secondary text-xs"
              >
                Copied
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {services.map((svc: any) => (
            <div
              key={svc.id}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="card-body">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">
                        {svc.serviceName}
                      </h3>
                      {svc.isActive ? (
                        <span className="badge bg-emerald-50 text-emerald-700">
                          active
                        </span>
                      ) : (
                        <span className="badge bg-red-50 text-red-700">
                          revoked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono">
                      {svc.keyPrefix}...
                      {svc.rotatedAt && (
                        <span className="text-amber-600 ml-2">(rotating)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Owner: {svc.user?.email} &middot; Rate: {svc.rateLimit}
                      /min &middot; Scopes: {svc.scopes?.join(", ")}
                    </p>
                  </div>
                </div>

                {svc.whitelists?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">IP Whitelist:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {svc.whitelists.map((w: any) => (
                        <span
                          key={w.id}
                          className="badge bg-gray-100 text-gray-700 font-mono"
                        >
                          {w.cidr}
                          {w.description ? ` (${w.description})` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => rotateMutation.mutate(svc.id)}
                    disabled={!svc.isActive}
                    className="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
                  >
                    Rotate Key
                  </button>
                  <button
                    onClick={() => setAccessServiceId(svc.id)}
                    disabled={!svc.isActive}
                    className="text-xs px-3 py-1.5 bg-white border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 font-medium"
                  >
                    Access Restriction
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Revoke this service?"))
                        deleteMutation.mutate(svc.id);
                    }}
                    disabled={!svc.isActive}
                    className="text-xs px-3 py-1.5 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 font-medium"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            </div>
          ))}

          {services.length === 0 && !isLoading && (
            <div className="card py-12">
              <div className="text-center">
                <svg
                  className="mx-auto w-12 h-12 text-gray-300 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-gray-500 mb-1">No services yet</p>
                <p className="text-sm text-gray-400">
                  Create one to allow machine-to-machine access
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateServiceModal onClose={() => setShowCreate(false)} />
      )}
      {accessServiceId && (
        <ServiceAccessPanel
          serviceId={accessServiceId}
          onClose={() => setAccessServiceId(null)}
        />
      )}
    </Layout>
  );
}
