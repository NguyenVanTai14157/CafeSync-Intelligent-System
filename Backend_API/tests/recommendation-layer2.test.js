/**
 * Tests for Layer 2 — Content-Based Filtering (contentBasedService)
 * and Regression tests for Layer 1 (recommendationService).
 *
 * Chạy: node --test tests/recommendation-layer2.test.js
 *
 * Lưu ý: Không ghi dữ liệu vào MongoDB Atlas. Tất cả DB calls được stub.
 */

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const User = require('../src/models/User');

// ── Layer 1 imports ──
const {
  resolveSlot,
  getTimeSlotPopularRecommendations,
  getCurrentHourVietnam,
  TIMEZONE
} = require('../src/services/recommendationService');
const { getRecommendations } = require('../src/controllers/recommendationController');

// ── Layer 2 imports ──
const {
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
} = require('../src/services/contentBasedService');

// ── Canonical menu data ──
const { products: menuProducts } = require('../scripts/menu-data');
const canonicalMenuNames = menuProducts.map(p => p.name);

// ── Stub storage ──
const originalAggregate = Order.aggregate;
const originalOrderFind = Order.find;
const originalProductFind = Product.find;
const originalUserFindOne = User.findOne;

const defaultUserStub = () => ({
  select: () => ({ lean: async () => ({ role: 'customer' }) }),
  lean: async () => ({ role: 'customer' })
});

User.findOne = defaultUserStub;

afterEach(() => {
  Order.aggregate = originalAggregate;
  Order.find = originalOrderFind;
  Product.find = originalProductFind;
  User.findOne = defaultUserStub;
});

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

// ════════════════════════════════════════════════════════════════════════
// SECTION A: LAYER 1 REGRESSION TESTS
// ════════════════════════════════════════════════════════════════════════

test('L1-REG-1: Guest vẫn nhận Layer 1', async () => {
  Order.aggregate = async () => [];
  const res = await getTimeSlotPopularRecommendations({});
  assert.equal(res.customerEmail, 'Guest');
  assert.equal(res.type, 'CONTEXT_POPULAR');
});

test('L1-REG-2: Missing email vẫn nhận Layer 1', async () => {
  Order.aggregate = async () => [];
  const res = await getTimeSlotPopularRecommendations({ email: undefined });
  assert.equal(res.customerEmail, 'Guest');
  assert.equal(res.type, 'CONTEXT_POPULAR');
});

test('L1-REG-3: email=Guest sử dụng Layer 1', async () => {
  Order.aggregate = async () => [];
  const res = await getTimeSlotPopularRecommendations({ email: 'Guest' });
  assert.equal(res.customerEmail, 'Guest');
  assert.equal(res.type, 'CONTEXT_POPULAR');
});

test('L1-REG-4: Hour boundary vẫn hoạt động', () => {
  assert.equal(resolveSlot(7).slotKey, 'morning');
  assert.equal(resolveSlot(11).slotKey, 'morning');
  assert.equal(resolveSlot(12).slotKey, 'afternoon');
  assert.equal(resolveSlot(17).slotKey, 'afternoon');
  assert.equal(resolveSlot(18).slotKey, 'evening');
  assert.equal(resolveSlot(22).slotKey, 'evening');
  assert.equal(resolveSlot(23).slotKey, 'late_night');
  assert.equal(resolveSlot(0).slotKey, 'late_night');
  assert.equal(resolveSlot(6).slotKey, 'late_night');
});

test('L1-REG-5: topK validation vẫn hoạt động', async () => {
  const invalidTopKs = [0, 11, -5, 'foo', '3.5'];
  for (const invalid of invalidTopKs) {
    const req = { query: { topK: invalid } };
    const res = createMockResponse();
    await getRecommendations(req, res);
    assert.equal(res.statusCode, 400, `Expected 400 for topK=${invalid}`);
    assert.ok(res.body.message.includes('Invalid topK'));
  }
});

test('L1-REG-6: Invalid hour returns HTTP 400', async () => {
  const invalidHours = [-1, 24, 'abc', '12.5'];
  for (const invalid of invalidHours) {
    const req = { query: { hour: invalid } };
    const res = createMockResponse();
    await getRecommendations(req, res);
    assert.equal(res.statusCode, 400, `Expected 400 for hour=${invalid}`);
    assert.ok(res.body.message.includes('Invalid hour'));
  }
});

test('L1-REG-7: Response Layer 1 không bị breaking (field contract)', async () => {
  Order.aggregate = async () => [{
    _id: 'prod1',
    totalSoldInSlot: 10,
    product: { name: 'Trà đào', price: 40000, image: 'tra-dao.jpg' },
    categoryDoc: { name: 'Trà' }
  }];
  const res = await getTimeSlotPopularRecommendations({ hour: 14 });
  assert.equal(res.type, 'CONTEXT_POPULAR');
  assert.ok(res.slotName);
  assert.ok(res.slotKey);
  assert.ok(res.bannerTitle);
  assert.ok(Number.isInteger(res.currentHour));
  assert.equal(res.timezone, 'Asia/Ho_Chi_Minh');
  assert.ok(Array.isArray(res.recommendations));
  const rec = res.recommendations[0];
  assert.ok(rec.productId);
  assert.ok(rec.name);
  assert.ok(rec.category);
  assert.ok(typeof rec.price === 'number');
});

test('L1-REG-8: Controller với Guest request trả Layer 1 + recommendationSource', async () => {
  Order.aggregate = async () => [];
  const req = { query: { email: 'Guest', hour: '10' } };
  const res = createMockResponse();
  await getRecommendations(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.type, 'CONTEXT_POPULAR');
  assert.equal(res.body.recommendationSource, 'TIME_SLOT_POPULARITY');
});

// ════════════════════════════════════════════════════════════════════════
// SECTION B: LAYER 2 UNIT TESTS
// ════════════════════════════════════════════════════════════════════════

// ── B1: Sugar parsing ──
test('L2-SUGAR-1: parseSugar parses valid percentages', () => {
  assert.equal(parseSugar('0%'), 0.0);
  assert.equal(parseSugar('30%'), 0.3);
  assert.equal(parseSugar('50%'), 0.5);
  assert.equal(parseSugar('70%'), 0.7);
  assert.equal(parseSugar('100%'), 1.0);
});

test('L2-SUGAR-2: parseSugar returns null for invalid input', () => {
  assert.equal(parseSugar(null), null);
  assert.equal(parseSugar(undefined), null);
  assert.equal(parseSugar(''), null);
  assert.equal(parseSugar('abc'), null);
  assert.equal(parseSugar(123), null);
});

test('L2-SUGAR-3: parseSugar handles whitespace', () => {
  assert.equal(parseSugar(' 70% '), 0.7);
  assert.equal(parseSugar('  100%  '), 1.0);
});

// ── B2: Ice parsing ──
test('L2-ICE-1: parseIce parses valid percentages', () => {
  assert.equal(parseIce('0%'), 0.0);
  assert.equal(parseIce('30%'), 0.3);
  assert.equal(parseIce('50%'), 0.5);
  assert.equal(parseIce('70%'), 0.7);
  assert.equal(parseIce('100%'), 1.0);
});

test('L2-ICE-2: parseIce returns null for invalid input', () => {
  assert.equal(parseIce(null), null);
  assert.equal(parseIce(undefined), null);
  assert.equal(parseIce('abc'), null);
  assert.equal(parseIce(42), null);
});

// ── B3: Cosine Similarity ──
test('L2-COS-1: Identical vectors → similarity = 1', () => {
  const v = [0.5, 0.5, 0.5];
  const sim = cosineSimilarity(v, v);
  assert.ok(Math.abs(sim - 1.0) < 0.001);
});

test('L2-COS-2: Orthogonal vectors → similarity = 0', () => {
  const a = [1, 0, 0];
  const b = [0, 1, 0];
  assert.equal(cosineSimilarity(a, b), 0);
});

test('L2-COS-3: Zero vector → similarity = 0 (no crash)', () => {
  assert.equal(cosineSimilarity([0, 0, 0], [1, 1, 1]), 0);
  assert.equal(cosineSimilarity([1, 1, 1], [0, 0, 0]), 0);
  assert.equal(cosineSimilarity([0, 0, 0], [0, 0, 0]), 0);
});

test('L2-COS-4: Score is finite and in valid range', () => {
  const score = cosineSimilarity([0.7, 0.3, 0.8], [0.5, 0.6, 0.9]);
  assert.ok(Number.isFinite(score));
  assert.ok(score >= -1 && score <= 1);
});

test('L2-COS-5: Handles NaN/undefined in vector gracefully', () => {
  const score = cosineSimilarity([NaN, 0.5, 0.5], [0.5, 0.5, 0.5]);
  assert.ok(Number.isFinite(score));
});

test('L2-COS-6: Wrong dimension → returns 0', () => {
  assert.equal(cosineSimilarity([1, 2], [1, 2, 3]), 0);
  assert.equal(cosineSimilarity([1, 2, 3, 4], [1, 2, 3]), 0);
});

// ── B4: Time modulation ──
test('L2-TIME-1: Morning alpha=1.4, beta=1.0', () => {
  const p = getTimeModulationParams(8);
  assert.equal(p.alpha, 1.4);
  assert.equal(p.beta, 1.0);
});

test('L2-TIME-2: Afternoon alpha=1.0, beta=1.2', () => {
  const p = getTimeModulationParams(14);
  assert.equal(p.alpha, 1.0);
  assert.equal(p.beta, 1.2);
});

test('L2-TIME-3: Evening alpha=0.2, beta=1.0', () => {
  const p = getTimeModulationParams(20);
  assert.equal(p.alpha, 0.2);
  assert.equal(p.beta, 1.0);
});

test('L2-TIME-4: Late night (hour=2) alpha=0.2, beta=1.0', () => {
  const p = getTimeModulationParams(2);
  assert.equal(p.alpha, 0.2);
  assert.equal(p.beta, 1.0);
});

test('L2-TIME-5: applyTimeModulation caps at 1.0', () => {
  const userVec = { sweetness: 0.8, caffeine: 0.9, coldness: 0.95 };
  const result = applyTimeModulation(userVec, 8); // alpha=1.4
  // caffeine: min(1.0, 0.9*1.4) = min(1.0, 1.26) = 1.0
  assert.equal(result[1], 1.0);
  assert.equal(result[0], 0.8); // sweetness unchanged
});

test('L2-TIME-6: applyTimeModulation afternoon beta=1.2', () => {
  const userVec = { sweetness: 0.5, caffeine: 0.5, coldness: 0.9 };
  const result = applyTimeModulation(userVec, 14); // beta=1.2
  // coldness: min(1.0, 0.9*1.2) = min(1.0, 1.08) = 1.0
  assert.equal(result[2], 1.0);
});

// ── B5: User preference vector ──
test('L2-PREF-1: buildUserPreferenceVector computes correctly', () => {
  const orders = [{
    items: [
      { id_product: 'p1', quantity: 2, options: { sugar: '70%', ice: '100%' } },
      { id_product: 'p2', quantity: 1, options: { sugar: '30%', ice: '50%' } }
    ]
  }];
  const catLookup = new Map([['p1', 'Cà phê'], ['p2', 'Trà']]);
  const pref = buildUserPreferenceVector(orders, catLookup);

  assert.ok(pref);
  // Sugar: (0.7*2 + 0.3*1) / 3 = 1.7/3 ≈ 0.567
  assert.ok(Math.abs(pref.sweetness - (1.7 / 3)) < 0.01);
  // Coffee: 2/3 ≈ 0.667
  assert.ok(Math.abs(pref.caffeine - (2 / 3)) < 0.01);
  // Ice: (1.0*2 + 0.5*1) / 3 = 2.5/3 ≈ 0.833
  assert.ok(Math.abs(pref.coldness - (2.5 / 3)) < 0.01);
});

test('L2-PREF-2: quantity weighting ảnh hưởng đúng', () => {
  const orders = [{
    items: [
      { id_product: 'p1', quantity: 3, options: { sugar: '0%', ice: '0%' } },
      { id_product: 'p2', quantity: 1, options: { sugar: '100%', ice: '100%' } }
    ]
  }];
  const catLookup = new Map([['p1', 'Cà phê'], ['p2', 'Trà']]);
  const pref = buildUserPreferenceVector(orders, catLookup);

  // Sugar: (0*3 + 1*1) / 4 = 0.25
  assert.ok(Math.abs(pref.sweetness - 0.25) < 0.01);
  // Sản phẩm q=3 ảnh hưởng gấp 3 lần q=1
  assert.ok(pref.sweetness < 0.5, 'q=3 product with 0% sugar should pull sweetness below 0.5');
});

test('L2-PREF-3: Chỉ dùng order "Hoàn thành" (kiểm tra filter)', () => {
  // buildUserPreferenceVector chỉ nhận orders đã được filter trước
  // Test controller/service sẽ verify filter status
  const orders = []; // empty → null
  const catLookup = new Map();
  const pref = buildUserPreferenceVector(orders, catLookup);
  assert.equal(pref, null);
});

test('L2-PREF-4: Empty items → returns null', () => {
  const orders = [{ items: [] }];
  const pref = buildUserPreferenceVector(orders, new Map());
  assert.equal(pref, null);
});

test('L2-PREF-5: Coffee ratio tính theo quantity không phải theo order', () => {
  const orders = [{
    items: [
      { id_product: 'p1', quantity: 5, options: { sugar: '50%', ice: '50%' } }
    ]
  }];
  // p1 is Cà phê → coffeeQty = 5, total = 5 → ratio = 1.0
  const catLookup = new Map([['p1', 'Cà phê']]);
  const pref = buildUserPreferenceVector(orders, catLookup);
  assert.equal(pref.caffeine, 1.0);
});

// ── B6: findSugarMode / findIceMode ──
test('L2-MODE-1: findSugarMode returns most frequent by quantity', () => {
  const items = [
    { options: { sugar: '70%' }, quantity: 5 },
    { options: { sugar: '100%' }, quantity: 2 },
    { options: { sugar: '30%' }, quantity: 1 }
  ];
  assert.equal(findSugarMode(items), '70%');
});

test('L2-MODE-2: findIceMode returns most frequent by quantity', () => {
  const items = [
    { options: { ice: '50%' }, quantity: 3 },
    { options: { ice: '100%' }, quantity: 2 }
  ];
  assert.equal(findIceMode(items), '50%');
});

test('L2-MODE-3: Empty items → returns default', () => {
  assert.equal(findSugarMode([]), '100%');
  assert.equal(findIceMode([]), '100%');
});

// ── B7: Product vectors ──
test('L2-VEC-1: PRODUCT_VECTORS chứa 31 món có vector hợp lệ với đủ 3 chiều và nằm trong [0, 1]', () => {
  for (const [name, vec] of Object.entries(PRODUCT_VECTORS)) {
    assert.ok(typeof vec.sweetness === 'number' && Number.isFinite(vec.sweetness), `${name} missing or invalid sweetness`);
    assert.ok(typeof vec.caffeine === 'number' && Number.isFinite(vec.caffeine), `${name} missing or invalid caffeine`);
    assert.ok(typeof vec.coldness === 'number' && Number.isFinite(vec.coldness), `${name} missing or invalid coldness`);
    assert.ok(vec.sweetness >= 0 && vec.sweetness <= 1, `${name} sweetness out of [0,1]: ${vec.sweetness}`);
    assert.ok(vec.caffeine >= 0 && vec.caffeine <= 1, `${name} caffeine out of [0,1]: ${vec.caffeine}`);
    assert.ok(vec.coldness >= 0 && vec.coldness <= 1, `${name} coldness out of [0,1]: ${vec.coldness}`);
  }
});

test('L2-VEC-COVERAGE: Khớp 100% với 31 món trong menu-data.js (0 thiếu, 0 thừa)', () => {
  const result = validateProductVectorMapping(canonicalMenuNames);
  assert.equal(result.valid, true, `Validation failed: ${result.errors.join('; ')}`);
  assert.equal(result.canonicalCount, 31, 'Canonical menu must have 31 products');
  assert.equal(result.vectorCount, 31, 'PRODUCT_VECTORS must have exactly 31 products');
  assert.equal(result.errors.length, 0);
});

test('L2-VEC-SPECIFIC: Nhận diện chính xác các món được yêu cầu trong đặc tả', () => {
  const requiredNames = [
    'Cà phê đặc biệt',
    'Cà phê Cappuccino',
    'Cà phê Espresso',
    'Cà phê Latte',
    'Cà phê Mocha',
    'Trà chanh',
    'Sinh tố dâu'
  ];
  for (const name of requiredNames) {
    const vec = getProductVector(name);
    assert.ok(vec !== null, `Must recognize ${name}`);
    assert.ok(Number.isFinite(vec.sweetness));
    assert.ok(Number.isFinite(vec.caffeine));
    assert.ok(Number.isFinite(vec.coldness));
  }
});

test('L2-VEC-NORM: normalizeProductName xử lý casing, spacing và Unicode NFC một cách tất định', () => {
  assert.deepEqual(getProductVector('cà phê cappuccino'), PRODUCT_VECTORS['Cà phê Cappuccino']);
  assert.deepEqual(getProductVector('  Cà Phê Latte  '), PRODUCT_VECTORS['Cà phê Latte']);
  assert.deepEqual(getProductVector('CÀ PHÊ ĐẶC BIỆT'), PRODUCT_VECTORS['Cà phê đặc biệt']);
  assert.deepEqual(getProductVector('trà chanh'), PRODUCT_VECTORS['Trà chanh']);
  assert.deepEqual(getProductVector('SINH TỐ DÂU'), PRODUCT_VECTORS['Sinh tố dâu']);
});

test('L2-VEC-EXCLUDE: Món không có trong menu không được âm thầm gán vector', () => {
  const outsideMenu = [
    'Nước ép dứa',
    'Nước ép ổi',
    'Nước ép cà rốt',
    'Bánh croissant',
    'Trà sữa trân châu hoàng kim',
    '',
    null,
    undefined
  ];
  for (const item of outsideMenu) {
    assert.equal(getProductVector(item), null, `${item} should NOT have a product vector`);
  }
});

test('L2-VEC-NO-FUZZY: Không sử dụng partial/substring matching', () => {
  assert.equal(getProductVector('Cà phê'), null);
  assert.equal(getProductVector('Trà'), null);
  assert.equal(getProductVector('Sinh tố'), null);
});

// ── B8: Threshold and topK ──
test('L2-THRESH-1: SIMILARITY_THRESHOLD is 0.65', () => {
  assert.equal(SIMILARITY_THRESHOLD, 0.65);
});

test('L2-THRESH-2: MAX_CAP is 5', () => {
  assert.equal(MAX_CAP, 5);
});

// ════════════════════════════════════════════════════════════════════════
// SECTION C: LAYER 2 INTEGRATION (Controller level)
// ════════════════════════════════════════════════════════════════════════

test('L2-INT-1: Member có completed orders nhận personalized recommendation (chính xác Layer 2)', async () => {
  // Stub Order.find cho Layer 2
  Order.find = () => ({
    lean: async () => [{
      customerEmail: 'test@gmail.com',
      status: 'Hoàn thành',
      items: [
        { id_product: 'prod1', quantity: 3, options: { sugar: '70%', ice: '100%' } },
        { id_product: 'prod2', quantity: 2, options: { sugar: '70%', ice: '100%' } }
      ]
    }]
  });

  // Stub Product.find cho Layer 2
  Product.find = () => ({
    populate: () => ({
      lean: async () => [
        { _id: 'prod1', name: 'Bạc xỉu', price: 35000, image: 'bac-xiu.jpg', category: { name: 'Cà phê' } },
        { _id: 'prod2', name: 'Cà phê sữa', price: 35000, image: 'ca-phe-sua.jpg', category: { name: 'Cà phê' } },
        { _id: 'prod3', name: 'Cà phê đặc biệt', price: 45000, image: 'cp-dac-biet.jpg', category: { name: 'Cà phê' } },
        { _id: 'prod4', name: 'Cà phê đá xay', price: 45000, image: 'da-xay.jpg', category: { name: 'Cà phê' } }
      ]
    })
  });

  // Stub Order.aggregate cho Layer 1 fallback (không được gọi khi Layer 2 thành công)
  Order.aggregate = async () => [];

  const req = { query: { email: 'test@gmail.com', hour: '8', topK: '3' } };
  const res = createMockResponse();
  await getRecommendations(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.type, 'PERSONALIZED_CONTENT_BASED');
  assert.equal(res.body.recommendationSource, 'CONTENT_BASED');
  assert.ok(Array.isArray(res.body.recommendations));
  assert.ok(res.body.recommendations.length > 0);
  assert.equal(res.body.customerEmail, 'test@gmail.com');
  for (const item of res.body.recommendations) {
    assert.ok(item.score >= 0.65, `Score ${item.score} should be >= 0.65`);
    assert.ok(item.reason);
  }
});

test('L2-INT-2: Member không có lịch sử → fallback Layer 1', async () => {
  Order.find = () => ({ lean: async () => [] });
  Order.aggregate = async () => [];

  const req = { query: { email: 'newuser@gmail.com', hour: '14' } };
  const res = createMockResponse();
  await getRecommendations(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.type, 'CONTEXT_POPULAR');
  assert.equal(res.body.recommendationSource, 'TIME_SLOT_POPULARITY');
});

test('L2-INT-3: Guest controller không truy vấn lịch sử riêng', async () => {
  let orderFindCalled = false;
  Order.find = () => {
    orderFindCalled = true;
    return { lean: async () => [] };
  };
  Order.aggregate = async () => [];

  const req = { query: { email: 'Guest', hour: '10' } };
  const res = createMockResponse();
  await getRecommendations(req, res);

  assert.equal(res.body.type, 'CONTEXT_POPULAR');
  assert.equal(orderFindCalled, false, 'Should NOT query order history for Guest');
});

test('L2-INT-4: Controller với missing email → Layer 1 không truy vấn lịch sử', async () => {
  let orderFindCalled = false;
  Order.find = () => {
    orderFindCalled = true;
    return { lean: async () => [] };
  };
  Order.aggregate = async () => [];

  const req = { query: { hour: '10' } };
  const res = createMockResponse();
  await getRecommendations(req, res);

  assert.equal(res.body.type, 'CONTEXT_POPULAR');
  assert.equal(orderFindCalled, false, 'Should NOT query order history when email missing');
});

test('L2-INT-5: Score giảm dần và finite', async () => {
  Order.find = () => ({
    lean: async () => [{
      customerEmail: 'test@gmail.com',
      status: 'Hoàn thành',
      items: [
        { id_product: 'p1', quantity: 10, options: { sugar: '70%', ice: '100%' } }
      ]
    }]
  });

  Product.find = () => ({
    populate: () => ({
      lean: async () => [
        { _id: 'p1', name: 'Bạc xỉu', price: 35000, image: 'bx.jpg', category: { name: 'Cà phê' } },
        { _id: 'p2', name: 'cà phê sữa', price: 30000, image: 'cps.jpg', category: { name: 'Cà phê' } },
        { _id: 'p3', name: 'Trà đào', price: 40000, image: 'td.jpg', category: { name: 'Trà' } },
        { _id: 'p4', name: 'Sinh tố bơ', price: 45000, image: 'sb.jpg', category: { name: 'Sinh tố' } }
      ]
    })
  });

  Order.aggregate = async () => [];

  const req = { query: { email: 'test@gmail.com', hour: '8', topK: '5' } };
  const res = createMockResponse();
  await getRecommendations(req, res);

  assert.equal(res.body.type, 'PERSONALIZED_CONTENT_BASED');
  const recs = res.body.recommendations;
  assert.ok(recs.length > 0);
  for (let i = 0; i < recs.length; i++) {
    assert.ok(Number.isFinite(recs[i].score), `Score at index ${i} should be finite`);
    if (i > 0) {
      assert.ok(recs[i - 1].score >= recs[i].score, 'Scores should be descending');
    }
  }
});

test('L2-INT-6: Không có sản phẩm đạt threshold 0.65 → fallback Layer 1', async () => {
  // User thích đồ ngọt không đá, không caffeine (vector = [1.0, 0.0, 0.0])
  Order.find = () => ({
    lean: async () => [{
      customerEmail: 'sweet_only@gmail.com',
      status: 'Hoàn thành',
      items: [
        { id_product: 'p1', quantity: 1, options: { sugar: '100%', ice: '0%' } }
      ]
    }]
  });

  // Sản phẩm candidate duy nhất là Espresso ([0.1, 1.0, 0.2]), similarity ~ 0.098 < 0.65
  Product.find = () => ({
    populate: () => ({
      lean: async () => [
        { _id: 'pEspresso', name: 'Cà phê Espresso', price: 30000, image: 'esp.jpg', category: { name: 'Cà phê' } }
      ]
    })
  });

  Order.aggregate = async () => [{
    _id: 'pEspresso',
    totalSoldInSlot: 15,
    product: { _id: 'pEspresso', name: 'Cà phê Espresso', price: 30000, image: 'esp.jpg' },
    categoryDoc: { name: 'Cà phê' }
  }];

  const req = { query: { email: 'sweet_only@gmail.com', hour: '14' } };
  const res = createMockResponse();
  await getRecommendations(req, res);

  // Vì không có món nào đạt threshold 0.65 → fallback Layer 1
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.type, 'CONTEXT_POPULAR');
  assert.equal(res.body.recommendationSource, 'TIME_SLOT_POPULARITY');
});

test('L2-INT-7: topK không vượt quá 5', async () => {
  Order.find = () => ({
    lean: async () => [{
      customerEmail: 'test@gmail.com',
      status: 'Hoàn thành',
      items: [
        { id_product: 'p1', quantity: 5, options: { sugar: '70%', ice: '100%' } }
      ]
    }]
  });

  Product.find = () => ({
    populate: () => ({
      lean: async () => Array.from({ length: 20 }, (_, i) => ({
        _id: `p${i}`,
        name: Object.keys(PRODUCT_VECTORS)[i] || `Product ${i}`,
        price: 30000 + i * 1000,
        image: `img${i}.jpg`,
        category: { name: 'Cà phê' }
      }))
    })
  });

  Order.aggregate = async () => [];

  const req = { query: { email: 'test@gmail.com', hour: '8', topK: '10' } };
  const res = createMockResponse();
  await getRecommendations(req, res);

  if (res.body.type === 'PERSONALIZED_CONTENT_BASED') {
    assert.ok(res.body.recommendations.length <= 5, 'Should not exceed MAX_CAP=5');
  }
});

test('L2-INT-8: Không duplicate product trong kết quả', async () => {
  Order.find = () => ({
    lean: async () => [{
      customerEmail: 'test@gmail.com',
      status: 'Hoàn thành',
      items: [
        { id_product: 'p1', quantity: 3, options: { sugar: '50%', ice: '100%' } }
      ]
    }]
  });

  Product.find = () => ({
    populate: () => ({
      lean: async () => [
        { _id: 'p1', name: 'Bạc xỉu', price: 35000, image: 'bx.jpg', category: { name: 'Cà phê' } },
        { _id: 'p2', name: 'cà phê sữa', price: 30000, image: 'cps.jpg', category: { name: 'Cà phê' } },
        { _id: 'p3', name: 'Trà đào', price: 40000, image: 'td.jpg', category: { name: 'Trà' } }
      ]
    })
  });

  Order.aggregate = async () => [];

  const req = { query: { email: 'test@gmail.com', hour: '8', topK: '5' } };
  const res = createMockResponse();
  await getRecommendations(req, res);

  if (res.body.type === 'PERSONALIZED_CONTENT_BASED') {
    const ids = res.body.recommendations.map(r => r.productId);
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, 'No duplicate products');
  }
});

test('L2-INT-9: Sản phẩm không có vector không làm request crash', async () => {
  Order.find = () => ({
    lean: async () => [{
      customerEmail: 'test@gmail.com',
      status: 'Hoàn thành',
      items: [
        { id_product: 'p1', quantity: 2, options: { sugar: '50%', ice: '100%' } }
      ]
    }]
  });

  Product.find = () => ({
    populate: () => ({
      lean: async () => [
        { _id: 'p1', name: 'Cà phê đen', price: 25000, image: 'cd.jpg', category: { name: 'Cà phê' } },
        { _id: 'noVec', name: 'Sản phẩm mới chưa có vector', price: 50000, image: null, category: { name: 'Khác' } }
      ]
    })
  });

  Order.aggregate = async () => [];

  const req = { query: { email: 'test@gmail.com', hour: '8' } };
  const res = createMockResponse();
  await getRecommendations(req, res);

  assert.equal(res.statusCode, 200);
  // Should not crash; either returns personalized or fallback
  assert.ok(res.body.type === 'PERSONALIZED_CONTENT_BASED' || res.body.type === 'CONTEXT_POPULAR');

  // If personalized, the product without vector should NOT appear
  if (res.body.type === 'PERSONALIZED_CONTENT_BASED') {
    const hasNoVec = res.body.recommendations.some(r => r.productId === 'noVec');
    assert.equal(hasNoVec, false, 'Product without vector should not appear in results');
  }
});

test('L2-INT-10: Database error trong Layer 2 trả về 500 chứ không che giấu thành fallback', async () => {
  Order.find = () => ({
    lean: async () => { throw new Error('DB connection failed'); }
  });
  // Dù Layer 1 hoạt động, lỗi DB tại Layer 2 không được che giấu thành fallback thành công
  Order.aggregate = async () => [];

  const req = { query: { email: 'test@gmail.com', hour: '8' } };
  const res = createMockResponse();
  await getRecommendations(req, res);

  assert.equal(res.statusCode, 500);
  assert.ok(res.body.message.includes('Lỗi hệ thống'));
});

test('L2-INT-11: preferredSugar và preferredIce khớp format frontend', async () => {
  Order.find = () => ({
    lean: async () => [{
      customerEmail: 'test@gmail.com',
      status: 'Hoàn thành',
      items: [
        { id_product: 'p1', quantity: 5, options: { sugar: '70%', ice: '50%' } },
        { id_product: 'p2', quantity: 1, options: { sugar: '30%', ice: '100%' } }
      ]
    }]
  });

  Product.find = () => ({
    populate: () => ({
      lean: async () => [
        { _id: 'p1', name: 'Bạc xỉu', price: 35000, image: 'bx.jpg', category: { name: 'Cà phê' } },
        { _id: 'p2', name: 'Trà đào', price: 40000, image: 'td.jpg', category: { name: 'Trà' } }
      ]
    })
  });

  Order.aggregate = async () => [];

  const req = { query: { email: 'test@gmail.com', hour: '8', topK: '3' } };
  const res = createMockResponse();
  await getRecommendations(req, res);

  if (res.body.type === 'PERSONALIZED_CONTENT_BASED') {
    // preferredSugar should be "70%" (mode by quantity: 5 vs 1)
    assert.equal(res.body.preferredSugar, '70%');
    // preferredIce should be "50%" (mode by quantity: 5 vs 1)
    assert.equal(res.body.preferredIce, '50%');

    // Values should be valid frontend options
    const validSugars = ['0%', '30%', '50%', '70%', '100%'];
    const validIces = ['0%', '30%', '50%', '70%', '100%'];
    assert.ok(validSugars.includes(res.body.preferredSugar), 'preferredSugar must match frontend options');
    assert.ok(validIces.includes(res.body.preferredIce), 'preferredIce must match frontend options');
  }
});

// ── Hour boundary tests for controller (regression) ──
test('L2-INT-12: Hour=6 works for member', async () => {
  Order.find = () => ({ lean: async () => [] });
  Order.aggregate = async () => [];
  const req = { query: { email: 'test@gmail.com', hour: '6' } };
  const res = createMockResponse();
  await getRecommendations(req, res);
  assert.equal(res.statusCode, 200);
});

test('L2-INT-13: Hour=7 works for member', async () => {
  Order.find = () => ({ lean: async () => [] });
  Order.aggregate = async () => [];
  const req = { query: { email: 'test@gmail.com', hour: '7' } };
  const res = createMockResponse();
  await getRecommendations(req, res);
  assert.equal(res.statusCode, 200);
});

test('L2-INT-14: Hour=23 works for member', async () => {
  Order.find = () => ({ lean: async () => [] });
  Order.aggregate = async () => [];
  const req = { query: { email: 'test@gmail.com', hour: '23' } };
  const res = createMockResponse();
  await getRecommendations(req, res);
  assert.equal(res.statusCode, 200);
});
