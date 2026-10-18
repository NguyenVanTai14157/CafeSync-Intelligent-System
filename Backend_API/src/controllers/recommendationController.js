const { getTimeSlotPopularRecommendations } = require('../services/recommendationService');
const { getContentBasedRecommendations } = require('../services/contentBasedService');

/**
 * GET /api/recommendations
 * Query params: email, hour, topK
 *
 * Luồng xử lý tầng recommendation:
 * 1. Guest / thiếu email / email="Guest" → Layer 1 (Time-slot Popularity)
 * 2. Member có lịch sử hợp lệ → Layer 2 (Content-Based Filtering)
 *    - Nếu không đủ score (< 0.65) hoặc không có lịch sử → fallback Layer 1
 * 3. Layer 3 chưa triển khai.
 */
const getRecommendations = async (req, res) => {
  try {
    const { email, hour, topK } = req.query;

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
      const { getCurrentHourVietnam } = require('../services/recommendationService');
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

module.exports = {
  getRecommendations
};
