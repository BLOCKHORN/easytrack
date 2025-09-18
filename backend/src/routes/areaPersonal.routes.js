// backend/src/routes/areaPersonal.routes.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const requireAuth = require('../middlewares/requireAuth');

const {
  obtenerResumenEconomico,
  obtenerIngresosMensuales,
  obtenerIngresosPorEmpresa,
  obtenerTopClientes,
  obtenerDiario,
  obtenerUltimasEntregas,
} = require('../controllers/areaPersonal.controller');

const {
  getFinanceSettings,
  updateFinanceSettings
} = require('../controllers/areaPersonalSettings.controller');

const {
  getSnapshots,
  createSnapshot
} = require('../controllers/areaPersonalSnapshots.controller');

// ---- Datos actuales ----
router.get('/resumen',       requireAuth, obtenerResumenEconomico);
router.get('/mensual',       requireAuth, obtenerIngresosMensuales);
router.get('/por-empresa',   requireAuth, obtenerIngresosPorEmpresa);
router.get('/top-clientes',  requireAuth, obtenerTopClientes);
router.get('/diario',        requireAuth, obtenerDiario);              // <- nombre correcto
router.get('/ultimas',       requireAuth, obtenerUltimasEntregas);     // <- faltaba

// ---- Settings ----
router.get('/settings',      requireAuth, getFinanceSettings);
router.patch('/settings',    requireAuth, updateFinanceSettings);

// ---- Snapshots (histórico) ----
router.get('/snapshots',     requireAuth, getSnapshots);
router.post('/snapshots',    requireAuth, createSnapshot);

module.exports = router;
