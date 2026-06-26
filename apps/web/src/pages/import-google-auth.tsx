import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";

export function ImportGoogleAuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"uri" | "data">("uri");
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<Array<{ name: string; issuer: string; algorithm: string; digits: number }> | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (mode === "uri") return api.importGoogleAuth({ uri: input });
      return api.importGoogleAuth({ data: input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      navigate("/");
    },
  });

  const previewData = async () => {
    try {
      let dataB64: string;
      if (mode === "data") {
        dataB64 = input;
      } else {
        const url = new URL(input);
        const d = url.searchParams.get("data");
        if (!d) throw new Error("No data parameter in URI");
        dataB64 = decodeURIComponent(d);
      }

      const res = await fetch("/api/entries/preview-google-auth", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "uri" ? { uri: input } : { data: input }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Preview failed" }));
        throw new Error(err.error || "Preview failed");
      }

      const data = await res.json();
      setPreview(data.accounts);
    } catch (e: any) {
      alert("Failed to parse: " + e.message);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Import from Google Authenticator</h1>
            <p className="text-sm text-gray-500 mt-0.5">Paste the export QR code content</p>
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-body space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => { setMode("uri"); setPreview(null); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === "uri" ? "bg-brand-100 text-brand-700" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                Migration URI
              </button>
              <button
                onClick={() => { setMode("data"); setPreview(null); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === "data" ? "bg-brand-100 text-brand-700" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                Raw Data (Base64)
              </button>
            </div>

            <div>
              <label className="label">
                {mode === "uri"
                  ? "Paste the otpauth-migration:// URI from the QR code"
                  : "Paste the base64 data parameter"}
              </label>
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); setPreview(null); }}
                rows={4}
                className="input-field font-mono text-xs"
                placeholder={
                  mode === "uri"
                    ? "otpauth-migration://offline?data=Cio...=="
                    : "CioBJghT...=="
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                {mode === "uri"
                  ? "Scan the QR code from Google Authenticator's export with any reader, then paste the full URL here"
                  : "Extract just the base64 data= parameter value"}
              </p>
            </div>

            {input && !preview && (
              <button onClick={previewData} className="btn-secondary w-full justify-center text-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Preview
              </button>
            )}

            {preview && preview.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {preview.length} account{preview.length !== 1 ? "s" : ""} detected
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {preview.map((acc, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate">
                        {acc.issuer ? `${acc.issuer} — ${acc.name}` : acc.name}
                      </span>
                      <span className="text-xs text-gray-400 font-mono shrink-0 ml-2">
                        {acc.algorithm} {acc.digits} digits
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mutation.data && (
              <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
                <p className="text-sm text-brand-800 font-medium">
                  Imported {mutation.data.imported} of {mutation.data.total} entries
                </p>
                {mutation.data.results
                  .filter((r: any) => !r.success)
                  .map((r: any, i: number) => (
                    <p key={i} className="text-xs text-red-600 mt-1">{r.name}: {r.error}</p>
                  ))}
              </div>
            )}

            {mutation.isError && (
              <p className="text-red-500 text-sm">{(mutation.error as Error).message}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => navigate("/")} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !input}
                className="btn-primary flex-1"
              >
                {mutation.isPending ? "Importing..." : `Import ${preview?.length || 0} accounts`}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-medium text-gray-900 mb-2">How to get the export data</h3>
            <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
              <li>Open Google Authenticator on your phone</li>
              <li>Tap the hamburger menu (three dots) → <strong>Transfer accounts</strong></li>
              <li>Select <strong>Export accounts</strong></li>
              <li>Authenticate with your phone's security</li>
              <li>Select the accounts you want to export</li>
              <li>Tap <strong>Export</strong> — a QR code will appear</li>
              <li>Scan the QR code with another device, or take a photo</li>
              <li>If the QR code reads as a URL like <code className="text-xs">otpauth-migration://...</code>, paste it above</li>
            </ol>
          </div>
        </div>
      </div>
    </Layout>
  );
}
