import { Layout } from "@/components/layout";

const scopes = [
  {
    id: "entries:read",
    description: "Read TOTP entries and generate live codes",
  },
  {
    id: "entries:write",
    description: "Create, update, and delete TOTP entries",
  },
  { id: "entries:share", description: "Share TOTP entries with other users" },
  {
    id: "secrets:read",
    description: "Read general secrets (API keys, passwords)",
  },
  { id: "secrets:write", description: "Create, update, and delete secrets" },
  { id: "secrets:share", description: "Share secrets with other users" },
  { id: "vault:export", description: "Export all vault entries and secrets" },
  { id: "audit:read", description: "View request logs and audit trail" },
];

const codeExamples = [
  {
    lang: "curl",
    label: "cURL / Bash",
    code: `# List all TOTP entries
curl -H "Authorization: Bearer vk_prod_your-key-here" \
  https://vault.sman3palu.sch.id/api/entries

# List secrets
curl -H "Authorization: Bearer vk_prod_your-key-here" \
  https://vault.sman3palu.sch.id/api/secrets

# Create a secret (write scope required)
curl -X POST \
  -H "Authorization: Bearer vk_prod_your-key-here" \
  -H "Content-Type: application/json" \
  -d '{"name":"My API Key","category":"api_key","data":{"key":"sk-xxx"}}' \
  https://vault.sman3palu.sch.id/api/secrets`,
  },
  {
    lang: "python",
    label: "Python (requests)",
    code: `import requests

API = "https://vault.sman3palu.sch.id"
KEY = "vk_prod_your-key-here"

headers = {"Authorization": f"Bearer {KEY}"}

# List entries
resp = requests.get(f"{API}/api/entries", headers=headers)
entries = resp.json()
for e in entries:
    print(f"{e['issuer']} — {e['code']}")

# List secrets
resp = requests.get(f"{API}/api/secrets", headers=headers)
secrets = resp.json()
for s in secrets:
    print(f"{s['name']} ({s['category']})")`,
  },
  {
    lang: "node",
    label: "Node.js (fetch)",
    code: `const API = "https://vault.sman3palu.sch.id";
const KEY = "vk_prod_your-key-here";

const headers = {
  "Authorization": \`Bearer \${KEY}\`,
  "Content-Type": "application/json",
};

// List entries
const entries = await fetch(\`\${API}/api/entries\`, { headers }).then(r => r.json());
for (const e of entries) {
  console.log(\`\${e.issuer} — \${e.code}\`);
}

// Create a secret (write scope required)
const secret = await fetch(\`\${API}/api/secrets\`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    name: "Production DB",
    category: "database",
    data: { username: "admin", password: "s3cret" },
  }),
}).then(r => r.json());
console.log("Created:", secret.id);`,
  },
  {
    lang: "go",
    label: "Go (net/http)",
    code: `package main

import (
  "fmt"
  "io"
  "net/http"
)

func main() {
  url := "https://vault.sman3palu.sch.id/api/entries"
  key := "vk_prod_your-key-here"

  req, _ := http.NewRequest("GET", url, nil)
  req.Header.Set("Authorization", "Bearer " + key)

  resp, _ := http.DefaultClient.Do(req)
  body, _ := io.ReadAll(resp.Body)
  fmt.Println(string(body))
}`,
  },
];

export function IntegrationPage() {
  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-gray-900">
            API Integration Guide
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Use API keys to let external services, scripts, and applications
            access the vault programmatically.
          </p>
        </div>

        {/* Step 1 */}
        <section className="card mb-6">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">
              1. Create an API Key
            </h2>
          </div>
          <div className="card-body space-y-3">
            <p className="text-sm text-gray-600">
              Go to <strong>Services</strong> in the admin panel and click{" "}
              <strong>New Service</strong>. Choose a name and select the scopes
              your application needs.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-medium text-amber-800">
                ⚠ The API key is shown only once — copy it immediately. If lost,
                rotate the key to generate a new one.
              </p>
            </div>
          </div>
        </section>

        {/* Step 2 */}
        <section className="card mb-6">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">
              2. Authenticate Requests
            </h2>
          </div>
          <div className="card-body space-y-3">
            <p className="text-sm text-gray-600">
              Send the API key in the{" "}
              <code className="text-xs bg-gray-100 px-1 rounded">
                Authorization
              </code>{" "}
              header using the <strong>Bearer</strong> scheme:
            </p>
            <div className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto">
              <pre className="text-xs font-mono leading-relaxed">
                Authorization: Bearer vk_prod_your-key-here
              </pre>
            </div>
            <p className="text-sm text-gray-600">
              All API endpoints are relative to{" "}
              <code className="text-xs bg-gray-100 px-1 rounded">
                https://vault.sman3palu.sch.id/api/
              </code>
              .
            </p>
          </div>
        </section>

        {/* Scopes */}
        <section className="card mb-6">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">
              3. Available Scopes
            </h2>
          </div>
          <div className="card-body">
            <p className="text-sm text-gray-600 mb-3">
              Each API key is restricted to the scopes you assign. This table
              shows what each scope allows:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scope
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Access
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scopes.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <code className="text-xs font-mono text-brand-600">
                          {s.id}
                        </code>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {s.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Code Examples */}
        <section className="card mb-6">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">
              4. Code Examples
            </h2>
          </div>
          <div className="card-body space-y-4">
            <p className="text-sm text-gray-600">
              Replace{" "}
              <code className="text-xs bg-gray-100 px-1 rounded">
                vk_prod_your-key-here
              </code>{" "}
              with your actual API key.
            </p>
            {codeExamples.map((ex) => (
              <div key={ex.lang}>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  {ex.label}
                </p>
                <div className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-xs font-mono leading-relaxed">
                    {ex.code}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* IP Whitelisting */}
        <section className="card mb-6">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">
              5. IP Whitelisting (Optional)
            </h2>
          </div>
          <div className="card-body space-y-3">
            <p className="text-sm text-gray-600">
              Restrict an API key to specific IP ranges by adding CIDR whitelist
              entries when creating or updating a service. If any whitelist
              entry is configured, requests from non-matching IPs are rejected.
            </p>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-700 mb-1">
                Example CIDR entries:
              </p>
              <ul className="text-xs text-gray-600 space-y-0.5 list-disc list-inside">
                <li>
                  <code className="text-xs bg-gray-100 px-1 rounded">
                    10.0.0.0/8
                  </code>{" "}
                  — internal network
                </li>
                <li>
                  <code className="text-xs bg-gray-100 px-1 rounded">
                    203.0.113.0/24
                  </code>{" "}
                  — specific office range
                </li>
                <li>
                  <code className="text-xs bg-gray-100 px-1 rounded">
                    192.168.1.1/32
                  </code>{" "}
                  — single IP
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Key Rotation */}
        <section className="card mb-6">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">
              6. Key Rotation &amp; Grace Period
            </h2>
          </div>
          <div className="card-body space-y-3">
            <p className="text-sm text-gray-600">
              When you rotate a key, the old hash is preserved and remains valid
              for a <strong>1-hour grace period</strong>. During this window,
              both old and new keys work. This allows you to update your
              external services without downtime.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-800">
                <strong>Tip:</strong> Rotate keys regularly (e.g., every 90
                days) as a security best practice. The response includes a{" "}
                <code className="text-xs bg-blue-100 px-1 rounded">
                  X-Key-Deprecated: true
                </code>{" "}
                header when using an old key during the grace period — use this
                to identify services that need updating.
              </p>
            </div>
          </div>
        </section>

        {/* Audit */}
        <section className="card mb-6">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">
              7. Monitoring &amp; Audit
            </h2>
          </div>
          <div className="card-body space-y-3">
            <p className="text-sm text-gray-600">
              Every API request is logged. Visit the <strong>Requests</strong>{" "}
              page in the admin panel to view:
            </p>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li>
                Total request count, error rate, and average response time
              </li>
              <li>
                Per-request details: method, path, status, auth type, service
                name, duration, IP
              </li>
              <li>
                Filter by IP address, HTTP method, status code, service, and
                time period
              </li>
              <li>Paginated results with sortable columns</li>
            </ul>
            <p className="text-sm text-gray-600 mt-2">
              Monitor for unusual activity (e.g., unexpected 401s, rate limit
              hits, requests from unknown IPs).
            </p>
          </div>
        </section>

        {/* Vault Transit Engine */}
        <section className="card mb-6">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">
              8. HashiCorp Vault Transit Engine
            </h2>
          </div>
          <div className="card-body space-y-3">
            <p className="text-sm text-gray-600">
              SMANTIVault includes a built-in Transit Engine compatible with
              HashiCorp Vault's encryption-as-a-service pattern. No Vault
              cluster needed — uses the same wrapping pattern as a lightweight
              replacement.
            </p>

            <h3 className="text-xs font-semibold text-gray-900">Endpoints</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endpoint
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <code className="text-xs font-mono text-green-600">
                        POST
                      </code>
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-xs font-mono text-brand-600">
                        /api/vault/encrypt/:key_name
                      </code>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      Encrypt plaintext
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <code className="text-xs font-mono text-green-600">
                        POST
                      </code>
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-xs font-mono text-brand-600">
                        /api/vault/decrypt/:key_name
                      </code>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      Decrypt ciphertext
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <code className="text-xs font-mono text-blue-600">
                        GET
                      </code>
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-xs font-mono text-brand-600">
                        /api/vault/keys
                      </code>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      List encryption keys
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <code className="text-xs font-mono text-green-600">
                        POST
                      </code>
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-xs font-mono text-brand-600">
                        /api/vault/keys
                      </code>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      Create encryption key
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <code className="text-xs font-mono text-green-600">
                        POST
                      </code>
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-xs font-mono text-brand-600">
                        /api/vault/keys/:name/rotate
                      </code>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      Rotate key
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xs font-semibold text-gray-900">
              Prerequisites
            </h3>
            <p className="text-sm text-gray-600">
              Set the{" "}
              <code className="text-xs bg-gray-100 px-1 rounded">
                MASTER_ENCRYPTION_KEY
              </code>{" "}
              environment variable in your{" "}
              <code className="text-xs bg-gray-100 px-1 rounded">.env</code>{" "}
              file.
            </p>

            <h3 className="text-xs font-semibold text-gray-900">
              Ciphertext Format
            </h3>
            <div className="bg-gray-50 rounded-xl p-3">
              <code className="text-xs font-mono text-gray-800">
                {"smantivault:{keyName}:{version}:{base64_ct}:{base64_nonce}"}
              </code>
            </div>

            <h3 className="text-xs font-semibold text-gray-900">Example</h3>
            <div className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto">
              <pre className="text-xs font-mono leading-relaxed">{`# Encrypt
curl -X POST \
  -H "Authorization: Bearer vk_prod_your-key-here" \
  -H "Content-Type: application/json" \
  -d '{"plaintext":"hello-world"}' \
  https://vault.sman3palu.sch.id/api/vault/encrypt/my-key

# Decrypt
curl -X POST \
  -H "Authorization: Bearer vk_prod_your-key-here" \
  -H "Content-Type: application/json" \
  -d '{"ciphertext":"smantivault:my-key:1:abc123:def456"}' \
  https://vault.sman3palu.sch.id/api/vault/decrypt/my-key`}</pre>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
