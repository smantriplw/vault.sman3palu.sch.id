import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";
import { decryptExport, isEncryptedExport } from "@/lib/crypto-export";

const ACCEPTED_EXTENSIONS = ".json,.json.encrypted";

export function ImportSecretsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [jsonText, setJsonText] = useState("");
  const [filePassphrase, setFilePassphrase] = useState("");
  const [decrypting, setDecrypting] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "paste") {
        const items = JSON.parse(jsonText);
        const arr = Array.isArray(items) ? items : [items];
        return api.importSecrets(arr);
      }
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("No file selected");
      const text = await file.text();
      let data: any;
      if (isEncryptedExport(text)) {
        if (!filePassphrase) throw new Error("Passphrase required for encrypted file");
        setDecrypting(true);
        try {
          data = await decryptExport(text, filePassphrase);
        } finally {
          setDecrypting(false);
        }
      } else {
        data = JSON.parse(text);
      }
      const arr = Array.isArray(data) ? data : data.data ? (Array.isArray(data.data) ? data.data : [data.data]) : [data];
      return api.importSecrets(arr);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secrets"] });
      navigate("/secrets");
    },
  });

  const handleFileChange = () => {
    const file = fileRef.current?.files?.[0];
    if (file) setFilePassphrase("");
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Import Secrets</h1>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("paste")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === "paste" ? "bg-brand-100 text-brand-700" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            Paste JSON
          </button>
          <button
            onClick={() => setMode("file")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === "file" ? "bg-brand-100 text-brand-700" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            Upload File
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="card">
          <div className="card-body space-y-4">
            {mode === "paste" ? (
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
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="label">Select export file</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                    required
                  />
                </div>
                <div>
                  <label className="label">Passphrase (if encrypted)</label>
                  <input
                    type="password"
                    value={filePassphrase}
                    onChange={(e) => setFilePassphrase(e.target.value)}
                    placeholder="Leave blank if not encrypted"
                    className="input-field"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

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
              <button
                type="submit"
                disabled={mutation.isPending || decrypting || (mode === "paste" && !jsonText) || (mode === "file" && !fileRef.current?.files?.[0])}
                className="btn-primary flex-1"
              >
                {decrypting ? "Decrypting..." : mutation.isPending ? "Importing..." : mode === "paste" ? "Import" : "Import from file"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
