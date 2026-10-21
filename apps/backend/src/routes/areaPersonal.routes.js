const express = require('express');
const router = express.Router({ mergeParams: true });
const requireAuth = require('../middlewares/requireAuth');

// Importamos TODO desde el único controlador unificado
const {
  obtenerResumenEconomico,
  obtenerIngresosMensuales,
  obtenerIngresosPorEmpresa,
  obtenerTopClientes,
  obtenerDiario,
  obtenerUltimasEntregas,
  getFinanceSettings,
  updateFinanceSettings,
  getSnapshots,
  createSnapshot
} = require('../controllers/areaPersonal.controller');

// Métricas y resúmenes
router.get('/resumen',       requireAuth, obtenerResumenEconomico);
router.get('/mensual',       requireAuth, obtenerIngresosMensuales);
router.get('/por-empresa',   requireAuth, obtenerIngresosPorEmpresa);
router.get('/top-clientes',  requireAuth, obtenerTopClientes);
router.get('/diario',        requireAuth, obtenerDiario);
router.get('/ultimas',       requireAuth, obtenerUltimasEntregas);

// Configuración (settings)
router.get('/settings',      requireAuth, getFinanceSettings);
router.patch('/settings',    requireAuth, updateFinanceSettings);

// Snapshots de finanzas
router.get('/snapshots',     requireAuth, getSnapshots);
router.post('/snapshots',    requireAuth, createSnapshot);

module.exports = router;