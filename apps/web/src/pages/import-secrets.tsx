import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";

export function ImportSecretsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [jsonText, setJsonText] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const items = JSON.parse(jsonText);
      const arr = Array.isArray(items) ? items : [items];
      return api.importSecrets(arr);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secrets"] });
      navigate("/secrets");
    },
  });

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Import Secrets</h1>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="card">
          <div className="card-body space-y-4">
            <div>
              <label className="label">Paste JSON (array of secrets)</label>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={10}
                className="input-field font-mono text-xs"
                placeholder='[{"name":"Staging DB","category":"database","data":{"username":"admin","password":"secret123"}}]'
                required
              />
            </div>

            {mutation.data && (
              <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
                <p className="text-sm text-brand-800 font-medium">
                  Imported {mutation.data.imported} / {mutation.data.results.length}
                </p>
                {mutation.data.results.filter((r: any) => !r.success).map((r: any, i: number) => (
                  <p key={i} className="text-xs text-red-600 mt-1">{r.name}: {r.error}</p>
                ))}
              </div>
            )}

            {mutation.isError && (
              <p className="text-red-500 text-sm">{(mutation.error as Error).message}</p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => navigate("/secrets")} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
                {mutation.isPending ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
