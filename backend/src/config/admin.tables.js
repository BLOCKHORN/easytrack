'use strict';

/**
 * Whitelist para el Explorador de Datos:
 *  - pk: columna clave primaria (simple) usada en PATCH
 *  - modifiable: columnas que el staff puede editar
 * Si una tabla no debe editarse → deja modifiable: [] (solo lectura)
 */
module.exports = {
  /* ===== Núcleo multi-tenant ===== */
  tenants: {
    pk: 'id',
    modifiable: ['nombre_empresa', 'slug', 'email', 'imagen_fondo', 'rol'],
  },

  subscriptions: {
    pk: 'id',
    modifiable: [
      'plan_id',
      'status',
      'trial_ends_at',
      'current_period_start',
      'current_period_end',
      'cancel_at_period_end',
      'tax_country',
      'tax_id',
      'is_business',
      'provider_subscription_id',
      'provider_session_id',
    ],
  },

  billing_plans: {
    pk: 'id',
    modifiable: [
      'code',
      'name',
      'period_months',
      'base_price_cents',
      'overage_price_milli_eur',
      'discount_pct',
      'active',
      'stripe_price_id',
    ],
  },

  /* ===== Usuarios & staff ===== */
  staff_users: {
    pk: 'user_id',
    modifiable: ['role', 'is_active', 'allowed_ips', 'note'],
  },
  memberships: {
    // PK compuesta (user_id, tenant_id) → dejamos lectura
    pk: 'user_id',
    modifiable: [],
  },
  finance_user_settings: {
    pk: 'id',
    modifiable: ['goal_annual_eur', 'currency'],
  },

  /* ===== Config del tenant ===== */
  area_personal_settings: {
    pk: 'tenant_id',
    modifiable: ['goal_annual_eur', 'currency'],
  },
  tenant_nomenclatura: {
    pk: 'tenant_id',
    modifiable: [
      'estante_singular', 'estante_plural',
      'balda_singular', 'balda_plural',
      'codigo_col_prefix', 'codigo_row_prefix',
      'col_scheme', 'col_fixed', 'col_case',
      'row_scheme', 'row_fixed', 'row_case',
      'separador_codigo', 'modo_almacen', 'row_scope',
    ],
  },
  layouts_meta: {
    pk: 'org_id',
    modifiable: ['mode', 'rows', 'cols', 'payload'],
  },

  /* ===== Estructura física ===== */
  baldas: {
    pk: 'id',
    modifiable: ['estante', 'balda', 'codigo', 'disponible', 'capacidad'],
  },
  lanes: {
    pk: 'id',
    modifiable: ['row', 'col', 'name', 'color', 'org_id', 'lane_id', 'tenant_id'],
  },
  racks: {
    // PK compuesta (rack_id, org_id) → solo lectura
    pk: 'rack_id',
    modifiable: [],
  },
  racks_shelves: {
    // PK compuesta → solo lectura
    pk: 'rack_id',
    modifiable: [],
  },

  /* ===== Operativa paquetes ===== */
  paquetes: {
    pk: 'id',
    modifiable: [
      'nombre_cliente',
      'entregado',
      'empresa_transporte',
      'ingreso_generado',
      'fecha_llegada',
      'fecha_entregado',
      'balda_id',
      'lane_id',
      'compartimento',
      'estante',
      'balda',
      'ubicacion_hist',
    ],
  },

  empresas_transporte: {
    pk: 'id',
    modifiable: ['nombre'],
  },
  empresas_transporte_tenant: {
    pk: 'id',
    modifiable: ['nombre', 'ingreso_por_entrega', 'activo', 'color', 'notas', 'tenant_id'],
  },

  /* ===== Facturación ===== */
  invoices: {
    pk: 'id',
    modifiable: [
      'status',
      'pdf_url',
      'amount_due_cents',
      'amount_paid_cents',
      'tax_rate_pct',
      'tax_amount_cents',
      'amount_total_cents',
    ],
  },
  invoice_items: {
    pk: 'id',
    modifiable: ['item_type', 'quantity', 'unit_price_cents', 'amount_cents', 'meta'],
  },
  payment_events: {
    pk: 'id',
    modifiable: [],
  },

  /* ===== Operador & Auditoría ===== */
  operator_sessions: {
    pk: 'id',
    modifiable: ['active', 'expires_at', 'reason', 'tenant_id'],
  },
  audit_log: {
    pk: 'id',
    modifiable: [], // SIEMPRE solo lectura
  },
  audit_config: {
    pk: 'id',
    modifiable: [], // solo lectura (si lo usas como raw log)
  },
};
