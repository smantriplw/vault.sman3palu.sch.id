import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { path: "/", label: "Dashboard", icon: "grid" },
  { path: "/secrets", label: "Secrets", icon: "key" },
];

const adminItems = [
  { path: "/services", label: "Services", icon: "settings" },
  { path: "/requests", label: "Requests", icon: "activity" },
  { path: "/admin-keys", label: "Encryption Keys", icon: "shield" },
  { path: "/admin/integration", label: "Integration", icon: "code" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const currentPath = location.pathname;
  const isExport = currentPath.includes("/export") || currentPath.includes("/import");
  const parentPath = currentPath.startsWith("/secrets") ? "/secrets" : "/";
  const nav = isExport ? parentPath : currentPath;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="sticky top-0 z-40 bg-slate-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center h-10">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 100" className="h-10 w-auto" fill="none">
                  <defs>
                    <linearGradient id="neonGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#06B6D4" />
                      <stop offset="100%" stop-color="#3B82F6" />
                    </linearGradient>
                    <linearGradient id="darkBase" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#1E293B" />
                      <stop offset="100%" stop-color="#0F172A" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#06B6D4" flood-opacity="0.5" />
                    </filter>
                  </defs>
                  <g transform="translate(15, 10)">
                    <rect x="15" y="15" width="50" height="50" rx="12" fill="url(#darkBase)" transform="rotate(45, 40, 40)" />
                    <path d="M 24 38 L 40 52 L 60 26" fill="none" stroke="url(#neonGrad)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" />
                    <circle cx="40" cy="62" r="4" fill="#06B6D4" filter="url(#glow)" />
                  </g>
                  <text x="110" y="55" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="900" fill="#FFFFFF" letter-spacing="1">
                    VAULT<tspan fill="#06B6D4">.</tspan>
                  </text>
                  <text x="113" y="77" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#94A3B8" letter-spacing="5">
                    SMAN 3 PALU
                  </text>
                </svg>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      nav === item.path || (item.path === "/" && nav === "/")
                        ? "bg-white/10 text-white"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                {user?.role === "admin" && adminItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      nav === item.path
                        ? "bg-white/10 text-white"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <span className="text-sm text-slate-300">{user?.email}</span>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
