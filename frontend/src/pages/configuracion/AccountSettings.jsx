// src/pages/account/AccountSettings.jsx
import { useEffect, useMemo, useState } from "react";
import {
  MdMail,
  MdPassword,
  MdSecurity,
  MdLogout,
  MdSave,
  MdInfo,
  MdVisibility,
  MdVisibilityOff,
  MdAutorenew,
  MdCancel,
  MdReceiptLong,
} from "react-icons/md";
import { supabase } from "../../utils/supabaseClient";
import "./AccountSettings.scss";

/* ========= API base ========= */
const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

/* ========= Reauth helpers ========= */
async function reauthWithPassword(currentEmail, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: currentEmail,
    password,
  });
  if (error) throw error;
  return data?.session;
}

async function updateEmailSecured(currentEmail, newEmail) {
  const pwd = window.prompt("Confirma tu contraseña para cambiar el email:");
  if (!pwd) return { error: new Error("Operación cancelada por el usuario") };
  await reauthWithPassword(currentEmail, pwd);
  return await supabase.auth.updateUser({ email: newEmail });
}

async function updatePasswordSecured(currentEmail, newPassword) {
  const pwd = window.prompt("Introduce tu contraseña actual:");
  if (!pwd) return { error: new Error("Operación cancelada por el usuario") };
  await reauthWithPassword(currentEmail, pwd);
  return await supabase.auth.updateUser({ password: newPassword });
}

/* ========= UI utils ========= */
const initialFromEmail = (email = "") => (email.trim()[0] || "U").toUpperCase();
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

function scorePassword(pwd) {
  let score = 0;
  if (!pwd) return { score: 0, label: "Muy débil" };
  const len = pwd.length;
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  const hasSymb = /[^A-Za-z0-9]/.test(pwd);

  score += Math.min(len, 12);
  score += hasLower ? 2 : 0;
  score += hasUpper ? 3 : 0;
  score += hasDigit ? 3 : 0;
  score += hasSymb ? 4 : 0;

  const pct = Math.min(100, Math.round((score / 24) * 100));
  let label = "Muy débil";
  if (pct >= 75) label = "Fuerte";
  else if (pct >= 50) label = "Media";
  else if (pct >= 25) label = "Débil";

  return { score: pct, label };
}
const strengthClass = (label) =>
  label === "Fuerte" ? "strong" : label === "Media" ? "medium" : label === "Débil" ? "weak" : "very-weak";

/* ========= Billing helpers ========= */
function eur0(c) {
  if (!Number.isFinite(+c)) return "—";
  return (c / 100).toLocaleString("es-ES", { maximumFractionDigits: 0 });
}
function fmtDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}
async function authedFetch(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("No auth");
  return fetch(`${API_BASE}${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

export default function AccountSettings() {
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

  const provider = useMemo(() => {
    const p = user?.app_metadata?.provider;
    if (p) return p;
    return user?.identities?.[0]?.provider || "email";
  }, [user]);

  /* ===== Suscripción ===== */
  const [sub, setSub] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [subMsg, setSubMsg] = useState("");

  async function loadSubscription() {
    setSubLoading(true);
    setSubMsg("");
    try {
      const r = await authedFetch("/api/billing/subscription");
      if (!r.ok) throw new Error(await r.text().catch(() => "No se pudo cargar la suscripción"));
      const j = await r.json();
      setSub(j || null);
    } catch (e) {
      setSubMsg(e.message || "No se pudo cargar la suscripción.");
      setSub(null);
    } finally {
      setSubLoading(false);
    }
  }

  async function cancelAtPeriodEnd() {
    if (!window.confirm("¿Cancelar la renovación automática? Se mantendrá activo hasta el fin del periodo actual.")) return;
    setSubMsg("");
    try {
      const r = await authedFetch("/api/billing/cancel-renewal", { method: "POST" });
      if (!r.ok) throw new Error(await r.text().catch(() => "No se pudo cancelar la renovación"));
      const j = await r.json();
      setSub(j);
      setSubMsg("La suscripción no se renovará. Seguirá activa hasta la fecha indicada.");
    } catch (e) {
      setSubMsg(e.message || "No se pudo cancelar la renovación.");
    }
  }

  async function resumeRenewal() {
    if (!window.confirm("¿Reactivar la renovación automática?")) return;
    setSubMsg("");
    try {
      const r = await authedFetch("/api/billing/resume", { method: "POST" });
      if (!r.ok) throw new Error(await r.text().catch(() => "No se pudo reactivar la renovación"));
      const j = await r.json();
      setSub(j);
      setSubMsg("Renovación automática reactivada.");
    } catch (e) {
      setSubMsg(e.message || "No se pudo reactivar la renovación.");
    }
  }

  async function openPortal() {
    try {
      const r = await authedFetch("/api/billing/portal", { method: "POST", body: { return_to: window.location.href } });
      if (!r.ok) throw new Error(await r.text().catch(() => "No se pudo abrir el portal"));
      const j = await r.json();
      if (j?.url) window.open(j.url, "_blank", "noopener");
    } catch (e) {
      setSubMsg(e.message || "No se pudo abrir el portal de facturación.");
    }
  }

  /* ===== Carga inicial ===== */
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (mounted) {
        setUser(data?.user || null);
        setEmail(data?.user?.email || "");
        setLoading(false);
        if (error) console.error(error);
      }
    })();
    loadSubscription().catch(() => {});
    return () => { mounted = false; };
  }, []);

  /* ===== Email ===== */
  const updateEmail = async () => {
    setEmailMsg("");
    const current = user?.email || "";
    const next = (email || "").trim();

    if (provider !== "email") {
      setEmailMsg(`Tu cuenta usa ${provider}. Cambia el email desde ese proveedor.`);
      return;
    }
    if (!next || next === current) {
      setEmailMsg("Introduce un email distinto.");
      return;
    }
    if (!isValidEmail(next)) {
      setEmailMsg("Introduce un email válido.");
      return;
    }

    setSavingEmail(true);
    const { error } = await updateEmailSecured(current, next);
    setSavingEmail(false);

    if (error) {
      setEmailMsg(error.message || "No se pudo actualizar el email.");
      return;
    }
    setEmailMsg("Te hemos enviado un correo de confirmación. El cambio se aplicará cuando lo confirmes.");
  };

  /* ===== Password ===== */
  const updatePassword = async () => {
    setPwdMsg("");
    if (provider !== "email") {
      setPwdMsg(`Tu cuenta usa ${provider}. La contraseña se gestiona en ese proveedor.`);
      return;
    }
    if (!pwd1 || !pwd2) {
      setPwdMsg("Rellena ambos campos.");
      return;
    }
    if (pwd1.length < 8) {
      setPwdMsg("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (pwd1 !== pwd2) {
      setPwdMsg("Las contraseñas no coinciden.");
      return;
    }

    setSavingPwd(true);
    const { error } = await updatePasswordSecured(user?.email || "", pwd1);
    setSavingPwd(false);

    if (error) {
      setPwdMsg(error.message || "No se pudo actualizar la contraseña.");
      return;
    }
    setPwd1("");
    setPwd2("");
    setPwdMsg("Contraseña actualizada correctamente.");
  };

  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" });
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="acct card">
        <div className="acct__skeleton" />
      </div>
    );
  }

  return (
    <div className="acct card">
      {/* Header */}
      <header className="card__header acct__header">
        <div className="acct__left">
          <div className="acct__avatar" aria-hidden>
            {initialFromEmail(user?.email)}
          </div>
          <div className="acct__meta">
            <h3 className="acct__title">Tu cuenta</h3>
            <p className="acct__email">
              {user?.email}
              <span className={`chip chip--prov chip--${provider}`}>{provider}</span>
            </p>
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
                  <strong>{sub.plan_label || "Plan único"}</strong>
                  {" · "}
                  {eur0(sub.price_cents)} €/mes
                  {sub.interval_label ? ` · ${sub.interval_label}` : ""}
                </div>
              </div>

              <div className="billing__row">
                <div className="billing__k">Estado</div>
                <div className="billing__v">
                  <span className={`badge badge--${sub.status}`}>{sub.status}</span>
                  {" "}
                  {sub.cancel_at_period_end ? (
                    <span className="muted">· Se cancelará al finalizar el periodo</span>
                  ) : (
                    <span className="muted">· Renovación automática activa</span>
                  )}
                </div>
              </div>

              <div className="billing__row">
                <div className="billing__k">Fin de periodo</div>
                <div className="billing__v">{fmtDate(sub.current_period_end)}</div>
              </div>

              <div className="actions">
                {!sub.cancel_at_period_end ? (
                  <button className="btn btn--danger" onClick={cancelAtPeriodEnd}>
                    <MdCancel /> Cancelar renovación
                  </button>
                ) : (
                  <button className="btn btn--primary" onClick={resumeRenewal}>
                    <MdAutorenew /> Reanudar renovación
                  </button>
                )}
                <button className="btn btn--outline" onClick={openPortal}>
                  <MdReceiptLong /> Ver facturas / cambiar tarjeta
                </button>
              </div>

              {subMsg && (
                <div className="note" role="status">
                  <MdInfo aria-hidden /> {subMsg}
                </div>
              )}
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
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                disabled={provider !== "email" || savingEmail}
                aria-invalid={!!emailMsg}
              />
              <span className="field__hint" />
            </label>

            <button
              className="btn btn--primary"
              onClick={updateEmail}
              disabled={provider !== "email" || savingEmail}
            >
              {savingEmail ? "Guardando…" : (<><MdSave /> Guardar</>)}
            </button>
          </div>

          {emailMsg && (
            <div className="note" role="status">
              <MdInfo aria-hidden /> {emailMsg}
            </div>
          )}
        </section>

        {/* Password */}
        <section className="acct__block">
          <div className="blk__head">
            <h4 className="blk__title"><MdPassword /> Cambiar contraseña</h4>
            <span className="hint">Mínimo 8 caracteres</span>
          </div>

          {provider !== "email" ? (
            <div className="note">
              <MdInfo aria-hidden />
              Tu cuenta usa <strong>{provider}</strong>. La contraseña se gestiona en ese proveedor.
            </div>
          ) : (
            <>
              <div className="form-col2">
                <label className="field">
                  <span className="label">Nueva contraseña</span>
                  <div className="has-right-icon">
                    <input
                      type={showPwd1 ? "text" : "password"}
                      value={pwd1}
                      onChange={(e) => setPwd1(e.target.value)}
                      autoComplete="new-password"
                      placeholder="********"
                      aria-describedby="pwd-strength"
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setShowPwd1((v) => !v)}
                      aria-label={showPwd1 ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      <MdVisibilityOff style={{ display: showPwd1 ? "block" : "none" }} />
                      <MdVisibility style={{ display: showPwd1 ? "none" : "block" }} />
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
                      type={showPwd2 ? "text" : "password"}
                      value={pwd2}
                      onChange={(e) => setPwd2(e.target.value)}
                      autoComplete="new-password"
                      placeholder="********"
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setShowPwd2((v) => !v)}
                      aria-label={showPwd2 ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      <MdVisibilityOff style={{ display: showPwd2 ? "block" : "none" }} />
                      <MdVisibility style={{ display: showPwd2 ? "none" : "block" }} />
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

              {pwdMsg && (
                <div className="note" role="status">
                  <MdInfo aria-hidden /> {pwdMsg}
                </div>
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
