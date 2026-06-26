import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";
import { useState } from "react";

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 15.75l7.5-7.5 7.5 7.5"
      />
    </svg>
  );
}

export function RequestsPage() {
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [ip, setIp] = useState("");
  const [path, setPath] = useState("");
  const [method, setMethod] = useState("");
  const [statusMin, setStatusMin] = useState("");
  const [statusMax, setStatusMax] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minDuration, setMinDuration] = useState("");
  const [maxDuration, setMaxDuration] = useState("");

  const [appliedPage, setAppliedPage] = useState(1);
  const [appliedIp, setAppliedIp] = useState("");
  const [appliedPath, setAppliedPath] = useState("");
  const [appliedMethod, setAppliedMethod] = useState("");
  const [appliedStatusMin, setAppliedStatusMin] = useState("");
  const [appliedStatusMax, setAppliedStatusMax] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [appliedMinDuration, setAppliedMinDuration] = useState("");
  const [appliedMaxDuration, setAppliedMaxDuration] = useState("");

  const buildParams = (p: number) => ({
    page: p,
    limit: 20,
    ...(appliedIp ? { ip: appliedIp } : {}),
    ...(appliedPath ? { path: appliedPath } : {}),
    ...(appliedMethod ? { method: appliedMethod } : {}),
    ...(appliedStatusMin ? { status_min: Number(appliedStatusMin) } : {}),
    ...(appliedStatusMax ? { status_max: Number(appliedStatusMax) } : {}),
    ...(appliedStartDate ? { start_date: appliedStartDate } : {}),
    ...(appliedEndDate ? { end_date: appliedEndDate } : {}),
    ...(appliedMinDuration ? { min_duration: Number(appliedMinDuration) } : {}),
    ...(appliedMaxDuration ? { max_duration: Number(appliedMaxDuration) } : {}),
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "requests",
      appliedPage,
      appliedIp,
      appliedPath,
      appliedMethod,
      appliedStatusMin,
      appliedStatusMax,
      appliedStartDate,
      appliedEndDate,
      appliedMinDuration,
      appliedMaxDuration,
    ],
    queryFn: () => api.getRequestLogs(buildParams(appliedPage)),
  });

  const { data: stats } = useQuery({
    queryKey: ["request-stats"],
    queryFn: api.getRequestStats,
  });

  const applyFilters = () => {
    setAppliedPage(1);
    setPage(1);
    setAppliedIp(ip);
    setAppliedPath(path);
    setAppliedMethod(method);
    setAppliedStatusMin(statusMin);
    setAppliedStatusMax(statusMax);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedMinDuration(minDuration);
    setAppliedMaxDuration(maxDuration);
  };

  const resetFilters = () => {
    setIp("");
    setPath("");
    setMethod("");
    setStatusMin("");
    setStatusMax("");
    setStartDate("");
    setEndDate("");
    setMinDuration("");
    setMaxDuration("");
    setAppliedPage(1);
    setPage(1);
    setAppliedIp("");
    setAppliedPath("");
    setAppliedMethod("");
    setAppliedStatusMin("");
    setAppliedStatusMax("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setAppliedMinDuration("");
    setAppliedMaxDuration("");
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const goToPage = (p: number) => {
    setPage(p);
    setAppliedPage(p);
  };

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Request Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Audit trail for all API requests
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card">
              <div className="card-body">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.total.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Errors
                </p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {stats.errors.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error Rate
                </p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {stats.errorRate.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Response
                </p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {stats.avgResponseTime}ms
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="card mb-6">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>Filters</span>
            {filtersOpen ? (
              <ChevronUpIcon className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {filtersOpen && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    IP Address
                  </label>
                  <input
                    type="text"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    placeholder="e.g. 192.168.1.1"
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Path
                  </label>
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="e.g. /api/entries"
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Method
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                  >
                    <option value="">Any</option>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Status Min
                  </label>
                  <input
                    type="number"
                    value={statusMin}
                    onChange={(e) => setStatusMin(e.target.value)}
                    placeholder="e.g. 200"
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Status Max
                  </label>
                  <input
                    type="number"
                    value={statusMax}
                    onChange={(e) => setStatusMax(e.target.value)}
                    placeholder="e.g. 499"
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Min Duration (ms)
                  </label>
                  <input
                    type="number"
                    value={minDuration}
                    onChange={(e) => setMinDuration(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Max Duration (ms)
                  </label>
                  <input
                    type="number"
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={applyFilters} className="btn-primary text-sm">
                  Apply
                </button>
                <button
                  onClick={resetFilters}
                  className="btn-secondary text-sm"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-600 border-t-transparent" />
          </div>
        )}

        {data && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Path
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Auth
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service/User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.logs.map((log: any) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-xs font-mono font-medium ${
                            log.method === "GET"
                              ? "text-emerald-600"
                              : log.method === "POST"
                                ? "text-brand-600"
                                : log.method === "PUT"
                                  ? "text-amber-600"
                                  : log.method === "DELETE"
                                    ? "text-red-600"
                                    : ""
                          }`}
                        >
                          {log.method}
                        </span>
                      </td>
                      <td
                        className="px-4 py-2.5 text-gray-700 font-mono text-xs max-w-[200px] truncate"
                        title={log.path}
                      >
                        {log.path}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-xs font-mono font-medium ${
                            (log.statusCode || 0) >= 400
                              ? "text-red-600"
                              : (log.statusCode || 0) >= 300
                                ? "text-amber-600"
                                : "text-emerald-600"
                          }`}
                        >
                          {log.statusCode || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {log.authType}
                      </td>
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
              <p className="text-center py-8 text-gray-500">
                No request logs yet
              </p>
            )}
          </div>
        )}

        {data && data.total > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              {data.total} total request{data.total !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">
                Page {data.page} of {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => goToPage(data.page - 1)}
                  disabled={data.page <= 1}
                  className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => goToPage(data.page + 1)}
                  disabled={data.page >= totalPages}
                  className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
