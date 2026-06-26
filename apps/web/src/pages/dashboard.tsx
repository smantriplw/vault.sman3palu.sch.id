import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";

function TOTPTimer({ period }: { period: number }) {
  const [remaining, setRemaining] = useState(period - (Math.floor(Date.now() / 1000) % period));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(period - (Math.floor(Date.now() / 1000) % period));
    }, 1000);
    return () => clearInterval(interval);
  }, [period]);

  const pct = (remaining / period) * 100;

  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
      <div
        className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["entries"],
    queryFn: api.listEntries,
    refetchInterval: 30_000,
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const handleDelete = async (id: string) => {
    await api.deleteEntry(id);
    queryClient.invalidateQueries({ queryKey: ["entries"] });
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
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">{entries.length} TOTP entries</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/import" className="btn-secondary text-sm">Import</Link>
            <Link to="/import-google-auth" className="btn-secondary text-sm">GA Import</Link>
            <Link to="/export" className="btn-secondary text-sm">Export</Link>
            <Link to="/add" className="btn-primary">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Entry
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <div key={entry.id} className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wider truncate">
                      {entry.issuer}
                    </p>
                    <p className="text-base font-semibold text-gray-900 truncate">{entry.label}</p>
                  </div>
                  {entry.shared && (
                    <span className="badge bg-blue-50 text-blue-700 ml-2 shrink-0">shared</span>
                  )}
                </div>

                <button
                  onClick={() => entry.code && copyCode(entry.code)}
                  className="w-full text-center py-2"
                  title="Click to copy"
                >
                  {entry.code ? (
                    <span className="text-3xl font-mono font-bold tracking-[0.25em] text-blue-600 hover:text-blue-700 transition-colors select-all">
                      {entry.code}
                    </span>
                  ) : (
                    <span className="text-sm text-red-500 font-medium">Decryption failed</span>
                  )}
                </button>

                <TOTPTimer period={entry.period} />

                {entry.canEdit && (
                  <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => navigate(`/edit/${entry.id}`)}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-sm text-red-500 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="col-span-full card py-12">
              <div className="text-center">
                <svg className="mx-auto w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <p className="text-gray-500 mb-1">No TOTP entries yet</p>
                <Link to="/add" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Add your first entry
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
