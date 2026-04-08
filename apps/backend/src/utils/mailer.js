// backend/src/utils/mailer.js
'use strict';

const nodemailer = require('nodemailer');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM     = process.env.EMAIL_FROM || 'EasyTrack <no-reply@easytrack.pro>';
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || ''; // <-- NUEVO
const SMTP_URL       = process.env.SMTP_URL || '';
const SMTP_HOST      = process.env.SMTP_HOST || '';
const SMTP_PORT      = Number(process.env.SMTP_PORT || 587);
const SMTP_USER      = process.env.SMTP_USER || '';
const SMTP_PASS      = process.env.SMTP_PASS || '';
const SMTP_SECURE    = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

let transporter = null;

/** Resend */
async function sendWithResend({ to, subject, html, text, replyTo }) {
  const API = 'https://api.resend.com/emails';
  const payload = { from: EMAIL_FROM, to, subject, html, text };
  if (replyTo) payload.reply_to = replyTo;             // <-- NUEVO
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(`Resend error: ${res.status} ${j.error || ''}`);
  }
}

/** SMTP (fallback) */
function getSmtpTransporter() { /* igual que tienes */ }
async function sendWithSmtp({ to, subject, html, text, replyTo }) {
  const tx = getSmtpTransporter();
  await tx.sendMail({ from: EMAIL_FROM, to, subject, html, text, ...(replyTo ? { replyTo } : {}) }); // <-- NUEVO
}

/** API pública */
async function sendEmail({ to, subject, html, text, replyTo = EMAIL_REPLY_TO }) { // <-- usa env por defecto
  if (!Array.isArray(to)) to = [to].filter(Boolean);
  if (!to.length) return;
  if (RESEND_API_KEY) return sendWithResend({ to, subject, html, text, replyTo });
  return sendWithSmtp({ to, subject, html, text, replyTo });
}

module.exports = { sendEmail };
