// routes/estantes.routes.js
'use strict';
const express = require('express');
const router = express.Router({ mergeParams: true });

const requireAuth = require('../middlewares/requireAuth');
const { guardarCarriers } = require('../controllers/estantes.controller');

// Solo carriers. Sin /estructura (legacy) 👇
router.post('/carriers', requireAuth, guardarCarriers);

module.exports = router;
