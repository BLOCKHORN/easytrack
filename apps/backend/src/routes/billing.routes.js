'use strict';

const express = require('express');
const requireAuth = require('../middlewares/requireAuth');
const billingController = require('../controllers/billing.controller');

const router = express.Router();

router.get('/plans', requireAuth, billingController.getPlans);
router.get('/period-options', requireAuth, billingController.getPeriodOptions);
router.post('/prefill', requireAuth, billingController.prefillCustomer);
router.post('/checkout', requireAuth, billingController.createCheckout);
router.get('/checkout/verify', billingController.verifyCheckout);
router.post('/portal', requireAuth, billingController.createPortal);

module.exports = router;