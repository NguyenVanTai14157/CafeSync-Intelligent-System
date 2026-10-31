const {
  getTimeSlotPopularRecommendations,
  getGlobalPopularityRecommendations,
  getCurrentHourVietnam
} = require('../services/recommendationService');
const {
  getContentBasedRecommendations,
  getPureContentBasedRecommendations,
  getContextAwareContentBasedRecommendations
} = require('../services/contentBasedService');

/**
 * GET /api/recommendations
 * Query params: email, hour, topK, strategy
 *
 * Luồng xử lý tầng recommendation:
 * - Nếu query có `strategy` (pp1, pp2, pp3, pp4, compare): điều hướng trực tiếp sang phương pháp tương ứng.
 * - Mặc định (Production Flow):
 *   1. Guest / thiếu email / email="Guest" → Layer 1 (Time-slot Popularity)
 *   2. Member có lịch sử hợp lệ → Layer 2 (Content-Based Filtering)
 *      - Nếu không đủ score (< 0.65) hoặc không có lịch sử → fallback Layer 1
 */
const getRecommendations = async (req, res) => {
  try {
    const { email, hour, topK, strategy } = req.query;

    // ── Hỗ trợ query strategy cho nghiên cứu & KLTN ──
    if (strategy) {
      const norm = String(strategy).trim().toLowerCase();
      if (norm === 'pp1') return getRecommendationPP1(req, res);
      if (norm === 'pp2') return getRecommendationPP2(req, res);
      if (norm === 'pp3') return getRecommendationPP3(req, res);
      if (norm === 'pp4') return getRecommendationPP4(req, res);
      if (norm === 'compare') return compareRecommendations(req, res);
      return res.status(400).json({
        message: `Invalid strategy "${strategy}". Supported strategies are: pp1, pp2, pp3, pp4, compare.`
      });
    }

    // ── Xác định Guest hay Member ──
    const isGuest = !email
      || typeof email !== 'string'
      || email.trim() === ''
      || email.trim().toLowerCase() === 'guest';

    if (isGuest) {
      // Guest → Layer 1 trực tiếp, không truy vấn lịch sử
      const result = await getTimeSlotPopularRecommendations({ email, hour, topK });
      result.recommendationSource = "TIME_SLOT_POPULARITY";
      return res.status(200).json(result);
    }

    // ── Member: thử Layer 2 ──
    // Validate hour và topK trước (reuse logic Layer 1 cho validation)
    let effectiveHour;
    if (hour !== undefined && hour !== null && hour !== '') {
      const parsedHour = Number(hour);
      if (!Number.isInteger(parsedHour) || parsedHour < 0 || parsedHour > 23 || String(hour).trim() !== String(parsedHour)) {
        return res.status(400).json({ message: 'Invalid hour parameter. Must be an integer between 0 and 23.' });
      }
      effectiveHour = parsedHour;
    } else {
      effectiveHour = getCurrentHourVietnam();
    }

    let effectiveTopK = 3;
    if (topK !== undefined && topK !== null && topK !== '') {
      const parsedTopK = Number(topK);
      if (!Number.isInteger(parsedTopK) || parsedTopK < 1 || parsedTopK > 10 || String(topK).trim() !== String(parsedTopK)) {
        return res.status(400).json({ message: 'Invalid topK parameter. Must be an integer between 1 and 10.' });
      }
      effectiveTopK = parsedTopK;
    }

    const trimmedEmail = email.trim();

    // ── Kiểm tra role: tài khoản staff/admin không được coi là customer member ──
    const User = require('../models/User');
    const { isStaffRole } = require('../utils/orderWorkflow');
    const userDoc = await User.findOne({ email: trimmedEmail }).select('role').lean();
    if (!userDoc || userDoc.role !== 'customer' || isStaffRole(userDoc.role)) {
      // Email không phải customer hoặc thuộc staff/admin → không xử lý Layer 2, fallback Layer 1
      const result = await getTimeSlotPopularRecommendations({ email: trimmedEmail, hour, topK });
      result.recommendationSource = "TIME_SLOT_POPULARITY";
      return res.status(200).json(result);
    }

    const layer2Result = await getContentBasedRecommendations({
      email: trimmedEmail,
      effectiveHour,
      effectiveTopK
    });

    if (layer2Result && layer2Result.recommendations && layer2Result.recommendations.length > 0) {
      return res.status(200).json(layer2Result);
    }

    // ── Fallback → Layer 1 ──
    const result = await getTimeSlotPopularRecommendations({ email, hour, topK });
    result.recommendationSource = "TIME_SLOT_POPULARITY";
    return res.status(200).json(result);

  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    console.error("Lỗi Recommendation Controller:", err);
    return res.status(500).json({ message: "Lỗi hệ thống khi tạo gợi ý theo thời gian." });
  }
};

/**
 * GET /api/recommendations/pp1
 * Strategy 1: Global Popularity (Baseline)
 * Query: topK (default 5)
 */
const getRecommendationPP1 = async (req, res) => {
  try {
    const { topK } = req.query;
    const result = await getGlobalPopularityRecommendations({ topK });
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    console.error("Lỗi Controller PP1 (Global Popularity):", err);
    return res.status(500).json({ message: "Lỗi hệ thống khi tạo gợi ý phổ biến toàn hệ thống." });
  }
};

/**
 * GET /api/recommendations/pp2
 * Strategy 2: Time-Slot Popularity (Tier 1)
 * Query: email, hour, topK (default 3)
 */
const getRecommendationPP2 = async (req, res) => {
  try {
    const { email, hour, topK } = req.query;
    const result = await getTimeSlotPopularRecommendations({ email, hour, topK });
    result.recommendationSource = "TIME_SLOT_POPULARITY";
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    console.error("Lỗi Controller PP2 (Time-Slot Popularity):", err);
    return res.status(500).json({ message: "Lỗi hệ thống khi tạo gợi ý theo khung giờ." });
  }
};

/**
 * GET /api/recommendations/pp3
 * Strategy 3: Pure Content-Based (No Time Modulation)
 * Query: email (required), hour (optional), topK (default 5)
 */
const getRecommendationPP3 = async (req, res) => {
  try {
    const { email, hour, topK } = req.query;
    const result = await getPureContentBasedRecommendations({ email, hour, topK });
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    console.error("Lỗi Controller PP3 (Pure Content-Based):", err);
    return res.status(500).json({ message: "Lỗi hệ thống khi tạo gợi ý Pure Content-Based." });
  }
};

/**
 * GET /api/recommendations/pp4
 * Strategy 4: Context-Aware Content-Based (Tier 2)
 * Query: email (required), hour (optional), topK (default 5)
 */
const getRecommendationPP4 = async (req, res) => {
  try {
    const { email, hour, topK } = req.query;
    const result = await getContextAwareContentBasedRecommendations({ email, hour, topK });
    return res.status(200).json(result);
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    console.error("Lỗi Controller PP4 (Context-Aware Content-Based):", err);
    return res.status(500).json({ message: "Lỗi hệ thống khi tạo gợi ý Context-Aware Content-Based." });
  }
};

/**
 * GET /api/recommendations/compare
 * So sánh đồng thời 4 chiến lược gợi ý (PP1, PP2, PP3, PP4)
 * Query: email, hour, topK (default 5)
 */
const compareRecommendations = async (req, res) => {
  try {
    const { email, hour, topK } = req.query;

    let effectiveHour;
    if (hour !== undefined && hour !== null && hour !== '') {
      const parsedHour = Number(hour);
      if (!Number.isInteger(parsedHour) || parsedHour < 0 || parsedHour > 23 || String(hour).trim() !== String(parsedHour)) {
        return res.status(400).json({ message: 'Invalid hour parameter. Must be an integer between 0 and 23.' });
      }
      effectiveHour = parsedHour;
    } else {
      effectiveHour = getCurrentHourVietnam();
    }

    let effectiveTopK = 5;
    if (topK !== undefined && topK !== null && topK !== '') {
      const parsedTopK = Number(topK);
      if (!Number.isInteger(parsedTopK) || parsedTopK < 1 || parsedTopK > 10 || String(topK).trim() !== String(parsedTopK)) {
        return res.status(400).json({ message: 'Invalid topK parameter. Must be an integer between 1 and 10.' });
      }
      effectiveTopK = parsedTopK;
    }

    const trimmedEmail = (email && typeof email === 'string') ? email.trim() : 'Guest';
    const isMemberEmail = trimmedEmail !== '' && trimmedEmail.toLowerCase() !== 'guest';

    const pp1Promise = getGlobalPopularityRecommendations({ topK: effectiveTopK });
    const pp2Promise = getTimeSlotPopularRecommendations({ email: trimmedEmail, hour: effectiveHour, topK: effectiveTopK });

    let pp3Promise;
    let pp4Promise;
    if (isMemberEmail) {
      pp3Promise = getPureContentBasedRecommendations({ email: trimmedEmail, hour: effectiveHour, topK: effectiveTopK });
      pp4Promise = getContextAwareContentBasedRecommendations({ email: trimmedEmail, hour: effectiveHour, topK: effectiveTopK });
    } else {
      pp3Promise = Promise.resolve({
        strategy: "PP3",
        strategyName: "Pure Content-Based (No Time Modulation)",
        type: "PURE_CONTENT_BASED",
        recommendationSource: "PURE_CONTENT_BASED",
        customerEmail: "Guest",
        message: "Email khách hàng là bắt buộc để tính vector khẩu vị.",
        recommendations: []
      });
      pp4Promise = Promise.resolve({
        strategy: "PP4",
        strategyName: "Context-Aware Content-Based",
        type: "PERSONALIZED_CONTENT_BASED",
        recommendationSource: "CONTENT_BASED",
        customerEmail: "Guest",
        message: "Email khách hàng là bắt buộc để tính vector khẩu vị.",
        recommendations: []
      });
    }

    const [pp1, pp2, pp3, pp4] = await Promise.all([pp1Promise, pp2Promise, pp3Promise, pp4Promise]);

    return res.status(200).json({
      experiment: "Graduation Thesis Recommendation Benchmark",
      parameters: {
        customerEmail: trimmedEmail,
        hour: effectiveHour,
        topK: effectiveTopK
      },
      strategies: {
        PP1: pp1,
        PP2: pp2,
        PP3: pp3,
        PP4: pp4
      }
    });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    console.error("Lỗi Controller Compare Recommendations:", err);
    return res.status(500).json({ message: "Lỗi hệ thống khi so sánh các thuật toán gợi ý." });
  }
};

module.exports = {
  getRecommendations,
  getRecommendationPP1,
  getRecommendationPP2,
  getRecommendationPP3,
  getRecommendationPP4,
  compareRecommendations
};
