// src/utils/mailer.js
'use strict';
const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
  auth: (process.env.SMTP_USER && process.env.SMTP_PASS) ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined,
});

async function sendActivationEmail({ to, token, frontendUrl, company }) {
  const base = (frontendUrl || process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const url = `${base}/activate?token=${encodeURIComponent(token)}`;
  const from = process.env.SMTP_FROM || 'EasyTrack <no-reply@easytrack>';

  const html = `
    <p>Hola${company ? `, ${company}` : ''}:</p>
    <p>Tu acceso a la <b>DEMO de EasyTrack</b> está listo.</p>
    <p><a href="${url}">👉 Activar cuenta</a></p>
    <p>Si el botón no funciona, copia y pega esta URL:</p>
    <p style="word-break:break-all">${url}</p>
  `;

  await transport.sendMail({
    from, to,
    subject: 'Activa tu cuenta — EasyTrack',
    text: `Activa tu cuenta: ${url}`,
    html
  });

  return { url };
}

module.exports = { sendActivationEmail };
