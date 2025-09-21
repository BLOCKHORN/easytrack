// src/pages/account/AccountSettings.jsx
import { useEffect, useMemo, useState } from "react";
import {
  MdMail, MdPassword, MdSecurity, MdLogout, MdSave, MdInfo,
  MdVisibility, MdVisibilityOff, MdAutorenew, MdCancel,
} from "react-icons/md";
import { supabase } from "../../utils/supabaseClient";
import { getTenantIdOrThrow } from "../../utils/tenant";
import "./AccountSettings.scss";

/* ===== (opcional) endpoints para cancelar/reanudar si los tienes en tu API ===== */
const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

/* ===== Reauth helpers ===== */
async function reauthWithPassword(email, password){
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data?.session;
}
async function updateEmailSecured(currentEmail, newEmail){
  const pwd = window.prompt("Confirma tu contraseña para cambiar el email:");
  if (!pwd) return { error: new Error("Operación cancelada por el usuario") };
  await reauthWithPassword(currentEmail, pwd);
  return await supabase.auth.updateUser({ email: newEmail });
}
async function updatePasswordSecured(currentEmail, newPassword){
  const pwd = window.prompt("Introduce tu contraseña actual:");
  if (!pwd) return { error: new Error("Operación cancelada por el usuario") };
  await reauthWithPassword(currentEmail, pwd);
  return await supabase.auth.updateUser({ password: newPassword });
}

/* ===== UI utils ===== */
const initialFromEmail = (email="") => (email.trim()[0] || "U").toUpperCase();
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
function scorePassword(pwd){
  let score = 0; if (!pwd) return { score:0, label:"Muy débil" };
  const len = pwd.length, hasLower=/[a-z]/.test(pwd), hasUpper=/[A-Z]/.test(pwd), hasDigit=/[0-9]/.test(pwd), hasSymb=/[^A-Za-z0-9]/.test(pwd);
  score += Math.min(len,12) + (hasLower?2:0) + (hasUpper?3:0) + (hasDigit?3:0) + (hasSymb?4:0);
  const pct = Math.min(100, Math.round((score/24)*100));
  const label = pct>=75?"Fuerte":pct>=50?"Media":pct>=25?"Débil":"Muy débil";
  return { score:pct, label };
}
const strengthClass = (label) => label==="Fuerte"?"strong":label==="Media"?"medium":label==="Débil"?"weak":"very-weak";

/* ===== Billing formatters ===== */
const eur0 = (c) => (Number.isFinite(+c) ? (c/100).toLocaleString("es-ES",{maximumFractionDigits:0}) : "—");
const fmtDate = (iso) => { if(!iso) return "—"; const d=new Date(iso); return isNaN(+d)?"—":d.toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"numeric"}); };
const humanRemaining = (iso) => { if(!iso) return "—"; const ms=new Date(iso).getTime()-Date.now(); if(ms<=0) return "hoy"; const days=Math.ceil(ms/86400000); return days>60?`en ${Math.round(days/30)} meses`:`en ${days} día${days!==1?"s":""}`; };
const periodLabel = (m) => (m===12?"1 año":m===1?"1 mes":`${m} meses`);

/* ===== Carga desde Supabase con fallback por memberships ===== */
async function fetchSubscriptionFromDB(userId){
  // 1) tenant “actual” (si falla, probamos todos los tenants del usuario)
  let primaryTenant = null;
  try { primaryTenant = await getTenantIdOrThrow(); } catch {}
  let tenantIds = [];
  if (primaryTenant) tenantIds.push(primaryTenant);

  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  }

  // 2) añade todos los tenants en los que el usuario es miembro (por si el “actual” no coincide)
  try {
    if (userId) {
      const { data: memRows } = await supabase
        .from("memberships")
        .select("tenant_id")
        .eq("user_id", userId);
      const extra = (memRows||[]).map(r => r.tenant_id).filter(Boolean);
      tenantIds = Array.from(new Set([...tenantIds, ...extra]));
    }
  } catch {}

  if (tenantIds.length === 0) return null;

  // helper para obtener la fila + plan
  const getWithPlan = async (subRow) => {
    if (!subRow) return null;
    let plan = null;
    try {
      const { data: p } = await supabase
        .from("billing_plans")
        .select("id,name,base_price_cents,period_months")
        .eq("id", subRow.plan_id)
        .maybeSingle();
      plan = p || null;
    } catch {}
    const base = Number(plan?.base_price_cents)||0;
    const months = Number(plan?.period_months)||1;
    const perMonth = months>0 ? Math.round(base/months) : base;

    const isTrial = String(subRow.status||"").toLowerCase()==="trialing" && subRow.trial_ends_at;
    const nextAt = isTrial ? subRow.trial_ends_at : subRow.current_period_end;

    return {
      id: subRow.id,
      provider: subRow.provider,
      status: subRow.status,
      cancel_at_period_end: !!subRow.cancel_at_period_end,
      trial_ends_at: subRow.trial_ends_at,
      current_period_start: subRow.current_period_start,
      current_period_end: subRow.current_period_end,

      plan_label: plan?.name || "Plan",
      price_cents: base,
      price_month_cents: perMonth,
      period_months: months,
      period_label: periodLabel(months),

      next_label: isTrial ? "Fin de prueba" : "Próxima facturación",
      next_billing_at: nextAt,
      remaining_label: humanRemaining(nextAt),

      period_start: isTrial ? (subRow.created_at || subRow.current_period_start) : subRow.current_period_start,
      period_end: isTrial ? subRow.trial_ends_at : subRow.current_period_end,
    };
  };

  // 3) primero intentamos por el tenant principal
  if (primaryTenant) {
    try {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", primaryTenant)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sub) return await getWithPlan(sub);
    } catch {}
  }

  // 4) si no hay nada, buscamos en cualquiera de los tenants del usuario
  try {
    const { data: subsAny } = await supabase
      .from("subscriptions")
      .select("*")
      .in("tenant_id", tenantIds)
      .order("created_at", { ascending: false })
      .limit(1);
    if (subsAny && subsAny.length) return await getWithPlan(subsAny[0]);
  } catch {}

  return null;
}

/* ===== API para cancelar/reanudar (si la tienes) ===== */
async function authedFetch(path, opts = {}){
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("No auth");
  return fetch(`${API_BASE}${path}`, {
    method: opts.method || "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers||{}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

export default function AccountSettings(){
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // email
  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");

  // password
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [showPwd1, setShowPwd1] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const pwdStrength = useMemo(() => scorePassword(pwd1), [pwd1]);
  const pwdStrengthCls = strengthClass(pwdStrength.label);

  const provider = useMemo(() => user?.app_metadata?.provider || user?.identities?.[0]?.provider || "email", [user]);

  // suscripción
  const [sub, setSub] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [subMsg, setSubMsg] = useState("");

  async function loadSubscription(){
    setSubLoading(true); setSubMsg("");
    try {
      const s = await fetchSubscriptionFromDB(user?.id);
      setSub(s || null);
    } catch (e) {
      console.error("[AccountSettings] loadSubscription:", e);
      setSub(null);
      setSubMsg("No se pudo cargar la suscripción.");
    } finally {
      setSubLoading(false);
    }
  }

  async function cancelAtPeriodEnd(){
    if (!window.confirm("¿Cancelar la renovación automática? Se mantendrá activo hasta el fin del periodo actual.")) return;
    try {
      const r = await authedFetch("/api/billing/cancel-renewal", { method:"POST" });
      if (!r.ok) throw new Error(await r.text().catch(()=> "No se pudo cancelar"));
      await loadSubscription();
      setSubMsg("La suscripción no se renovará. Seguirá activa hasta la fecha indicada.");
    } catch (e) { setSubMsg(e.message || "No se pudo cancelar la renovación."); }
  }
  async function resumeRenewal(){
    if (!window.confirm("¿Reactivar la renovación automática?")) return;
    try {
      const r = await authedFetch("/api/billing/resume", { method:"POST" });
      if (!r.ok) throw new Error(await r.text().catch(()=> "No se pudo reactivar"));
      await loadSubscription();
      setSubMsg("Renovación automática reactivada.");
    } catch (e) { setSubMsg(e.message || "No se pudo reactivar la renovación."); }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) {
        setUser(data?.user || null);
        setEmail(data?.user?.email || "");
        setLoading(false);
      }
    })();
    // carga la suscripción al montar
    loadSubscription().catch(()=>{});
    return () => { mounted = false; };
  }, []);

  const updateEmail = async () => {
    setEmailMsg("");
    const current = user?.email || "";
    const next = (email || "").trim();
    if (provider !== "email") return setEmailMsg(`Tu cuenta usa ${provider}. Cambia el email en ese proveedor.`);
    if (!next || next === current) return setEmailMsg("Introduce un email distinto.");
    if (!isValidEmail(next)) return setEmailMsg("Introduce un email válido.");
    setSavingEmail(true);
    const { error } = await updateEmailSecured(current, next);
    setSavingEmail(false);
    if (error) return setEmailMsg(error.message || "No se pudo actualizar el email.");
    setEmailMsg("Te hemos enviado un correo de confirmación. El cambio se aplicará cuando lo confirmes.");
  };

  const updatePassword = async () => {
    setPwdMsg("");
    if (provider !== "email") return setPwdMsg(`Tu cuenta usa ${provider}. La contraseña se gestiona en ese proveedor.`);
    if (!pwd1 || !pwd2) return setPwdMsg("Rellena ambos campos.");
    if (pwd1.length < 8) return setPwdMsg("La contraseña debe tener al menos 8 caracteres.");
    if (pwd1 !== pwd2) return setPwdMsg("Las contraseñas no coinciden.");
    setSavingPwd(true);
    const { error } = await updatePasswordSecured(user?.email || "", pwd1);
    setSavingPwd(false);
    if (error) return setPwdMsg(error.message || "No se pudo actualizar la contraseña.");
    setPwd1(""); setPwd2(""); setPwdMsg("Contraseña actualizada correctamente.");
  };

  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" });
    window.location.reload();
  };

  if (loading) {
    return (<div className="acct card"><div className="acct__skeleton" /></div>);
  }

  return (
    <div className="acct card">
      {/* Header */}
      <header className="card__header acct__header">
        <div className="acct__left">
          <div className="acct__avatar" aria-hidden>{initialFromEmail(user?.email)}</div>
          <div className="acct__meta">
            <h3 className="acct__title">Tu cuenta</h3>
            <p className="acct__email">{user?.email}<span className={`chip chip--prov chip--${provider}`}>{provider}</span></p>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="acct__stack">
        {/* Suscripción */}
        <section className="acct__block acct__block--billing">
          <div className="blk__head">
            <h4 className="blk__title"><MdAutorenew /> Suscripción</h4>
            {subLoading && <span className="hint">Cargando…</span>}
          </div>

          {sub ? (
            <>
              <div className="billing__row">
                <div className="billing__k">Plan</div>
                <div className="billing__v">
                  <strong>{sub.plan_label}</strong> · {eur0(sub.price_month_cents)} €/mes
                  <span className="muted"> ({eur0(sub.price_cents)} € / {sub.period_label})</span>
                </div>
              </div>

              <div className="billing__row">
                <div className="billing__k">Estado</div>
                <div className="billing__v">
                  <span className={`badge badge--${String(sub.status||"").toLowerCase()}`}>{sub.status}</span>{" "}
                  {sub.cancel_at_period_end ? (
                    <span className="muted">· No se renovará al finalizar el periodo</span>
                  ) : (
                    <span className="muted">· Renovación automática activa</span>
                  )}
                </div>
              </div>

              <div className="billing__row">
                <div className="billing__k">Proveedor</div>
                <div className="billing__v">{sub.provider || "—"}</div>
              </div>

              <div className="billing__row">
                <div className="billing__k">Periodo actual</div>
                <div className="billing__v">{fmtDate(sub.period_start)} → {fmtDate(sub.period_end)}</div>
              </div>

              <div className="billing__row">
                <div className="billing__k">{sub.next_label}</div>
                <div className="billing__v">{fmtDate(sub.next_billing_at)} <span className="muted">({sub.remaining_label})</span></div>
              </div>

              <div className="actions">
                {!sub.cancel_at_period_end ? (
                  <button className="btn btn--danger" onClick={cancelAtPeriodEnd}><MdCancel /> Cancelar renovación</button>
                ) : (
                  <button className="btn btn--primary" onClick={resumeRenewal}><MdAutorenew /> Reanudar renovación</button>
                )}
                {/* Sin botón de “Ver facturas / cambiar tarjeta” por ahora */}
              </div>

              {subMsg && <div className="note" role="status"><MdInfo aria-hidden /> {subMsg}</div>}
            </>
          ) : subLoading ? null : (
            <div className="note">
              <MdInfo aria-hidden /> No hemos encontrado una suscripción activa para tu cuenta.
            </div>
          )}
        </section>

        {/* Email */}
        <section className="acct__block">
          <div className="blk__head">
            <h4 className="blk__title"><MdMail /> Cambiar email</h4>
            {provider !== "email" && <span className="hint">Bloqueado por proveedor</span>}
          </div>

          <p className="muted">Email actual: <strong>{user?.email}</strong></p>

          <div className="form-row">
            <label className="field">
              <span className="label">Nuevo email</span>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)}
                     placeholder="tu@email.com" autoComplete="email"
                     disabled={provider!=="email" || savingEmail} aria-invalid={!!emailMsg}/>
              <span className="field__hint" />
            </label>

            <button className="btn btn--primary" onClick={updateEmail} disabled={provider!=="email" || savingEmail}>
              {savingEmail ? "Guardando…" : (<><MdSave /> Guardar</>)}
            </button>
          </div>

          {emailMsg && <div className="note" role="status"><MdInfo aria-hidden /> {emailMsg}</div>}
        </section>

        {/* Password */}
        <section className="acct__block">
          <div className="blk__head">
            <h4 className="blk__title"><MdPassword /> Cambiar contraseña</h4>
            <span className="hint">Mínimo 8 caracteres</span>
          </div>

          {provider !== "email" ? (
            <div className="note"><MdInfo aria-hidden /> Tu cuenta usa <strong>{provider}</strong>. La contraseña se gestiona en ese proveedor.</div>
          ) : (
            <>
              <div className="form-col2">
                <label className="field">
                  <span className="label">Nueva contraseña</span>
                  <div className="has-right-icon">
                    <input type={showPwd1?"text":"password"} value={pwd1} onChange={(e)=>setPwd1(e.target.value)} autoComplete="new-password" placeholder="********" aria-describedby="pwd-strength"/>
                    <button type="button" className="icon-btn" onClick={()=>setShowPwd1(v=>!v)} aria-label={showPwd1?"Ocultar contraseña":"Mostrar contraseña"}>
                      <MdVisibilityOff style={{display:showPwd1?"block":"none"}}/><MdVisibility style={{display:showPwd1?"none":"block"}}/>
                    </button>
                  </div>
                  <div id="pwd-strength" className="strength" aria-live="polite">
                    <div className={`bar bar--${pwdStrengthCls}`} style={{ width: `${pwdStrength.score}%` }} />
                    <span className="strength__label">{pwdStrength.label}</span>
                  </div>
                </label>

                <label className="field">
                  <span className="label">Repetir contraseña</span>
                  <div className="has-right-icon">
                    <input type={showPwd2?"text":"password"} value={pwd2} onChange={(e)=>setPwd2(e.target.value)} autoComplete="new-password" placeholder="********"/>
                    <button type="button" className="icon-btn" onClick={()=>setShowPwd2(v=>!v)} aria-label={showPwd2?"Ocultar contraseña":"Mostrar contraseña"}>
                      <MdVisibilityOff style={{display:showPwd2?"block":"none"}}/><MdVisibility style={{display:showPwd2?"none":"block"}}/>
                    </button>
                  </div>
                  <span className="field__hint" />
                </label>
              </div>

              <div className="actions">
                <button className="btn btn--primary" onClick={updatePassword} disabled={savingPwd}>
                  {savingPwd ? "Guardando…" : (<><MdSave /> Guardar</>)}
                </button>
              </div>

              {pwdMsg && <div className="note" role="status"><MdInfo aria-hidden /> {pwdMsg}</div>}
            </>
          )}
        </section>

        {/* Seguridad */}
        <section className="acct__block acct__block--sec">
          <h4 className="blk__title"><MdSecurity /> Seguridad</h4>
          <p className="muted">Cierra tus sesiones activas en otros dispositivos.</p>
          <button className="btn btn--outline btn--full" onClick={signOutAll}>
            <MdLogout /> Cerrar sesión en todos los dispositivos
          </button>
        </section>
      </div>
    </div>
  );
}
