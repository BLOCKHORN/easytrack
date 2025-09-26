// src/pages/Registro.jsx
import { useEffect, useMemo, useState } from 'react';
import '../styles/registro.scss';

// Países (todos) con nombres en español
import countries from 'i18n-iso-countries';
import esLocale from 'i18n-iso-countries/langs/es.json';
countries.registerLocale(esLocale);

// 👉 nuevo: servicio de auth robusto
import { register as apiRegister, resend as apiResend } from '../services/authService';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'');

function guessInboxUrl(email='') {
  const d = email.split('@')[1]?.toLowerCase() || '';
  if (d.includes('gmail')) return 'https://mail.google.com/mail/u/0/#inbox';
  if (d.includes('outlook') || d.includes('hotmail') || d.includes('live')) return 'https://outlook.live.com/mail/0/inbox';
  if (d.includes('office') || d.includes('microsoft')) return 'https://outlook.office.com/mail/';
  if (d.includes('yahoo')) return 'https://mail.yahoo.com/';
  if (d.includes('icloud') || d.includes('me.com')) return 'https://www.icloud.com/mail';
  return null;
}

export default function Registro() {
  // Requeridos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Opcional
  const [pais, setPais] = useState('ES');

  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  // UX mensajes
  const [okMsg,   setOkMsg]   = useState('');
  const [errMsg,  setErrMsg]  = useState('');
  const [kind,    setKind]    = useState(''); // signup_sent | resend_signup | reset_sent
  const [dbgLink, setDbgLink] = useState('');

  // Reenvío
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    try {
      const se = localStorage.getItem('signup_email');
      if (se && !email) setEmail(se);
    } catch {}
  }, []);

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const inboxUrl = useMemo(() => guessInboxUrl(email), [email]);

  const countryOptions = useMemo(() => {
    const names = countries.getNames('es', { select: 'official' }) || {};
    return Object.entries(names)
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, []);

  const pwdTooShort = (password || '').length < 8;
  const pwdMismatch = password && confirmPwd && password !== confirmPwd;

  async function onSubmit(e) {
    e.preventDefault();
    setOkMsg(''); setErrMsg(''); setKind(''); setDbgLink('');

    if (!termsAccepted) return setErrMsg('Debes aceptar los términos para continuar.');
    if (!email || !password || !nombreEmpresa) {
      return setErrMsg('Completa email, contraseña y nombre de empresa.');
    }
    if (pwdTooShort) return setErrMsg('La contraseña debe tener al menos 8 caracteres.');
    if (pwdMismatch) return setErrMsg('Las contraseñas no coinciden.');

    setLoading(true);
    try {
      // 👉 Llamada robusta
      const res = await apiRegister({
        email,
        password,
        nombre_empresa: nombreEmpresa,
        termsAccepted,
        // Si quieres recoger este opt-in aquí añade un checkbox y pásalo:
        marketingOptIn: false
      });

      try { localStorage.setItem('signup_email', email); } catch {}
      setKind(res.kind || 'signup_sent');
      setDbgLink(res.debug_link || '');
      // Mensajes claros por tipo
      const msg =
        res.kind === 'reset_sent'
          ? 'Tu cuenta ya existía y estaba confirmada. Te enviamos un correo para restablecer la contraseña.'
          : res.kind === 'resend_signup'
            ? 'Tu cuenta ya existía pero no estaba confirmada. Reenviamos el correo de confirmación.'
            : (res.message || 'Registro correcto. Revisa tu correo para confirmar la cuenta.');
      setOkMsg(msg);
      // Ponemos un cooldown inicial para el botón “Reenviar”
      setCooldown(20);
    } catch (e) {
      setErrMsg(e.message || 'No se pudo registrar.');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (cooldown) return;
    setErrMsg(''); setOkMsg('');
    try {
      const r = await apiResend({ email, type: 'signup' });
      setKind(r.kind || 'resend_signup');
      setDbgLink(r.debug_link || '');
      setOkMsg('Hemos reenviado el correo de confirmación. Revisa tu bandeja (y SPAM).');
      setCooldown(20);
    } catch (e) {
      setErrMsg(e.message || 'No se pudo reenviar.');
      setCooldown(8);
    }
  }

  return (
    <div className="reg-shell">
      {/* HERO (izquierda) */}
      <aside className="reg-hero">
        <header className="hero-head">
          <div className="logo-dot" />
          <span className="brand">EasyTrack</span>
        </header>

        <h1 className="hero-title">
          Empieza tu <span className="grad">prueba gratuita</span>
        </h1>
        <p className="hero-sub">
          Crea tu cuenta y prueba EasyTrack con <strong>hasta 20 paquetes</strong>.
          Sin tarjeta hasta que decidas actualizar.
        </p>

        <div className="hero-points">
          <div className="point">Onboarding rápido y seguro</div>
          <div className="point">Explora estantes, búsquedas y entregas</div>
          <div className="point">Actualiza a plan completo cuando quieras</div>
        </div>

        {/* degradados animados */}
        <div className="hero-anim">
          <div className="blob blob-a" />
          <div className="blob blob-b" />
          <div className="ribbon ribbon-1" />
          <div className="ribbon ribbon-2" />
        </div>

        <footer className="hero-foot">
          ¿Ya tienes cuenta? <a href="/login">Inicia sesión</a> ·
          <a href="/recuperar" className="muted-link"> Recuperar contraseña</a>
        </footer>
      </aside>

      {/* CARD (derecha) */}
      <main className="reg-card">
        <form onSubmit={onSubmit} noValidate>
          <div className="card-head">
            <h2>Crea tu cuenta</h2>
            <p>Solo lo esencial. Podrás completar tu perfil después.</p>
          </div>

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>

          <div className="field">
            <label>Contraseña</label>
            <div className="pwd-box">
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                className="icon-btn"
                aria-label="Mostrar u ocultar contraseña"
                onClick={() => setShowPwd(s => !s)}
                title={showPwd ? 'Ocultar' : 'Mostrar'}
              >
                {showPwd ? (
                  <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M2.1 3.51L.69 4.93l3.03 3.03C2.42 9 1.36 10.26.6 11.4a1 1 0 0 0 0 1.2C3.27 16.23 7.37 19 12 19c2.06 0 3.96-.48 5.66-1.33l3.43 3.43 1.41-1.41L2.1 3.51Zm9.9 12.49a4 4 0 0 1-4-4c0-.45.08-.87.22-1.26l5.04 5.04c-.39.14-.81.22-1.26.22Zm-8.4-4.49c.8-1.1 2.04-2.42 3.74-3.32l1.57 1.57A6.02 6.02 0 0 0 6 12c0 .69.12 1.36.35 1.98a12.62 12.62 0 0 1-2.75-2.47ZM12 5c-1.12 0-2.2.16-3.22.46l1.7 1.7c.49-.1 1-.16 1.52-.16 4.63 0 8.73 2.77 11.4 6.39a1 1 0 0 1 0 1.2c-.9 1.26-2.11 2.6-3.64 3.66l-1.43-1.43A10.6 10.6 0 0 0 21.4 12C18.73 8.38 14.63 5 12 5Z"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 5c-4.63 0-8.73 2.77-11.4 6.39a1 1 0 0 0 0 1.2C3.27 16.23 7.37 19 12 19s8.73-2.77 11.4-6.41a1 1 0 0 0 0-1.2C20.73 7.77 16.63 5 12 5Zm0 12a6 6 0 1 1 0-12a6 6 0 0 1 0 12Zm0-4a2 2 0 1 0 0-4a2 2 0 0 0 0 4Z"/></svg>
                )}
              </button>
            </div>
            {password && pwdTooShort && (
              <small className="muted" style={{ color: '#b45309' }}>
                La contraseña debe tener al menos 8 caracteres.
              </small>
            )}
          </div>

          <div className="field">
            <label>Repite la contraseña</label>
            <div className="pwd-box">
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="Vuelve a escribirla"
              />
              <button
                type="button"
                className="icon-btn"
                aria-label="Mostrar u ocultar contraseña"
                onClick={() => setShowPwd(s => !s)}
                title={showPwd ? 'Ocultar' : 'Mostrar'}
              >
                {showPwd ? (
                  <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M2.1 3.51L.69 4.93l3.03 3.03C2.42 9 1.36 10.26.6 11.4a1 1 0 0 0 0 1.2C3.27 16.23 7.37 19 12 19c2.06 0 3.96-.48 5.66-1.33l3.43 3.43 1.41-1.41L2.1 3.51Zm9.9 12.49a4 4 0 0 1-4-4c0-.45.08-.87.22-1.26l5.04 5.04c-.39.14-.81.22-1.26.22Zm-8.4-4.49c.8-1.1 2.04-2.42 3.74-3.32l1.57 1.57A6.02 6.02 0 0 0 6 12c0 .69.12 1.36.35 1.98a12.62 12.62 0 0 1-2.75-2.47ZM12 5c-1.12 0-2.2.16-3.22.46l1.7 1.7c.49-.1 1-.16 1.52-.16 4.63 0 8.73 2.77 11.4 6.39a1 1 0 0 1 0 1.2c-.9 1.26-2.11 2.6-3.64 3.66l-1.43-1.43A10.6 10.6 0 0 0 21.4 12C18.73 8.38 14.63 5 12 5Z"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 5c-4.63 0-8.73 2.77-11.4 6.39a1 1 0 0 0 0 1.2C3.27 16.23 7.37 19 12 19s8.73-2.77 11.4-6.41a1 1 0 0 0 0-1.2C20.73 7.77 16.63 5 12 5Zm0 12a6 6 0 1 1 0-12a6 6 0 0 1 0 12Zm0-4a2 2 0 1 0 0-4a2 2 0 0 0 0 4Z"/></svg>
                )}
              </button>
            </div>
            {confirmPwd && pwdMismatch && (
              <small className="muted" style={{ color: '#b91c1c' }}>
                Las contraseñas no coinciden.
              </small>
            )}
          </div>

          <div className="field">
            <label>Nombre de tu empresa</label>
            <input
              type="text"
              required
              value={nombreEmpresa}
              onChange={e => setNombreEmpresa(e.target.value)}
              placeholder="Mi Negocio S.L."
            />
          </div>

          <div className="field">
            <label>País <span className="muted">(opcional)</span></label>
            <select value={pais} onChange={e => setPais(e.target.value)}>
              {countryOptions.map(({ code, name }) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          <label className="checkline">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              required
            />
            <span>
              Acepto los <a href="/legal/terminos" target="_blank" rel="noreferrer">Términos y Condiciones</a> y la{' '}
              <a href="/legal/privacidad" target="_blank" rel="noreferrer">Política de Privacidad</a>.
            </span>
          </label>

          <button
            type="submit"
            className="cta"
            disabled={loading || !termsAccepted || pwdTooShort || pwdMismatch || !email || !nombreEmpresa}
          >
            {loading ? 'Registrando…' : 'Crear cuenta'}
          </button>

          {/* Mensajes */}
          {okMsg && (
            <div className="alert ok" style={{ display:'grid', gap:10 }}>
              {okMsg}

              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {inboxUrl ? (
                  <a className="btn btn--primary" href={inboxUrl} target="_blank" rel="noreferrer">
                    Abrir bandeja de entrada
                  </a>
                ) : (
                  <span className="muted">Abre tu proveedor de correo y busca nuestro mensaje.</span>
                )}

                <button
                  type="button"
                  className="btn"
                  onClick={onResend}
                  disabled={!!cooldown}
                  title="Reenviar correo de confirmación"
                >
                  {cooldown ? `Reenviar en ${cooldown}s` : 'Reenviar'}
                </button>
              </div>

              {/* Modo DEV: el backend puede devolver debug_link si EXPOSE_DEBUG_LINKS=true */}
              {dbgLink && (
                <div className="muted" style={{ fontSize:13 }}>
                  Enlace directo (solo desarrollo):{' '}
                  <a href={dbgLink}>Abrir ahora</a>
                </div>
              )}
            </div>
          )}

          {errMsg && <div className="alert err">{errMsg}</div>}

          {/* CTA de sesión más "pro" */}
          <div
            style={{
              marginTop: 16,
              padding: 12,
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8
            }}
          >
            <div style={{ color: '#6b7280' }}>¿Ya tienes cuenta?</div>
            <a
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                background: '#111827',
                color: '#fff',
                fontWeight: 600
              }}
            >
              Inicia sesión
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="currentColor" d="M13 5l7 7l-7 7v-4H4v-6h9V5z"/>
              </svg>
            </a>
          </div>

          <p className="tiny">
            Tras confirmar tu email, te llevaremos al panel y activaremos la versión de prueba (límite 20 paquetes).
          </p>
        </form>
      </main>
    </div>
  );
}
