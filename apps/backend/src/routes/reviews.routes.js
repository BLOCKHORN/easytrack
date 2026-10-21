'use strict';

const express = require('express');
const router = express.Router();
const requireAuth = require('../middlewares/requireAuth');
const reviewsController = require('../controllers/reviews.controller');

router.get('/public', reviewsController.getPublicReviews);
router.get('/eligibility', requireAuth.tokenOnly, reviewsController.getEligibility);
router.post('/', requireAuth.tokenOnly, reviewsController.submitReview);

module.exports = router;
