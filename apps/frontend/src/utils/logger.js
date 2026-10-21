// src/utils/logger.js
// Debug controlado por env o flag global
// - Pon VITE_DEBUG=1 en .env para ver logs (desarrollo)
// - O en runtime: window.__DEBUG__ = true;

export const isDebug =
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_DEBUG === '1') ||
  (typeof window !== 'undefined' && window.__DEBUG__ === true);

export const debugLog = (...args) => {
  if (!isDebug) return;
  // eslint-disable-next-line no-console
  console.log(...args);
};
