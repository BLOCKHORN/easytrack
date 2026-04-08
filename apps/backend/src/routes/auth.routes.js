'use strict';

const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth');
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/bootstrap', requireAuth, authController.bootstrap);

module.exports = router;