// backend/routes/dashboard.routes.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  obtenerResumenDashboard,
  obtenerVolumenPaquetes,
  obtenerNegocio,
} = require('../controllers/dashboard.controller');

const requireAuth = require('../middlewares/requireAuth');

// 📊 Resumen general (usa 'packages')
router.get('/resumen', requireAuth, obtenerResumenDashboard);

// 📈 Volumen de paquetes (agregado desde 'packages'; ya NO usa RPC legacy)
router.post('/volumen-paquetes', requireAuth, obtenerVolumenPaquetes);

// 🏢 Datos del negocio (marca 'ubicaciones' si hay)
router.get('/negocio', requireAuth, obtenerNegocio);

module.exports = router;
