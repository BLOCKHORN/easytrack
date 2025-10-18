// src/routes/import.routes.js
'use strict';

const { Router } = require('express');
const requireAuth = require('../middlewares/requireAuth');
const ctrl = require('../controllers/import.controller');

const router = Router();

// Todas protegidas por login (pero sin subscriptionFirewall, igual que /api/paquetes)
router.use(requireAuth);

router.post('/preview', ctrl.preview);
router.post('/commit',  ctrl.commit);
router.get('/staging',  ctrl.listStaging);
router.post('/bulk-confirm', ctrl.bulkConfirm);

module.exports = router;
