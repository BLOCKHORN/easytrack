import { useEffect, useMemo, useState } from "react";
import { FiZap, FiX, FiLoader, FiAlertCircle } from "react-icons/fi";
import { supabase } from "../../utils/supabaseClient";
import { getPlans, startCheckout } from "../../services/billingService";
import "./UpgradeModal.scss";

/* === helpers === */
const API = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/,"");
const fmtEUR = (cents=0) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" })
    .format((cents||0)/100);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

async function authFetch(path, opts = {}) {
  const { data: sdata } = await supabase.auth.getSession();
  const token = sdata?.session?.access_token;
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: "include",
  });
  const txt = await res.text();
  let body = null; try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  if (!res.ok || body?.ok === false) {
    const err = new Error(body?.error || `HTTP ${res.status}`);
    err.status = res.status; err.body = body; throw err;
  }
  return body;
}

export default function UpgradeModal({ open, onClose, defaultPlanCode=null }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState("");

  const [plans, setPlans]     = useState([]);
  const [sel, setSel]         = useState("");

  // billing form
  const [name, setName]       = useState("");
  const [taxId, setTaxId]     = useState("");
  const [country, setCountry] = useState("ES");
  const [state, setState]     = useState("");
  const [city, setCity]       = useState("");
  const [zip, setZip]         = useState("");
  const [addr1, setAddr1]     = useState("");
  const [addr2, setAddr2]     = useState("");

  // cargar planes + prefills del tenant
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setErr("");

        // 1) planes
        const list = await getPlans();
        const arr  = Array.isArray(list) ? list : (list?.plans || []);
        if (!cancelled) setPlans(arr);

        // escoger plan por defecto (preferimos anual, luego mensual)
        const preferred = defaultPlanCode && arr.find(p => p.code === defaultPlanCode);
        const monthly   = arr.find(p => Number(p.period_months) === 1);
        const annual    = arr.find(p => Number(p.period_months) === 12);
        if (!cancelled) {
          setSel((preferred || annual || monthly || arr[0])?.code || "");
        }

        // 2) prefills tenant
        const { data: sdata } = await supabase.auth.getSession();
        const token = sdata?.session?.access_token;
        if (token) {
          const r = await fetch(`${API}/api/tenants/me`, { headers: { Authorization: `Bearer ${token}` } });
          const j = await r.json().catch(()=> ({}));
          const tenant = j?.tenant;
          if (tenant && !cancelled) {
            setName(tenant.nombre_empresa || tenant.billing_name || "");
            setCountry(tenant.billing_country || "ES");
            setState(tenant.billing_state || "");
            setCity(tenant.billing_city || "");
            setZip(tenant.billing_zip || "");
            setAddr1(tenant.billing_address1 || "");
            setAddr2(tenant.billing_address2 || "");
            setTaxId(tenant.tax_id || "");
          }
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || "No se pudieron cargar los planes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, defaultPlanCode]);

  // mapa para mostrar precios bonitos
  const displayPlans = useMemo(() => {
    return plans.map(p => {
      const base = Number(p.base_price_cents || 0);
      const pct  = clamp(Number(p.discount_pct || 0), 0, 100);
      const months = Number(p.period_months || 1);
      const totalCents   = Math.round(base * (1 - pct/100));
      const monthlyCents = Math.round(totalCents / months);
      return {
        code: p.code,
        name: p.name || (months === 1 ? "Mensual" : `Prepago ${months} meses`),
        months,
        totalCents,
        monthlyCents,
        labelTotal: fmtEUR(totalCents),
        labelPerMonth: `${fmtEUR(monthlyCents)}/mes`,
      };
    }).sort((a,b)=> a.months - b.months);
  }, [plans]);

  const selectedPlan = displayPlans.find(p => p.code === sel) || null;

  async function pay() {
    try {
      setBusy(true); setErr("");

      const billing = {
        name: name?.trim() || "",
        tax_id: taxId?.trim() || "",
        country: country || "ES",
        state: state?.trim() || "",
        city: city?.trim() || "",
        postal_code: zip?.trim() || "",
        address1: addr1?.trim() || "",
        address2: addr2?.trim() || "",
      };

      // 0) Asegura tenant/membership por si no existe (idempotente)
      try {
        await authFetch('/api/auth/bootstrap', {
          method: 'POST',
          body: JSON.stringify({ nombre_empresa: name || undefined })
        });
      } catch {}

      // 0.5) Prefill opcional (si no existe, no rompe)
      try {
        await authFetch('/api/billing/prefill', {
          method: 'POST',
          body: JSON.stringify({
            nombre_empresa: name || undefined,
            country: billing.country,
            line1: billing.address1, line2: billing.address2,
            city: billing.city, state: billing.state, postal_code: billing.postal_code,
            tax_id: billing.tax_id
          })
        });
      } catch {}

      // 1) Checkout
      const url = await startCheckout({ plan_code: sel, billing }); // devuelve session.url
      if (!url) throw new Error("No se pudo iniciar el checkout.");
      window.location.assign(url);
    } catch (e) {
      setErr(e.message || "No se pudo iniciar el checkout.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="umodal" role="dialog" aria-modal="true" aria-labelledby="umodal-title">
      <div className="umodal__backdrop" onClick={busy ? undefined : onClose} />
      <div className="umodal__panel">
        <button className="umodal__close" onClick={onClose} aria-label="Cerrar">
          <FiX />
        </button>

        <header className="umodal__header">
          <div className="icon"><FiZap/></div>
          <div>
            <h3 id="umodal-title">Desbloquear EasyTrack</h3>
            <p>Primer mes gratis en el plan mensual. Cancela cuando quieras.</p>
          </div>
        </header>

        <div className="umodal__body">
          {/* PLANES */}
          <fieldset className="umodal__section">
            <legend>Plan</legend>

            {loading ? (
              <div className="skeleton" />
            ) : (
              <div className="plan-list">
                {displayPlans.map(p => (
                  <label key={p.code} className={`plan ${sel === p.code ? "is-active" : ""}`}>
                    <input
                      type="radio"
                      name="plan"
                      value={p.code}
                      checked={sel === p.code}
                      onChange={() => setSel(p.code)}
                    />
                    <div className="plan__name">{p.name}</div>
                    <div className="plan__period">
                      <span>{p.labelPerMonth}</span> · <span>{p.labelTotal} facturados cada {p.months} meses</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {/* BILLING */}
          <fieldset className="umodal__section">
            <legend>Datos de facturación</legend>

            <div className="grid grid--full">
              <label>
                <span>Nombre de empresa</span>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tu empresa S.L." />
              </label>
              <label>
                <span>CIF/NIF (opcional)</span>
                <input value={taxId} onChange={e=>setTaxId(e.target.value)} placeholder="ESB12345678" />
              </label>
            </div>

            <div className="grid">
              <label>
                <span>País</span>
                <input value={country} onChange={e=>setCountry(e.target.value.toUpperCase())} maxLength={2} placeholder="ES" />
              </label>
              <label>
                <span>Provincia/Estado</span>
                <input value={state} onChange={e=>setState(e.target.value)} />
              </label>
            </div>

            <div className="grid">
              <label>
                <span>Ciudad</span>
                <input value={city} onChange={e=>setCity(e.target.value)} />
              </label>
              <label>
                <span>Código postal</span>
                <input value={zip} onChange={e=>setZip(e.target.value)} />
              </label>
            </div>

            <div className="grid grid--full">
              <label>
                <span>Dirección (línea 1)</span>
                <input value={addr1} onChange={e=>setAddr1(e.target.value)} />
              </label>
              <label>
                <span>Dirección (línea 2, opcional)</span>
                <input value={addr2} onChange={e=>setAddr2(e.target.value)} />
              </label>
            </div>
          </fieldset>

          {err && (
            <div className="umodal__error">
              <FiAlertCircle style={{marginRight: 6}} />
              {err}
            </div>
          )}

          <div className="umodal__actions">
            <button className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancelar</button>
            <button className="btn btn--primary" onClick={pay} disabled={busy || loading}>
              {busy ? (<><FiLoader className="spin" /> Procesando…</>) : (<><FiZap/> Continuar con el pago</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
