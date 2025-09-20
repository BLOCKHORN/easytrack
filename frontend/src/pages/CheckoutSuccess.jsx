import { useEffect, useMemo, useState } from 'react';
import {
  FiCheck, FiMail, FiExternalLink, FiRepeat, FiAlertCircle, FiClock, FiUser, FiShield, FiCopy
} from 'react-icons/fi';
import '../styles/CheckoutSuccess.scss';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/,'');

const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');

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

export default function CheckoutSuccess() {
  const qs = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionIdFromUrl = qs.get('session_id') || '';
  const [sessionId] = useState(sessionIdFromUrl || localStorage.getItem('last_session_id') || '');

  const [email, setEmail] = useState(localStorage.getItem('signup_email') || '');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [msg, setMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [loading, setLoading] = useState(true);
  const [verifiedOk, setVerifiedOk] = useState(false); // <- NUEVO: sabemos si la verificación fue OK
  const [verifyErr, setVerifyErr] = useState('');
  const [planCode, setPlanCode] = useState('');
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [dashboardUrl, setDashboardUrl] = useState(`${window.location.origin}/app`);
  const [plansUrl, setPlansUrl] = useState(`${window.location.origin}/planes`);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copied, setCopied] = useState(false);

  // Guarda el último session_id por si refresca
  useEffect(() => {
    if (sessionIdFromUrl) localStorage.setItem('last_session_id', sessionIdFromUrl);
  }, [sessionIdFromUrl]);

  const inboxUrl  = guessInboxUrl(email);
  const canResend = isEmail(email) && status!=='sending' && cooldown===0;

  useEffect(() => {
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

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
          const urlsObj = d.urls || {};
          const arr = Array.isArray(d.checkoutUrls) ? d.checkoutUrls : [];

          const portal   = urlsObj.portal    || arr[0] || '';
          const dash     = urlsObj.dashboard || arr[1] || `${window.location.origin}/app`;
          const plans    = urlsObj.plans     || arr[2] || `${window.location.origin}/planes`;

          setDashboardUrl(dash);
          setPlansUrl(plans);
          setPortalUrl(portal);

          if (!email && d.customerEmail) {
            setEmail(d.customerEmail);
            localStorage.setItem('signup_email', d.customerEmail);
          }

          setPlanCode(d.planCode || '');
          setTrialEndsAt(d.trialEndsAt || '');
          setCurrentPeriodEnd(d.currentPeriodEnd || '');

          setVerifiedOk(true);      // <- marcamos verificación OK
          setLoading(false);
          return true;
        } catch {
          // probar siguiente endpoint
        }
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

      // Fallback amable
      setVerifyErr('No se pudo confirmar automáticamente tu sesión. Puedes entrar al panel o gestionar la facturación desde aquí.');
      setLoading(false);
    })();
  }, [sessionId, email]);

  // ---- Reenviar/invitar (lo usa el auto-envío y el botón) ----
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
        ? 'Tu cuenta ya existía. Te hemos enviado un email para restablecer la contraseña.'
        : 'Invitación enviada. Revisa tu correo (y SPAM).'
      );
      setCooldown(20);
      localStorage.setItem('signup_email', email);
    }catch(e){
      setStatus('error'); setMsg(e.message); setCooldown(8);
    }
  }

  // ---- NUEVO: auto-envío una sola vez por session_id cuando todo está listo ----
  useEffect(() => {
    if (!verifiedOk) return;          // necesitamos verificación OK
    if (!isEmail(email)) return;      // necesitamos email válido
    if (!sessionId) return;

    const key = `invite_sent:${sessionId}`;
    if (localStorage.getItem(key) === '1') return; // ya enviado para esta sesión

    // Dispara invitación y marca como enviada (aunque falle no bloquea el botón)
    (async () => {
      try {
        await resendInvite();
      } finally {
        localStorage.setItem(key, '1');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifiedOk, email, sessionId]);

  function copyEmail(){
    if (!email) return;
    navigator.clipboard?.writeText(email).then(()=>{
      setCopied(true);
      setTimeout(()=>setCopied(false), 1000);
    });
  }

  return (
    <section className="success-screen full-bleed">
      {/* confetti */}
      <div className={`confetti ${showConfetti?'show':''}`} aria-hidden="true">
        {Array.from({length:10}).map((_,i)=><span key={i}/>)}
      </div>

      <div className="card" role="status" aria-live="polite">
        {/* Hero */}
        <div className="hero">
          <span className="badge"><FiCheck/><span className="pulse"/></span>
          <h1>Pago completado</h1>
          <p className="muted">
            {loading ? 'Confirmando tu suscripción…' : 'Te hemos enviado un correo para crear tu contraseña.'}
          </p>
        </div>

        {/* Skeleton */}
        {loading && (
          <div className="skeletons" aria-hidden="true">
            <div className="sk sk-row" />
            <div className="sk sk-steps" />
          </div>
        )}

        {/* Info rápida */}
        <div className="quick" aria-label="Resumen de la suscripción">
          <div className="qitem">
            <FiUser/> <span className="lab">Email</span>
            <span className="val">{email || '—'}</span>
            {email && (
              <button className="icon-btn" onClick={copyEmail} aria-label="Copiar email">
                <FiCopy/>
              </button>
            )}
          </div>
          <div className="qitem">
            <FiShield/> <span className="lab">Plan</span>
            <span className="val">{planCode || '—'}</span>
          </div>
          <div className="qitem">
            <FiClock/> <span className="lab">Prueba hasta</span>
            <span className="val">{fmtDate(trialEndsAt)}</span>
          </div>
        </div>

        {/* Timeline */}
        <ol className="timeline" aria-label="Pasos completados">
          <li className="step done">
            <span className="dot"><FiCheck/></span>
            <div className="txt"><strong>Pago confirmado</strong><span>Listo en Stripe</span></div>
          </li>
          <div className={`connector ${loading ? '' : 'done'}`} />
          <li className={`step ${loading ? '' : 'active'}`}>
            <span className="dot">2</span>
            <div className="txt"><strong>Revisa tu email</strong><span>“Invitación a EasyTrack”</span></div>
          </li>
          <div className="connector" />
          <li className="step">
            <span className="dot">3</span>
            <div className="txt"><strong>Crea tu contraseña</strong><span>Te lleva a <code>/crear-password</code></span></div>
          </li>
        </ol>

        {/* Abrir correo */}
        <div className="inbox-row">
          <div className="left">
            <div className="subj">Asunto: <b>“Invitación a EasyTrack”</b></div>
            <div className="muted small">Si no aparece, revisa Promociones/SPAM.</div>
          </div>
          {inboxUrl ? (
            <a className="btn ghost" href={inboxUrl} target="_blank" rel="noreferrer">Abrir correo <FiExternalLink/></a>
          ) : (
            <button className="btn ghost" disabled title="Proveedor no detectado">Abrir correo <FiExternalLink/></button>
          )}
        </div>

        {/* CTAs */}
        <div className="cta-row">
          {dashboardUrl && <a className="btn primary" href={dashboardUrl}>Ir al panel</a>}
          {portalUrl
            ? <a className="btn" href={portalUrl} target="_blank" rel="noreferrer">Gestionar facturación</a>
            : <button className="btn" disabled aria-disabled="true" title="Portal no disponible todavía">Gestionar facturación</button>}
          {plansUrl && <a className="btn ghost" href={plansUrl}>Cambiar plan</a>}
        </div>

        {/* Reenviar */}
        <div className="resend">
          <label htmlFor="inv-email">¿No te llegó? Reenviar invitación</label>
          <div className={`row ${!isEmail(email)&&email?'invalid':''}`}>
            <input id="inv-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" />
            <button className="btn primary" onClick={resendInvite} disabled={!canResend} aria-busy={status==='sending'}>
              <FiRepeat/>{status==='sending' ? 'Enviando…' : cooldown? `Reintenta en ${cooldown}s` : 'Reenviar'}
            </button>
          </div>
          {!!msg && <p className={`status ${status==='error'?'error':'ok'}`}>{status==='error'?<FiAlertCircle/>:<FiCheck/>} {msg}</p>}
          {status==='idle' && <p className="hint"><FiClock/> Normalmente llega en segundos.</p>}
          {verifyErr && <p className="status warn"><FiAlertCircle/> {verifyErr}</p>}
          {copied && <p className="status ok" role="status">Email copiado</p>}
        </div>

        <details className="tips">
          <summary>¿No lo ves? Consejos rápidos</summary>
          <ul>
            <li>Busca por remitente <code>no-reply@supabase.io</code>.</li>
            <li>Revisa carpetas de <b>SPAM</b>, <b>Promociones</b> y <b>Todos</b>.</li>
            <li>Confirma que tu email es correcto y pulsa <b>Reenviar</b>.</li>
          </ul>
        </details>
      </div>
    </section>
  );
}
