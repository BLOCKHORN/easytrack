// backend/src/services/storage.service.js
'use strict';

const { supabase } = require('../utils/supabaseClient');
const sharp = require('sharp');

const BUCKET = 'imagenes-negocio';
// Caducidad URL firmada (7 días en segundos)
const SIGNED_TTL = 60 * 60 * 24 * 7;

/* ------------------ file-type (ESM) desde CommonJS ------------------ */
/* Carga perezosa con caché para evitar el error de exports y no penalizar rendimiento. */
let _fileTypeModPromise = null;
async function fileTypeFromBufferSafe(buffer) {
  if (!_fileTypeModPromise) {
    _fileTypeModPromise = import('file-type');
  }
  const { fileTypeFromBuffer } = await _fileTypeModPromise;
  return fileTypeFromBuffer(buffer);
}
/* -------------------------------------------------------------------- */

function keyForTenant(tenantId, ext = 'webp') {
  // key única para bust de caché y permitir cache-control alto en CDN
  return `${tenantId}/banner-${Date.now()}.${ext}`;
}

async function procesarImagen(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 16) {
    throw new Error('Archivo inválido.');
  }

  // Detecta tipo real del binario
  const detected = await fileTypeFromBufferSafe(buffer).catch(() => null);
  const mime = detected?.mime || 'application/octet-stream';

  const allow = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  if (!allow.includes(mime)) {
    throw new Error('Formato no soportado. Usa JPG, PNG, WEBP o AVIF.');
  }

  // Normaliza: respeta orientación EXIF, recorta a 1440x360 con cover y genera WEBP calidad 82
  const out = await sharp(buffer)
    .rotate()
    .resize(1440, 360, { fit: 'cover', position: 'entropy', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  return { buffer: out, ext: 'webp', mime: 'image/webp' };
}

async function subirImagenNegocio(tenantId, fileBuffer) {
  if (!tenantId || !fileBuffer) throw new Error('Datos insuficientes');

  const { buffer, ext, mime } = await procesarImagen(fileBuffer);
  const key = keyForTenant(tenantId, ext);

  const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
    contentType: mime,
    upsert: false, // key única → nunca sobrescribimos; así podemos cachear alto
    cacheControl: '31536000, immutable',
  });
  if (error) {
    console.error('❌ Error al subir imagen:', error.message);
    throw new Error('Error al subir la imagen');
  }
  return key;
}

async function obtenerSignedUrl(fileKey) {
  if (!fileKey) throw new Error('Clave requerida');

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(fileKey, SIGNED_TTL);

  if (error || !data?.signedUrl) {
    console.error('❌ Error al generar URL firmada:', error?.message);
    throw new Error('Error al generar URL firmada');
  }
  return data.signedUrl;
}

async function eliminarImagen(fileKey) {
  // idempotente
  if (!fileKey) return true;

  const { error } = await supabase.storage.from(BUCKET).remove([fileKey]);
  if (error) {
    console.error('❌ Error al eliminar imagen:', error.message);
    throw new Error('Error al eliminar imagen');
  }
  return true;
}

module.exports = {
  BUCKET,
  SIGNED_TTL,
  subirImagenNegocio,
  obtenerSignedUrl,
  eliminarImagen,
};
