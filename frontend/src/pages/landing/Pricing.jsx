import { useEffect, useMemo, useRef, useState } from "react";
import "./Pricing.scss";
import { savePlanIntent } from "../../utils/planIntent";

const API_BASE   = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/,"");
const SIGNUP_URL = "/registro";

const FALLBACK = [
  { code: "monthly",     label: "Mensual",   period_months: 1,  price_cents:  2900 },
  { code: "prepaid_12m", label: "Anual",     period_months: 12, price_cents: 28800 },
  { code: "prepaid_24m", label: "24 meses",  period_months: 24, price_cents: 45600 },
];

const PROMO = { firstMonthFreeMonthly: true, label: "PRIMER MES GRATIS", short: "1er mes gratis" };
const eur0 = (c) => (c / 100).toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const eur  = (c) => (c / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const IStar   = () => (<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 17.3l-6.16 3.7 1.64-6.99-5.48-4.75 7.2-.62L12 2l2.8 6.64 7.2.62-5.48 4.75 1.64 6.99z"/></svg>);
const ICheck  = () => (<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>);
const IShield = () => (<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2l7 3v6c0 5-3.5 9.7-7 11C8.5 20.7 5 16 5 11V5l7-3z"/></svg>);
const IReceipt= () => (<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 2h12v20l-3-2-3 2-3-2-3 2zM8 7h8v2H8zm0 4h8v2H8z"/></svg>);
const IChat   = () => (<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2 4h20v12H7l-5 4z"/></svg>);
const IInfo   = () => (<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 9h2v8h-2zm0-4h2v2h-2z"/><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/></svg>);

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

export default function Pricing() {
  const [rawPlans, setRawPlans] = useState(FALLBACK);
  const [selected, setSelected] = useState("prepaid_12m");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const urls = [`${API_BASE}/billing/plans`, `${API_BASE}/api/billing/plans`];
        for (const u of urls) {
          try {
            const r = await fetch(u);
            if (!r.ok) continue;
            const j = await r.json();
            const plans = (j?.plans || [])
              .filter(p => [1,12,24].includes(p.period_months))
              .map(p => ({
                code: p.code,
                label: p.period_months === 1 ? "Mensual" : (p.period_months === 12 ? "Anual" : "24 meses"),
                period_months: p.period_months,
                price_cents: p.base_price_cents
              }));
            if (on && plans.length) {
              const byMonths = Object.fromEntries(plans.map(p => [p.period_months, p]));
              setRawPlans([
                byMonths[1]  || FALLBACK[0],
                byMonths[12] || FALLBACK[1],
                byMonths[24] || FALLBACK[2],
              ]);
              break;
            }
          } catch {/* continuar */}
        }
      } finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, []);

  const data = useMemo(() => {
    const map = Object.fromEntries(rawPlans.map(p => [p.period_months, p]));
    const monthly = map[1]  || FALLBACK[0];
    const annual  = map[12] || FALLBACK[1];
    const m24     = map[24] || FALLBACK[2];

    const mMonthly   = monthly.price_cents;
    const monthlyY   = mMonthly * 12;
    const saveAnnual = monthlyY - annual.price_cents;
    const monthly2Y  = mMonthly * 24;
    const save2Y     = monthly2Y - m24.price_cents;

    return {
      monthly: {
        ...monthly,
        uiMonthly: mMonthly,
        chips: ["Flexibilidad total", "Cancela cuando quieras"],
        compare: null,
        promoEligible: PROMO.firstMonthFreeMonthly === true,
      },
      annual: {
        ...annual,
        uiMonthly: Math.round(annual.price_cents / 12),
        chips: [`Pagas hoy ${eur(annual.price_cents)} €`, `Ahorro anual de ${eur(saveAnnual)} €`],
        compare: { ref: "Comparado con pagar mes a mes", before: monthlyY, total: annual.price_cents, save: saveAnnual, unit: "año" },
        popular: true
      },
      m24: {
        ...m24,
        uiMonthly: Math.round(m24.price_cents / 24),
        chips: [`Pagas hoy ${eur(m24.price_cents)} €`, `Ahorro en 2 años de ${eur(save2Y)} €`],
        compare: { ref: "Comparado con pagar mes a mes", before: monthly2Y, total: m24.price_cents, save: save2Y, unit: "2 años" }
      }
    };
  }, [rawPlans]);

  const plan =
    selected === "monthly"     ? data.monthly :
    selected === "prepaid_12m" ? data.annual  :
    data.m24;

  const animMonthly = useAnimatedNumber(plan.uiMonthly || 0);

  function startSignup(planCode) {
    savePlanIntent(planCode, 'pricing');
    window.location.assign(`${SIGNUP_URL}?plan=${encodeURIComponent(planCode)}`);
  }

  return (
    <section className="pricing-pro v4" id="pricing" aria-labelledby="pricing-title">
      <header className="pp-head">
        <h2 id="pricing-title">Plan Único</h2>
        <p className="sub">Mismo producto. <b>Tú eliges cómo pagarlo.</b> Sin letra pequeña.</p>
      </header>

      {PROMO.firstMonthFreeMonthly && (
        <div className="pp-promo-stripe" role="status" aria-live="polite">
          <strong className="promo-kicker">{PROMO.label}</strong>
          <span className="promo-note">— Aplica al plan mensual. Se activa automáticamente en el checkout.</span>
        </div>
      )}

      <div className="pp-toggle" role="tablist" aria-label="Elige periodo de facturación">
        {[
          { key: "monthly",     label: data.monthly.label,   code: data.monthly.code, promo: data.monthly.promoEligible },
          { key: "prepaid_12m", label: data.annual.label,    code: data.annual.code,  badge: "Más elegido" },
          { key: "prepaid_24m", label: data.m24.label,       code: data.m24.code },
        ].map(opt => (
          <button
            key={opt.key}
            role="tab"
            aria-selected={selected === opt.key}
            className={`opt ${selected === opt.key ? "is-active" : ""} ${opt.key === "prepaid_12m" ? "is-popular" : ""}`}
            onClick={() => setSelected(opt.key)}
            disabled={loading}
          >
            <span>{opt.label}</span>
            {opt.badge && (
              <em className="badge-soft" aria-hidden="true">
                <i className="ico"><IStar/></i> {opt.badge}
              </em>
            )}
            {opt.promo && (
              <em className="badge-promo" aria-hidden="true">
                {PROMO.short}
              </em>
            )}
          </button>
        ))}
      </div>

      <div className={`pp-hero ${selected === "prepaid_12m" ? "pop" : ""}`} aria-live="polite">
        {/* Col 1: precio */}
        <div className="price-wrap">
          {plan.promoEligible ? (
            <div className="price-duo" aria-label="Promoción: primer mes gratis">
              <div className="now-free">
                <span className="num">0</span><span className="eur">€</span><span className="tag">este mes</span>
              </div>
              <div className="then">
                <span className="then-label">Después</span>
                <span className="then-num">{eur0(animMonthly)} €</span>
                <span className="then-per">/ mes</span>
              </div>
              <span className="burst" aria-hidden="true">{PROMO.short}</span>
            </div>
          ) : (
            <div className="price" aria-label="Precio mensual">
              <span className="num">{eur0(animMonthly)}</span><span className="per">€/mes</span>
            </div>
          )}
          {plan.popular && <span className="corner-badge">Recomendado</span>}
        </div>

        {/* Col 2: comparador / chips */}
        {plan.compare ? (
          <div className="compare" aria-label="Comparativa frente a pagar mensual">
            <span className="ref"><i className="ico"><IInfo/></i>{plan.compare.ref}</span>
            <span className="before">Antes: <s>{eur(plan.compare.before)} €</s></span>
            <span className="total">Total del periodo: {eur(plan.compare.total)} €</span>
            <span className="saving">Te ahorras: {eur(plan.compare.save)} € / {plan.compare.unit}</span>
          </div>
        ) : (
          <div className="chips" aria-label="Ventajas del plan mensual">
            <span className="chip">Pago mes a mes</span>
            <span className="chip ok">Cancela cuando quieras</span>
          </div>
        )}

        {/* Fila 2: CTA a todo lo ancho (centrado) */}
        <div className="cta-inline">
          <button className="btn-primary" disabled={loading} onClick={() => startSignup(plan.code)}>
            Crear cuenta gratis
          </button>
        </div>
      </div>

      <article className="pp-card">
        <ul className="features">
          <li><i className="ico"><IChat/></i>Ubicación por estante/balda y alta en segundos</li>
          <li><i className="ico"><IChat/></i>Mapa de ocupación y reubicación guiada</li>
          <li><i className="ico"><IChat/></i>Conciliación básica con transportistas sin Excel</li>
          <li><i className="ico"><IChat/></i>Checklist diario e incidencias</li>
          <li><i className="ico"><IChat/></i>Usuarios sin límite bajo fair-use. Soporte por email.</li>
        </ul>
        <p className="fine">
          Mostramos <b>precios IVA incluido</b>. En el checkout, Stripe recopila tus datos fiscales (empresa/VAT).
        </p>
      </article>

      <div className="pp-trust" aria-label="Garantías">
        <div className="titem"><i className="ico"><IShield/></i>RGPD y datos alojados en la UE</div>
        <div className="titem"><i className="ico"><IReceipt/></i>Sin cortes ni sorpresas en la factura</div>
        <div className="titem"><i className="ico"><IChat/></i>Soporte cercano por email</div>
      </div>
    </section>
  );
}
