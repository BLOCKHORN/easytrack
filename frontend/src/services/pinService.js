// src/services/pinService.js
import { supabase } from '../utils/supabaseClient';

// helper: toma la primera fila si llega un array
const first = (d) => (Array.isArray(d) ? d[0] : d) || null;

export async function getPinStatus(tenantId) {
  const { data, error } = await supabase.rpc('tenant_pin_status', { p_tenant: tenantId });
  if (error) throw error;
  const row = first(data);
  return {
    enabled: !!row?.enabled,
    updatedAt: row?.updated_at || null,
  };
}

export async function verifyPin(tenantId, pin) {
  const { data, error } = await supabase.rpc('tenant_pin_verify', {
    p_tenant: tenantId,
    p_pin: String(pin || ''),
  });
  if (error) throw error;
  const row = first(data);
  return !!row?.ok;
}

export async function setPin(tenantId, newPin, currentPin = null) {
  const { data, error } = await supabase.rpc('tenant_pin_set', {
    p_tenant: tenantId,
    p_new_pin: String(newPin || ''),
    p_current_pin: currentPin != null ? String(currentPin) : null,
  });
  if (error) throw error;
  const row = first(data);
  if (!row?.updated) throw new Error('No se pudo actualizar el PIN');
  return true;
}

export async function disablePin(tenantId) {
  const { data, error } = await supabase.rpc('tenant_pin_disable', { p_tenant: tenantId });
  if (error) throw error;
  const row = first(data);
  return !!row?.disabled;
}
