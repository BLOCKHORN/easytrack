// frontend/src/pages/SubscriptionGate.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/subscription-gate.scss';
import anime from 'animejs/lib/anime.es.js';
import { supabase } from '../utils/supabaseClient';

export default function SubscriptionGate() {
  // Motivo (query ?reason=...)
  const params  = new URLSearchParams(location.search);
  const [reason, setReason] = useState(params.get('reason') || 'inactive');

  // Contexto guardado por el fetcher cuando recibió 402
  const ctx = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('sub_block') || '{}'); }
    catch { return {}; }
  }, []);

  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const bgRef   = useRef(null);

  // ⛔️ Antes: salíamos si /api/tenants/me devolvía 200 (siempre 200 por whitelist)
  // ✅ Ahora: solo salimos si la suscripción está ACTIVA de verdad.
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return; // no logueado → que vea la puerta

        const r = await fetch('/api/tenants/me', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (!r.ok) return; // si falla, mantenemos la puerta visible

        const json = await r.json().catch(() => ({}));
        const sub  = json?.subscription;
        const now = Date.now();
        const status = String(sub?.status || '').toLowerCase();
        const cpe = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
        const trialEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : null;

        let active = false;
        if (status === 'active')   active = (cpe == null) || (cpe > now);
        else if (status === 'trialing') active = (trialEnd == null) || (trialEnd > now);
        else if (status === 'canceled') active = (cpe != null) && (cpe > now);

        if (active) {
          const back = ctx?.returnTo || '/';
          window.location.replace(back);
        } else {
          // Ajusta el motivo mostrado para que sea coherente con el estado real
          setReason(status === 'trialing' ? 'trial' : (status || 'inactive'));
        }
      } catch {
        // si algo falla, dejamos la puerta visible
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Título por motivo
  const headline = {
    inactive: 'Tu suscripción no está activa',
    expired: 'Tu suscripción ha expirado',
    past_due: 'Hay un problema con tu pago',
    canceled: 'Tu suscripción está cancelada',
    cancel_at_period_end: 'Tu suscripción quedará cancelada',
    trial: 'Termina tu prueba para seguir usando EasyTrack',
  }[reason] || 'Suscripción requerida';

  useEffect(() => {
    const root = bgRef.current;
    if (!root || !anime) return;

    const prefersReduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // Burbujas
    let bubbles = [];
    if (!prefersReduce) {
      root.innerHTML = '';
      const n = Math.min(12, Math.max(8, Math.floor(window.innerWidth / 140)));
      const frag = document.createDocumentFragment();
      for (let i = 0; i < n; i++) {
        const s = document.createElement('span');
        s.className = 'bubble';
        s.style.left = Math.random() * 100 + '%';
        s.style.top  = Math.random() * 100 + '%';
        s.style.setProperty('--size', (80 + Math.random() * 140).toFixed(0) + 'px');
        frag.appendChild(s);
        bubbles.push(s);
      }
      root.appendChild(frag);
    }

    // Fondo flotante
    const loop = !prefersReduce ? anime({
      targets: bubbles,
      translateX: () => anime.random(-40, 40),
      translateY: () => anime.random(-30, 30),
      scale:     () => 0.9 + Math.random() * 0.3,
      direction: 'alternate',
      easing: 'easeInOutSine',
      duration: () => anime.random(4500, 9000),
      delay:    anime.stagger(90),
      loop: true,
      autoplay: true
    }) : null;

    // Entrada de contenido
    const intro = anime.timeline({ easing: 'easeOutQuad', autoplay: true })
      .add({ targets: '.gate_main', opacity: [0,1], translateY: [10,0], duration: 420 })
      .add({ targets: '.reveal',    opacity: [0,1], translateY: [8,0], delay: anime.stagger(60), duration: 360 }, '-=220');

    const onVisibility = () => {
      const hidden = document.hidden;
      try { hidden ? intro.pause() : intro.play(); } catch {}
      if (loop) { try { hidden ? loop.pause() : loop.play(); } catch {} }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      try { intro?.pause?.(); } catch {}
      try { loop?.pause?.(); }  catch {}
      try { anime.remove?.(bubbles); } catch {}
      if (root) root.innerHTML = '';
      bubbles = [];
    };
  }, []);

  function volver() {
    const back = ctx?.returnTo || '/';
    location.assign(back);
  }

  function openPortal() {
    setBusy(true); setErr('');
    try {
      window.location.assign('/portal'); // puente → backend /billing/portal
    } catch {
      setErr('No se pudo abrir el portal de facturación.');
      setBusy(false);
    }
  }

  return (
    <div className="gate gate--light">
      <div className="gate_bg" ref={bgRef} />

      <div className="gate_wrap">
        <header className="gate_head reveal">
          <div className="brand">
            <span className="dot" /> EasyTrack
          </div>
          <button className="btn btn--ghost" onClick={volver}>Volver</button>
        </header>

        <main className="gate_main">
          <h1 className="reveal">{headline}</h1>
          <p className="lead reveal">
            Tu cuenta está protegida y tus datos siguen a salvo. Para continuar usando EasyTrack,
            revisa nuestros planes y reactiva la suscripción cuando quieras.
          </p>

          <div className="info_cards reveal">
            <div className="info_card">
              <div className="ic_title">¿Por qué veo esto?</div>
              <div className="ic_body">
                Tu suscripción está inactiva o hubo un problema con el cobro.
                Puedes reactivarla en un minuto.
              </div>
            </div>
            <div className="info_card">
              <div className="ic_title">¿Pierdo mis datos?</div>
              <div className="ic_body">
                No. Tus datos se conservan. En cuanto reanudes el plan, todo seguirá tal cual lo dejaste.
              </div>
            </div>
            <div className="info_card">
              <div className="ic_title">¿Qué plan elegir?</div>
              <div className="ic_body">
                Tenemos mensual, anual y bianual. A más tiempo, mejor precio al mes.
              </div>
            </div>
          </div>

          <div className="cta_row reveal">
            <a className="btn" href="/planes">Ver planes y reactivar</a>
            <button
              className="btn btn--ghost"
              onClick={openPortal}
              disabled={busy}
              title="Abrir portal de facturación"
            >
              {busy ? 'Abriendo…' : 'Ver/actualizar método de pago'}
            </button>
          </div>

          {err && <div className="error reveal">{err}</div>}

          <p className="muted reveal">
            ¿Dudas o ya pagaste y sigues sin acceso? Escríbenos a&nbsp;
            <a href="mailto:soporte@easytrack.app">soporte@easytrack.app</a>.
          </p>
        </main>
      </div>
    </div>
  );
}
