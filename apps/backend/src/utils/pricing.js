'use strict';

const { supabase } = require('./supabaseClient');

/** Normaliza a los dos únicos planes de nuestro modelo de negocio */
function normalizePlan(code) {
  const c = String(code || '').trim().toLowerCase();

  // Si es cualquier variante de anual
  if (['annual', 'yearly', 'anual', '12m', 'prepaid_12m', 'prepago_12m'].includes(c)) {
    return 'annual';
  }
  
  // Por defecto, siempre mensual
  return 'monthly';
}

/** Lee los planes activos (Solo 1 o 12 meses) */
async function getPlans() {
  const { data, error } = await supabase
    .from('billing_plans')
    .select('id, code, name, period_months, base_price_cents, discount_pct, active, stripe_price_id, created_at')
    .eq('active', true)
    .in('period_months', [1, 12]) // Bloqueado a 1 mes o 12 meses
    .order('period_months', { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Busca plan por code normalizado para el checkout de Stripe */
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