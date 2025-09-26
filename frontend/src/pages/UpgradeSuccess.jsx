// src/pages/UpgradeSuccess.jsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyCheckout } from "../services/billingService";
import { supabase } from "../utils/supabaseClient";
import "../styles/UpgradeSuccess.scss";

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-ES", {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  } catch { return iso; }
}

export default function UpgradeSuccess() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const [planCode, setPlan] = useState("");
  const [trialEnd, setTrialEnd] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [slug, setSlug] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // 1) Verificar la sesión de Stripe (no requiere estar logueado)
        const sid = sp.get("session_id");
        if (!sid) throw new Error("Falta el session_id de Stripe.");
        const d = await verifyCheckout(sid); // { status, planCode, trialEndsAt, currentPeriodEnd, ... }
        setOk(true);
        setPlan(d?.planCode || "");
        setTrialEnd(d?.trialEndsAt || "");
        setPeriodEnd(d?.currentPeriodEnd || "");

        // 2) Resolver slug si el usuario sigue logueado
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (token) {
          const API = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/,"");
          const r = await fetch(`${API}/api/tenants/me`, { headers: { Authorization: `Bearer ${token}` } });
          const j = await r.json().catch(()=> ({}));
          if (r.ok && j?.tenant?.slug) setSlug(j.tenant.slug);
        }
      } catch (e) {
        setErr(e.message || "No se pudo verificar el pago.");
      } finally {
        setLoading(false);
      }
    })();
  }, [sp]);

  const goPanel = () => navigate(slug ? `/${slug}/dashboard` : "/dashboard", { replace: true });

  if (loading) {
    return (
      <section className="ups">
        <div className="ups__card ups__card--loading">
          <div className="spinner" aria-hidden="true" />
          <h1>Procesando pago…</h1>
          <p>Estamos verificando tu suscripción. Un momento…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="ups">
      <div className="ups__card">
        <div className={`ups__icon ${ok ? "ok" : "warn"}`} aria-hidden="true" />
        <h1>{ok ? "¡Suscripción activada!" : "Algo no fue bien"}</h1>

        {ok ? (
          <>
            <p className="ups__lead">Gracias por confiar en EasyTrack. Tu cuenta ya está lista.</p>

            <div className="ups__grid">
              <div className="ups__row">
                <span className="label">Plan</span>
                <span className="value">{planCode || "—"}</span>
              </div>
              <div className="ups__row">
                <span className="label">Prueba hasta</span>
                <span className="value">{fmtDate(trialEnd)}</span>
              </div>
              <div className="ups__row">
                <span className="label">Periodo actual</span>
                <span className="value">{fmtDate(periodEnd)}</span>
              </div>
            </div>

            <div className="ups__actions">
              <button className="btn btn--primary" onClick={goPanel}>Empezar a usar EasyTrack</button>
              <a className="btn btn--ghost" href="/portal">Gestionar suscripción</a>
            </div>
          </>
        ) : (
          <>
            <p className="ups__lead" style={{color:"#b91c1c"}}>{err || "No se pudo verificar la sesión."}</p>
            <div className="ups__actions">
              <a className="btn btn--ghost" href="/precios">Volver a precios</a>
            </div>
          </>
        )}

        {!ok && (
          <p className="ups__hint">
            Si acabas de pagar, espera unos segundos y vuelve a intentarlo. Si persiste, contáctanos.
          </p>
        )}
      </div>
    </section>
  );
}
