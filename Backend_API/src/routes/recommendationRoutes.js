const express = require('express');
const router = express.Router();
const {
  getRecommendations,
  getRecommendationPP1,
  getRecommendationPP2,
  getRecommendationPP3,
  getRecommendationPP4,
  compareRecommendations
} = require('../controllers/recommendationController');

// ── 4 Graduation Thesis Benchmark Strategies ──
// GET /api/recommendations/pp1 - PP1: Global Popularity (Baseline)
router.get('/pp1', getRecommendationPP1);

// GET /api/recommendations/pp2 - PP2: Time-Slot Popularity (Tier 1)
router.get('/pp2', getRecommendationPP2);

// GET /api/recommendations/pp3 - PP3: Pure Content-Based (No Time Modulation)
router.get('/pp3', getRecommendationPP3);

// GET /api/recommendations/pp4 - PP4: Context-Aware Content-Based (Tier 2)
router.get('/pp4', getRecommendationPP4);

// GET /api/recommendations/compare - Concurrent comparison of PP1, PP2, PP3, PP4
router.get('/compare', compareRecommendations);

// GET /api/recommendations - Default Hybrid Flow (or via ?strategy=pp1|pp2|pp3|pp4|compare)
router.get('/', getRecommendations);

module.exports = router;
