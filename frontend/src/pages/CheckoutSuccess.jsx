import { useEffect, useMemo, useState } from 'react';
import {
  FiCheck, FiMail, FiExternalLink, FiRepeat, FiAlertCircle, FiClock, FiUser, FiShield, FiCopy, FiEye, FiEyeOff
} from 'react-icons/fi';
import { supabase } from '../utils/supabaseClient';
import '../styles/CheckoutSuccess.scss';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'');
// A dónde quieres ir tras crear la contraseña:
const DASHBOARD_URL = (import.meta.env.VITE_DASHBOARD_URL || '/dashboard').replace(/\/$/,'');

const isEmail = (v='') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function guessInboxUrl(email=''){
  const d = email.split('@')[1]?.toLowerCase() || '';
  if (d.includes('gmail')) return 'https://mail.google.com/mail/u/0/#inbox';
  if (d.includes('outlook') || d.includes('hotmail') || d.includes('live')) return 'https://outlook.live.com/mail/0/inbox';
  if (d.includes('office') || d.includes('microsoft')) return 'https://outlook.office.com/mail/';
  if (d.includes('yahoo')) return 'https://mail.yahoo.com/';
  if (d.includes('icloud') || d.includes('me.com')) return 'https://www.icloud.com/mail';
  return null;
}
function fmtDate(iso){
  if (!iso) return '—';
  try{
    return new Date(iso).toLocaleString('es-ES',{
      year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit'
    });
  }catch{ return iso; }
}

/* ------------------------- helpers auth/backend ------------------------- */

// Hace ping a tu backend con Authorization: Bearer <token>
async function pingBackendWithToken(token){
  if (!token) return false;
  try {
    const res = await fetch(`${API}/tenants/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Obtiene el access_token actual
async function getAccessToken(){
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

/* ----------------------------- Inline Create Password ----------------------------- */
function InlineCreatePassword({ userEmail }) {
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');

  const rules = useMemo(() => {
    const L = pwd.length >= 8;
    const U = /[A-Z]/.test(pwd);
    const l = /[a-z]/.test(pwd);
    const n = /[0-9]/.test(pwd);
    const s = /[^A-Za-z0-9]/.test(pwd);
    const w = !/\s/.test(pwd);
    return { L, U, l, n, s, w };
  }, [pwd]);

  const strength = useMemo(() => {
    let score = 0;
    if (rules.L) score++;
    if (rules.U) score++;
    if (rules.l) score++;
    if (rules.n) score++;
    if (rules.s) score++;
    if (!rules.w) score = Math.max(0, score - 2);
    return score; // 0..5
  }, [rules]);

  const allValid = rules.L && rules.U && rules.l && rules.n && rules.w && pwd === pwd2;

  async function save(e) {
    e?.preventDefault?.();
    setErr('');
    if (!allValid) {
      setErr('Revisa los requisitos y que ambas contraseñas coincidan.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) {
      setSaving(false);
      setErr(error.message || 'No se pudo actualizar la contraseña.');
      return;
    }

    // ✅ Warm-up de sesión + ping al backend con Bearer antes de ir al dashboard
    try {
      // pequeña espera para que rote la sesión si aplica
      await new Promise(r => setTimeout(r, 200));
      let token = await getAccessToken();

      // si por lo que sea no está, forzamos un refresh
      if (!token) {
        const { data } = await supabase.auth.refreshSession();
        token = data?.session?.access_token || null;
      }

      // haz 1-2 intentos de ping para evitar 401 tempranos al cargar el dashboard
      let alive = await pingBackendWithToken(token);
      if (!alive) {
        await new Promise(r => setTimeout(r, 300));
        token = await getAccessToken();
        alive = await pingBackendWithToken(token);
      }
    } catch {/* no bloquea la UX */ }

    setOk(true);
    setSaving(false);

    // Redirección final
    window.location.assign(DASHBOARD_URL);
  }

  return (
    <div className="et-inline-pw et-card">
      <header className="et-inline-pw__head">
        <span className="badge">Paso final</span>
        <h3>Crea tu contraseña</h3>
        <p className="muted">Usuario: <strong>{userEmail}</strong></p>
      </header>

      <form className="et-inline-pw__form" onSubmit={save}>
        <label className="label" htmlFor="pwd">Nueva contraseña</label>
        <div className="input-wrap">
          <input
            id="pwd"
            type={show ? 'text' : 'password'}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            className="toggle"
            onClick={() => setShow(v => !v)}
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {show ? <FiEyeOff/> : <FiEye/>}
          </button>
        </div>

        <div className={`meter s-${strength}`} aria-hidden="true"><span /></div>

        <ul className="checks" aria-live="polite">
          <li className={rules.L ? 'ok' : ''}>Mínimo 8 caracteres</li>
          <li className={rules.U ? 'ok' : ''}>Una mayúscula</li>
          <li className={rules.l ? 'ok' : ''}>Una minúscula</li>
          <li className={rules.n ? 'ok' : ''}>Un número</li>
          <li className={rules.w ? 'ok' : ''}>Sin espacios</li>
          <li className={rules.s ? 'ok' : ''}>Recomendado: símbolo</li>
        </ul>

        <label className="label" htmlFor="pwd2">Confirmar contraseña</label>
        <div className="input-wrap">
          <input
            id="pwd2"
            type="password"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            required
          />
        </div>

        {err && <div className="alert error" role="alert">{err}</div>}
        {ok && <div className="alert success" role="status">Contraseña guardada. Cargando tu panel…</div>}

        <div className="actions">
          <button className="et-btn et-btn--primary" disabled={!allValid || saving}>
            {saving ? 'Guardando…' : 'Guardar y entrar'}
          </button>
          <a className="et-btn et-btn--ghost" href="/precios">Cancelar</a>
        </div>
      </form>

      <footer className="foot muted">
        La sesión se mantendrá en este navegador. Podrás cambiar la contraseña desde tu perfil.
      </footer>
    </div>
  );
}

/* --------------------------------- Success --------------------------------- */
export default function CheckoutSuccess() {
  const qs = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionIdFromUrl = qs.get('session_id') || '';
  const [sessionId] = useState(sessionIdFromUrl || localStorage.getItem('last_session_id') || '');

  const [email, setEmail] = useState(localStorage.getItem('signup_email') || '');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [msg, setMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [loading, setLoading] = useState(true);
  const [verifiedOk, setVerifiedOk] = useState(false);
  const [verifyErr, setVerifyErr] = useState('');
  const [planCode, setPlanCode] = useState('');
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState('');

  // Si el usuario ya confirmó el email en esta u otra pestaña
  const [authedUser, setAuthedUser] = useState(null);
  const mode = authedUser ? 'create' : 'steps';

  useEffect(() => {
    if (sessionIdFromUrl) localStorage.setItem('last_session_id', sessionIdFromUrl);
  }, [sessionIdFromUrl]);

  const inboxUrl  = guessInboxUrl(email);
  const canResend = isEmail(email) && status!=='sending' && cooldown===0;

  // Countdown del botón
  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // 1) Verifica checkout/session y rellena datos
  useEffect(() => {
    async function verifyWith(id){
      const endpoints = [
        `${API}/billing/checkout/verify?session_id=${encodeURIComponent(id)}`,
        `${API}/api/billing/checkout/verify?session_id=${encodeURIComponent(id)}`
      ];
      for (const url of endpoints) {
        try {
          const r = await fetch(url, { headers: { 'Accept':'application/json' } });
          const text = await r.text();
          let j; try { j = JSON.parse(text); } catch { continue; }
          if (!r.ok || j?.ok === false) {
            const m = (j?.error || '').toLowerCase();
            if (m.includes('no such checkout.session') || m.includes('resource_missing')) {
              localStorage.removeItem('last_session_id');
            }
            continue;
          }
          const d = j?.data ?? j ?? {};
          if (!email && d.customerEmail) {
            setEmail(d.customerEmail);
            localStorage.setItem('signup_email', d.customerEmail);
          }
          setPlanCode(d.planCode || '');
          setTrialEndsAt(d.trialEndsAt || '');
          setCurrentPeriodEnd(d.currentPeriodEnd || '');
          setVerifiedOk(true);
          setLoading(false);
          return true;
        } catch { /* siguiente endpoint */ }
      }
      return false;
    }

    (async () => {
      setLoading(true);
      setVerifiedOk(false);
      setVerifyErr('');

      if (sessionId) {
        const ok = await verifyWith(sessionId);
        if (ok) return;
      }
      setVerifyErr('No se pudo confirmar automáticamente tu sesión. Revisa tu correo o reenvía la invitación.');
      setLoading(false);
    })();
  }, [sessionId, email]);

  // 2) Reenvío automático (una sola vez) tras verificar checkout
  useEffect(() => {
    if (!verifiedOk) return;
    if (!isEmail(email)) return;
    if (!sessionId) return;

    const key = `invite_sent:${sessionId}`;
    if (localStorage.getItem(key) === '1') return;

    (async () => {
      try { await resendInvite(); }
      finally { localStorage.setItem(key, '1'); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifiedOk, email, sessionId]);

  // 3) Detectar sesión de Supabase (misma pestaña o otra) y cambiar a modo "create"
  useEffect(() => {
    // Chequeo inicial
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setAuthedUser(data.user);
    });
    // Evento de cambios
    const sub = supabase.auth.onAuthStateChange((_ev, session) => {
      if (session?.user) setAuthedUser(session.user);
    });
    // Si otra pestaña setea la sesión, escuchamos storage y re-consultamos
    const onStorage = () => {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setAuthedUser(data.user);
      });
    };
    window.addEventListener('storage', onStorage);
    return () => {
      sub.data?.subscription?.unsubscribe?.();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  async function resendInvite(){
    if(!isEmail(email)) return;
    if(status==='sending') return;
    setStatus('sending'); setMsg('');
    const body = JSON.stringify({ email });

    const endpoints = [
      `${API}/billing/checkout/resend-invite`,
      `${API}/api/billing/checkout/resend-invite`
    ];

    try{
      let ok = false, lastErr = '', kind = 'invite';
      for (const url of endpoints) {
        try{
          const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body });
          const data = await res.json().catch(()=> ({}));
          if (res.ok && data?.ok) { ok = true; kind = data.kind || 'invite'; break; }
          lastErr = data?.error || `HTTP ${res.status}`;
        }catch(e){
          lastErr = e.message;
        }
      }
      if (!ok) throw new Error(lastErr || 'No se pudo reenviar la invitación.');

      setStatus('sent');
      setMsg(kind === 'reset'
        ? 'Tu cuenta ya existía. Te enviamos un email para restablecer la contraseña.'
        : 'Invitación enviada. Revisa tu correo (y SPAM).'
      );
      setCooldown(20);
      localStorage.setItem('signup_email', email);
    }catch(e){
      setStatus('error'); setMsg(e.message); setCooldown(8);
    }
  }

  function copyEmail(){
    if (!email) return;
    navigator.clipboard?.writeText(email);
  }

  return (
    <section className="et-success">
      <header className="et-hero">
        <div className="et-hero__icon">
          <div className="ok"><FiCheck aria-hidden="true"/></div>
        </div>
        <div className="et-hero__text">
          <h1>{mode === 'create' ? '¡Email verificado!' : 'Pago completado'}</h1>
          <p>
            {mode === 'create'
              ? 'Completa tu alta creando la contraseña aquí mismo.'
              : loading
                ? 'Confirmando tu suscripción…'
                : 'Te hemos enviado un correo para crear tu contraseña.'}
          </p>
        </div>
      </header>

      {verifyErr && mode !== 'create' && (
        <div className="et-banner et-banner--warn">
          <FiAlertCircle/> <span>{verifyErr}</span>
        </div>
      )}

      <main className="et-container">
        {/* Resumen */}
        <div className="et-card et-summary">
          <div className="et-summary__item">
            <div className="et-summary__icon"><FiUser/></div>
            <div>
              <div className="et-summary__label">Email</div>
              <div className="et-summary__value">{email || '—'}</div>
            </div>
            {email && (
              <button className="et-icon-btn" onClick={copyEmail} aria-label="Copiar email">
                <FiCopy/>
              </button>
            )}
          </div>

          <div className="et-summary__item">
            <div className="et-summary__icon"><FiShield/></div>
            <div>
              <div className="et-summary__label">Plan</div>
              <div className="et-summary__value">{planCode || '—'}</div>
            </div>
          </div>

          <div className="et-summary__item">
            <div className="et-summary__icon"><FiClock/></div>
            <div>
              <div className="et-summary__label">Prueba hasta</div>
              <div className="et-summary__value">{fmtDate(trialEndsAt)}</div>
            </div>
          </div>
        </div>

        {/* Pasos o Crear contraseña inline */}
        {mode === 'create' ? (
          <InlineCreatePassword userEmail={authedUser?.email || email} />
        ) : (
          <div className="et-card et-steps">
            <ol>
              <li className="done">
                <div className="dot"><FiCheck/></div>
                <div className="txt">
                  <strong>Pago confirmado</strong>
                  <span>Listo en Stripe</span>
                </div>
              </li>
              <li className={!loading ? 'active' : ''}>
                <div className="dot">2</div>
                <div className="txt">
                  <strong>Revisa tu correo</strong>
                  <span>Busca el email “Invitación a EasyTrack”</span>
                </div>
              </li>
              <li>
                <div className="dot">3</div>
                <div className="txt">
                  <strong>Crea tu contraseña</strong>
                  <span>El enlace te lleva a <code>/crear-password</code></span>
                </div>
              </li>
            </ol>

            <div className="et-inbox" role="group" aria-label="Abrir tu bandeja de entrada">
              <div>
                <div className="subj">Asunto esperado</div>
                <div className="title">“Invitación a EasyTrack”</div>
                <div className="subj">Si no aparece, revisa Promociones/SPAM.</div>
              </div>
              {inboxUrl ? (
                // mismo tab
                <a className="et-btn et-btn--primary" href={inboxUrl}>
                  <FiMail/> Abrir correo <FiExternalLink/>
                </a>
              ) : (
                <button className="et-btn" disabled title="Proveedor no detectado">
                  <FiMail/> Abrir correo
                </button>
              )}
            </div>
          </div>
        )}

        {/* Reenviar */}
        {mode !== 'create' && (
          <div className="et-card et-resend">
            <h3>¿No te llegó? Reenviar invitación</h3>
            <div className={`et-input-row ${!isEmail(email) && email ? 'is-invalid' : ''}`}>
              <input
                id="inv-email"
                type="email"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                inputMode="email"
              />
              <button
                className="et-btn et-btn--primary"
                onClick={resendInvite}
                disabled={!canResend}
                aria-busy={status==='sending'}
              >
                <FiRepeat/>{status==='sending' ? 'Enviando…' : cooldown? `Reintenta en ${cooldown}s` : 'Reenviar'}
              </button>
            </div>

            {msg && (
              <p className={`et-status ${status==='error' ? 'is-error' : 'is-ok'}`}>
                {status==='error' ? <FiAlertCircle/> : <FiCheck/>} {msg}
              </p>
            )}
            {status==='idle' && <p className="et-hint"><FiClock/> Normalmente llega en segundos.</p>}

            <details className="et-tips">
              <summary>¿No lo ves? Consejos rápidos</summary>
              <ul>
                <li>Busca por remitente <code>no-reply@supabase.io</code>.</li>
                <li>Revisa carpetas de <b>SPAM</b>, <b>Promociones</b> y <b>Todos</b>.</li>
                <li>Confirma que tu email es correcto y pulsa <b>Reenviar</b>.</li>
              </ul>
            </details>
          </div>
        )}

        {/* Meta */}
        <div className="et-card et-meta">
          <div className="et-meta__row">
            <span>Periodo actual</span>
            <strong>{fmtDate(currentPeriodEnd)}</strong>
          </div>
        </div>
      </main>
    </section>
  );
}
