'use strict';

const { supabase } = require('./supabaseClient');

/** Normaliza alias a tus códigos reales de DB (solo 1/12/24 meses) */
function normalizePlan(code) {
  const c = String(code || '').trim().toLowerCase();

  if (['monthly', 'mes', 'mensual', '1m'].includes(c)) return 'monthly';
  if (['annual', 'yearly', 'anual', '12m', 'prepaid_12m', 'prepago_12m'].includes(c)) return 'prepaid_12m';
  if (['24m', 'bianual', '24 meses', 'prepaid_24m', 'prepago_24m'].includes(c)) return 'prepaid_24m';

  return 'monthly';
}

/** Lee todos los planes (solo activos) */
async function getPlans() {
  const { data, error } = await supabase
    .from('billing_plans')
    .select('id, code, name, period_months, base_price_cents, discount_pct, active, stripe_price_id, created_at')
    .eq('active', true)
    .in('period_months', [1, 12, 24])
    .order('period_months', { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Busca plan por code normalizado y devuelve campos necesarios para checkout */
async function findPlanByCode(plan_code_raw) {
  const code = normalizePlan(plan_code_raw);
  const { data, error } = await supabase
    .from('billing_plans')
    .select('id, code, name, period_months, base_price_cents, stripe_price_id')
    .eq('code', code)
    .eq('active', true)
    .single();

  if (error) return null;
  return data;
}

module.exports = {
  normalizePlan,
  getPlans,
  findPlanByCode
};
