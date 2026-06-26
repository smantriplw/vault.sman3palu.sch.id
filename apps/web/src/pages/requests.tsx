import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";

export function RequestsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["requests"],
    queryFn: () => api.getRequestLogs(1),
  });

  const { data: stats } = useQuery({
    queryKey: ["request-stats"],
    queryFn: api.getRequestStats,
  });

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Request Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Audit trail for all API requests</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card">
              <div className="card-body">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total.toLocaleString()}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Errors</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.errors.toLocaleString()}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Error Rate</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.errorRate.toFixed(1)}%</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Response</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.avgResponseTime}ms</p>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
          </div>
        )}

        {data && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auth</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service/User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-mono font-medium ${
                          log.method === "GET" ? "text-emerald-600" :
                          log.method === "POST" ? "text-blue-600" :
                          log.method === "PUT" ? "text-amber-600" :
                          log.method === "DELETE" ? "text-red-600" : ""
                        }`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 font-mono text-xs max-w-[200px] truncate" title={log.path}>
                        {log.path}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-mono font-medium ${
                          (log.statusCode || 0) >= 400 ? "text-red-600" :
                          (log.statusCode || 0) >= 300 ? "text-amber-600" : "text-emerald-600"
                        }`}>
                          {log.statusCode || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{log.authType}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {log.apiKey?.serviceName || log.user?.email || "-"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs font-mono">
                        {log.responseTimeMs}ms
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">
                        {log.ipAddress || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.logs.length === 0 && (
              <p className="text-center py-8 text-gray-500">No request logs yet</p>
            )}
          </div>
        )}

        {data && data.total > data.logs.length && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Showing {data.logs.length} of {data.total} requests
          </p>
        )}
      </div>
    </Layout>
  );
}
