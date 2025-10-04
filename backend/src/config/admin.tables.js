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

  /* ===== Config del tenant ===== */
  area_personal_settings: {
    pk: 'tenant_id',
    modifiable: ['goal_annual_eur', 'currency'],
  },

  // Layout de almacén (si lo sigues usando para meta visual)
  layouts_meta: {
    pk: 'org_id',
    modifiable: ['mode', 'rows', 'cols', 'payload'],
  },

  /* ===== Nueva estructura de ubicaciones ===== */
  ubicaciones: {
    pk: 'id',
    modifiable: ['label', 'orden', 'activo'], // tenant_id NO editable desde admin
  },
  ubicaciones_meta: {
    pk: 'tenant_id',
    modifiable: ['cols', 'orden'],
  },

  /* ===== Operativa de paquetes (NUEVO) ===== */
  packages: {
    pk: 'id',
    // OJO: no expongo tenant_id ni ubicacion_id como editables para evitar “des-tenantizar” o romper FKs.
    // Si alguna vez necesitas moverlos manualmente, hazlo por SQL controlado.
    modifiable: [
      'nombre_cliente',
      'empresa_transporte',
      'empresa_id',
      'fecha_llegada',
      'entregado',
      'fecha_entregado',
      'ingreso_generado',
      'ubicacion_label', // etiqueta visible (la FK se valida por trigger)
    ],
  },

  /* ===== Empresas de transporte ===== */
  empresas_transporte: {
    pk: 'id',
    modifiable: ['nombre'],
  },
  empresas_transporte_tenant: {
    pk: 'id',
    modifiable: ['nombre', 'ingreso_por_entrega', 'activo', 'color', 'notas', 'tenant_id'],
  },

  /* ===== Legacy / compatibilidad ===== */
  // Deja baldas como SOLO LECTURA mientras exista el fallback/sync desde ubicaciones.
  baldas: {
    pk: 'id',
    modifiable: [],
  },

  // Si mantienes la tabla vieja "paquetes" por auditoría, mejor SOLO LECTURA:
  // (quítala si ya la retiraste del DB)
  paquetes: {
    pk: 'id',
    modifiable: [], // evitar tocar datos antiguos accidentalmente
  },

  /* ===== Operador & Auditoría ===== */
  operator_sessions: {
    pk: 'id',
    modifiable: ['active', 'expires_at', 'reason', 'tenant_id'],
  },
  audit_log: {
    pk: 'id',
    modifiable: [], // solo lectura
  },
  audit_config: {
    pk: 'id',
    modifiable: [], // solo lectura
  },
};
