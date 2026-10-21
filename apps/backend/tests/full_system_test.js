'use strict';

require('dotenv').config({ path: '/root/Easytrack/apps/backend/.env' });
const { signAccessToken } = require('../src/utils/token');
const { query } = require('../src/utils/db');

const BASE_URL = 'http://127.0.0.1:3000';
const TEST_USER = {
  id: 'cbb23480-334a-48a9-bb47-e626480c3cc4',
  email: 'oscar213413@gmail.com',
  tenant_id: '51a0e226-1502-42c3-9bf6-3cead2ea0e27',
  slug: 'oscar213413'
};

const token = signAccessToken({ sub: TEST_USER.id, email: TEST_USER.email });

async function req(method, path, body = null) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, data: json };
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 INICIANDO BATERÍA DE PRUEBAS INTEGRAL DE EASYTRACK');
  console.log(`👤 Tenant Test: ${TEST_USER.slug} (${TEST_USER.tenant_id})`);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. PUBLIC METRICS
  console.log('1. TEST: Métricas Públicas');
  const mRes = await req('GET', '/api/metrics/public');
  assert(mRes.status === 200, 'GET /api/metrics/public retorna 200');
  assert(Number(mRes.data.tenants_count) > 0, `Tenants count es positivo (${mRes.data.tenants_count})`);
  assert(Number(mRes.data.packages_delivered_total) > 0, `Paquetes entregados es positivo (${mRes.data.packages_delivered_total})`);

  // 2. TENANT ME
  console.log('\n2. TEST: Tenant Me');
  const tRes = await req('GET', '/api/tenants/me');
  assert(tRes.status === 200 && tRes.data.ok, 'GET /api/tenants/me resuelve tenant');
  assert(tRes.data.tenant.slug === TEST_USER.slug, `Slug del tenant correcto (${tRes.data.tenant.slug})`);

  // 3. CARRIERS (EMPRESAS DE TRANSPORTE)
  console.log('\n3. TEST: Configuración de Transportistas');
  const saveCarriersRes = await req('POST', '/api/ubicaciones/carriers', {
    tenant_id: TEST_USER.tenant_id,
    carriers: [
      { nombre: 'GLS', ingreso_por_entrega: 0.45, activo: true, color: '#f97316' },
      { nombre: 'SEUR', ingreso_por_entrega: 0.50, activo: true, color: '#ef4444' }
    ]
  });
  assert(saveCarriersRes.status === 200 && saveCarriersRes.data.ok, 'POST /api/ubicaciones/carriers guarda transportistas');

  const getCarriersRes = await req('GET', `/api/ubicaciones/carriers?tenant_id=${TEST_USER.tenant_id}`);
  assert(getCarriersRes.status === 200, 'GET /api/ubicaciones/carriers retorna 200');
  const glsCarrier = (getCarriersRes.data.empresas || []).find(e => e.nombre === 'GLS');
  assert(glsCarrier && Number(glsCarrier.ingreso_por_entrega) === 0.45, 'GLS guardado con tarifa correcta (0.45€)');

  // 4. UBICACIONES / ESTANTERÍAS
  console.log('\n4. TEST: Estructura de Almacén y Bal行業/Ubicaciones');
  const upsertUbiRes = await req('POST', '/api/ubicaciones', {
    tenant_id: TEST_USER.tenant_id,
    meta: { cols: 4, num_rows: 3, order: 'horizontal' },
    ubicaciones: [
      { label: 'B1', orden: 0 },
      { label: 'B2', orden: 1 },
      { label: 'B3', orden: 2 }
    ]
  });
  assert(upsertUbiRes.status === 200 && upsertUbiRes.data.ok, 'POST /api/ubicaciones crea cuadrícula y baldas B1, B2, B3');

  const getUbiRes = await req('GET', `/api/ubicaciones?tenant_id=${TEST_USER.tenant_id}`);
  assert(getUbiRes.status === 200, 'GET /api/ubicaciones retorna estructura 200');
  assert(getUbiRes.data.lanes?.length >= 3, `Se recuperaron las ubicaciones (${getUbiRes.data.lanes?.length} ubicaciones)`);

  // 5. PAQUETES CRUD
  console.log('\n5. TEST: Paquetes (Creación, Listado, Entrega y Eliminación)');
  const createPkgRes = await req('POST', '/api/paquetes', {
    tenant_id: TEST_USER.tenant_id,
    nombre_cliente: 'Cliente Test Automatizado',
    empresa_transporte: 'GLS',
    ubicacion_label: 'B1',
    telefono: '600123456'
  });
  assert(createPkgRes.status === 200 && createPkgRes.data.paquete?.id, 'POST /api/paquetes crea paquete');
  const testPkg = createPkgRes.data.paquete;

  if (testPkg?.id) {
    const listPkgRes = await req('GET', `/api/paquetes?tenantId=${TEST_USER.tenant_id}&search=Automatizado`);
    assert(listPkgRes.status === 200 && (listPkgRes.data.paquetes || []).length > 0, 'GET /api/paquetes encuentra paquete creado');

    const deliverRes = await req('PATCH', `/api/paquetes/entregar/${testPkg.id}?tenantId=${TEST_USER.tenant_id}`);
    assert(deliverRes.status === 200 && deliverRes.data.ok, 'PATCH /api/paquetes/entregar marca como entregado');
    assert(Number(deliverRes.data.paquete?.ingreso_generado) === 0.45, `Ingreso generado calculado correctamente (0.45€ de GLS)`);

    const delPkgRes = await req('DELETE', `/api/paquetes/${testPkg.id}?tenantId=${TEST_USER.tenant_id}`);
    assert(delPkgRes.status === 200 && delPkgRes.data.ok, 'DELETE /api/paquetes elimina paquete de prueba');
  }

  // 6. CSV / TXT IMPORT ENGINE
  console.log('\n6. TEST: Motor de Importación Masiva (CSV / TXT)');
  const previewRes = await req('POST', '/api/import/preview', {
    tenantId: TEST_USER.tenant_id,
    content: 'Laura Martinez - SEUR - B2\nCarlos Sanchez - GLS - B3',
    source: 'txt'
  });
  assert(previewRes.status === 200 && previewRes.data.ok, 'POST /api/import/preview parsea texto multi-línea');
  assert(previewRes.data.rows?.length === 2, `Detectó exactamente 2 filas para importar`);

  const commitRes = await req('POST', '/api/import/commit', {
    tenantId: TEST_USER.tenant_id,
    rows: previewRes.data.rows,
    autoConfirmIfGte: 0.5
  });
  assert(commitRes.status === 200 && commitRes.data.ok, 'POST /api/import/commit procesa e inserta en staging y packages');
  assert(commitRes.data.created === 2, `Creó exitosamente los 2 paquetes en PostgreSQL`);

  // Limpiar los 2 paquetes importados de prueba
  await query("DELETE FROM public.packages WHERE tenant_id = $1 AND nombre_cliente IN ('LAURA MARTINEZ', 'CARLOS SANCHEZ')", [TEST_USER.tenant_id]);
  await query("DELETE FROM public.import_buffer WHERE tenant_id = $1", [TEST_USER.tenant_id]);
  console.log('  🧹 Limpieza de paquetes y buffer de importación completada');

  // 7. DASHBOARD ANALYTICS
  console.log('\n7. TEST: Dashboard y Analítica');
  const dashResumenRes = await req('GET', `/api/dashboard/resumen?tenant_id=${TEST_USER.tenant_id}`);
  assert(dashResumenRes.status === 200, 'GET /api/dashboard/resumen retorna 200');

  const dashVolumenRes = await req('POST', '/api/dashboard/volumen', {
    tenant_id: TEST_USER.tenant_id,
    rango: '7d'
  });
  assert(dashVolumenRes.status === 200 && Array.isArray(dashVolumenRes.data), `POST /api/dashboard/volumen retorna serie de tiempo (${dashVolumenRes.data.length} días)`);

  const dashNegocioRes = await req('GET', `/api/dashboard/negocio/${TEST_USER.slug}`);
  assert(dashNegocioRes.status === 200 && dashNegocioRes.data.negocio?.slug === TEST_USER.slug, 'GET /api/dashboard/negocio/:slug resuelve negocio');

  console.log('\n====================================================');
  console.log(`📊 RESULTADOS FINALES: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Error no capturado en batería de tests:', err);
  process.exit(1);
});
