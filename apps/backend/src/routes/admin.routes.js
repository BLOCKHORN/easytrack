const express = require('express');
const router = express.Router();
const { 
  getDashboardData, 
  getTenantStats, 
  updateReviewStatus, 
  updateTenantLimits,
  checkAdminStatus
} = require('../controllers/admin.controller');

router.get('/check', checkAdminStatus);
router.get('/dashboard-data', getDashboardData);
router.get('/tenant-stats/:tenantId', getTenantStats);
router.patch('/review/:id', updateReviewStatus);
router.patch('/tenant/:id/limits', updateTenantLimits);

module.exports = router;