const Order = require('../models/Order');
require('../models/Product');
require('../models/Category');

const TIMEZONE = 'Asia/Ho_Chi_Minh';

const CATEGORY_TIME_WEIGHTS = {
  morning: {
    "Cà phê": 0.75,
    "Trà": 0.10,
    "Nước ép": 0.10,
    "Sinh tố": 0.05
  },
  afternoon: {
    "Trà": 0.55,
    "Nước ép": 0.25,
    "Sinh tố": 0.15,
    "Cà phê": 0.05
  },
  evening: {
    "Sinh tố": 0.47,
    "Nước ép": 0.30,
    "Trà": 0.20,
    "Cà phê": 0.03
  },
  late_night: {
    "Sinh tố": 0.45,
    "Nước ép": 0.30,
    "Trà": 0.24,
    "Cà phê": 0.01
  }
};

const SLOT_CONFIG = {
  morning: {
    hours: [7, 8, 9, 10, 11],
    slotName: "Morning",
    bannerTitle: "Morning Recommendations",
    reason: "Most ordered during morning hours"
  },
  afternoon: {
    hours: [12, 13, 14, 15, 16, 17],
    slotName: "Afternoon",
    bannerTitle: "Afternoon Refreshments",
    reason: "Top trending refreshing choice this afternoon"
  },
  evening: {
    hours: [18, 19, 20, 21, 22],
    slotName: "Evening",
    bannerTitle: "Evening Selections",
    reason: "Popular caffeine-free selection for the evening"
  },
  late_night: {
    hours: [23, 0, 1, 2, 3, 4, 5, 6],
    slotName: "Late Night",
    bannerTitle: "Late Night Selections",
    reason: "Light and refreshing choice for late night"
  }
};

/**
 * Get current hour in Vietnam timezone (0-23)
 */
function getCurrentHourVietnam(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    hourCycle: 'h23'
  });
  return parseInt(formatter.format(date), 10);
}

/**
 * Map an hour (0-23) to corresponding slot configuration
 */
function resolveSlot(hour) {
  if (hour >= 7 && hour <= 11) {
    return { slotKey: 'morning', ...SLOT_CONFIG.morning };
  }
  if (hour >= 12 && hour <= 17) {
    return { slotKey: 'afternoon', ...SLOT_CONFIG.afternoon };
  }
  if (hour >= 18 && hour <= 22) {
    return { slotKey: 'evening', ...SLOT_CONFIG.evening };
  }
  return { slotKey: 'late_night', ...SLOT_CONFIG.late_night };
}

/**
 * Execute Layer 1 Time-slot Popularity Recommendation
 * @param {Object} params
 * @param {string} [params.email='Guest']
 * @param {number|string} [params.hour]
 * @param {number|string} [params.topK=3]
 */
async function getTimeSlotPopularRecommendations({ email, hour, topK = 3 } = {}) {
  // 1. Validate and resolve hour
  let effectiveHour;
  if (hour !== undefined && hour !== null && hour !== '') {
    const parsedHour = Number(hour);
    if (!Number.isInteger(parsedHour) || parsedHour < 0 || parsedHour > 23 || String(hour).trim() !== String(parsedHour)) {
      const err = new Error('Invalid hour parameter. Must be an integer between 0 and 23.');
      err.statusCode = 400;
      throw err;
    }
    effectiveHour = parsedHour;
  } else {
    effectiveHour = getCurrentHourVietnam();
  }

  // 2. Validate and resolve topK
  let effectiveTopK = 3;
  if (topK !== undefined && topK !== null && topK !== '') {
    const parsedTopK = Number(topK);
    if (!Number.isInteger(parsedTopK) || parsedTopK < 1 || parsedTopK > 10 || String(topK).trim() !== String(parsedTopK)) {
      const err = new Error('Invalid topK parameter. Must be an integer between 1 and 10.');
      err.statusCode = 400;
      throw err;
    }
    effectiveTopK = parsedTopK;
  }

  // 3. Resolve slot details
  const slot = resolveSlot(effectiveHour);
  const weights = CATEGORY_TIME_WEIGHTS[slot.slotKey] || {};
  const allowedCategories = Object.keys(weights);

  // 4. Aggregation pipeline
  const pipeline = [
    {
      $match: {
        status: "Hoàn thành",
        $expr: {
          $in: [
            {
              $hour: {
                date: "$createdAt",
                timezone: TIMEZONE
              }
            },
            slot.hours
          ]
        }
      }
    },
    { $unwind: "$items" },
    {
      $match: {
        "items.id_product": { $exists: true, $ne: null },
        "items.quantity": { $gt: 0 }
      }
    },
    {
      $group: {
        _id: "$items.id_product",
        totalSoldInSlot: { $sum: "$items.quantity" }
      }
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },
    {
      $lookup: {
        from: "categories",
        localField: "product.category",
        foreignField: "_id",
        as: "categoryDoc"
      }
    },
    { $unwind: "$categoryDoc" },
    {
      $match: {
        "categoryDoc.name": { $in: allowedCategories }
      }
    }
  ];

  const aggregateResults = await Order.aggregate(pipeline);

  // 5. Rank candidates deterministically:
  //    1) totalSoldInSlot DESC
  //    2) category priority weight DESC
  //    3) product name ASC
  //    4) productId ASC
  const ranked = aggregateResults.map(item => {
    const categoryName = item.categoryDoc.name;
    const categoryWeight = weights[categoryName] !== undefined ? weights[categoryName] : 0;
    return {
      productId: item._id.toString(),
      name: item.product.name,
      category: categoryName,
      price: item.product.price,
      image: (item.product.image && typeof item.product.image === 'string' && item.product.image.trim() !== '') ? item.product.image : null,
      totalSoldInSlot: item.totalSoldInSlot,
      categoryWeight,
      badge: "Top Seller",
      reason: slot.reason
    };
  }).sort((a, b) => {
    if (b.totalSoldInSlot !== a.totalSoldInSlot) {
      return b.totalSoldInSlot - a.totalSoldInSlot;
    }
    if (b.categoryWeight !== a.categoryWeight) {
      return b.categoryWeight - a.categoryWeight;
    }
    const nameDiff = a.name.localeCompare(b.name);
    if (nameDiff !== 0) {
      return nameDiff;
    }
    return a.productId.localeCompare(b.productId);
  }).slice(0, effectiveTopK);

  const customerEmail = (email && typeof email === 'string' && email.trim() !== '') ? email.trim() : 'Guest';

  const response = {
    type: "CONTEXT_POPULAR",
    recommendationSource: "TIME_SLOT_POPULARITY",
    slotName: slot.slotName,
    slotKey: slot.slotKey,
    bannerTitle: slot.bannerTitle,
    currentHour: effectiveHour,
    timezone: TIMEZONE,
    customerEmail,
    preferredSugar: "100%",
    preferredIce: "100%",
    recommendations: ranked
  };

  if (ranked.length === 0) {
    response.message = "No completed-order data is available for this time slot.";
  }

  return response;
}

module.exports = {
  TIMEZONE,
  CATEGORY_TIME_WEIGHTS,
  SLOT_CONFIG,
  getCurrentHourVietnam,
  resolveSlot,
  getTimeSlotPopularRecommendations
};
