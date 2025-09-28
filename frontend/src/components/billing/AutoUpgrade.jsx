// src/components/billing/AutoUpgrade.jsx
import { useEffect } from "react";
import { readPlanIntent, consumePlanIntent } from "../../utils/planIntent";
import { supabase } from "../../utils/supabaseClient";

export default function AutoUpgrade() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const wantUpgrade = params.get("upgrade") === "1";
      const planQ = params.get("plan") || "";

      const { data: { session } } = await supabase.auth.getSession();
      const logged = !!session;

      // 1) lee la intención almacenada
      const stored = readPlanIntent();
      const storedPlan = stored?.code || "";

      // 2) prioriza ?plan= de la URL sobre lo almacenado
      const planCode = planQ || storedPlan || "";

      if (!cancelled && logged && (wantUpgrade || planCode)) {
        // 3) consume la intención solo cuando la vamos a usar
        consumePlanIntent();

        // 4) abre el modal (defer para dejar registrar listeners)
        setTimeout(() => {
          if (typeof window.__openUpgradeModal === "function") {
            window.__openUpgradeModal(planCode);
          } else {
            window.dispatchEvent(new CustomEvent("upgrade:open", { detail: { planCode } }));
          }
        }, 0);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return null;
}
