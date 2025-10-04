// src/pages/CrearPassword.jsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { FiEye, FiEyeOff, FiAlertCircle, FiCheck, FiRefreshCw } from 'react-icons/fi';
import '../styles/CrearPassword.scss';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'');

export default function CrearPassword() {
  const nav = useNavigate();
  const loc = useLocation();

  const [loadingUser, setLoadingUser]   = useState(true);
  const [user, setUser]                 = useState(null);

  const [pwd, setPwd]                   = useState('');
  const [pwd2, setPwd2]                 = useState('');
  const [show, setShow]                 = useState(false);
  const [saving, setSaving]             = useState(false);

  const [ok, setOk]                     = useState(false);
  const [err, setErr]                   = useState('');
  const [hashErr, setHashErr]           = useState('');
  const [resending, setResending]       = useState(false);
  const [resentMsg, setResentMsg]       = useState('');
  const [bootMsg, setBootMsg]           = useState('');

  const signupEmail = useMemo(() => (localStorage.getItem('signup_email') || ''), []);
  const lastKnownSlug = useMemo(() => (localStorage.getItem('et:last_slug') || ''), []);
  const nextParam = useMemo(() => new URLSearchParams(loc.search).get('next') || '', [loc.search]);

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

  function computeNext(slugMaybe) {
    const slug = slugMaybe || lastKnownSlug || '';
    if (nextParam) return nextParam;
    return slug ? `/${slug}/dashboard` : '/dashboard';
  }

  async function runBootstrap() {
    try {
      setBootMsg('Preparando tu espacio…');
      const { data: fresh } = await supabase.auth.getSession();
      const token = fresh?.session?.access_token;
      if (!token) return;

      const resp = await fetch(`${API}/api/auth/bootstrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${resp.status}`);

      const slug = j?.tenant?.slug || '';
      if (slug) {
        try { localStorage.setItem('et:last_slug', slug); } catch {}
      }
      setBootMsg('');
    } catch {
      // Silencioso: si falla bootstrap no bloqueamos la creación de password
      setBootMsg('');
    }
  }

  // Hash/session bootstrap
  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash?.startsWith('#')
          ? new URLSearchParams(window.location.hash.slice(1))
          : new URLSearchParams();

        const qp = new URLSearchParams(window.location.search);
        const access_token  = hash.get('access_token');
        const refresh_token = hash.get('refresh_token');
        const error_code    = hash.get('error_code') || qp.get('error_code') || qp.get('error');
        const error_desc    = hash.get('error_description') || qp.get('error_description');

        if (access_token && refresh_token) {
          try {
            await supabase.auth.setSession({ access_token, refresh_token });
            history.replaceState({}, document.title, window.location.pathname + window.location.search);
          } catch {}
        } else if (error_code) {
          setHashErr(`${error_desc || error_code}`);
        }

        // Obtener usuario si hay sesión
        const { data, error } = await supabase.auth.getUser();
        if (!error) {
          const u = data?.user || null;
          setUser(u);

          if (u?.email) {
            try {
              localStorage.setItem('et:email_confirmed', '1');
              localStorage.setItem('signup_email', u.email);
              setTimeout(() => { try { localStorage.removeItem('et:email_confirmed'); } catch {} }, 1500);
              if ('BroadcastChannel' in window) {
                const bc = new BroadcastChannel('et-auth');
                bc.postMessage({ type: 'EMAIL_CONFIRMED', email: u.email });
                bc.close();
              }
            } catch {}
          }
        }

        // Hacemos bootstrap (crea/asegura tenant+membership) para poder calcular redirección por slug
        await runBootstrap();
      } finally {
        setLoadingUser(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e) {
    e?.preventDefault?.();
    setErr('');
    if (!allValid) {
      setErr('Revisa los requisitos y que ambas contraseñas coincidan.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd, data: { needs_password: false } });
      if (error) throw error;
      setOk(true);
      const slug = localStorage.getItem('et:last_slug') || '';
      const dest = computeNext(slug);
      setTimeout(() => { nav(dest, { replace: true }); }, 700);
    } catch (e2) {
      setErr(e2?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setSaving(false);
    }
  }

  async function resendInvite() {
    if (!signupEmail) {
      setResentMsg('No conozco tu email. Vuelve a la pantalla anterior y solicita reenvío.');
      return;
    }
    setResending(true);
    setResentMsg('');
    try {
      // Mantengo tus endpoints de fallback para tu stack actual
      const body = JSON.stringify({ email: signupEmail });
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
        } catch (e) { lastErr = e.message; }
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

  if (!user) {
    return (
      <section className="pw-setup">
        <div className="card empty">
          <h1>Crear contraseña</h1>
          {hashErr ? (
            <div className="alert error">
              <FiAlertCircle /> {decodeURIComponent(hashErr)}
            </div>
          ) : null}
          <p className="muted">
            No hay sesión activa. Abre el enlace más reciente desde este navegador o solicita uno nuevo.
          </p>

          {signupEmail ? (
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
          {bootMsg ? <p className="muted small">{bootMsg}</p> : null}
        </header>

        <form className="form" onSubmit={save}>
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
