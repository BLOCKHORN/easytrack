'use strict';

const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metrics.controller');

router.get('/public', metricsController.getPublicMetrics);

module.exports = router;