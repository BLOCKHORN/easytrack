// backend/routes/dashboard.routes.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  obtenerResumenDashboard,
  obtenerVolumenPaquetes,
  obtenerNegocio,
} = require('../controllers/dashboard.controller');

const requireAuth = require('../middlewares/requireAuth');

router.get('/resumen', requireAuth, obtenerResumenDashboard);
router.post('/volumen-paquetes', requireAuth, obtenerVolumenPaquetes);
router.get('/negocio', requireAuth, obtenerNegocio);

module.exports = router;
