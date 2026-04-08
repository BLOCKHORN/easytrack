import { supabase } from '../utils/supabaseClient';

const first = (d) => (Array.isArray(d) ? d[0] : d) || null;

// Helper: Convierte un slug en UUID si es necesario (vital para que funcione la URL pública y el panel)
async function resolveId(identifier) {
  if (!identifier) throw new Error("Falta identificador del negocio.");
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(identifier)) return identifier;

  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', identifier)
    .maybeSingle();
    
  if (!data?.id) throw new Error("Negocio no encontrado.");
  return data.id;
}

export async function getPinStatus(identifier) {
  const tenantId = await resolveId(identifier);
  const { data, error } = await supabase.rpc('tenant_pin_status', { p_tenant: tenantId });
  if (error) throw error;
  const row = first(data);
  return {
    enabled: !!row?.enabled,
    updatedAt: row?.updated_at || null,
  };
}

export async function verifyPin(identifier, pin) {
  const tenantId = await resolveId(identifier);
  const { data, error } = await supabase.rpc('tenant_pin_verify', {
    p_tenant: tenantId,
    p_pin: String(pin || ''),
  });
  if (error) throw error;
  const row = first(data);
  return !!row?.ok;
}

export async function setPin(identifier, newPin, currentPin = null) {
  const tenantId = await resolveId(identifier);
  const { data, error } = await supabase.rpc('tenant_pin_set', {
    p_tenant: tenantId,
    p_new_pin: String(newPin || ''),
    p_current_pin: currentPin != null ? String(currentPin) : null,
  });
  if (error) throw error;
  const row = first(data);
  if (!row?.updated) throw new Error('El PIN actual es incorrecto o hubo un error al actualizarlo.');
  return true;
}

export async function disablePin(identifier) {
  const tenantId = await resolveId(identifier);
  const { data, error } = await supabase.rpc('tenant_pin_disable', { p_tenant: tenantId });
  if (error) throw error;
  const row = first(data);
  return !!row?.disabled;
}