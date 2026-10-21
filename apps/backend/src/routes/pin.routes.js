'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });
const rateLimit = require('express-rate-limit');
const pinController = require('../controllers/pin.controller');

const pinVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5, // max 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados intentos de PIN. Por seguridad, espera 15 minutos.' }
});

router.get('/status', pinController.getStatus);
router.post('/verify', pinVerifyLimiter, pinController.verify);
router.post('/set', pinController.setPin);
router.post('/disable', pinController.disablePin);

module.exports = {
  router,
  pinVerifyLimiter
};
