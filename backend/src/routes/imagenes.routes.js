// src/routes/imagenes.routes.js
const express = require('express');
const multer = require('multer');
const router = express.Router({ mergeParams: true });

const { subirImagenNegocio, obtenerSignedUrl, eliminarImagen } = require('../services/storage.service');
const requireAuth = require('../middlewares/requireAuth');
const { supabase } = require('../utils/supabaseClient');

// MemoryStorage + límite de 8 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

// Helper para leer la key actual del tenant
async function getTenantBannerKey(tenantId) {
  const { data, error } = await supabase
    .from('tenants')
    .select('imagen_fondo')
    .eq('id', tenantId)
    .maybeSingle();
  if (error) throw error;
  return data?.imagen_fondo || null;
}

// POST /api/imagenes/subir
router.post('/subir', requireAuth, upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo no proporcionado' });

    const tenantId = req.tenant_id || req.tenant?.id;
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const previousKey = await getTenantBannerKey(tenantId);

    // 1) Subimos nueva optimizada (key única)
    const newKey = await subirImagenNegocio(tenantId, req.file.buffer);

    // 2) Guardamos en BD
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ imagen_fondo: newKey })
      .eq('id', tenantId);
    if (updateError) {
      console.error('❌ Error al actualizar imagen en tenant:', updateError.message);
      return res.status(500).json({ error: 'Error al guardar imagen en la base de datos' });
    }

    // 3) Eliminamos la anterior (si había)
    if (previousKey && previousKey !== newKey) {
      try {
        await eliminarImagen(previousKey);
      } catch (e) {
        // no interrumpimos al usuario; solo log
        console.warn('⚠ No se pudo eliminar banner anterior:', e?.message);
      }
    }

    // 4) URL firmada para mostrar en el front
    const signedUrl = await obtenerSignedUrl(newKey);
    return res.json({ success: true, key: newKey, url: signedUrl });
  } catch (err) {
    const msg = err?.message || 'Error al subir imagen';
    console.error('❌ [imagenes] subir:', msg);
    return res.status(500).json({ error: msg });
  }
});

// GET /api/imagenes/obtener
router.get('/obtener', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.tenant?.id;
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const key = await getTenantBannerKey(tenantId);
    if (!key) return res.json({ key: null, url: null });

    const signedUrl = await obtenerSignedUrl(key);
    return res.json({ key, url: signedUrl });
  } catch (err) {
    console.error('❌ [imagenes] obtener:', err?.message);
    return res.status(500).json({ error: 'Error al obtener imagen' });
  }
});

// DELETE /api/imagenes/eliminar
router.delete('/eliminar', requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenant_id || req.tenant?.id;
    if (!tenantId) return res.status(403).json({ error: 'Tenant no resuelto' });

    const key = await getTenantBannerKey(tenantId);
    if (key) await eliminarImagen(key);

    const { error } = await supabase
      .from('tenants')
      .update({ imagen_fondo: null })
      .eq('id', tenantId);
    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    console.error('❌ [imagenes] eliminar:', err?.message);
    return res.status(500).json({ error: 'Error al eliminar imagen' });
  }
});

module.exports = router;
