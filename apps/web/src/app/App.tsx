import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { AddEntryPage } from "@/pages/add-entry";
import { EditEntryPage } from "@/pages/edit-entry";
import { ImportPage } from "@/pages/import";
import { ExportPage } from "@/pages/export";
import { SecretsPage } from "@/pages/secrets";
import { AddSecretPage } from "@/pages/add-secret";
import { EditSecretPage } from "@/pages/edit-secret";
import { ImportSecretsPage } from "@/pages/import-secrets";
import { ExportSecretsPage } from "@/pages/export-secrets";
import { ServicesPage } from "@/pages/services";
import { RequestsPage } from "@/pages/requests";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/add" element={<ProtectedRoute><AddEntryPage /></ProtectedRoute>} />
            <Route path="/edit/:id" element={<ProtectedRoute><EditEntryPage /></ProtectedRoute>} />
            <Route path="/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
            <Route path="/export" element={<ProtectedRoute><ExportPage /></ProtectedRoute>} />
            <Route path="/secrets" element={<ProtectedRoute><SecretsPage /></ProtectedRoute>} />
            <Route path="/secrets/new" element={<ProtectedRoute><AddSecretPage /></ProtectedRoute>} />
            <Route path="/secrets/:id/edit" element={<ProtectedRoute><EditSecretPage /></ProtectedRoute>} />
            <Route path="/secrets/import" element={<ProtectedRoute><ImportSecretsPage /></ProtectedRoute>} />
            <Route path="/secrets/export" element={<ProtectedRoute><ExportSecretsPage /></ProtectedRoute>} />
            <Route path="/services" element={<AdminRoute><ServicesPage /></AdminRoute>} />
            <Route path="/requests" element={<AdminRoute><RequestsPage /></AdminRoute>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
