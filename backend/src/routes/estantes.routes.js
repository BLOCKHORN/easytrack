// routes/estantes.routes.js
'use strict';
const express = require('express');
const router = express.Router({ mergeParams: true });

const requireAuth = require('../middlewares/requireAuth');
const {
  obtenerEstructura,
  guardarEstructura,
  guardarCarriers
} = require('../controllers/estantes.controller');

router.get('/estructura', requireAuth, obtenerEstructura);
router.post('/estructura', requireAuth, guardarEstructura);
router.post('/carriers', requireAuth, guardarCarriers);

module.exports = router;
