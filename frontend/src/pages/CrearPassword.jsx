import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import '../styles/CrearPassword.scss';

export default function CrearPassword() {
  const [loadingUser, setLoadingUser]   = useState(true);
  const [user, setUser]                 = useState(null);

  const [pwd, setPwd]                   = useState('');
  const [pwd2, setPwd2]                 = useState('');
  const [show, setShow]                 = useState(false);
  const [saving, setSaving]             = useState(false);

  const [ok, setOk]                     = useState(false);
  const [err, setErr]                   = useState('');

  // Al entrar desde el link de invitación, ya venimos con sesión válida.
  // Aquí leemos el usuario y señalizamos a la otra pestaña que el email está confirmado.
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error) {
        const u = data?.user || null;
        setUser(u);

        // 🔔 Señaliza a otras pestañas/ventanas que el email ya fue confirmado
        try {
          // Fallback por localStorage (dispara evento 'storage')
          localStorage.setItem('et:email_confirmed', '1');
          setTimeout(() => {
            try { localStorage.removeItem('et:email_confirmed'); } catch {}
          }, 2000);

          // Canal dedicado (más fiable/moderno)
          if ('BroadcastChannel' in window) {
            const bc = new BroadcastChannel('et-auth');
            bc.postMessage({ type: 'EMAIL_CONFIRMED' });
            bc.close();
          }
        } catch {}
      }
      setLoadingUser(false);
    })();
  }, []);

  // Reglas de seguridad
  const rules = useMemo(() => {
    const L = pwd.length >= 8;
    const U = /[A-Z]/.test(pwd);
    const l = /[a-z]/.test(pwd);
    const n = /[0-9]/.test(pwd);
    const s = /[^A-Za-z0-9]/.test(pwd);
    const w = !/\s/.test(pwd);
    return { L, U, l, n, s, w };
  }, [pwd]);

  // Puntuación (0..5) para barra
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
    // Refresco ligero y al panel
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 900);
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
          <p className="muted">
            No hay sesión activa. Abre el enlace de invitación desde este mismo
            navegador o solicita uno nuevo desde la pantalla anterior.
          </p>
          <a className="btn ghost" href="/planes">Volver a planes</a>
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
          <div className={`meter s-${strength}`} aria-hidden="true">
            <span />
          </div>

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
