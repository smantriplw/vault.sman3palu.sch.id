import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";
import { encryptExport } from "@/lib/crypto-export";

export function ExportSecretsPage() {
  const navigate = useNavigate();
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [encrypting, setEncrypting] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["secrets-export"],
    queryFn: api.exportSecrets,
  });

  const downloadExport = async () => {
    if (!data) return;
    if (passphrase && passphrase !== confirm) {
      alert("Passphrases do not match");
      return;
    }

    setEncrypting(true);
    try {
      let content: string;
      let filename: string;
      const date = new Date().toISOString().split("T")[0];

      if (passphrase) {
        content = await encryptExport(data, passphrase);
        filename = `smantivault-secrets-export-${date}.json.encrypted`;
      } else {
        content = JSON.stringify(data, null, 2);
        filename = `smantivault-secrets-export-${date}.json`;
      }

      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setEncrypting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Export Secrets</h1>

        <div className="card">
          <div className="card-body">
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-600 border-t-transparent" />
              </div>
            )}
            {error && <p className="text-red-500 text-sm">{(error as Error).message}</p>}
            {data && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{data.length} secrets ready</p>
                    <p className="text-sm text-gray-500">Export contains decrypted data</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-medium text-gray-500">Optional: Encrypt with passphrase</p>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Encryption passphrase"
                    className="input-field"
                    autoComplete="new-password"
                  />
                  {passphrase && (
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Confirm passphrase"
                      className={`input-field ${confirm && passphrase !== confirm ? "border-red-300 focus:ring-red-500" : ""}`}
                      autoComplete="new-password"
                    />
                  )}
                  {confirm && passphrase !== confirm && (
                    <p className="text-xs text-red-500">Passphrases do not match</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {passphrase
                      ? "File will be encrypted with AES-256-GCM. You'll need this passphrase to decrypt it later."
                      : "Without encryption, the export file will contain raw decrypted data."}
                  </p>
                </div>

                <button
                  onClick={downloadExport}
                  disabled={encrypting}
                  className="btn-primary w-full justify-center"
                >
                  {encrypting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Encrypting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      {passphrase ? "Encrypt & Download" : "Download Export (JSON)"}
                    </>
                  )}
                </button>
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
