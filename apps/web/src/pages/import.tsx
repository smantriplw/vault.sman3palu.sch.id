import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";

export function ImportPage() {
  const navigate = useNavigate();
  const [urisText, setUrisText] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const uris = urisText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("otpauth://"));
      return api.importEntries(uris);
    },
    onSuccess: () => navigate("/"),
  });

  const uriCount = urisText.split("\n").filter((l) => l.trim().startsWith("otpauth://")).length;

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Import TOTP Entries</h1>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="card">
          <div className="card-body space-y-4">
            <div>
              <label className="label">Paste otpauth:// URIs (one per line)</label>
              <textarea
                value={urisText}
                onChange={(e) => setUrisText(e.target.value)}
                rows={8}
                className="input-field font-mono text-xs"
                placeholder="otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example"
                required
              />
              <p className="text-xs text-gray-500 mt-1">{uriCount} valid URI(s) detected</p>
            </div>

            {mutation.data && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 font-medium mb-1">
                  Imported {mutation.data.imported} of {mutation.data.results.length} entries
                </p>
                {mutation.data.results
                  .filter((r: any) => !r.success)
                  .map((r: any, i: number) => (
                    <p key={i} className="text-xs text-red-600">{r.error}</p>
                  ))}
              </div>
            )}

            {mutation.isError && (
              <p className="text-red-500 text-sm">{(mutation.error as Error).message}</p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => navigate("/")} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending || uriCount === 0}
                className="btn-primary flex-1"
              >
                {mutation.isPending ? "Importing..." : `Import ${uriCount} entries`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
