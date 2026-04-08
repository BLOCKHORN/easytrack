'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('./supabaseClient');

exports.uploadManyToBucket = async function uploadManyToBucket({ bucket, tenant_id, user_id, files }) {
  if (!bucket) throw new Error('Bucket requerido');
  const out = [];

  for (const f of files) {
    const originalName = f.originalname || f.name || 'file';
    const mime = f.mimetype || f.type || 'application/octet-stream';
    const size = f.size || (f.buffer ? f.buffer.length : 0);
    const key = `${tenant_id}/${uuidv4()}_${sanitizeFileName(originalName)}`;

    if (f.buffer) {
      const { error } = await supabaseAdmin.storage.from(bucket).upload(key, f.buffer, {
        contentType: mime, upsert: false,
      });
      if (error) throw error;
    } else if (f.path || f.filepath) {
      const filepath = f.path || f.filepath;
      const stream = fs.createReadStream(filepath);
      const { error } = await supabaseAdmin.storage.from(bucket).upload(key, stream, {
        contentType: mime, upsert: false,
      });
      if (error) throw error;
    } else {
      throw new Error('Formato de archivo no soportado');
    }

    const { data: signed, error: e2 } = await supabaseAdmin
      .storage.from(bucket)
      .createSignedUrl(key, 60 * 60 * 24 * 7);
    if (e2) throw e2;

    out.push({ nombre: originalName, url: signed.signedUrl, tamano: size, mime });
  }

  return out;
};

function sanitizeFileName(name) {
  return String(name).replace(/[^\w.\-]+/g, '_').slice(0, 140);
}
