import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { FiEye, FiEyeOff, FiAlertCircle, FiCheck, FiRefreshCw } from 'react-icons/fi';
import '../styles/CrearPassword.scss';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'');

export default function CrearPassword() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser]               = useState(null);

  const [pwd, setPwd]                 = useState('');
  const [pwd2, setPwd2]               = useState('');
  const [show, setShow]               = useState(false);
  const [saving, setSaving]           = useState(false);

  const [ok, setOk]                   = useState(false);
  const [err, setErr]                 = useState('');
  const [linkErr, setLinkErr]         = useState(''); // error proveniente del link (otp_expired, etc.)
  const [resending, setResending]     = useState(false);
  const [resentMsg, setResentMsg]     = useState('');

  const signupEmail = useMemo(() => (localStorage.getItem('signup_email') || ''), []);

  // 1) Procesar el enlace (query y hash) -> crear sesión si viene code o tokens
  useEffect(() => {
    (async () => {
      try {
        // --- A) ?code=... (nuevo flujo)
        const qs = new URLSearchParams(window.location.search);
        const code = qs.get('code');
        const qErrCode = qs.get('error_code') || qs.get('error');
        const qErrDesc = qs.get('error_description') || qs.get('error_message');

        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(code);
          } catch (e) {
            setLinkErr(e?.message || 'El enlace ha expirado o no es válido.');
          } finally {
            // Limpia la URL (evita reintentos al refrescar)
            ['code','type','next','error','error_code','error_description','error_message']
              .forEach(k => qs.delete(k));
            const newQs = qs.toString();
            const newUrl = window.location.pathname + (newQs ? `?${newQs}` : '') + window.location.hash;
            history.replaceState({}, document.title, newUrl);
          }
        } else if (qErrCode) {
          setLinkErr(decodeURIComponent(qErrDesc || qErrCode));
        }

        // --- B) #access_token=#... (flujo clásico)
        const h = window.location.hash.startsWith('#')
          ? new URLSearchParams(window.location.hash.slice(1))
          : new URLSearchParams();

        const access_token  = h.get('access_token');
        const refresh_token = h.get('refresh_token');
        const hErrCode      = h.get('error_code');
        const hErrDesc      = h.get('error_description');

        if (access_token && refresh_token) {
          try {
            await supabase.auth.setSession({ access_token, refresh_token });
          } catch {
            // seguimos y dejamos que getUser decida
          } finally {
            history.replaceState({}, document.title, window.location.pathname + window.location.search);
          }
        } else if (hErrCode) {
          setLinkErr(decodeURIComponent(hErrDesc || hErrCode));
        }
      } finally {
        // 2) Cargar usuario en sesión (si ya se estableció)
        const { data, error } = await supabase.auth.getUser();
        if (!error) {
          const u = data?.user || null;
          setUser(u);

          // Guarda email como fallback y notifica a otras pestañas
          if (u?.email) {
            try {
              if (!localStorage.getItem('signup_email')) {
                localStorage.setItem('signup_email', u.email);
              }
              localStorage.setItem('et:email_confirmed', '1');
              setTimeout(() => { try { localStorage.removeItem('et:email_confirmed'); } catch {} }, 1500);
              if ('BroadcastChannel' in window) {
                const bc = new BroadcastChannel('et-auth');
                bc.postMessage({ type: 'EMAIL_CONFIRMED', email: u.email });
                bc.close();
              }
            } catch {}
          }
        }
        setLoadingUser(false);
      }
    })();
  }, []);

  // 3) Reglas de seguridad
  const rules = useMemo(() => {
    const L = pwd.length >= 8;
    const U = /[A-Z]/.test(pwd);
    const l = /[a-z]/.test(pwd);
    const n = /[0-9]/.test(pwd);
    const s = /[^A-Za-z0-9]/.test(pwd);
    const w = !/\s/.test(pwd);
    return { L, U, l, n, s, w };
  }, [pwd]);

  // 4) Indicador de fortaleza
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

  const allValid =
    rules.L && rules.U && rules.l && rules.n && rules.w && pwd === pwd2;

  // 5) Guardar contraseña
  async function save(e) {
    e?.preventDefault?.();
    setErr('');
    if (!allValid) {
      setErr('Revisa los requisitos y que ambas contraseñas coincidan.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) {
      setErr(error.message || 'No se pudo actualizar la contraseña.');
      return;
    }
    setOk(true);
    setTimeout(() => { window.location.href = '/dashboard'; }, 900);
  }

  // 6) Reenviar invitación / reset si el link salió “otp_expired” o similar
  async function resendInvite() {
    const email = signupEmail || user?.email || '';
    if (!email) {
      setResentMsg('No conozco tu email. Vuelve a la pantalla anterior y solicita reenvío.');
      return;
    }
    setResending(true);
    setResentMsg('');
    try {
      const body = JSON.stringify({ email });
      const endpoints = [
        `${API}/billing/checkout/resend-invite`,
        `${API}/api/billing/checkout/resend-invite`
      ];
      let ok = false, kind = 'invite', lastErr = '';
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
          const j = await res.json().catch(() => ({}));
          if (res.ok && j?.ok) { ok = true; kind = j.kind || 'invite'; break; }
          lastErr = j?.error || `HTTP ${res.status}`;
        } catch (e) {
          lastErr = e.message;
        }
      }
      if (!ok) throw new Error(lastErr || 'No se pudo reenviar el enlace.');
      setResentMsg(kind === 'reset'
        ? 'Tu cuenta ya existía. Te enviamos un email para restablecer la contraseña.'
        : 'Te enviamos una nueva invitación. Abre el último email recibido (revisa SPAM).'
      );
    } catch (e) {
      setResentMsg(`Error reenviando: ${e.message}`);
    } finally {
      setResending(false);
    }
  }

  /* ===================== UI ===================== */

  if (loadingUser) {
    return (
      <section className="pw-setup">
        <div className="card">
          <div className="skeleton title" />
          <div className="skeleton text" />
          <div className="skeleton field" />
        </div>
      </section>
    );
  }

  // Si no hay sesión y el link trajo error (ej. otp_expired), permitir reenvío
  if (!user) {
    return (
      <section className="pw-setup">
        <div className="card empty">
          <h1>Crear contraseña</h1>
          {linkErr ? (
            <div className="alert error">
              <FiAlertCircle /> {linkErr}
            </div>
          ) : null}
          <p className="muted">
            No hay sesión activa. Abre el enlace de invitación más reciente desde este
            navegador o solicita uno nuevo.
          </p>

          {(signupEmail) ? (
            <button className="btn primary" onClick={resendInvite} disabled={resending}>
              {resending ? <><FiRefreshCw className="spin" /> Reenviando…</> : 'Reenviar enlace a mi email'}
            </button>
          ) : (
            <a className="btn ghost" href="/planes">Volver a planes</a>
          )}

          {resentMsg && (
            <p className="status small">
              {resentMsg.startsWith('Error') ? <FiAlertCircle/> : <FiCheck/>} {resentMsg}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="pw-setup">
      <div className="card">
        <header className="head">
          <div className="badge">Paso final</div>
          <h1>Crea tu contraseña</h1>
          <p className="muted">Usuario: <strong>{user.email}</strong></p>
        </header>

        <form className="form" onSubmit={save}>
          {/* Password */}
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
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {show ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          {/* Strength meter */}
          <div className={`meter s-${strength}`} aria-hidden="true"><span /></div>

          {/* Checklist */}
          <ul className="checks" aria-live="polite">
            <li className={rules.L ? 'ok' : ''}>Mínimo 8 caracteres</li>
            <li className={rules.U ? 'ok' : ''}>Una mayúscula</li>
            <li className={rules.l ? 'ok' : ''}>Una minúscula</li>
            <li className={rules.n ? 'ok' : ''}>Un número</li>
            <li className={rules.w ? 'ok' : ''}>Sin espacios</li>
            <li className={rules.s ? 'ok' : ''}>Recomendado: símbolo</li>
          </ul>

          {/* Confirm */}
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

          {/* Feedback */}
          {err && <div className="alert error" role="alert">{err}</div>}
          {ok && <div className="alert success" role="status">Contraseña guardada. Redirigiendo…</div>}

          <div className="actions">
            <button className="btn primary" disabled={!allValid || saving}>
              {saving ? 'Guardando…' : 'Guardar y entrar'}
            </button>
            <a className="btn ghost" href="/planes">Cancelar</a>
          </div>
        </form>

        <footer className="foot muted">
          La sesión se mantendrá en este navegador. Podrás cambiar la contraseña desde tu perfil.
        </footer>
      </div>
    </section>
  );
}
