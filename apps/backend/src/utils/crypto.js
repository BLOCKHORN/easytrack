'use strict';
const crypto = require('crypto');

const SECRET = process.env.DEMO_PASS_SECRET || '';
if (!SECRET || SECRET.length < 16) {
  console.warn('[crypto] DEMO_PASS_SECRET muy corto o faltante. Establece uno de 32+ chars en .env');
}

function keyFromSecret() {
  // 32 bytes (AES-256) a partir del secret (sha256)
  return crypto.createHash('sha256').update(String(SECRET), 'utf8').digest();
}

/**
 * Devuelve: v1:<iv_b64>:<tag_b64>:<ct_b64>
 */
function encrypt(plain = '') {
  try {
    const key = keyFromSecret();
    const iv = crypto.randomBytes(12); // GCM recomienda 12 bytes
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
  } catch (e) {
    console.error('[crypto.encrypt] error', e);
    return null;
  }
}

function decrypt(blob = '') {
  try {
    const [v, ivB64, tagB64, ctB64] = String(blob).split(':');
    if (v !== 'v1') throw new Error('bad version');
    const key = keyFromSecret();
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const ct = Buffer.from(ctB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString('utf8');
  } catch (e) {
    console.error('[crypto.decrypt] error', e);
    return null;
  }
}

module.exports = { encrypt, decrypt };
