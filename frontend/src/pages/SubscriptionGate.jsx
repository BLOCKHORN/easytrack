import { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/subscription-gate.scss';
import anime from 'animejs/lib/anime.es.js';
import { supabase } from '../utils/supabaseClient';

export default function SubscriptionGate() {
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

  // ✅ Salimos si entitlements.canUseApp === true; fallback a /api/limits/me
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // 1) Canon: /api/tenants/me
        const r = await fetch('/api/tenants/me', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (r.ok) {
          const json = await r.json().catch(() => ({}));
          const ent  = json?.entitlements;
          if (ent?.canUseApp) {
            try { sessionStorage.removeItem('sub_block'); } catch {}
            const back = ctx?.returnTo || '/';
            return window.location.replace(back);
          }
          if (ent) setReason(ent?.reason || 'inactive');
        }

        // 2) Fallback: /api/limits/me (legacy)
        const r2 = await fetch('/api/limits/me', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (r2.ok) {
          const j2 = await r2.json().catch(() => ({}));
          const ent2 = j2?.entitlements;
          if (ent2?.canUseApp) {
            try { sessionStorage.removeItem('sub_block'); } catch {}
            const back = ctx?.returnTo || '/';
            return window.location.replace(back);
          }
          const remaining = Number(j2?.limits?.remaining ?? 0);
          const softBlocked = !!j2?.limits?.soft_blocked;
          if (!softBlocked && remaining > 0) {
            try { sessionStorage.removeItem('sub_block'); } catch {}
            const back = ctx?.returnTo || '/';
            return window.location.replace(back);
          }
          setReason(remaining <= 0 ? 'trial_exhausted' : 'inactive');
        }
      } catch { /* deja la puerta visible */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headline = {
    inactive: 'Tu suscripción no está activa',
    expired: 'Tu suscripción ha expirado',
    past_due: 'Hay un problema con tu pago',
    canceled: 'Tu suscripción está cancelada',
    cancel_at_period_end: 'Tu suscripción quedará cancelada',
    trial_exhausted: 'Has agotado tu prueba gratuita',
  }[reason] || 'Suscripción requerida';

  useEffect(() => {
    const root = bgRef.current;
    if (!root || !anime) return;

    const prefersReduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

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
      window.location.assign('/portal');
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
          <div className="brand"><span className="dot" /> EasyTrack</div>
          <button className="btn btn--ghost" onClick={volver}>Volver</button>
        </header>

        <main className="gate_main">
          <h1 className="reveal">{headline}</h1>
          <p className="lead reveal">
            Tu cuenta está protegida y tus datos siguen a salvo. Para continuar usando EasyTrack,
            revisa nuestros planes y reactivas cuando quieras.
          </p>

          <div className="info_cards reveal">
            <div className="info_card">
              <div className="ic_title">¿Por qué veo esto?</div>
              <div className="ic_body">
                Tu suscripción no está activa o has agotado la prueba gratuita.
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
            <a className="btn" href="/precios">Ver planes y reactivar</a>
            <button className="btn btn--ghost" onClick={openPortal} disabled={busy}>
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
