import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";

function CreateKeyModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", algorithm: "aes256-gcm96", auto_rotate_period: "" });

  const mutation = useMutation({
    mutationFn: () =>
      api.createTransitKey({
        name: form.name,
        algorithm: form.algorithm,
        auto_rotate_period: form.auto_rotate_period || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transit-keys"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Encryption Key</h2>

        <div className="space-y-4">
          <div>
            <label className="label">Key Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="label">Algorithm</label>
            <select value={form.algorithm} onChange={(e) => setForm({ ...form, algorithm: e.target.value })} className="input-field">
              <option value="aes256-gcm96">AES-256-GCM</option>
              <option value="aes128-gcm96">AES-128-GCM</option>
              <option value="chacha20-poly1305">ChaCha20-Poly1305</option>
            </select>
          </div>
          <div>
            <label className="label">Auto-Rotate Period (optional)</label>
            <input type="text" value={form.auto_rotate_period} onChange={(e) => setForm({ ...form, auto_rotate_period: e.target.value })} placeholder="e.g. 720h" className="input-field" />
            <p className="text-xs text-gray-500 mt-1">Duration string like 720h, 168h, 8760h</p>
          </div>
        </div>

        {mutation.isError && <p className="text-red-500 text-sm mt-2">{(mutation.error as Error).message}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary flex-1">
            {mutation.isPending ? "Creating..." : "Create Key"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RotateModal({ keyName, onClose }: { keyName: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.rotateTransitKey(keyName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transit-keys"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Rotate Key "{keyName}"</h2>
        <p className="text-sm text-gray-500 mb-4">A new key version will be created. Existing ciphertext stays decryptable with its original version.</p>

        {mutation.isError && <p className="text-red-500 text-sm mb-2">{(mutation.error as Error).message}</p>}

        <div className="flex gap-3 mt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary flex-1">
            {mutation.isPending ? "Rotating..." : "Rotate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ keyName, onClose }: { keyName: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.deleteTransitKey(keyName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transit-keys"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-red-600 mb-2">Delete Key "{keyName}"?</h2>
        <p className="text-sm text-gray-500 mb-4">Data encrypted with this key will become permanently undecryptable. Enable <code className="text-xs bg-gray-100 px-1 rounded">deletion_allowed</code> first.</p>

        {mutation.isError && <p className="text-red-500 text-sm mb-2">{(mutation.error as Error).message}</p>}

        <div className="flex gap-3 mt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium text-sm flex-1">
            {mutation.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UpdateKeyModal({ keyName, currentAllowed, currentRotate, onClose }: {
  keyName: string;
  currentAllowed: boolean;
  currentRotate: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    deletion_allowed: currentAllowed,
    auto_rotate_period: currentRotate || "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.updateTransitKey(keyName, {
        deletion_allowed: form.deletion_allowed,
        auto_rotate_period: form.auto_rotate_period || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transit-keys"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Configure Key "{keyName}"</h2>

        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.deletion_allowed} onChange={(e) => setForm({ ...form, deletion_allowed: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-sm text-gray-700">Allow deletion</span>
          </label>
          <div>
            <label className="label">Auto-Rotate Period</label>
            <input type="text" value={form.auto_rotate_period} onChange={(e) => setForm({ ...form, auto_rotate_period: e.target.value })} placeholder="e.g. 720h" className="input-field" />
          </div>
        </div>

        {mutation.isError && <p className="text-red-500 text-sm mt-2">{(mutation.error as Error).message}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary flex-1">
            {mutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminKeysPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [rotateTarget, setRotateTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [configTarget, setConfigTarget] = useState<{ name: string; allowed: boolean; rotate: string | null } | null>(null);

  const { data: keys = [], isLoading, error } = useQuery({
    queryKey: ["transit-keys"],
    queryFn: api.listTransitKeys,
  });

  return (
    <Layout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Encryption Keys (Transit)</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage encryption keys and versions — like HashiCorp Vault Transit</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Key
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Transit is not enabled — set <code className="text-xs bg-amber-100 px-1 rounded">MASTER_ENCRYPTION_KEY</code> in .env
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
          </div>
        )}

        <div className="space-y-4">
          {keys.map((key: any) => (
            <div key={key.id} className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{key.name}</h3>
                      <span className="badge bg-blue-50 text-blue-700 text-xs">{key.algorithm}</span>
                      {key.auto_rotate_period && (
                        <span className="badge bg-purple-50 text-purple-700 text-xs">auto-rotate: {key.auto_rotate_period}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {key.versions?.length || 0} version(s) &middot; Encryption: {key.supportsEncryption ? "✓" : "✗"} &middot; Decryption: {key.supportsDecryption ? "✓" : "✗"}
                      {key.deletionAllowed && <span className="text-red-500 ml-2">(deletable)</span>}
                    </p>
                  </div>
                </div>

                {key.versions?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1.5">Key Versions:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {key.versions.map((v: any) => (
                        <span key={v.id} className={`badge text-xs font-mono ${
                          v.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          v{v.versionNumber} {v.status === "active" ? "(active)" : v.status}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setRotateTarget(key.name)}
                    className="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Rotate
                  </button>
                  <button
                    onClick={() => setConfigTarget({ name: key.name, allowed: key.deletionAllowed, rotate: key.auto_rotate_period })}
                    className="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Configure
                  </button>
                  <button
                    onClick={() => setDeleteTarget(key.name)}
                    className="text-xs px-3 py-1.5 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                    disabled={!key.deletionAllowed}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {keys.length === 0 && !isLoading && !error && (
            <div className="card py-12">
              <div className="text-center">
                <svg className="mx-auto w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m0 0v6m0 0a3 3 0 01-3 3m3-3H5.25m0 0a3 3 0 013-3m-3 3v6m0 0a3 3 0 003 3" />
                </svg>
                <p className="text-gray-500 mb-1">No encryption keys yet</p>
                <p className="text-sm text-gray-400">Create one to use the Transit encryption engine</p>
                <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">Create Key</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateKeyModal onClose={() => setShowCreate(false)} />}
      {rotateTarget && <RotateModal keyName={rotateTarget} onClose={() => setRotateTarget(null)} />}
      {deleteTarget && <DeleteModal keyName={deleteTarget} onClose={() => setDeleteTarget(null)} />}
      {configTarget && (
        <UpdateKeyModal
          keyName={configTarget.name}
          currentAllowed={configTarget.allowed}
          currentRotate={configTarget.rotate}
          onClose={() => setConfigTarget(null)}
        />
      )}
    </Layout>
  );
}
