import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { api } from "@/lib/api";

type User = { id: string; email: string; name: string; avatarUrl: string | null; role: string };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>(null!);

const REFRESH_INTERVAL = 45 * 60 * 1000; // 45 min — refresh before 1h JWT expiry

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const u = await api.me();
        if (!cancelled) setUser(u);
      } catch {
        // Session might be expired — try refreshing
        const refreshed = await tryRefresh();
        if (refreshed && !cancelled) {
          try {
            const u = await api.me();
            if (!cancelled) setUser(u);
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => { cancelled = true; };
  }, []);

  // Periodic session refresh
  useEffect(() => {
    if (!user) return;

    refreshRef.current = setInterval(async () => {
      try {
        await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
      } catch {
        // Silent — next me() call will handle it
      }
    }, REFRESH_INTERVAL);

    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [user]);

  const login = () => { window.location.href = "/api/auth/login"; };
  const logout = async () => {
    await api.logout();
    setUser(null);
    if (refreshRef.current) clearInterval(refreshRef.current);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
