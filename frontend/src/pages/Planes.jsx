import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaStar, FaShieldAlt, FaLock, FaInfoCircle, FaMoneyBillWave,
  FaClock, FaHeadset, FaArrowRight, FaCheck, FaTag
} from "react-icons/fa";
import "../styles/Planes.scss";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/,"");

/* ===== PROMO (activar/desactivar en un solo sitio) ===== */
const PROMO = {
  firstMonthFreeMonthly: true,
  label: "PRIMER MES GRATIS",
  short: "1er mes gratis",
  note: "Se aplica automáticamente en el checkout.",
};

const isEmail = (v = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const fmtEUR = (cents) => (cents / 100).toFixed(2) + " €";

/* ---------- Preferencia de plan vía URL/localStorage ---------- */
function readPreferredPlan() {
  try {
    const qs = new URLSearchParams(window.location.search);
    const q = (qs.get("plan") || "").toLowerCase();
    const m = (localStorage.getItem("preferred_plan") || "").toLowerCase();
    return q || m || "";
  } catch {
    return "";
  }
}
function writePreferredPlan(code) {
  try {
    const qs = new URLSearchParams(window.location.search);
    qs.set("plan", code);
    const url = `${window.location.pathname}?${qs.toString()}`;
    window.history.replaceState({}, "", url);
    localStorage.setItem("preferred_plan", code);
  } catch {}
}

/* ---------- Barra con marcas de pago ---------- */
function PaymentMarks() {
  const marks = [
    { src: "/brands/stripe-svgrepo-com.svg", alt: "Procesado por Stripe" },
    { src: "/brands/visa-svgrepo-com.svg", alt: "Visa" },
    { src: "/brands/mastercard-svgrepo-com.svg", alt: "Mastercard" },
    { src: "/brands/amex-svgrepo-com.svg", alt: "American Express" },
    { src: "/brands/apple-pay-svgrepo-com.svg", alt: "Apple Pay" },
    { src: "/brands/google-pay-svgrepo-com.svg", alt: "Google Pay" },
    { src: "/brands/amazon-pay-svgrepo-com.svg", alt: "Amazon Pay" },
    { src: "/brands/paypal-svgrepo-com.svg", alt: "PayPal" },
  ];
  return (
    <div className="paybar" aria-label="Métodos de pago y wallets soportados">
      {marks.map((m) => (
        <span className="brand-pill" key={m.src}>
          <img src={m.src} alt={m.alt} loading="lazy" decoding="async" />
        </span>
      ))}
    </div>
  );
}

/* ---------- Animación suave para el número (€/mes) ---------- */
function useAnimatedNumber(value, duration = 380) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current, to = value;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

/* ---------- Overlay de carga ---------- */
function LoadingOverlay() {
  return (
    <div className="load-overlay" role="status" aria-live="polite" aria-label="Cargando">
      <div className="gcube" aria-hidden="true">
        <span className="ring r1"></span>
        <span className="ring r2"></span>
        <span className="ring r3"></span>
        <span className="cube">
          <i /><i /><i /><i />
        </span>
        <span className="orbit" aria-hidden="true"></span>
      </div>
      <div className="brand-text">EASYTRACK</div>
    </div>
  );
}

export default function Planes() {
  const [plans, setPlans] = useState([]);
  const [selected, setSel] = useState(null);

  // Form checkout (solo email + nombre negocio opcional)
  const [email, setEmail] = useState(localStorage.getItem("signup_email") || "");
  const [company, setCompany] = useState(localStorage.getItem("signup_company") || "");

  const [error, setError] = useState("");
  const [loading, setLoad] = useState(false); // overlay

  // Bloquea scroll cuando mostramos el overlay
  useEffect(() => {
    if (!loading) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [loading]);

  // Cargar planes; dejar 1 / 12 / 24 meses y ordenar
  useEffect(() => {
    (async () => {
      try {
        // intentamos /billing/plans, si falla probamos /api/billing/plans
        const endpoints = [`${API_BASE}/billing/plans`, `${API_BASE}/api/billing/plans`];
        let out = null, lastErr = null;
        for (const url of endpoints) {
          try {
            const res = await fetch(url);
            if (!res.ok) { lastErr = `HTTP ${res.status}`; continue; }
            const j = await res.json();
            out = j?.plans || [];
            break;
          } catch (e) { lastErr = e.message; }
        }
        if (!out) throw new Error(lastErr || 'No se pudieron cargar los planes');

        const desired = [1, 12, 24];
        const arr = out
          .filter((p) => desired.includes(p.period_months) && p.active !== false)
          .sort((a, b) => desired.indexOf(a.period_months) - desired.indexOf(b.period_months));

        setPlans(arr);

        const wanted = readPreferredPlan();
        const picked =
          arr.find((p) => p.code === wanted) ||
          arr.find((p) => p.period_months === 12) ||
          arr[0];
        if (picked?.code) {
          setSel(picked.code);
          writePreferredPlan(picked.code);
        }
      } catch (e) {
        console.error("[Planes] Error al cargar planes:", e);
        setError("No se pudieron cargar los planes de precios.");
      }
    })();
  }, []);

  const byCode = useMemo(() => Object.fromEntries(plans.map((p) => [p.code, p])), [plans]);
  const monthly = useMemo(() => plans.find((p) => p.period_months === 1) || null, [plans]);
  const plan = selected ? byCode[selected] : null;
  const refMonthly = monthly ? monthly.base_price_cents : 2900;

  // Métricas
  const payNow = plan ? plan.base_price_cents : 0;
  const perMonthC = plan ? Math.round(plan.base_price_cents / plan.period_months) : 0;
  const animMonthly = useAnimatedNumber(perMonthC);

  const compare = useMemo(() => {
    if (!plan || plan.period_months === 1) return null;
    const was = refMonthly * plan.period_months;
    const now = plan.base_price_cents;
    const save = Math.max(0, was - now);
    const unit = plan.period_months === 24 ? "2 años" : plan.period_months === 12 ? "año" : `${plan.period_months} meses`;
    return { was, now, save, unit };
  }, [plan, refMonthly]);

  // ---------- Checkout (Stripe-first; guardamos session_id si llega) ----------
  async function start() {
    try {
      if (!plan) return;
      if (!isEmail(email)) {
        alert("Introduce un email válido.");
        return;
      }
      setLoad(true);

      localStorage.setItem("signup_email", email);
      localStorage.setItem("signup_company", company);

      const endpoints = [
        `${API_BASE}/billing/checkout/start`,
        `${API_BASE}/api/billing/checkout/start`
      ];

      let ok = false, lastErr = "", url = "", session_id = "";
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan_code: plan.code, tenant_name: company, email })
          });
          const j = await res.json().catch(()=> ({}));
          if (!res.ok || !j?.ok || !(j.checkout_url || j.url)) {
            lastErr = j?.error || `HTTP ${res.status}`;
            continue;
          }
          ok = true;
          url = j.checkout_url || j.url;
          session_id = j.session_id || "";
          break;
        } catch (e) {
          lastErr = e.message;
        }
      }
      if (!ok) throw new Error(lastErr || "Error iniciando el checkout.");

      if (session_id) localStorage.setItem("last_session_id", session_id);

      window.location.href = url;
    } catch (e) {
      console.error("[Planes] Checkout error:", e);
      alert(e.message);
      setLoad(false);
    }
  }

  const labelFor = (p) => (p.period_months === 1 ? "Mensual" : p.period_months === 12 ? "Anual" : "24 meses");

  return (
    <section className="plans-pro" aria-labelledby="plans-title">
      {/* Background animado */}
      <div className="bg" aria-hidden="true">
        <div className="mesh">
          <span className="blob b1"></span>
          <span className="blob b2"></span>
          <span className="blob b3"></span>
        </div>
        <div className="grid"></div>
        <div className="glow"></div>
      </div>

      <div className="content">
        <header className="pp-head">
          <h1 id="plans-title">Plan Único</h1>
          <p className="sub">
            Mismo producto. <b>3 formas de pagarlo.</b> Sin letra pequeña.
          </p>

          {/* Banda promocional (visible si la promo está activa) */}
          {PROMO.firstMonthFreeMonthly && (
            <div className="pp-promo-stripe" role="status" aria-live="polite">
              <strong className="promo-kicker"><FaTag /> {PROMO.label}</strong>
              <span className="promo-note">— Aplica al plan mensual. {PROMO.note}</span>
            </div>
          )}

          <div className="pp-toggle" role="tablist" aria-label="Periodo de pago">
            {plans.map((p) => {
              const isMonthly = p.period_months === 1;
              return (
                <button
                  key={p.code}
                  role="tab"
                  aria-selected={selected === p.code}
                  className={`opt ${selected === p.code ? "is-active" : ""} ${p.period_months === 12 ? "is-popular" : ""}`}
                  onClick={() => {
                    setSel(p.code);
                    writePreferredPlan(p.code);
                  }}
                >
                  <span>{labelFor(p)}</span>
                  {p.period_months === 12 && (
                    <em className="badge-soft">
                      <FaStar /> Más elegido
                    </em>
                  )}
                  {PROMO.firstMonthFreeMonthly && isMonthly && (
                    <em className="badge-promo">{PROMO.short}</em>
                  )}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
        </header>

        {/* HERO */}
        <div className={`pp-hero ${plan?.period_months === 12 ? "pop" : ""}`} aria-live="polite">
          <div className="price-wrap">
            {/* Precio dual si la promo aplica y el plan es mensual */}
            {PROMO.firstMonthFreeMonthly && plan?.period_months === 1 ? (
              <div className="price-duo" aria-label="Promoción: primer mes gratis">
                <div className="now-free">
                  <span className="num">0</span>
                  <span className="eur">€</span>
                  <span className="tag">este mes</span>
                </div>
                <div className="then">
                  <span className="then-label">Luego</span>
                  <span className="then-num">
                    {(animMonthly / 100).toLocaleString("es-ES", { maximumFractionDigits: 0 })}
                  </span>
                  <span className="then-per">/ mes</span>
                </div>
                <span className="burst" aria-hidden="true">{PROMO.short}</span>
              </div>
            ) : (
              <div className="price">
                <span className="num">{(animMonthly / 100).toLocaleString("es-ES", { maximumFractionDigits: 0 })}</span>
                <span className="per">€/mes</span>
              </div>
            )}
            {plan?.period_months === 12 && <span className="corner-badge">Recomendado</span>}
          </div>

          {compare ? (
            <div className="compare">
              <span className="ref">
                <FaInfoCircle /> vs pagar mes a mes
              </span>
              <span className="was">
                <s>{fmtEUR(compare.was)}</s>
              </span>
              <span className="now">Ahora {fmtEUR(compare.now)}</span>
              <span className="save">
                Ahorras {(compare.save / 100).toFixed(0)} € / {compare.unit}
              </span>
            </div>
          ) : (
            <div className="chips">
              <span className="chip">
                <FaTag /> Pago mes a mes
              </span>
              <span className="chip ok">
                <FaCheck /> Cancela cuando quieras
              </span>
            </div>
          )}
        </div>

        {/* LAYOUT */}
        <div className="layout">
          <div className="left">
            {/* Comparativa breve */}
            <div className="pp-compare" aria-label="Comparativa rápida">
              {plans.map((p) => {
                const m = Math.round(p.base_price_cents / p.period_months);
                const isSel = selected === p.code;
                const save = p.period_months > 1 ? Math.max(0, refMonthly * p.period_months - p.base_price_cents) : 0;
                const isMonthly = p.period_months === 1;
                return (
                  <button
                    key={p.code}
                    className={`mini ${isSel ? "focus" : ""} ${p.period_months === 12 ? "popular" : ""}`}
                    onClick={() => {
                      setSel(p.code);
                      writePreferredPlan(p.code);
                    }}
                  >
                    <span className="k">{labelFor(p)}</span>
                    <span className="v">{(m / 100).toFixed(0)} €</span>
                    {isMonthly && PROMO.firstMonthFreeMonthly ? (
                      <span className="t ok">{PROMO.short}</span>
                    ) : save > 0 ? (
                      <span className="t ok">
                        Ahorra {(save / 100).toFixed(0)} € {p.period_months === 24 ? "en 2 años" : "al año"}
                      </span>
                    ) : (
                      <span className="t muted">Empieza sin compromiso</span>
                    )}
                  </button>
                );
              })}
            </div>

            <article className="pp-card">
              <ul className="features">
                <li><FaCheck /> Orden instantáneo: zonas virtuales, etiquetas A4+QR y foto al ingreso</li>
                <li><FaCheck /> Mapa de ocupación y reubicación guiada para liberar espacio</li>
                <li><FaCheck /> Recordatorios 24/48/72 h para acelerar retiradas</li>
                <li><FaCheck /> Checklist diario, radar de incidencias y exportes contables básicos</li>
                <li><FaCheck /> Usuarios sin límite bajo fair-use. Soporte priorizado.</li>
              </ul>
            </article>

            <div className="pp-trust" aria-label="Garantías">
              <div className="titem"><FaLock /> RGPD y datos alojados en la UE</div>
              <div className="titem"><FaShieldAlt /> Stripe (PCI DSS L1)</div>
              <div className="titem"><FaMoneyBillWave /> Sin permanencia</div>
              <div className="titem"><FaClock /> Alta en minutos</div>
              <div className="titem"><FaHeadset /> Soporte cercano</div>
            </div>
          </div>

          <aside className="right">
            <div className="summary">
              <h4>Resumen</h4>

              {plan ? (
                <>
                  <div className="row">
                    <span className="label">Plan</span>
                    <span className="value">{labelFor(plan)}</span>
                  </div>

                  <div className="row">
                    <span className="label">Equivalente / mes</span>
                    <span className="value strong">{(perMonthC / 100).toFixed(2)} €</span>
                  </div>

                  {compare && (
                    <div className="row save">
                      <span className="label">Ahorro vs mensual</span>
                      <span className="value green">{(compare.save / 100).toFixed(0)} €</span>
                    </div>
                  )}

                  <div className="row total">
                    <span className="label">Pagas ahora</span>
                    <span className="value">
                      {fmtEUR(payNow)} <em className="muted">(IVA incl.)</em>
                    </span>
                  </div>

                  {/* Pista de promo en el resumen (sin alterar el total mostrado) */}
                  {PROMO.firstMonthFreeMonthly && plan.period_months === 1 && (
                    <>
                      <div className="row promo">
                        <span className="label">Promoción</span>
                        <span className="value green">{PROMO.short}</span>
                      </div>
                      <p className="microcopy promo-note">
                        {PROMO.note} El primer cargo será de <b>0,00 €</b> y después {(perMonthC/100).toFixed(2)} € / mes.
                      </p>
                    </>
                  )}

                  <p className="microcopy">
                    Mostramos <b>precios IVA incluido</b>. En el checkout, Stripe recogerá tus datos fiscales
                    (empresa/VAT) y mostrará el desglose sin cambiar el <b>total</b>.
                  </p>

                  <div className="sep" />

                  <div className="form">
                    <label>Email de tu negocio</label>
                    <input
                      placeholder="tucuenta@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      inputMode="email"
                      autoComplete="email"
                    />

                    <label>Nombre del negocio (opcional)</label>
                    <input
                      placeholder="Mi Empresa S.L."
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      autoComplete="organization"
                    />
                  </div>

                  <button className="cta" onClick={start} disabled={!plan || !isEmail(email) || loading} aria-busy={loading}>
                    {loading ? "Iniciando…" : (<>Empezar ahora <FaArrowRight /></>)}
                  </button>

                  <PaymentMarks />
                </>
              ) : (
                <p className="muted">Selecciona un plan para ver el resumen.</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      {loading && <LoadingOverlay />}
    </section>
  );
}
