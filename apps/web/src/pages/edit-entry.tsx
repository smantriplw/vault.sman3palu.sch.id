import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";

const CATEGORIES = [
  "general",
  "email",
  "social",
  "finance",
  "vpn",
  "server",
  "api",
  "other",
] as const;

export function EditEntryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: entry, isLoading } = useQuery({
    queryKey: ["entry", id],
    queryFn: () => api.getEntry(id!),
  });

  const [form, setForm] = useState({
    issuer: "",
    label: "",
    category: "general",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  useEffect(() => {
    if (entry) {
      setForm({
        issuer: entry.issuer,
        label: entry.label,
        category: entry.category || "general",
        algorithm: entry.algorithm,
        digits: entry.digits,
        period: entry.period,
      });
    }
  }, [entry]);

  const mutation = useMutation({
    mutationFn: () => api.updateEntry(id!, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      navigate("/");
    },
  });

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
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Edit Entry</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="card"
        >
          <div className="card-body space-y-4">
            <div>
              <label className="label">Issuer</label>
              <input
                type="text"
                value={form.issuer}
                onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">Label</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="select-field"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Algorithm</label>
                <select
                  value={form.algorithm}
                  onChange={(e) =>
                    setForm({ ...form, algorithm: e.target.value })
                  }
                  className="select-field"
                >
                  <option value="SHA1">SHA1</option>
                  <option value="SHA256">SHA256</option>
                  <option value="SHA512">SHA512</option>
                </select>
              </div>
              <div>
                <label className="label">Digits</label>
                <input
                  type="number"
                  value={form.digits}
                  onChange={(e) =>
                    setForm({ ...form, digits: parseInt(e.target.value) })
                  }
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Period</label>
                <input
                  type="number"
                  value={form.period}
                  onChange={(e) =>
                    setForm({ ...form, period: parseInt(e.target.value) })
                  }
                  className="input-field"
                />
              </div>
            </div>

            {mutation.isError && (
              <p className="text-red-500 text-sm">
                {(mutation.error as Error).message}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn-primary flex-1"
              >
                {mutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
