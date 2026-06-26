import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";
import { useState } from "react";

export function SecretsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const { data: secrets = [], isLoading } = useQuery({
    queryKey: ["secrets"],
    queryFn: api.listSecrets,
    refetchInterval: 30_000,
  });

  const categories = ["all", ...new Set(secrets.map((s) => s.category).filter(Boolean))];

  const filtered = categoryFilter === "all" ? secrets : secrets.filter((s) => s.category === categoryFilter);

  const copyValue = async (id: string, val: string) => {
    await navigator.clipboard.writeText(val);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    await api.deleteSecret(id);
    queryClient.invalidateQueries({ queryKey: ["secrets"] });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Secrets</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} credentials</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/secrets/import" className="btn-secondary text-sm">Import</Link>
            <Link to="/secrets/export" className="btn-secondary text-sm">Export</Link>
            <Link to="/secrets/new" className="btn-primary">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Secret
            </Link>
          </div>
        </div>

        {categories.length > 1 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  categoryFilter === cat
                    ? "bg-brand-100 text-brand-700"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((secret) => {
            const isRevealed = revealedIds.has(secret.id);
            return (
              <div key={secret.id} className="card hover:shadow-md transition-shadow">
                <div className="card-body">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                        {secret.category || "Uncategorized"}
                      </p>
                      <p className="text-base font-semibold text-gray-900 truncate">{secret.name}</p>
                    </div>
                    {secret.shared && (
                      <span className="badge bg-brand-50 text-brand-700 ml-2 shrink-0">shared</span>
                    )}
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {secret.fields.map((field: { key: string; value: string }, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-medium text-gray-500 w-24 truncate">{field.key}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-mono text-gray-900">
                            {isRevealed ? field.value : "••••••••"}
                          </span>
                          <button
                            onClick={() => toggleReveal(secret.id)}
                            className="text-gray-400 hover:text-gray-600 p-0.5"
                            title={isRevealed ? "Hide" : "Show"}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              {isRevealed ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              )}
                            </svg>
                          </button>
                          <button
                            onClick={() => copyValue(secret.id, field.value)}
                            className="text-gray-400 hover:text-brand-600 p-0.5"
                            title="Copy"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {secret.notes && (
                    <p className="text-xs text-gray-400 italic mb-3">{secret.notes}</p>
                  )}

                  {secret.canEdit && (
                    <div className="flex gap-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => navigate(`/secrets/${secret.id}/edit`)}
                        className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(secret.id)}
                        className="text-sm text-red-500 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full card py-12">
              <div className="text-center">
                <svg className="mx-auto w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
                <p className="text-gray-500 mb-1">No secrets found</p>
                <Link to="/secrets/new" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                  Create your first secret
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
