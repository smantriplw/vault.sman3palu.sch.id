import { useAuth } from "@/hooks/use-auth";

export function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="bg-slate-800 rounded-t-xl px-8 py-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 100" className="h-14 w-auto mx-auto mb-2" fill="none">
              <defs>
                <linearGradient id="neonGradLg" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#06B6D4" />
                  <stop offset="100%" stop-color="#3B82F6" />
                </linearGradient>
                <linearGradient id="darkBaseLg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#1E293B" />
                  <stop offset="100%" stop-color="#0F172A" />
                </linearGradient>
                <filter id="glowLg" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#06B6D4" flood-opacity="0.5" />
                </filter>
              </defs>
              <g transform="translate(15, 10)">
                <rect x="15" y="15" width="50" height="50" rx="12" fill="url(#darkBaseLg)" transform="rotate(45, 40, 40)" />
                <path d="M 24 38 L 40 52 L 60 26" fill="none" stroke="url(#neonGradLg)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" filter="url(#glowLg)" />
                <circle cx="40" cy="62" r="4" fill="#06B6D4" filter="url(#glowLg)" />
              </g>
              <text x="110" y="55" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="900" fill="#FFFFFF" letter-spacing="1">
                VAULT<tspan fill="#06B6D4">.</tspan>
              </text>
              <text x="113" y="77" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#94A3B8" letter-spacing="5">
                SMAN 3 PALU
              </text>
            </svg>
          </div>

          <div className="px-8 py-6">
            <button
              onClick={login}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
              Login with ZITADEL
            </button>

            <p className="text-xs text-gray-400 text-center mt-6">
              Single Sign-On — your institutional account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
