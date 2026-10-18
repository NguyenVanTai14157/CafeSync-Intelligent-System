/**
 * Layer 2 — Context-Aware Content-Based Filtering using Cosine Similarity
 *
 * Mô tả thuật toán:
 * -  Layer 2 là content-based filtering cá nhân hóa cho khách hàng thành viên.
 * -  User vector được suy ra từ lịch sử các đơn hàng đã hoàn thành (status: "Hoàn thành").
 * -  Product features (sweetness, caffeine, coldness) là expert-defined normalized values
 *    nằm trong khoảng [0, 1], KHÔNG phải giá trị đo thực tế hay ML embedding.
 * -  Cosine Similarity đo mức tương đồng giữa preference vector và item vector.
 * -  Time context điều chỉnh caffeine/coldness theo khung giờ (alpha/beta).
 * -  Threshold 0.65 là similarity threshold do chuyên gia thiết kế,
 *    KHÔNG phải confidence probability.
 * -  Member mới (không có lịch sử hợp lệ) fallback về Layer 1.
 * -  Dataset hiện tại là synthetic scenario-based dataset.
 * -  Chưa có bằng chứng để khẳng định tăng doanh thu, độ chính xác cao
 *    hoặc cải thiện conversion rate.
 * -  Layer 3 Collaborative Filtering chưa được triển khai.
 */

const Order = require('../models/Order');
const Product = require('../models/Product');
require('../models/Category');

const { resolveSlot, getCurrentHourVietnam, TIMEZONE } = require('./recommendationService');

// ─── Similarity threshold & cap ──────────────────────────────────────────────
const SIMILARITY_THRESHOLD = 0.65;
const MAX_CAP = 5;

// ─── Expert-defined normalized product feature vectors ───────────────────────
// Mỗi sản phẩm được biểu diễn bằng 3 chiều: [sweetness, caffeine, coldness]
// Tất cả giá trị trong [0, 1]. Đây là expert-defined normalized features,
// KHÔNG phải dữ liệu đo thực tế hay giá trị được học từ dữ liệu.
// Khớp 100% với 31 món trong scripts/menu-data.js (12 Cà phê, 6 Trà, 9 Sinh tố, 4 Nước ép).
const PRODUCT_VECTORS = {
  // ── Cà phê (12 món) ──
  "Cà phê đặc biệt":        { sweetness: 0.5, caffeine: 0.9, coldness: 0.7 },
  "Cà phê đen":            { sweetness: 0.1, caffeine: 0.9, coldness: 0.7 },
  "Cà phê sữa":            { sweetness: 0.6, caffeine: 0.7, coldness: 0.7 },
  "Cà phê Espresso":        { sweetness: 0.1, caffeine: 1.0, coldness: 0.2 },
  "Cà phê Cappuccino":      { sweetness: 0.5, caffeine: 0.7, coldness: 0.3 },
  "Cà phê Latte":           { sweetness: 0.6, caffeine: 0.5, coldness: 0.4 },
  "Cà phê trứng":          { sweetness: 0.6, caffeine: 0.6, coldness: 0.3 },
  "Cà phê dừa":            { sweetness: 0.7, caffeine: 0.5, coldness: 0.7 },
  "Bạc xỉu":               { sweetness: 0.7, caffeine: 0.5, coldness: 0.7 },
  "Cà phê muối":           { sweetness: 0.4, caffeine: 0.7, coldness: 0.6 },
  "Cà phê đá xay":         { sweetness: 0.7, caffeine: 0.6, coldness: 0.9 },
  "Cà phê Mocha":          { sweetness: 0.7, caffeine: 0.6, coldness: 0.4 },

  // ── Trà (6 món) ──
  "Trà đào":                { sweetness: 0.7, caffeine: 0.1, coldness: 0.8 },
  "Trà chanh":              { sweetness: 0.6, caffeine: 0.1, coldness: 0.8 },
  "Trà vải":                { sweetness: 0.7, caffeine: 0.1, coldness: 0.8 },
  "Trà dâu":                { sweetness: 0.7, caffeine: 0.1, coldness: 0.8 },
  "Trà trái cây nhiệt đới": { sweetness: 0.7, caffeine: 0.05, coldness: 0.8 },
  "Trà sữa socola":        { sweetness: 0.8, caffeine: 0.2, coldness: 0.7 },

  // ── Sinh tố (9 món) ──
  "Sinh tố chuối":          { sweetness: 0.7, caffeine: 0.0, coldness: 0.8 },
  "Sinh tố dưa hấu":       { sweetness: 0.7, caffeine: 0.0, coldness: 0.9 },
  "Sinh tố mít":            { sweetness: 0.7, caffeine: 0.0, coldness: 0.8 },
  "Sinh tố xoài":           { sweetness: 0.8, caffeine: 0.0, coldness: 0.9 },
  "Sinh tố kiwi":           { sweetness: 0.5, caffeine: 0.0, coldness: 0.9 },
  "Sinh tố mãng cầu":      { sweetness: 0.6, caffeine: 0.0, coldness: 0.9 },
  "Sinh tố việt quất":      { sweetness: 0.5, caffeine: 0.0, coldness: 0.9 },
  "Sinh tố dâu":            { sweetness: 0.7, caffeine: 0.0, coldness: 0.9 },
  "Sinh tố bơ":             { sweetness: 0.6, caffeine: 0.0, coldness: 0.9 },

  // ── Nước ép (4 món) ──
  "Nước ép chanh dây":      { sweetness: 0.4, caffeine: 0.0, coldness: 0.8 },
  "Nước ép đào":            { sweetness: 0.6, caffeine: 0.0, coldness: 0.8 },
  "Nước ép táo":            { sweetness: 0.6, caffeine: 0.0, coldness: 0.8 },
  "Nước ép cam":            { sweetness: 0.5, caffeine: 0.0, coldness: 0.8 }
};

/**
 * Chuẩn hóa tên sản phẩm để lookup robust (Unicode NFC, trim, single space, lowercase tiếng Việt).
 * KHÔNG dùng fuzzy matching hay substring matching.
 */
function normalizeProductName(name) {
  return String(name || '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi-VN');
}

const NORMALIZED_PRODUCT_VECTORS = new Map(
  Object.entries(PRODUCT_VECTORS).map(([name, vector]) => [
    normalizeProductName(name),
    vector
  ])
);

/**
 * Lấy vector đặc trưng của sản phẩm theo tên đã chuẩn hóa.
 * Trả về vector [sweetness, caffeine, coldness] hoặc null nếu không tồn tại.
 */
function getProductVector(name) {
  return NORMALIZED_PRODUCT_VECTORS.get(normalizeProductName(name)) || null;
}

/**
 * Kiểm tra tính hợp lệ và độ bao phủ của mapping vector đối với menu chuẩn.
 * @param {string[]} [canonicalProductNames] - Danh sách tên sản phẩm chuẩn (tùy chọn)
 * @returns {{ valid: boolean, errors: string[], canonicalCount: number|null, vectorCount: number }}
 */
function validateProductVectorMapping(canonicalProductNames) {
  const errors = [];
  const normalizedVectorMap = new Map();
  const vectorKeys = Object.keys(PRODUCT_VECTORS);

  // 1. Kiểm tra duplicate normalized keys trong PRODUCT_VECTORS
  for (const name of vectorKeys) {
    const norm = normalizeProductName(name);
    if (normalizedVectorMap.has(norm)) {
      errors.push(`Trùng lặp normalized key: "${name}" xung đột với "${normalizedVectorMap.get(norm)}"`);
    } else {
      normalizedVectorMap.set(norm, name);
    }
  }

  // 2. Kiểm tra chiều và khoảng giá trị của từng vector
  for (const [name, vec] of Object.entries(PRODUCT_VECTORS)) {
    if (!vec || typeof vec !== 'object') {
      errors.push(`Vector của "${name}" không phải là object`);
      continue;
    }
    const dimensions = ['sweetness', 'caffeine', 'coldness'];
    for (const dim of dimensions) {
      const val = vec[dim];
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        errors.push(`Vector của "${name}" thuộc tính "${dim}" không phải số hữu hạn: ${val}`);
      } else if (val < 0 || val > 1) {
        errors.push(`Vector của "${name}" thuộc tính "${dim}" nằm ngoài [0, 1]: ${val}`);
      }
    }
  }

  // 3. Đối chiếu với danh sách tên sản phẩm chuẩn (nếu có)
  if (Array.isArray(canonicalProductNames)) {
    const canonicalNormalized = new Map();
    for (const name of canonicalProductNames) {
      const norm = normalizeProductName(name);
      canonicalNormalized.set(norm, name);
      if (!normalizedVectorMap.has(norm)) {
        errors.push(`Thiếu vector cho món chuẩn trong menu: "${name}"`);
      }
    }

    for (const [norm, origName] of normalizedVectorMap.entries()) {
      if (!canonicalNormalized.has(norm)) {
        errors.push(`Thừa vector cho món không có trong menu chuẩn: "${origName}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    canonicalCount: Array.isArray(canonicalProductNames) ? canonicalProductNames.length : null,
    vectorCount: vectorKeys.length
  };
}

// ─── Sugar parsing ───────────────────────────────────────────────────────────
// Sugar trong order item lưu dưới dạng phần trăm: "0%", "30%", "50%", "70%", "100%"
const SUGAR_MAP = {
  "0%":   0.0,
  "30%":  0.3,
  "50%":  0.5,
  "70%":  0.7,
  "100%": 1.0
};

/**
 * Parse giá trị sugar từ order item.
 * @param {string} sugarStr – e.g. "70%"
 * @returns {number|null} – giá trị 0..1 hoặc null nếu không hợp lệ
 */
function parseSugar(sugarStr) {
  if (typeof sugarStr !== 'string') return null;
  const trimmed = sugarStr.trim();
  if (SUGAR_MAP[trimmed] !== undefined) return SUGAR_MAP[trimmed];
  // Fallback: thử parse số từ chuỗi phần trăm (ví dụ: "75%")
  const match = trimmed.match(/^(\d+(?:\.\d+)?)%$/);
  if (match) {
    const val = parseFloat(match[1]) / 100;
    if (Number.isFinite(val) && val >= 0 && val <= 1) return val;
  }
  return null;
}

// ─── Ice parsing ─────────────────────────────────────────────────────────────
// Ice trong order item lưu dưới dạng phần trăm: "0%", "30%", "50%", "70%", "100%"
// (schema Product.iceOptions = ["0%", "30%", "50%", "70%", "100%"])
const ICE_MAP = {
  "0%":   0.0,
  "30%":  0.3,
  "50%":  0.5,
  "70%":  0.7,
  "100%": 1.0
};

/**
 * Parse giá trị ice từ order item.
 * @param {string} iceStr – e.g. "50%"
 * @returns {number|null} – giá trị 0..1 hoặc null nếu không hợp lệ
 */
function parseIce(iceStr) {
  if (typeof iceStr !== 'string') return null;
  const trimmed = iceStr.trim();
  if (ICE_MAP[trimmed] !== undefined) return ICE_MAP[trimmed];
  // Fallback: thử parse số phần trăm
  const match = trimmed.match(/^(\d+(?:\.\d+)?)%$/);
  if (match) {
    const val = parseFloat(match[1]) / 100;
    if (Number.isFinite(val) && val >= 0 && val <= 1) return val;
  }
  return null;
}

// ─── Time context modulation parameters ──────────────────────────────────────
// Đây là expert-defined design parameters, KHÔNG phải tham số đã học từ dữ liệu.
//
// Morning 07:00–11:59 → alpha=1.4, beta=1.0  (tăng caffeine preference buổi sáng)
// Afternoon 12:00–17:59 → alpha=1.0, beta=1.2  (tăng coldness preference buổi chiều)
// Evening/Late night 18:00–06:59 → alpha=0.2, beta=1.0  (giảm caffeine buổi tối/đêm)
//
// Lưu ý: Boundary thời gian giữ nhất quán với Layer 1 (resolveSlot):
//   morning: 7–11, afternoon: 12–17, evening: 18–22, late_night: 23–6
// Nhóm evening + late_night dùng chung alpha=0.2, beta=1.0 theo spec "18:00–06:59".
function getTimeModulationParams(hour) {
  if (hour >= 7 && hour <= 11) {
    return { alpha: 1.4, beta: 1.0 };
  }
  if (hour >= 12 && hour <= 17) {
    return { alpha: 1.0, beta: 1.2 };
  }
  // 18–06 (evening + late_night)
  return { alpha: 0.2, beta: 1.0 };
}

// ─── Cosine Similarity ──────────────────────────────────────────────────────
/**
 * Tính Cosine Similarity giữa hai vector 3 chiều.
 * @param {number[]} a – [sweetness, caffeine, coldness]
 * @param {number[]} b – [sweetness, caffeine, coldness]
 * @returns {number} – similarity score, 0 nếu vector zero
 */
function cosineSimilarity(a, b) {
  if (a.length !== 3 || b.length !== 3) return 0;

  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < 3; i++) {
    const ai = Number.isFinite(a[i]) ? a[i] : 0;
    const bi = Number.isFinite(b[i]) ? b[i] : 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  // Không chia cho zero → trả 0
  if (normA === 0 || normB === 0) return 0;

  const similarity = dot / (normA * normB);
  return Number.isFinite(similarity) ? similarity : 0;
}

/**
 * Tìm sugar mode (giá trị xuất hiện nhiều nhất tính theo quantity) để trả về
 * preferredSugar khớp với các option frontend thực tế.
 */
function findSugarMode(validItems) {
  const freq = {};
  for (const item of validItems) {
    const s = item.options?.sugar;
    if (typeof s === 'string' && SUGAR_MAP[s.trim()] !== undefined) {
      const key = s.trim();
      freq[key] = (freq[key] || 0) + (item.quantity || 1);
    }
  }
  let best = null, bestCount = 0;
  for (const [key, count] of Object.entries(freq)) {
    if (count > bestCount) { best = key; bestCount = count; }
  }
  return best || "100%"; // Trả default nếu không có dữ liệu
}

/**
 * Tìm ice mode (giá trị xuất hiện nhiều nhất tính theo quantity).
 * Trả về string phần trăm khớp với iceOptions frontend: "0%", "50%", "100%".
 */
function findIceMode(validItems) {
  const freq = {};
  for (const item of validItems) {
    const ic = item.options?.ice;
    if (typeof ic === 'string' && ICE_MAP[ic.trim()] !== undefined) {
      const key = ic.trim();
      freq[key] = (freq[key] || 0) + (item.quantity || 1);
    }
  }
  let best = null, bestCount = 0;
  for (const [key, count] of Object.entries(freq)) {
    if (count > bestCount) { best = key; bestCount = count; }
  }
  return best || "100%";
}

/**
 * Tính user preference vector từ lịch sử order đã hoàn thành.
 *
 * @param {Array} completedOrders – danh sách order có status "Hoàn thành"
 * @param {Map} categoryLookup – Map<productId_string, categoryName_string>
 * @returns {Object|null} – { sweetness, caffeine, coldness, validItems } hoặc null
 */
function buildUserPreferenceVector(completedOrders, categoryLookup) {
  let totalSugarWeighted = 0;
  let totalSugarQty = 0;
  let coffeeQty = 0;
  let totalValidQty = 0;
  let totalIceWeighted = 0;
  let totalIceQty = 0;
  const validItems = [];

  for (const order of completedOrders) {
    if (!Array.isArray(order.items)) continue;
    for (const item of order.items) {
      const qty = (typeof item.quantity === 'number' && item.quantity > 0) ? item.quantity : 0;
      if (qty === 0) continue;
      if (!item.id_product) continue;

      const productId = item.id_product.toString();
      const catName = categoryLookup.get(productId);
      // Sản phẩm không xác định được category vẫn được tính sugar/ice
      // nhưng không được tính coffee ratio

      validItems.push(item);
      totalValidQty += qty;

      // Sugar
      const sugarVal = parseSugar(item.options?.sugar);
      if (sugarVal !== null) {
        totalSugarWeighted += sugarVal * qty;
        totalSugarQty += qty;
      }

      // Ice
      const iceVal = parseIce(item.options?.ice);
      if (iceVal !== null) {
        totalIceWeighted += iceVal * qty;
        totalIceQty += qty;
      }

      // Coffee detection
      if (catName === 'Cà phê') {
        coffeeQty += qty;
      }
    }
  }

  if (totalValidQty === 0) return null;

  const preferredSweetness = totalSugarQty > 0 ? totalSugarWeighted / totalSugarQty : 0.5;
  const caffeinePreference = totalValidQty > 0 ? coffeeQty / totalValidQty : 0;
  const preferredColdness = totalIceQty > 0 ? totalIceWeighted / totalIceQty : 0.5;

  return {
    sweetness: preferredSweetness,
    caffeine: caffeinePreference,
    coldness: preferredColdness,
    validItems
  };
}

/**
 * Apply time context modulation to user vector.
 *
 * V_user,t = [
 *   preferredSweetness,
 *   min(1.0, caffeinePreference * alpha_t),
 *   min(1.0, preferredColdness * beta_t)
 * ]
 */
function applyTimeModulation(userVector, hour) {
  const { alpha, beta } = getTimeModulationParams(hour);
  return [
    userVector.sweetness,
    Math.min(1.0, userVector.caffeine * alpha),
    Math.min(1.0, userVector.coldness * beta)
  ];
}

/**
 * Layer 2 — Content-Based Personalized Recommendation
 *
 * @param {Object} params
 * @param {string} params.email – email thành viên
 * @param {number} params.effectiveHour – giờ hiện tại (0–23)
 * @param {number} params.effectiveTopK – số lượng tối đa (đã validate, sẽ bị cap ở 5)
 * @returns {Object|null} – kết quả Layer 2 hoặc null (fallback Layer 1)
 */
async function getContentBasedRecommendations({ email, effectiveHour, effectiveTopK }) {
  // 0. Kiểm tra role người dùng: Layer 2 chỉ phục vụ user tồn tại với role === 'customer'
  const User = require('../models/User');
  const { isStaffRole } = require('../utils/orderWorkflow');
  const userDoc = await User.findOne({ email }).select('role').lean();
  if (!userDoc || userDoc.role !== 'customer' || isStaffRole(userDoc.role)) {
    return null; // Fallback Layer 1 cho staff/admin hoặc user không tồn tại
  }

  // 1. Lấy tất cả completed orders của member
  const completedOrders = await Order.find({
    customerEmail: email,
    status: "Hoàn thành"
  }).lean();

  if (!completedOrders || completedOrders.length === 0) {
    return null; // Fallback Layer 1
  }

  // 2. Thu thập tất cả product IDs từ order items
  const productIdSet = new Set();
  for (const order of completedOrders) {
    if (!Array.isArray(order.items)) continue;
    for (const item of order.items) {
      if (item.id_product) {
        productIdSet.add(item.id_product.toString());
      }
    }
  }

  if (productIdSet.size === 0) {
    return null;
  }

  // 3. Lấy tất cả sản phẩm hiện tại (với category populated) để tính vector
  const allProducts = await Product.find({}).populate('category').lean();

  // Build category lookup: productId → categoryName
  const categoryLookup = new Map();
  const productMap = new Map();
  for (const prod of allProducts) {
    const pid = prod._id.toString();
    const catName = (prod.category && typeof prod.category === 'object')
      ? prod.category.name
      : null;
    if (catName) categoryLookup.set(pid, catName);
    productMap.set(pid, prod);
  }

  // 4. Build user preference vector
  const userPref = buildUserPreferenceVector(completedOrders, categoryLookup);
  if (!userPref) {
    return null; // Không tạo được vector → fallback
  }

  // 5. Apply time modulation
  const userVectorT = applyTimeModulation(userPref, effectiveHour);

  // Kiểm tra norm(V_user,t) === 0 → fallback
  const userNorm = Math.sqrt(
    userVectorT[0] * userVectorT[0] +
    userVectorT[1] * userVectorT[1] +
    userVectorT[2] * userVectorT[2]
  );
  if (userNorm === 0) {
    return null; // fallback Layer 1
  }

  // 6. Tính Cosine Similarity cho tất cả sản phẩm có vector
  const scoredProducts = [];
  const seenIds = new Set();

  for (const prod of allProducts) {
    const pid = prod._id.toString();
    if (seenIds.has(pid)) continue;
    seenIds.add(pid);

    const vec = getProductVector(prod.name);
    if (!vec) continue; // Sản phẩm không có vector → bỏ qua

    const itemVector = [vec.sweetness, vec.caffeine, vec.coldness];

    // Kiểm tra norm(V_item) === 0 → bỏ qua sản phẩm
    const itemNorm = Math.sqrt(
      itemVector[0] * itemVector[0] +
      itemVector[1] * itemVector[1] +
      itemVector[2] * itemVector[2]
    );
    if (itemNorm === 0) continue;

    const score = cosineSimilarity(userVectorT, itemVector);
    if (!Number.isFinite(score)) continue;
    if (score < SIMILARITY_THRESHOLD) continue;

    const catName = (prod.category && typeof prod.category === 'object')
      ? prod.category.name
      : (typeof prod.category === 'string' ? prod.category : '');

    scoredProducts.push({
      productId: pid,
      name: prod.name,
      category: catName,
      price: prod.price,
      image: (prod.image && typeof prod.image === 'string' && prod.image.trim() !== '')
        ? prod.image
        : null,
      score: Math.round(score * 1000) / 1000, // Round 3 decimals
      reason: "Phù hợp với khẩu vị và lịch sử gọi món của bạn"
    });
  }

  // Không có sản phẩm đạt threshold → fallback
  if (scoredProducts.length === 0) {
    return null;
  }

  // 7. Sắp xếp giảm dần theo score, deterministic tiebreak bằng name rồi productId
  scoredProducts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const nameDiff = a.name.localeCompare(b.name);
    if (nameDiff !== 0) return nameDiff;
    return a.productId.localeCompare(b.productId);
  });

  // 8. Cap tối đa min(topK, 5)
  const K = Math.min(effectiveTopK, MAX_CAP);
  const topResults = scoredProducts.slice(0, K);

  // 9. Tính preferredSugar và preferredIce (mode theo quantity)
  const preferredSugar = findSugarMode(userPref.validItems);
  const preferredIce = findIceMode(userPref.validItems);

  // 10. Resolve slot info cho response
  const slot = resolveSlot(effectiveHour);

  return {
    type: "PERSONALIZED_CONTENT_BASED",
    recommendationSource: "CONTENT_BASED",
    slotName: slot.slotName,
    slotKey: slot.slotKey,
    bannerTitle: slot.bannerTitle,
    currentHour: effectiveHour,
    timezone: TIMEZONE,
    customerEmail: email,
    preferredSugar,
    preferredIce,
    recommendations: topResults
  };
}

module.exports = {
  PRODUCT_VECTORS,
  NORMALIZED_PRODUCT_VECTORS,
  normalizeProductName,
  getProductVector,
  validateProductVectorMapping,
  SUGAR_MAP,
  ICE_MAP,
  SIMILARITY_THRESHOLD,
  MAX_CAP,
  parseSugar,
  parseIce,
  cosineSimilarity,
  buildUserPreferenceVector,
  applyTimeModulation,
  getTimeModulationParams,
  findSugarMode,
  findIceMode,
  getContentBasedRecommendations
};
