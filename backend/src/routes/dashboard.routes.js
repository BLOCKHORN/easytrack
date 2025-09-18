// backend/routes/dashboard.routes.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  obtenerResumenDashboard,
  obtenerVolumenPaquetes,
  obtenerNegocio,
} = require('../controllers/dashboard.controller');

const requireAuth = require('../middlewares/requireAuth');

// 📊 Resumen general del dashboard
router.get('/resumen', requireAuth, obtenerResumenDashboard);

// 📈 Volumen de paquetes (gráfico)
router.post('/volumen-paquetes', requireAuth, obtenerVolumenPaquetes);

// 🏢 Datos del negocio (sin columnas/baldas_por_columna)
router.get('/negocio', requireAuth, obtenerNegocio);

module.exports = router;
