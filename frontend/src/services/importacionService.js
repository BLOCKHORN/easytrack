// src/services/importacionService.js
const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

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
