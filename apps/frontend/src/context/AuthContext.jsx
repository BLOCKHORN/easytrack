import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService } from '../services/authService';
import { apiFetch } from '../utils/fetcher';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/check');
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(!!data?.isAdmin);
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          setUser(data.user);
          setTenant(data.tenant || null);
          checkAdminStatus();
          return;
        }
      }

      // Si /me falla con 401, intentar refresh silencioso
      const refreshed = await authService.refresh();
      if (refreshed?.user) {
        setUser(refreshed.user);
        setTenant(refreshed.tenant || null);
        checkAdminStatus();
      } else {
        setUser(null);
        setTenant(null);
        setIsAdmin(false);
      }
    } catch {
      setUser(null);
      setTenant(null);
      setIsAdmin(false);
    } finally {
      setIsInitializing(false);
    }
  }, [checkAdminStatus]);

  useEffect(() => {
    loadSession();

    const onAuthEvent = (e) => {
      if (e?.detail?.user) {
        setUser(e.detail.user);
        if (e.detail.tenant !== undefined) setTenant(e.detail.tenant);
        checkAdminStatus();
      } else if (e?.detail === null) {
        setUser(null);
        setTenant(null);
        setIsAdmin(false);
      } else {
        loadSession();
      }
    };

    window.addEventListener('easytrack:auth', onAuthEvent);
    return () => window.removeEventListener('easytrack:auth', onAuthEvent);
  }, [loadSession, checkAdminStatus]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.ok) {
      setUser(res.user);
      setTenant(res.tenant || null);
      checkAdminStatus();
    }
    return res;
  };

  const register = async (payload) => {
    const res = await authService.register(payload);
    if (res.ok) {
      setUser(res.user);
      setTenant(res.tenant || null);
      checkAdminStatus();
    }
    return res;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setTenant(null);
    setIsAdmin(false);
  };

  const value = {
    user,
    tenant,
    isLoggedIn: !!user,
    isAdmin,
    isInitializing,
    login,
    register,
    logout,
    refreshSession: loadSession,
    setTenant
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex antialiased">
        <aside className="hidden md:flex w-64 border-r border-zinc-800/80 p-6 flex-col justify-between">
          <div className="space-y-6">
            <div className="h-8 w-32 bg-zinc-900 animate-pulse rounded-lg" />
            <div className="space-y-2 mt-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-zinc-900/60 animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        </aside>
        <main className="flex-1 p-6 md:p-10 max-w-7xl">
          <div className="h-8 w-48 bg-zinc-900/80 animate-pulse rounded-lg mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-zinc-900/50 animate-pulse rounded-2xl border border-zinc-800/50" />
            ))}
          </div>
          <div className="h-64 bg-zinc-900/40 animate-pulse rounded-2xl border border-zinc-800/50" />
        </main>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
