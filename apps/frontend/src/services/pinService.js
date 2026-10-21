import { apiFetch } from '../utils/fetcher';

export async function getPinStatus(identifier) {
  if (!identifier) throw new Error("Falta identificador del negocio.");
  const res = await apiFetch(`/api/tenants/${encodeURIComponent(identifier)}/pin/status`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al obtener estado del PIN');
  }
  const data = await res.json();
  return {
    enabled: !!data?.enabled,
    updatedAt: data?.updatedAt || null,
  };
}

export async function verifyPin(identifier, pin) {
  if (!identifier) throw new Error("Falta identificador del negocio.");
  const res = await apiFetch('/api/auth/verify-pin', {
    method: 'POST',
    body: {
      identifier,
      pin: String(pin || '').trim()
    }
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'PIN incorrecto');
  }
  
  const data = await res.json();
  return !!data?.ok;
}

export async function setPin(identifier, newPin, currentPin = null) {
  if (!identifier) throw new Error("Falta identificador del negocio.");
  const res = await apiFetch(`/api/tenants/${encodeURIComponent(identifier)}/pin/set`, {
    method: 'POST',
    body: {
      newPin: String(newPin || '').trim(),
      currentPin: currentPin != null ? String(currentPin).trim() : null
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'El PIN actual es incorrecto o hubo un error al actualizarlo.');
  }

  const data = await res.json();
  return !!data?.updated;
}

export async function disablePin(identifier) {
  if (!identifier) throw new Error("Falta identificador del negocio.");
  const res = await apiFetch(`/api/tenants/${encodeURIComponent(identifier)}/pin/disable`, {
    method: 'POST'
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al desactivar PIN');
  }

  const data = await res.json();
  return !!data?.disabled;
}