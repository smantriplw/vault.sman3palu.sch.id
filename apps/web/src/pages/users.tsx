import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Layout } from "@/components/layout";
import { useState } from "react";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  isSuspended: boolean;
  createdAt: string;
  avatarUrl: string | null;
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const {
    data: users = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["users"],
    queryFn: api.listUsers,
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setMessage({ type: "success", text: "Role updated" });
    },
    onError: (e: Error) => setMessage({ type: "error", text: e.message }),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => api.suspendUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setMessage({ type: "success", text: "User suspended" });
    },
    onError: (e: Error) => setMessage({ type: "error", text: e.message }),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (id: string) => api.unsuspendUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setMessage({ type: "success", text: "User unsuspended" });
    },
    onError: (e: Error) => setMessage({ type: "error", text: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setMessage({ type: "success", text: "User deleted" });
    },
    onError: (e: Error) => setMessage({ type: "error", text: e.message }),
  });

  const isSelf = (userId: string) => me?.id === userId;

  const getInitial = (name: string) => name?.charAt(0)?.toUpperCase() || "?";

  return (
    <Layout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              User Management
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage user accounts and permissions
            </p>
          </div>
          <button onClick={() => refetch()} className="btn-secondary text-sm">
            <svg
              className="w-4 h-4 mr-1.5 inline"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
              />
            </svg>
            Refresh
          </button>
        </div>

        {message && (
          <div
            className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="ml-2 font-medium opacity-70 hover:opacity-100"
            >
              &times;
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-600 border-t-transparent" />
          </div>
        )}

        {users.length > 0 && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user: User) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-medium">
                              {getInitial(user.name)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            user.role === "admin"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            user.isSuspended
                              ? "bg-red-50 text-red-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {user.isSuspended ? "suspended" : "active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSelf(user.id) ? (
                            <span
                              className="text-xs text-gray-400"
                              title="Cannot modify yourself"
                            >
                              —
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  roleMutation.mutate({
                                    id: user.id,
                                    role:
                                      user.role === "admin" ? "user" : "admin",
                                  })
                                }
                                disabled={roleMutation.isPending}
                                className="text-xs px-2.5 py-1 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
                              >
                                {user.role === "admin"
                                  ? "Make User"
                                  : "Make Admin"}
                              </button>
                              {user.isSuspended ? (
                                <button
                                  onClick={() =>
                                    unsuspendMutation.mutate(user.id)
                                  }
                                  disabled={unsuspendMutation.isPending}
                                  className="text-xs px-2.5 py-1 bg-white border border-emerald-300 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50 font-medium"
                                >
                                  Unsuspend
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    suspendMutation.mutate(user.id)
                                  }
                                  disabled={suspendMutation.isPending}
                                  className="text-xs px-2.5 py-1 bg-white border border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50 font-medium"
                                >
                                  Suspend
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Delete user "${user.name}"? This cannot be undone.`,
                                    )
                                  )
                                    deleteMutation.mutate(user.id);
                                }}
                                disabled={deleteMutation.isPending}
                                className="text-xs px-2.5 py-1 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 font-medium"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {users.length === 0 && !isLoading && (
          <div className="card py-12">
            <div className="text-center">
              <p className="text-gray-500">No users found</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
