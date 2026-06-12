// src/services/importacionService.js
const isLocal = /^(localhost|127\.0\.0\.1|.*\.ngrok-free\.dev|.*\.devtunnels\.ms)$/.test(window.location.hostname);
const PROD_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API = isLocal ? '' : PROD_URL;

export async function importPreview({ token, tenantId, content, source = 'txt' }) {
  const r = await fetch(`${API}/api/import/preview`, {
    method: 'POST',
    headers: {
      'Content-Type':'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tenantId, content, source }),
  });
  if (!r.ok) throw new Error(`IMPORT_PREVIEW_FAILED ${r.status}`);
  return r.json();
}

export async function importCommit({ token, tenantId, rows, autoConfirmIfGte = 0.9 }) {
  const r = await fetch(`${API}/api/import/commit`, {
    method: 'POST',
    headers: {
      'Content-Type':'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tenantId, rows, autoConfirmIfGte }),
  });
  if (!r.ok) throw new Error(`IMPORT_COMMIT_FAILED ${r.status}`);
  return r.json();
}

export async function importListStaging({ token, status = 'pendiente' }) {
  const r = await fetch(`${API}/api/import/staging?status=${encodeURIComponent(status)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`IMPORT_STAGING_FAILED ${r.status}`);
  return r.json();
}

export async function importBulkConfirm({ token, ids }) {
  const r = await fetch(`${API}/api/import/bulk-confirm`, {
    method: 'POST',
    headers: {
      'Content-Type':'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ids }),
  });
  if (!r.ok) throw new Error(`IMPORT_BULK_CONFIRM_FAILED ${r.status}`);
  return r.json();
}
