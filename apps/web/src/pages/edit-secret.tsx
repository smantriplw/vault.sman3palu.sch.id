import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";

const CATEGORIES = [
  "general", "email", "database", "api_key", "ssh", "social", "finance", "server",
];

const FIELD_TYPES = ["text", "password", "email", "url", "textarea", "note"] as const;

export function EditSecretPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: secret, isLoading } = useQuery({
    queryKey: ["secret", id],
    queryFn: () => api.getSecret(id!),
  });

  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [fields, setFields] = useState<Array<{ key: string; label: string; type: string; value: string }>>([]);

  useEffect(() => {
    if (secret) {
      setName(secret.name);
      setCategory(secret.category);
      const schema = secret.fieldsSchema || [];
      setFields(
        schema.map((f: any) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          value: secret.data?.[f.key] || "",
        }))
      );
    }
  }, [secret]);

  const addField = () => {
    const idx = fields.length + 1;
    setFields([...fields, { key: `field${idx}`, label: `Field ${idx}`, type: "text", value: "" }]);
  };

  const removeField = (i: number) => {
    if (fields.length <= 1) return;
    setFields(fields.filter((_, idx) => idx !== i));
  };

  const updateField = (i: number, key: string, val: string) => {
    const copy = [...fields];
    (copy[i] as any)[key] = val;
    if (key === "label") {
      copy[i].key = val.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    }
    setFields(copy);
  };

  const saveAll = async () => {
    const data: Record<string, string> = {};
    fields.forEach((f) => { data[f.key] = f.value; });
    const fieldsSchema = fields.map((f) => ({ key: f.key, label: f.label, type: f.type }));

    try {
      await api.updateSecret(id!, { name, category, fields_schema: fieldsSchema });
      await api.updateSecretData(id!, data);
      queryClient.invalidateQueries({ queryKey: ["secrets"] });
      navigate("/secrets");
    } catch (e) {
      // error shown below
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Edit Secret</h1>
        <form onSubmit={(e) => { e.preventDefault(); saveAll(); }} className="card">
          <div className="card-body space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div className="w-40">
                <label className="label">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="select-field"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Fields</label>
                <button type="button" onClick={addField} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  + Add field
                </button>
              </div>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="w-32 shrink-0">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(i, "label", e.target.value)}
                        placeholder="Label"
                        className="input-field text-sm"
                      />
                    </div>
                    <div className="w-28 shrink-0">
                      <select
                        value={field.type}
                        onChange={(e) => updateField(i, "type", e.target.value)}
                        className="select-field text-sm"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      {field.type === "textarea" || field.type === "note" ? (
                        <textarea
                          value={field.value}
                          onChange={(e) => updateField(i, "value", e.target.value)}
                          rows={2}
                          className="input-field font-mono text-sm"
                        />
                      ) : (
                        <input
                          type={field.type === "password" ? "password" : "text"}
                          value={field.value}
                          onChange={(e) => updateField(i, "value", e.target.value)}
                          className="input-field font-mono text-sm"
                        />
                      )}
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeField(i)}
                        className="text-red-500 hover:text-red-700 shrink-0 text-lg font-medium px-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-red-500 text-sm hidden">Save failed</p>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => navigate("/secrets")} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1">
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
