import { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const { tenant, isInitializing, setTenant } = useAuth();

  return (
    <TenantContext.Provider value={{ tenant, loading: isInitializing, setTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    try {
      const auth = useAuth();
      return { tenant: auth.tenant, loading: auth.isInitializing, setTenant: auth.setTenant };
    } catch {
      return { tenant: null, loading: false };
    }
  }
  return ctx;
}