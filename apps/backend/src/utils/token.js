'use strict';

const crypto = require('crypto');

function getSecret() {
  return process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'easytrack_fallback_secret_key_32chars_min';
}

/**
 * Genera un token JWT estándar firmado con HMAC-SHA256 (compatible con el validador local de requireAuth).
 */
function signToken(payload, expiresInSeconds = 7 * 24 * 3600) {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);
  
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    iss: 'easytrack-native',
    role: 'authenticated',
    iat: now,
    exp: now + expiresInSeconds,
    ...payload
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sigB64 = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

/**
 * Verifica y decodifica un token JWT (soporta tanto tokens nativos como tokens legados de Supabase).
 */
function verifyToken(token) {
  if (!token) return null;
  const rawSecret = getSecret();
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const dataToSign = `${headerB64}.${payloadB64}`;

    // 1. Validar con secret nativo (string UTF-8)
    const expectedSig = crypto
      .createHmac('sha256', rawSecret)
      .update(dataToSign)
      .digest('base64url');

    let match = (sigB64 === expectedSig);

    // 2. Fallback de compatibilidad: secret base64 decodificado (tokens emitidos por Supabase GoTrue)
    if (!match && rawSecret.length > 32) {
      try {
        const bufSecret = Buffer.from(rawSecret, 'base64');
        const sigBuf = crypto
          .createHmac('sha256', bufSecret)
          .update(dataToSign)
          .digest('base64url');
        match = (sigBuf === sigB64);
      } catch {}
    }

    if (!match) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    if (!payload.sub) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Genera un Access Token JWT (24 horas por defecto para estabilidad operativa en locales).
 */
function signAccessToken(payload, expiresInSeconds = 24 * 3600) {
  return signToken({ ...payload, token_type: 'access' }, expiresInSeconds);
}

/**
 * Genera un Refresh Token JWT de larga duración (30 días por defecto).
 */
function signRefreshToken(payload, expiresInSeconds = 30 * 24 * 3600) {
  return signToken({ ...payload, token_type: 'refresh' }, expiresInSeconds);
}

module.exports = {
  signToken,
  signAccessToken,
  signRefreshToken,
  verifyToken
};
