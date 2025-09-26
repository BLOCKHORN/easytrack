// ✅ En local (localhost/127.0.0.1) usamos rutas relativas -> Vite proxy /api
// ✅ En prod usamos VITE_API_URL (https://tu-backend...); si no está, quedará relativo (requiere rewrite en hosting)

const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const PROD_URL = (import.meta.env?.VITE_API_URL || '').trim().replace(/\/$/, '');

export const API_BASE = isLocal ? '' : PROD_URL;

export function apiPath(p = '') {
  const path = String(p || '');
  if (!API_BASE) return path.startsWith('/') ? path : `/${path}`;
  return API_BASE + (path.startsWith('/') ? path : `/${path}`);
}
