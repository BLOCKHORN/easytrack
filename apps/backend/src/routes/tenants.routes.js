'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });
const requireAuth = require('../middlewares/requireAuth');
const tenantsController = require('../controllers/tenants.controller');

router.get('/me', requireAuth, tenantsController.obtenerTenantMe);
router.post('/me', requireAuth, tenantsController.actualizarTenantMe);
router.put('/me', requireAuth, tenantsController.actualizarTenantMe);
router.patch('/me', requireAuth, tenantsController.actualizarTenantMe);
router.post('/me/ai-trial', requireAuth, tenantsController.activarPruebaIA);

module.exports = router;