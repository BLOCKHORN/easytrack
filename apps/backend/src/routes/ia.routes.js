'use strict';

const express = require('express');
const router = express.Router();
const iaController = require('../controllers/ia.controller');
const requireAuth = require('../middlewares/requireAuth');
const subscriptionFirewall = require('../middlewares/subscriptionFirewall'); // Opcional, pero recomendado

// Solo permitimos el acceso si están autenticados
router.post('/scan-label', requireAuth, iaController.escanearEtiqueta);

module.exports = router;