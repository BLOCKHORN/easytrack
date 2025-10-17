'use strict';

/**
 * Whitelist para el Explorador de Datos:
 *  - pk: columna clave primaria (simple) usada en PATCH
 *  - modifiable: columnas que el staff puede editar
 *  - tenantScoped: si la tabla pertenece a un tenant (aplica filtro por tenant)
 *  - tenantIdCol: nombre de la columna tenant (por defecto 'tenant_id')
 *  - searchable: columnas en las que se permite búsqueda q (solo texto)
 *  - defaultOrder: columna por la que ordenar por defecto (si no se envía orderBy)
 */
module.exports = {
  /* ===== Núcleo multi-tenant ===== */
  tenants: {
    pk: 'id',
    modifiable: ['nombre_empresa', 'slug', 'email', 'imagen_fondo', 'rol'],
    tenantScoped: false,
    searchable: ['nombre_empresa', 'slug', 'email'],
    defaultOrder: 'id', // <- ANTES 'created_at' te daba 42703
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
    tenantScoped: true,
    tenantIdCol: 'tenant_id',
    searchable: ['status', 'plan_id', 'provider_subscription_id'],
    defaultOrder: 'current_period_end',
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
    tenantScoped: false,
    searchable: ['code', 'name', 'stripe_price_id'],
    defaultOrder: 'id',
  },

  /* ===== Usuarios & staff ===== */
  staff_users: {
    pk: 'user_id',
    modifiable: ['role', 'is_active', 'allowed_ips', 'note'],
    tenantScoped: false,
    searchable: ['user_id', 'role', 'note'],
    defaultOrder: 'id',
  },
  memberships: {
    // PK compuesta (user_id, tenant_id) → dejamos lectura
    pk: 'user_id',
    modifiable: [],
    tenantScoped: true,
    tenantIdCol: 'tenant_id',
    searchable: ['user_id'],
    defaultOrder: 'user_id',
  },

  /* ===== Config del tenant ===== */
  area_personal_settings: {
    pk: 'tenant_id',
    modifiable: ['goal_annual_eur', 'currency'],
    tenantScoped: true,
    tenantIdCol: 'tenant_id',
    searchable: ['currency'],
    defaultOrder: 'tenant_id',
  },

  // Layout de almacén (si lo sigues usando para meta visual)
  layouts_meta: {
    pk: 'org_id',
    modifiable: ['mode', 'rows', 'cols', 'payload'],
    tenantScoped: true,
    tenantIdCol: 'org_id',
    searchable: ['mode'],
    defaultOrder: 'org_id',
  },

  /* ===== Nueva estructura de ubicaciones ===== */
  ubicaciones: {
    pk: 'id',
    modifiable: ['label', 'orden', 'activo'], // tenant_id NO editable desde admin
    tenantScoped: true,
    tenantIdCol: 'tenant_id',
    searchable: ['label'],
    defaultOrder: 'orden',
  },
  ubicaciones_meta: {
    pk: 'tenant_id',
    modifiable: ['cols', 'orden'],
    tenantScoped: true,
    tenantIdCol: 'tenant_id',
    searchable: [],
    defaultOrder: 'tenant_id',
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
    tenantScoped: true,
    tenantIdCol: 'tenant_id',
    searchable: ['nombre_cliente', 'empresa_transporte', 'ubicacion_label'],
    defaultOrder: 'fecha_llegada',
  },

  /* ===== Empresas de transporte ===== */
  empresas_transporte: {
    pk: 'id',
    modifiable: ['nombre'],
    tenantScoped: false,
    searchable: ['nombre'],
    defaultOrder: 'nombre',
  },
  empresas_transporte_tenant: {
    pk: 'id',
    modifiable: ['nombre', 'ingreso_por_entrega', 'activo', 'color', 'notas', 'tenant_id'],
    tenantScoped: true,
    tenantIdCol: 'tenant_id',
    searchable: ['nombre', 'color', 'notas'],
    defaultOrder: 'nombre',
  },

  /* ===== Legacy / compatibilidad ===== */
  // Deja baldas como SOLO LECTURA mientras exista el fallback/sync desde ubicaciones.
  baldas: {
    pk: 'id',
    modifiable: [],
    tenantScoped: true,
    tenantIdCol: 'tenant_id',
    searchable: ['label'],
    defaultOrder: 'id',
  },

  // Si mantienes la tabla vieja "paquetes" por auditoría, mejor SOLO LECTURA:
  // (quítala si ya la retiraste del DB)
  paquetes: {
    pk: 'id',
    modifiable: [], // evitar tocar datos antiguos accidentalmente
    tenantScoped: true,
    tenantIdCol: 'tenant_id',
    searchable: ['destinatario', 'tracking'],
    defaultOrder: 'id',
  },

  /* ===== Operador & Auditoría ===== */
  operator_sessions: {
    pk: 'id',
    modifiable: ['active', 'expires_at', 'reason', 'tenant_id'],
    tenantScoped: true,
    tenantIdCol: 'tenant_id',
    searchable: ['reason'],
    defaultOrder: 'created_at',
  },
  audit_log: {
    pk: 'id',
    modifiable: [], // solo lectura
    tenantScoped: true,
    tenantIdCol: 'tenant_id',
    searchable: ['action', 'target_table', 'target_id', 'actor_user_id'],
    defaultOrder: 'created_at',
  },
  audit_config: {
    pk: 'id',
    modifiable: [], // solo lectura
    tenantScoped: false,
    searchable: ['id'],
    defaultOrder: 'id',
  },
};
