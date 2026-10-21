'use strict';

const { query } = require('../utils/db');

async function resolveTenantId(identifier) {
  if (!identifier) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  if (isUuid) return identifier;
  const { rows } = await query('SELECT id FROM public.tenants WHERE slug = $1 LIMIT 1', [identifier]);
  return rows[0]?.id || null;
}

async function getStatus(req, res) {
  try {
    const identifier = req.params.slug || req.params.tenantId || req.query.tenant || req.tenant?.id;
    const tenantId = await resolveTenantId(identifier);
    if (!tenantId) {
      return res.status(404).json({ ok: false, error: 'Negocio no encontrado' });
    }

    const { rows } = await query('SELECT * FROM public.tenant_pin_status($1::uuid)', [tenantId]);
    const row = rows[0] || null;
    return res.json({
      ok: true,
      enabled: !!row?.enabled,
      updatedAt: row?.updated_at || null
    });
  } catch (err) {
    console.error('[PIN getStatus Error]', err);
    return res.status(500).json({ ok: false, error: 'Error al consultar estado del PIN' });
  }
}

async function verify(req, res) {
  try {
    const identifier = req.params.slug || req.params.tenantId || req.body.tenantId || req.body.slug || req.body.identifier || req.tenant?.id;
    const pin = req.body.pin || req.body.p_pin;

    if (!pin) {
      return res.status(400).json({ ok: false, error: 'PIN requerido' });
    }

    const tenantId = await resolveTenantId(identifier);
    if (!tenantId) {
      return res.status(404).json({ ok: false, error: 'Negocio no encontrado' });
    }

    const { rows } = await query('SELECT * FROM public.tenant_pin_verify($1::uuid, $2::text)', [tenantId, String(pin).trim()]);
    const ok = !!rows[0]?.ok;

    return res.json({ ok });
  } catch (err) {
    console.error('[PIN verify Error]', err);
    return res.status(500).json({ ok: false, error: 'Error al verificar PIN' });
  }
}

async function setPin(req, res) {
  try {
    const identifier = req.params.slug || req.params.tenantId || req.body.tenantId || req.tenant?.id;
    const { newPin, currentPin } = req.body;

    if (!newPin) {
      return res.status(400).json({ ok: false, error: 'Nuevo PIN requerido' });
    }

    const tenantId = await resolveTenantId(identifier);
    if (!tenantId) {
      return res.status(404).json({ ok: false, error: 'Negocio no encontrado' });
    }

    const { rows } = await query(
      'SELECT * FROM public.tenant_pin_set($1::uuid, $2::text, $3::text)',
      [tenantId, String(newPin).trim(), currentPin ? String(currentPin).trim() : null]
    );

    const updated = !!rows[0]?.updated;
    if (!updated) {
      return res.status(400).json({ ok: false, error: 'El PIN actual es incorrecto o no se pudo actualizar' });
    }

    return res.json({ ok: true, updated: true });
  } catch (err) {
    console.error('[PIN setPin Error]', err);
    return res.status(500).json({ ok: false, error: 'Error al configurar el PIN' });
  }
}

async function disablePin(req, res) {
  try {
    const identifier = req.params.slug || req.params.tenantId || req.body.tenantId || req.tenant?.id;
    const tenantId = await resolveTenantId(identifier);
    if (!tenantId) {
      return res.status(404).json({ ok: false, error: 'Negocio no encontrado' });
    }

    const { rows } = await query('SELECT * FROM public.tenant_pin_disable($1::uuid)', [tenantId]);
    return res.json({ ok: true, disabled: !!rows[0]?.disabled });
  } catch (err) {
    console.error('[PIN disablePin Error]', err);
    return res.status(500).json({ ok: false, error: 'Error al desactivar PIN' });
  }
}

module.exports = {
  getStatus,
  verify,
  setPin,
  disablePin
};
