// src/pages/account/AccountSettings.jsx
import { useEffect, useMemo, useState } from "react";
import {
  MdMail, MdPassword, MdSecurity, MdLogout, MdInfo,
  MdVisibility, MdVisibilityOff, MdAutorenew, MdCancel,
} from "react-icons/md";
import { supabase } from "../../utils/supabaseClient";
import { getTenantIdOrThrow } from "../../utils/tenant";
import "./AccountSettings.scss";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

/* ===== Reauth helpers (compartidos con guardado global) ===== */
async function reauthWithPassword(email, password){
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data?.session;
}

export async function applyEmailDraft({ currentEmail, nextEmail }) {
  if (!nextEmail || nextEmail === currentEmail) return { ok: true };
  const pwd = window.prompt("Confirma tu contraseña para cambiar el email:");
  if (!pwd) return { error: new Error("Operación cancelada por el usuario") };
  await reauthWithPassword(currentEmail, pwd);
  const { error } = await supabase.auth.updateUser({ email: nextEmail });
  if (error) return { error };
  return { ok: true, notice: "Te hemos enviado un correo de confirmación. El cambio se aplicará cuando lo confirmes." };
}

export async function applyPasswordDraft({ currentEmail, pwd1, pwd2 }) {
  if (!pwd1 && !pwd2) return { ok: true };
  if (!pwd1 || !pwd2) return { error: new Error("Rellena ambos campos de contraseña.") };
  if (pwd1.length < 8) return { error: new Error("La contraseña debe tener al menos 8 caracteres.") };
  if (pwd1 !== pwd2) return { error: new Error("Las contraseñas no coinciden.") };

  const pwd = window.prompt("Introduce tu contraseña actual:");
  if (!pwd) return { error: new Error("Operación cancelada por el usuario") };
  await reauthWithPassword(currentEmail, pwd);
  const { error } = await supabase.auth.updateUser({ password: pwd1 });
  if (error) return { error };
  return { ok: true, notice: "Contraseña actualizada correctamente." };
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

/* ===== Billing helpers ===== */
const eur0 = (c) => (Number.isFinite(+c) ? (c/100).toLocaleString("es-ES",{maximumFractionDigits:0}) : "—");
const fmtDate = (iso) => { if(!iso) return "—"; const d=new Date(iso); return isNaN(+d)?"—":d.toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"numeric"}); };
const humanRemaining = (iso) => { if(!iso) return "—"; const ms=new Date(iso).getTime()-Date.now(); if(ms<=0) return "hoy"; const days=Math.ceil(ms/86400000); return days>60?`en ${Math.round(days/30)} meses`:`en ${days} día${days!==1?"s":""}`; };
const periodLabel = (m) => (m===12?"1 año":m===1?"1 mes":`${m} meses`);
const marketingName = (code, fallback) => (code === 'monthly' ? 'Premium' : (fallback || 'Plan'));

/* ===== Carga de suscripción ===== */
async function fetchSubscriptionFromDB(userId){
  let primaryTenant = null;
  try { primaryTenant = await getTenantIdOrThrow(); } catch {}
  let tenantIds = [];
  if (primaryTenant) tenantIds.push(primaryTenant);

  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  }
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

  const getWithPlan = async (subRow) => {
    if (!subRow) return null;

    let plan = null;
    try {
      const { data: p } = await supabase
        .from("billing_plans")
        .select("id,code,name,base_price_cents,period_months")
        .eq("id", subRow.plan_id)
        .maybeSingle();
      plan = p || null;
    } catch {}

    const base   = Number(plan?.base_price_cents)||0;
    const months = Number(plan?.period_months)||1;
    const perMonth = months>0 ? Math.round(base/months) : base;

    const isTrial = String(subRow.status||"").toLowerCase()==="trialing" && subRow.trial_ends_at;
    const nextAt  = subRow.current_period_end || subRow.trial_ends_at || null;
    const pStart  = subRow.current_period_start || subRow.created_at || null;
    const pEnd    = subRow.current_period_end || subRow.trial_ends_at || null;

    return {
      id: subRow.id,
      provider: subRow.provider,
      status: subRow.status,
      cancel_at_period_end: !!subRow.cancel_at_period_end,
      trial_ends_at: subRow.trial_ends_at,
      current_period_start: subRow.current_period_start,
      current_period_end: subRow.current_period_end,

      plan_code: plan?.code || null,
      plan_label: marketingName(plan?.code, plan?.name),
      price_cents: base,
      price_month_cents: perMonth,
      period_months: months,
      period_label: periodLabel(months),

      next_label: isTrial ? "Fin de prueba" : "Próxima facturación",
      next_billing_at: nextAt,
      remaining_label: humanRemaining(nextAt),

      period_start: pStart,
      period_end: pEnd,
    };
  };

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

/* ===== API helper ===== */
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

export default function AccountSettings({ usuario = null, onDraftChange }){
  const [user, setUser] = useState(usuario);
  const [loading, setLoading] = useState(!usuario);

  const [emailDraft, setEmailDraft] = useState(usuario?.email || "");
  const [emailMsg, setEmailMsg] = useState("");

  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [showPwd1, setShowPwd1] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const pwdStrength = useMemo(() => scorePassword(pwd1), [pwd1]);
  const pwdStrengthCls = strengthClass(pwdStrength.label);

  const provider = useMemo(() => user?.app_metadata?.provider || user?.identities?.[0]?.provider || "email", [user]);

  const [sub, setSub] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [subMsg, setSubMsg] = useState("");

  // cargar user si no viene
  useEffect(() => {
    let mounted = true;
    if (!usuario) {
      (async () => {
        const { data } = await supabase.auth.getUser();
        if (mounted) {
          setUser(data?.user || null);
          setEmailDraft(data?.user?.email || "");
          setLoading(false);
        }
      })();
    } else {
      setUser(usuario);
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [usuario]);

  // suscripción
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
  useEffect(() => { loadSubscription().catch(()=>{}); /* no-bail */ }, [user?.id]);

  // emitir borrador al padre
  useEffect(() => {
    onDraftChange?.({
      emailDraft,
      pwd1,
      pwd2,
      provider,
    });

    // Validaciones suaves (no bloqueantes, solo hints)
    setEmailMsg(() => {
      if (!emailDraft) return "";
      if (emailDraft === (user?.email || "")) return "";
      return isValidEmail(emailDraft) ? "" : "Introduce un email válido.";
    });
    setPwdMsg(() => {
      if (!pwd1 && !pwd2) return "";
      if (pwd1 && pwd1.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
      if (pwd1 !== pwd2) return "Las contraseñas no coinciden.";
      return "";
    });
  }, [emailDraft, pwd1, pwd2, provider, user?.email, onDraftChange]);

  const cancelAtPeriodEnd = async () => {
    if (!window.confirm("¿Cancelar la renovación automática? Se mantendrá activo hasta el fin del periodo actual.")) return;
    try {
      const r = await authedFetch("/api/billing/cancel-renewal", { method:"POST" });
      if (!r.ok) throw new Error(await r.text().catch(()=> "No se pudo cancelar"));
      await loadSubscription();
      setSubMsg("La suscripción no se renovará. Seguirá activa hasta la fecha indicada.");
    } catch (e) { setSubMsg(e.message || "No se pudo cancelar la renovación."); }
  };
  const resumeRenewal = async () => {
    if (!window.confirm("¿Reactivar la renovación automática?")) return;
    try {
      const r = await authedFetch("/api/billing/resume", { method:"POST" });
      if (!r.ok) throw new Error(await r.text().catch(()=> "No se pudo reactivar"));
      await loadSubscription();
      setSubMsg("Renovación automática reactivada.");
    } catch (e) { setSubMsg(e.message || "No se pudo reactivar la renovación."); }
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
      <header className="card__header acct__header">
        <div className="acct__left">
          <div className="acct__avatar" aria-hidden>{initialFromEmail(user?.email)}</div>
          <div className="acct__meta">
            <h3 className="acct__title">Tu cuenta</h3>
            <p className="acct__email">
              <span className="acct__emailText" title={user?.email}>{user?.email}</span>
              <span className={`chip chip--prov chip--${provider}`}>{provider}</span>
            </p>
          </div>
        </div>
      </header>

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
              </div>

              {subMsg && <div className="note" role="status"><MdInfo aria-hidden /> {subMsg}</div>}
            </>
          ) : subLoading ? null : (
            <div className="note">
              <MdInfo aria-hidden /> No hemos encontrado una suscripción activa para tu cuenta.
            </div>
          )}
        </section>

        {/* Email (borrador, sin guardar aquí) */}
        <section className="acct__block">
          <div className="blk__head">
            <h4 className="blk__title"><MdMail /> Cambiar email</h4>
            {provider !== "email" && <span className="hint">Bloqueado por proveedor</span>}
          </div>

          <p className="muted">Email actual: <strong>{user?.email}</strong></p>

          <div className="form-row">
            <label className="field">
              <span className="label">Nuevo email</span>
              <input
                type="email"
                value={emailDraft}
                onChange={(e)=>setEmailDraft(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                disabled={provider!=="email"}
                aria-invalid={!!emailMsg}
              />
              <span className="field__hint" />
            </label>
          </div>

          {!!emailMsg && <div className="note" role="status"><MdInfo aria-hidden /> {emailMsg}</div>}
          {(provider === "email" && emailDraft && emailDraft !== (user?.email || "")) && (
            <div className="pending">Cambios pendientes: se aplicarán al guardar.</div>
          )}
        </section>

        {/* Password (borrador, sin guardar aquí) */}
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
                    <input
                      type={showPwd1?"text":"password"}
                      value={pwd1}
                      onChange={(e)=>setPwd1(e.target.value)}
                      autoComplete="new-password"
                      placeholder="********"
                      aria-describedby="pwd-strength"
                    />
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
                    <input
                      type={showPwd2?"text":"password"}
                      value={pwd2}
                      onChange={(e)=>setPwd2(e.target.value)}
                      autoComplete="new-password"
                      placeholder="********"
                    />
                    <button type="button" className="icon-btn" onClick={()=>setShowPwd2(v=>!v)} aria-label={showPwd2?"Ocultar contraseña":"Mostrar contraseña"}>
                      <MdVisibilityOff style={{display:showPwd2?"block":"none"}}/><MdVisibility style={{display:showPwd2?"none":"block"}}/>
                    </button>
                  </div>
                  <span className="field__hint" />
                </label>
              </div>

              {!!pwdMsg && <div className="note" role="status"><MdInfo aria-hidden /> {pwdMsg}</div>}
              {(pwd1 || pwd2) && !pwdMsg && (
                <div className="pending">Cambios pendientes: se aplicarán al guardar.</div>
              )}
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
