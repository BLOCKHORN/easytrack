'use strict';

const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth');
const authController = require('../controllers/auth.controller');

const pinController = require('../controllers/pin.controller');
const { pinVerifyLimiter } = require('./pin.routes');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados intentos de acceso fallidos. Por seguridad, espera 15 minutos.' }
});

router.post('/register', authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/verify-pin', pinVerifyLimiter, pinController.verify);
router.get('/google/login', authController.googleLogin);
router.get('/google/callback', authController.googleCallback);
router.get('/me', requireAuth.tokenOnly, authController.me);
router.post('/update-password', requireAuth.tokenOnly, authController.updatePassword);
router.post('/bootstrap', requireAuth.tokenOnly, authController.bootstrap);

module.exports = router;