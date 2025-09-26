// backend/src/routes/paquetes.routes.js
'use strict';

const express = require('express');
// mergeParams:true => recoge params del path padre (/:tenantSlug/...)
const router = express.Router({ mergeParams: true });

const requireAuth = require('../middlewares/requireAuth');
const requireActiveSubscription = require('../middlewares/requireActiveSubscription');

const {
  crearPaquete,
  listarPaquetes,
  eliminarPaquete,
  entregarPaquete,
  editarPaquete
} = require('../controllers/paquetes.controller');

/**
 * Lectura -> solo requiere login
 */
router.get('/listar', requireAuth, listarPaquetes);

/**
 * Escritura -> requiere login + suscripción activa o trial vigente
 */
router.post('/crear', requireAuth, requireActiveSubscription(), crearPaquete);
router.patch('/entregar/:id', requireAuth, requireActiveSubscription(), entregarPaquete);
router.put('/:id', requireAuth, requireActiveSubscription(), editarPaquete);
router.delete('/:id', requireAuth, requireActiveSubscription(), eliminarPaquete);

module.exports = router;
