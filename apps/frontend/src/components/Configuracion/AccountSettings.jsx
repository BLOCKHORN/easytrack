import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../utils/supabaseClient";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

// ==========================================
// ICONOS CUSTOM
// ==========================================
const IconUser = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconCreditCard = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const IconKey = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
const IconShield = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconExternalLink = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const IconEye = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEyeOff = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/></svg>;
const IconStar = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;

/* ===== HELPERS LOGICOS ===== */
async function reauthWithPassword(email, password) {
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

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

function scorePassword(pwd) {
  let score = 0; if (!pwd) return { score: 0, label: "Muy débil" };
  const len = pwd.length, hasLower = /[a-z]/.test(pwd), hasUpper = /[A-Z]/.test(pwd), hasDigit = /[0-9]/.test(pwd), hasSymb = /[^A-Za-z0-9]/.test(pwd);
  score += Math.min(len, 12) + (hasLower ? 2 : 0) + (hasUpper ? 3 : 0) + (hasDigit ? 3 : 0) + (hasSymb ? 4 : 0);
  const pct = Math.min(100, Math.round((score / 24) * 100));
  const label = pct >= 75 ? "Fuerte" : pct >= 50 ? "Media" : pct >= 25 ? "Débil" : "Muy débil";
  return { score: pct, label };
}

const strengthClass = (label) => label === "Fuerte" ? "bg-emerald-500" : label === "Media" ? "bg-amber-500" : label === "Débil" ? "bg-orange-500" : "bg-red-500";
const eur0 = (c) => (Number.isFinite(+c) ? (c / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");
const fmtDate = (iso) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(+d) ? "—" : d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }); };

async function authedFetch(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("No auth");
  return fetch(`${API_BASE}${path}`, {
    method: opts.method || "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

export default function AccountSettings({ usuario = null, onDraftChange }) {
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

  // Límites y Suscripción (Desde backend)
  const [limitsData, setLimitsData] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [subMsg, setSubMsg] = useState("");
  const [periodSel, setPeriodSel] = useState("m12");
  const [periodLoading, setPeriodLoading] = useState(false);
  const [periodOptions, setPeriodOptions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await authedFetch("/api/billing/period-options");
        if (r.ok) {
          const json = await r.json();
          setPeriodOptions(Array.isArray(json) ? json : []);
        }
      } catch {}
    })();
  }, []);

  const openPortal = async () => {
    try {
      setSubMsg(""); setPeriodLoading(true);
      const r = await authedFetch("/api/billing/portal", { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.hint || data.error || "No se pudo abrir el portal.");
      if (data.url) return window.location.href = data.url;
      throw new Error("Portal no disponible.");
    } catch (e) {
      setSubMsg(e.message || "No se pudo abrir el portal de facturación.");
    } finally {
      setPeriodLoading(false);
    }
  };

  const startPeriodCheckout = async () => {
    try {
      setSubMsg(""); setPeriodLoading(true);
      const planCode = periodSel === 'm12' ? 'annual' : 'monthly';
      const r = await authedFetch("/api/billing/checkout", {
        method: "POST",
        body: { plan_code: planCode }
      });
      if (!r.ok) throw new Error("No se pudo iniciar la pasarela de pago.");
      const { url } = await r.json();
      if (url) window.location.href = url;
    } catch (e) {
      setSubMsg(e.message);
    } finally {
      setPeriodLoading(false);
    }
  };

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

  async function loadLimits() {
    setSubLoading(true); setSubMsg("");
    try {
      const r = await authedFetch("/api/limits/me");
      if (!r.ok) throw new Error("No se pudieron cargar los límites");
      const data = await r.json();
      setLimitsData(data);
      if (data?.entitlements?.plan?.cadence === 'annual') setPeriodSel('m12');
      else setPeriodSel('m1');
    } catch (e) {
      setSubMsg("No se pudo cargar la información de facturación.");
    } finally {
      setSubLoading(false);
    }
  }

  useEffect(() => { loadLimits(); }, []);

  useEffect(() => {
    onDraftChange?.({ emailDraft, pwd1, pwd2, provider });
    setEmailMsg(() => (!emailDraft || emailDraft === (user?.email || "") || isValidEmail(emailDraft)) ? "" : "Introduce un email válido.");
    setPwdMsg(() => {
      if (!pwd1 && !pwd2) return "";
      if (pwd1 && pwd1.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
      if (pwd1 !== pwd2) return "Las contraseñas no coinciden.";
      return "";
    });
  }, [emailDraft, pwd1, pwd2, provider, user?.email, onDraftChange]);

  const signOutAll = async () => {
    if (!window.confirm("Se cerrará la sesión en todos los dispositivos. ¿Continuar?")) return;
    await supabase.auth.refreshSession();
    window.location.reload();
  };

  if (loading) return null;

  const ent = limitsData?.entitlements;
  const isPaid = !!ent?.is_paid;
  const isVip = ent?.trial?.quota > 10000;
  
  const status = String(ent?.plan?.status || "").toLowerCase();
  const isPaymentIssue = ["past_due", "unpaid", "incomplete"].includes(status);
  const isCanceled = status === "canceled";
  const isScheduledCancel = !!ent?.plan?.cancel_at_period_end;
  const currentPeriodKey = ent?.plan?.cadence === 'annual' ? 'm12' : 'm1';

  const trialUsed = ent?.trial?.used || 0;
  const trialQuota = ent?.trial?.quota || 250;
  const trialPct = Math.min(100, Math.round((trialUsed / trialQuota) * 100)) || 0;
  const isQuotaExceeded = !ent?.trial?.quota_ok;

  return (
    <div className="space-y-8">
      
      {/* CUENTA ACTIVA */}
      <div className="bg-white rounded-[2rem] border border-zinc-200/80 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-zinc-100 bg-zinc-50/30 flex items-center gap-5">
          <div className="w-14 h-14 bg-zinc-950 border border-zinc-200 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0">
            <IconUser />
          </div>
          <div>
            <h3 className="text-xl font-black text-zinc-950 tracking-tight">Cuenta Activa</h3>
            <p className="text-zinc-500 font-medium text-sm mt-1">
              Usuario: <span className="font-bold text-zinc-900">{user?.email}</span>
            </p>
          </div>
        </div>
      </div>

      {/* SUSCRIPCIÓN Y FACTURACIÓN */}
      <div className="bg-white rounded-[2rem] border border-zinc-200/80 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-zinc-100 bg-zinc-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center text-zinc-900 shadow-md shrink-0">
              <IconCreditCard />
            </div>
            <div>
              <h3 className="text-xl font-black text-zinc-950 tracking-tight">Suscripción y Facturación</h3>
              <p className="text-zinc-500 font-medium text-sm mt-1">Gestiona tu capacidad y método de pago.</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 md:p-8 bg-zinc-50/50">
          {subLoading ? (
             <div className="text-sm font-bold text-zinc-400 animate-pulse">Analizando capacidad de la cuenta...</div>
          ) : (
            <div className="space-y-6">
              
              {/* ESTADO DEL PLAN */}
              <div className="flex flex-wrap gap-x-12 gap-y-6 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Plan Actual</div>
                  <div className="text-xl font-black text-zinc-950 flex items-center gap-2">
                    {isPaid ? ent.plan.name : isVip ? 'Licencia Lifetime' : 'Prueba Gratuita'}
                    {isPaid && <div className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest flex items-center gap-1"><IconStar/> Premium</div>}
                  </div>
                </div>
                
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Estado</div>
                  <div className={`text-sm font-bold px-3 py-1 rounded-full border inline-flex items-center ${isPaid || isVip ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isQuotaExceeded ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {isPaid || isVip ? 'ACTIVO' : isQuotaExceeded ? 'LÍMITE ALCANZADO' : 'USO GRATUITO'}
                  </div>
                </div>

                {isPaid && (
                  <div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Próxima Factura</div>
                    <div className="text-sm font-bold text-zinc-900">{fmtDate(ent.plan.current_period_end)}</div>
                  </div>
                )}
              </div>

              {/* BARRA DE PROGRESO */}
              {!isPaid && !isVip && (
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <h4 className="text-sm font-black text-zinc-900">Capacidad Gratuita</h4>
                      <p className="text-xs font-medium text-zinc-500 mt-0.5">Paquetes procesados en tu cuenta</p>
                    </div>
                    <span className="text-sm font-black text-zinc-900">{trialUsed} <span className="text-zinc-400 font-medium">/ {trialQuota}</span></span>
                  </div>
                  
                  <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${trialPct >= 100 ? 'bg-red-500' : trialPct > 80 ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${trialPct}%` }} />
                  </div>
                  
                  {isQuotaExceeded && (
                    <div className="mt-4 text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                      Has alcanzado el límite de {trialQuota} paquetes. Actualiza tu plan para seguir registrando envíos sin restricciones.
                    </div>
                  )}
                </div>
              )}

              {isScheduledCancel && <div className="text-sm font-bold text-amber-600 bg-amber-50 p-4 rounded-xl border border-amber-200">La suscripción no se renovará al finalizar el periodo actual.</div>}
              {isPaymentIssue && <div className="text-sm font-bold text-red-600 bg-red-50 p-4 rounded-xl border border-red-200">Hay un problema con tu método de pago. Por favor, actualízalo en el portal.</div>}
              {subMsg && <div className="text-sm font-bold text-brand-600 bg-brand-50 p-4 rounded-xl border border-brand-200">{subMsg}</div>}

              <div className="flex flex-wrap gap-3 pt-2">
                {isPaid ? (
                  <button onClick={openPortal} disabled={periodLoading} className="px-6 py-3 rounded-xl font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-2 shadow-sm">
                    <IconExternalLink /> Gestionar en Portal Seguro
                  </button>
                ) : !isVip ? (
                  <button onClick={startPeriodCheckout} disabled={periodLoading} className="px-8 py-3.5 rounded-xl font-black text-sm bg-brand-500 hover:bg-brand-400 disabled:bg-zinc-200 disabled:text-zinc-400 text-white transition-all shadow-lg shadow-brand-500/20 active:scale-95">
                    {periodLoading ? "Cargando pasarela..." : "Desbloquear Plan Premium"}
                  </button>
                ) : null}
              </div>

              {(!isCanceled && !isPaymentIssue && periodOptions.length > 0 && !isVip) && (
                <div className="pt-8 mt-8 border-t border-zinc-200/60">
                  <h4 className="text-sm font-black text-zinc-900 mb-4">{isPaid ? 'Cambiar ciclo de facturación' : 'Elige tu ciclo de facturación'}</h4>
                  <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    {periodOptions.map((opt) => (
                      <button 
                        key={opt.key} 
                        onClick={() => setPeriodSel(opt.key)}
                        className={`flex-1 p-5 rounded-2xl border-2 text-left transition-all ${periodSel === opt.key ? 'border-brand-500 bg-white shadow-md' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-white'}`}
                      >
                        <div className={`text-sm font-black mb-1 ${periodSel === opt.key ? 'text-brand-600' : 'text-zinc-900'}`}>
                          {opt.label} 
                          {isPaid && currentPeriodKey === opt.key && <span className="ml-2 text-[10px] bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-md uppercase tracking-wider">Actual</span>}
                        </div>
                        <div className={`text-xs font-bold ${periodSel === opt.key ? 'text-brand-500' : 'text-zinc-500'}`}>
                          {eur0(opt.price_month_cents)} €/mes {opt.key === 'm12' && <span className="text-emerald-500 font-black ml-1">(2 meses gratis)</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                  {isPaid && (
                    <button onClick={startPeriodCheckout} disabled={periodLoading || periodSel === currentPeriodKey} className="px-6 py-3 rounded-xl font-bold text-sm bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white transition-all shadow-md active:scale-95">
                      {periodLoading ? "Procesando..." : "Confirmar cambio de ciclo"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CREDENCIALES Y SEGURIDAD */}
      <div className="bg-white rounded-[2rem] border border-zinc-200/80 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-zinc-100 bg-zinc-50/30 flex items-center gap-5">
          <div className="w-14 h-14 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center text-zinc-900 shadow-md shrink-0">
            <IconKey />
          </div>
          <div>
            <h3 className="text-xl font-black text-zinc-950 tracking-tight">Acceso y Credenciales</h3>
            <p className="text-zinc-500 font-medium text-sm mt-1">Gestiona tu correo y contraseña.</p>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-8 bg-zinc-50/50">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Correo Electrónico (Login)</label>
            <input 
              type="email" value={emailDraft} onChange={(e)=>setEmailDraft(e.target.value)} disabled={provider !== "email"}
              className="w-full max-w-md px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-bold text-zinc-900 transition-all disabled:opacity-60"
            />
            {emailMsg && <p className="text-xs font-bold text-red-500 mt-2">{emailMsg}</p>}
          </div>

          {provider === "email" ? (
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm max-w-2xl">
              <h4 className="text-sm font-black text-zinc-900 mb-4">Cambiar Contraseña</h4>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <input type={showPwd1 ? "text" : "password"} value={pwd1} onChange={e=>setPwd1(e.target.value)} placeholder="Nueva contraseña" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-bold text-zinc-900 pr-12" />
                  <button onClick={() => setShowPwd1(!showPwd1)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                    {showPwd1 ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
                <div className="flex-1 relative">
                  <input type={showPwd2 ? "text" : "password"} value={pwd2} onChange={e=>setPwd2(e.target.value)} placeholder="Repetir contraseña" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none font-bold text-zinc-900 pr-12" />
                  <button onClick={() => setShowPwd2(!showPwd2)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                    {showPwd2 ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden mb-2">
                <div className={`h-full transition-all duration-300 ${pwdStrengthCls}`} style={{ width: `${pwdStrength.score}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{pwdStrength.label}</span>
                {pwdMsg && <span className="text-xs font-bold text-red-500">{pwdMsg}</span>}
              </div>
              {(pwd1 || pwd2 || (emailDraft && emailDraft !== user?.email)) && (
                <div className="mt-4 text-xs font-bold text-brand-600 bg-brand-50 p-3 rounded-xl border border-brand-200 inline-block">Cambios pendientes: se aplicarán al guardar la página.</div>
              )}
            </div>
          ) : (
             <div className="text-sm font-bold text-zinc-500 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">Tu cuenta usa <strong>{provider}</strong>. Las contraseñas se gestionan allí.</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-red-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-red-100 bg-red-50/30 flex items-center gap-5">
          <div className="w-14 h-14 bg-red-100 border border-red-200 rounded-2xl flex items-center justify-center text-red-600 shadow-sm shrink-0">
            <IconShield />
          </div>
          <div>
            <h3 className="text-xl font-black text-red-950 tracking-tight">Seguridad Global</h3>
            <p className="text-red-700/80 font-medium text-sm mt-1">Control remoto de sesiones activas.</p>
          </div>
        </div>
        <div className="p-6 md:p-8 bg-red-50/10">
          <p className="text-sm font-medium text-zinc-600 mb-6 max-w-2xl">Si has iniciado sesión en un ordenador público o has perdido un dispositivo, puedes forzar el cierre de la sesión de forma remota en todos sitios.</p>
          <button onClick={signOutAll} className="px-6 py-3.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-black text-sm rounded-xl transition-all shadow-sm active:scale-95">
            Cerrar sesión en otros dispositivos
          </button>
        </div>
      </div>

    </div>
  );
}