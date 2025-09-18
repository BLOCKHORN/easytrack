// src/utils/tenant.js
import { supabase } from "./supabaseClient";

/**
 * Devuelve el tenant_id del usuario logueado o lanza un error claro.
 * Orden de resolución:
 * 1) memberships (canónico)
 * 2) tenants.email (retrocompatibilidad)
 */
export async function getTenantIdOrThrow() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("No hay sesión activa.");

  // 1) memberships = fuente oficial
  const { data: mem, error: memErr } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (memErr) throw new Error("No se pudo leer memberships.");
  if (mem?.tenant_id) return mem.tenant_id;

  // 2) compat por email en tenants
  const { data: ten, error: tenErr } = await supabase
    .from("tenants")
    .select("id")
    .eq("email", user.email)
    .limit(1)
    .maybeSingle();

  if (tenErr) throw new Error("No se pudo resolver el negocio del usuario.");
  if (ten?.id) return ten.id;

  throw new Error("Tu usuario no está asociado a ningún negocio.");
}

/** Alias cómodo para quien importe { getTenantId } */
export async function getTenantId() {
  return getTenantIdOrThrow();
}
