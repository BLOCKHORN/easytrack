// src/pages/admin/AuthView.jsx
import { useEffect, useRef, useState } from 'react';
import anime from 'animejs/lib/anime.es.js'; // requiere animejs@3.2.1
import { supabase } from '../../utils/supabaseClient';
import '../../styles/auth.scss';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ⬇️ Nuevo: base fija para el admin (configúrala en .env)
const ADMIN_BASE = (import.meta.env.VITE_ADMIN_BASE_URL || 'https://admin.easytrack.pro').replace(/\/$/, '');

export default function AuthView() {
  const bgRef = useRef(null);
  const [email, setEmail] = useState('blockhornstudios@gmail.com'); // opcional: pre-rellenado
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (!bgRef.current) return;
    const ct = bgRef.current;
    ct.innerHTML = '';
    const count = window.innerWidth < 640 ? 6 : 12;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'orb';
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      s.style.setProperty('--d', (6 + Math.random() * 10).toFixed(1) + 's');
      s.style.setProperty('--sz', (50 + Math.random() * 140).toFixed(0) + 'px');
      ct.appendChild(s);
    }
    const anim = anime({
      targets: '.orb',
      translateX: () => anime.random(-40, 40),
      translateY: () => anime.random(-40, 40),
      direction: 'alternate',
      easing: 'easeInOutSine',
      duration: () => anime.random(5000, 11000),
      loop: true,
      delay: anime.stagger(80)
    });
    return () => anim.pause();
  }, []);

  async function submit(e) {
    e?.preventDefault();
    setErr('');
    setInfo('');
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // window.location.replace('/admin'); // si necesitas forzar redirección aquí
    } catch (ex) {
      setErr(ex.message || 'Error de autenticación');
    } finally {
      setBusy(false);
    }
  }

  async function sendResetLink() {
    setErr('');
    setInfo('');
    if (!emailRe.test(String(email || '').trim())) {
      setErr('Introduce un email válido para enviar el enlace de restablecimiento.');
      return;
    }
    setResetting(true);
    try {
      try { localStorage.setItem('signup_email', String(email).trim()); } catch {}
      // ⬇️ Importante: usar ADMIN_BASE (y no window.location.origin)
      const redirectTo = `${ADMIN_BASE}/crear-password?next=${encodeURIComponent('/admin')}`;

      const { error } = await supabase.auth.resetPasswordForEmail(String(email).trim(), {
        redirectTo
      });
      if (error) throw error;

      setInfo('Te hemos enviado un email con el enlace para restablecer la contraseña. Revisa tu bandeja de entrada y SPAM.');
    } catch (ex) {
      setErr(ex.message || 'No se pudo enviar el enlace de restablecimiento.');
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="auth">
      <div className="brandbar">
        <div className="brand">
          <span className="logo-dot" />
          <span>EasyTrack — Superadmin</span>
        </div>
        <div className="env-pill">localhost</div>
      </div>

      <div className="auth__bg" ref={bgRef} />

      <div className="wrap">
        <div className="grid">
          <section className="hero">
            <span className="badge">Superadmin</span>
            <h1>Controla EasyTrack<br/>desde un único panel</h1>
            <p className="lead">
              Tenants, suscripciones, datos y soporte — con seguridad, auditoría e impersonación.
            </p>
            <ul className="bullets">
              <li>2FA y roles de staff</li>
              <li>Impersonación segura</li>
              <li>Audit log detallado</li>
            </ul>
          </section>

          <section className="card glass">
            <h3 className="card__title">Acceso restringido</h3>

            <form className="form" onSubmit={submit}>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  placeholder="tu@empresa.com"
                  value={email}
                  onChange={e=>setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </label>
              <label>
                <span>Contraseña</span>
                <input
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </label>

              {err && <div className="error" role="alert">{err}</div>}
              {info && <div className="info" role="status">{info}</div>}

              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? 'Procesando…' : 'Entrar'}
              </button>

              <div className="switch" style={{marginTop:12, display:'flex', alignItems:'center', gap:12}}>
                <button
                  type="button"
                  className="btn"
                  onClick={sendResetLink}
                  disabled={resetting}
                  aria-label="Enviar enlace de restablecimiento"
                  title="Enviar enlace de restablecimiento"
                >
                  {resetting ? 'Enviando enlace…' : '¿Olvidaste tu contraseña?'}
                </button>
                <small className="muted">
                  Recibirás un enlace. Te llevaremos a <code>/crear-password</code> y luego al panel.
                </small>
              </div>
            </form>

            <div className="switch" style={{marginTop:12}}>
              <small className="muted">
                Solo personal autorizado. Las altas de cuentas se gestionan en Supabase.
              </small>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
