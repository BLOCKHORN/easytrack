import { apiFetch, apiPath, API_BASE } from '../utils/fetcher';

export const authService = {
  loginWithGoogle(next = '/dashboard') {
    const qp = new URLSearchParams({ next });
    window.location.href = `${API_BASE}/api/auth/google/login?${qp.toString()}`;
  },

  async register(payload) {
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: payload
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        window.dispatchEvent(new CustomEvent('easytrack:auth', {
          detail: { user: data.user, tenant: data.tenant }
        }));
        return { ok: true, user: data.user, tenant: data.tenant };
      }
      return { ok: false, error: data.error || 'Error al crear la cuenta' };
    } catch {
      return { ok: false, error: 'Error de conexión con el servidor' };
    }
  },

  async login(email, password) {
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        window.dispatchEvent(new CustomEvent('easytrack:auth', {
          detail: { user: data.user, tenant: data.tenant }
        }));
        return { ok: true, user: data.user, tenant: data.tenant };
      }
      return { ok: false, error: data.error || 'Credenciales incorrectas' };
    } catch {
      return { ok: false, error: 'Error de conexión con el servidor' };
    }
  },

  async refresh() {
    try {
      const res = await fetch(apiPath('/api/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        window.dispatchEvent(new CustomEvent('easytrack:auth', {
          detail: { user: data.user, tenant: data.tenant }
        }));
        return data;
      }
    } catch {}
    return null;
  },

  async logout() {
    try {
      await fetch(apiPath('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include'
      });
    } catch {}
    localStorage.clear();
    sessionStorage.clear();
    window.dispatchEvent(new CustomEvent('easytrack:auth', { detail: null }));
  },

  async getMe() {
    try {
      const res = await apiFetch('/api/auth/me');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
};
