// backend/src/utils/notifyStaffNewDemo.js
'use strict';

const { supabase: db } = require('./supabaseClient'); // misma ruta que usas en otras rutas
const { sendEmail } = require('./mailer');

const APP_BASE = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const ADMIN_BASE = (process.env.ADMIN_BASE_URL || APP_BASE).replace(/\/$/, ''); // por si tienes panel admin separado

function esc(x) {
  return String(x ?? '').replace(/[<>&"]/g, s => ({
    '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'
  }[s]));
}

/**
 * Envía email al staff cuando se crea una demo_request
 * @param {string} requestId  - id de demo_requests
 * @param {object} payload    - datos mínimos de la solicitud (para render de email rápido)
 */
async function notifyStaffNewDemo(requestId, payload = {}) {
  // 1) Saca staff recipients (emails)
  const { data: staff, error: e1 } = await db
    .from('v_staff_emails')
    .select('email, user_id, role')
    .eq('is_active', true);

  if (e1) {
    console.error('[notifyStaffNewDemo] Error consultando v_staff_emails:', e1);
    return;
  }
  const recipients = (staff || [])
    .map(s => (s?.email || '').trim().toLowerCase())
    .filter(Boolean);

  if (!recipients.length) {
    console.warn('[notifyStaffNewDemo] No hay recipients (staff activo sin email).');
    return;
  }

  // 2) Link directo al detalle de la solicitud en tu panel
  // ajusta si tu ruta es distinta
  const detailUrl = `${ADMIN_BASE}/admin/requests?open=${encodeURIComponent(requestId)}`;

  // 3) Render rápido del email
  const subject = `🆕 Nueva solicitud de DEMO: ${payload.company_name || payload.email || requestId}`;
  const text = [
    'Nueva solicitud de DEMO recibida.',
    '',
    `Empresa: ${payload.company_name || '—'}`,
    `Nombre: ${payload.full_name || '—'}`,
    `Email: ${payload.email || '—'}`,
    `Teléfono: ${payload.phone || '—'}`,
    `Ciudad: ${payload.city || '—'}`,
    `Provincia: ${payload.province || '—'}`,
    `País: ${payload.country_name || payload.country_code || '—'}`,
    '',
    `Ver en el panel: ${detailUrl}`,
  ].join('\n');

  const html = `
  <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">
    <h2 style="margin:0 0 12px">Nueva solicitud de DEMO</h2>
    <table style="border-collapse:collapse">
      <tr><td style="padding:4px 8px;color:#666">Empresa</td><td style="padding:4px 8px"><strong>${esc(payload.company_name)||'—'}</strong></td></tr>
      <tr><td style="padding:4px 8px;color:#666">Nombre</td><td style="padding:4px 8px">${esc(payload.full_name)||'—'}</td></tr>
      <tr><td style="padding:4px 8px;color:#666">Email</td><td style="padding:4px 8px">${esc(payload.email)||'—'}</td></tr>
      <tr><td style="padding:4px 8px;color:#666">Teléfono</td><td style="padding:4px 8px">${esc(payload.phone)||'—'}</td></tr>
      <tr><td style="padding:4px 8px;color:#666">Ciudad</td><td style="padding:4px 8px">${esc(payload.city)||'—'}</td></tr>
      <tr><td style="padding:4px 8px;color:#666">Provincia</td><td style="padding:4px 8px">${esc(payload.province)||'—'}</td></tr>
      <tr><td style="padding:4px 8px;color:#666">País</td><td style="padding:4px 8px">${esc(payload.country_name || payload.country_code)||'—'}</td></tr>
    </table>
    <p style="margin:16px 0">
      <a href="${detailUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px">Abrir en el panel</a>
    </p>
    <p style="color:#888;font-size:12px">ID solicitud: ${esc(requestId)}</p>
  </div>`;

  // 4) Enviar
  try {
    await sendEmail({ to: recipients, subject, html, text });
  } catch (err) {
    console.error('[notifyStaffNewDemo] Error enviando email:', err);
  }
}

module.exports = { notifyStaffNewDemo };
