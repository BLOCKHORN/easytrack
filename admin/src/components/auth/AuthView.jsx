import { useEffect, useRef, useState } from 'react';
import anime from 'animejs/lib/anime.es.js'; // requiere animejs@3.2.1
import { supabase } from '../../utils/supabaseClient';
import '../../styles/auth.scss';

export default function AuthView() {
  const bgRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

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
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (ex) {
      setErr(ex.message || 'Error de autenticación');
    } finally {
      setBusy(false);
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
              {err && <div className="error">{err}</div>}
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? 'Procesando…' : 'Entrar'}
              </button>
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
