const express = require("express");
const router = express.Router();

const {
  getTotalRevenue,
  getTodayRevenue,
  getMonthRevenue,
  getRevenueByDay,
  getDashboardStats,
} = require("../controllers/reportController");

router.get("/total", getTotalRevenue);
router.get("/today", getTodayRevenue);
router.get("/month", getMonthRevenue);
router.get("/chart/week", getRevenueByDay);
router.get("/stats", getDashboardStats);
router.get('/operations', require('../controllers/operationalController').getOperationalStats);

module.exports = router;
