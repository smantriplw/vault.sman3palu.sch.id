import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";

export function ExportSecretsPage() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["secrets-export"],
    queryFn: api.exportSecrets,
  });

  const downloadExport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smantivault-secrets-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Export Secrets</h1>

        <div className="card">
          <div className="card-body">
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
              </div>
            )}
            {error && <p className="text-red-500 text-sm">{(error as Error).message}</p>}
            {data && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{data.length} secrets ready</p>
                    <p className="text-sm text-gray-500">Export contains decrypted data</p>
                  </div>
                </div>
                <button onClick={downloadExport} className="btn-primary w-full justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download Export (JSON)
                </button>
                <p className="text-xs text-gray-400">
                  Export contains decrypted data — store securely
                </p>
              </div>
            )}
          </div>
        </div>

        <button onClick={() => navigate("/secrets")} className="btn-secondary w-full mt-4 justify-center">
          Back to Secrets
        </button>
      </div>
    </Layout>
  );
}
