'use strict';

const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth');
const limitsController = require('../controllers/limits.controller');

router.get('/me', requireAuth, limitsController.getLimitsMe);

module.exports = router;