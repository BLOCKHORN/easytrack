'use strict';
const express = require('express');
const router = express.Router();
const radarController = require('../controllers/radar.controller');

router.post('/scan', radarController.scanRadar);

module.exports = router;