'use strict';

const express = require('express');
const router = express.Router();
const partnersController = require('../controllers/partners.controller');

router.get('/admin', partnersController.getAdminPartnersData);
router.post('/admin/create', partnersController.createPartner);
router.post('/admin/assign', partnersController.assignPartnerToTenant);
router.post('/admin/liquidate', partnersController.liquidatePayout);
router.post('/admin/engine', partnersController.runCommissionEngine);

router.get('/me', partnersController.getPartnerDashboard);
router.post('/payout/request', partnersController.requestPayout);

module.exports = router;