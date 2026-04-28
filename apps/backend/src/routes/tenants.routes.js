'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });
const { tokenOnly } = require('../middlewares/requireAuth');
const tenantsController = require('../controllers/tenants.controller');

router.get('/me', tokenOnly, tenantsController.obtenerTenantMe);
router.post('/me', tokenOnly, tenantsController.actualizarTenantMe);
router.put('/me', tokenOnly, tenantsController.actualizarTenantMe);
router.patch('/me', tokenOnly, tenantsController.actualizarTenantMe);
router.post('/me/ai-trial', tokenOnly, tenantsController.activarPruebaIA);

module.exports = router;