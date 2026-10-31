/**
 * Unit & Integration Tests for 4 Graduation Thesis Recommendation Strategies:
 * - PP1: Global Popularity (Baseline)
 * - PP2: Time-Slot Popularity (Current Tier 1)
 * - PP3: Pure Content-Based (No Time Modulation)
 * - PP4: Context-Aware Content-Based (Current Tier 2)
 * - Compare Endpoint: Side-by-side comparison of PP1..PP4
 *
 * Chạy: node --test tests/recommendation-thesis-strategies.test.js
 */

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const User = require('../src/models/User');

const {
  getGlobalPopularityRecommendations,
  getPP1Recommendations,
  getTimeSlotPopularRecommendations,
  getPP2Recommendations
} = require('../src/services/recommendationService');

const {
  getPureContentBasedRecommendations,
  getPP3Recommendations,
  getContextAwareContentBasedRecommendations,
  getPP4Recommendations,
  getContentBasedRecommendations
} = require('../src/services/contentBasedService');

const {
  getRecommendations,
  getRecommendationPP1,
  getRecommendationPP2,
  getRecommendationPP3,
  getRecommendationPP4,
  compareRecommendations
} = require('../src/controllers/recommendationController');

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
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 1: PP1 (GLOBAL POPULARITY - BASELINE)
// ════════════════════════════════════════════════════════════════════════

test('PP1-1: PP1 aggregation pipeline verifies status="Hoàn thành", unwinds items, and groups by items.name', async () => {
  let capturedPipeline = null;
  Order.aggregate = async (pipeline) => {
    capturedPipeline = pipeline;
    return [
      {
        _id: 'Cà phê đen',
        totalSold: 120,
        productId: 'prod1',
        product: { _id: 'prod1', name: 'Cà phê đen', price: 25000, image: 'cafe-den.jpg' },
        categoryDoc: { name: 'Cà phê' }
      },
      {
        _id: 'Trà đào',
        totalSold: 95,
        productId: 'prod2',
        product: { _id: 'prod2', name: 'Trà đào', price: 35000, image: 'tra-dao.jpg' },
        categoryDoc: { name: 'Trà' }
      }
    ];
  };

  const res = await getGlobalPopularityRecommendations({ topK: 5 });

  assert.equal(res.strategy, 'PP1');
  assert.equal(res.type, 'GLOBAL_POPULARITY');
  assert.equal(res.recommendations.length, 2);
  assert.equal(res.recommendations[0].name, 'Cà phê đen');
  assert.equal(res.recommendations[0].totalSold, 120);
  assert.equal(res.recommendations[0].rank, 1);
  assert.equal(res.recommendations[1].name, 'Trà đào');
  assert.equal(res.recommendations[1].totalSold, 95);
  assert.equal(res.recommendations[1].rank, 2);

  // Pipeline stage checks
  assert.ok(capturedPipeline, 'Pipeline must be passed to Order.aggregate');
  const matchStage = capturedPipeline.find(s => s.$match && s.$match.status === 'Hoàn thành');
  assert.ok(matchStage, 'Must match completed orders');
  assert.ok(capturedPipeline.find(s => s.$unwind === '$items'), 'Must unwind items');
  const groupStage = capturedPipeline.find(s => s.$group && s.$group._id === '$items.name');
  assert.ok(groupStage, 'Must group by $items.name');
  assert.deepEqual(groupStage.$group.totalSold, { $sum: '$items.quantity' });
});

test('PP1-2: PP1 alias getPP1Recommendations works identically', async () => {
  Order.aggregate = async () => [];
  const res = await getPP1Recommendations();
  assert.equal(res.strategy, 'PP1');
  assert.equal(res.recommendations.length, 0);
  assert.ok(res.message);
});

test('PP1-3: PP1 validates topK parameter (1 to 20)', async () => {
  const invalidTopKs = [0, 21, -1, 'foo', '2.5'];
  for (const invalid of invalidTopKs) {
    await assert.rejects(
      async () => getGlobalPopularityRecommendations({ topK: invalid }),
      err => err.statusCode === 400 && err.message.includes('Invalid topK parameter')
    );
  }
});

// ════════════════════════════════════════════════════════════════════════
// SECTION 2: PP2 (TIME-SLOT POPULARITY - CURRENT TIER 1)
// ════════════════════════════════════════════════════════════════════════

test('PP2-1: PP2 returns strategy="PP2" and keeps existing slot resolution', async () => {
  Order.aggregate = async () => [
    {
      _id: 'prod10',
      totalSoldInSlot: 30,
      product: { name: 'Cà phê sữa', price: 30000, image: 'cafe-sua.jpg' },
      categoryDoc: { name: 'Cà phê' }
    }
  ];

  const res = await getPP2Recommendations({ hour: 8, topK: 3 });
  assert.equal(res.strategy, 'PP2');
  assert.equal(res.recommendationSource, 'TIME_SLOT_POPULARITY');
  assert.equal(res.slotKey, 'morning');
  assert.equal(res.recommendations.length, 1);
  assert.equal(res.recommendations[0].name, 'Cà phê sữa');
});

// ════════════════════════════════════════════════════════════════════════
// SECTION 3: PP3 vs PP4 (PURE VS CONTEXT-AWARE CONTENT-BASED)
// ════════════════════════════════════════════════════════════════════════

test('PP3-1: PP3 requires a valid email and rejects Guest/empty email', async () => {
  await assert.rejects(
    async () => getPureContentBasedRecommendations({ email: '' }),
    err => err.statusCode === 400
  );
  await assert.rejects(
    async () => getPureContentBasedRecommendations({ email: 'Guest' }),
    err => err.statusCode === 400
  );
});

test('PP3-2 vs PP4-1: PP3 explicitly ignores time modulation, while PP4 applies it at night (21:00)', async () => {
  // Setup user with 100% coffee history (caffeine = 1.0, sweetness = 0.1, coldness = 0.7)
  const coffeeProduct = {
    _id: '661b369d1234567890abcdef',
    name: 'Cà phê đen',
    price: 25000,
    category: { name: 'Cà phê' }
  };
  const smoothieProduct = {
    _id: '661b369d1234567890fedcba',
    name: 'Sinh tố xoài',
    price: 45000,
    category: { name: 'Sinh tố' }
  };

  Order.find = () => ({
    lean: async () => [
      {
        customerEmail: 'coffee_lover@example.com',
        status: 'Hoàn thành',
        items: [
          {
            id_product: coffeeProduct._id,
            name: coffeeProduct.name,
            quantity: 5,
            options: { sugar: '0%', ice: '100%' }
          }
        ]
      }
    ]
  });

  Product.find = () => ({
    populate: () => ({
      lean: async () => [coffeeProduct, smoothieProduct]
    })
  });

  // At hour 21 (Evening / night):
  // PP3 (Pure Content-Based) -> Caffeine remains 1.0. Cà phê đen has top similarity!
  const pp3Res = await getPureContentBasedRecommendations({
    email: 'coffee_lover@example.com',
    hour: 21
  });

  assert.equal(pp3Res.strategy, 'PP3');
  assert.equal(pp3Res.timeModulationApplied, false);
  assert.ok(pp3Res.recommendations.length > 0);
  assert.equal(pp3Res.recommendations[0].name, 'Cà phê đen', 'PP3 must keep Cà phê đen top ranked even at night');

  // PP4 (Context-Aware Content-Based) -> Caffeine is modulated by alpha = 0.2 at night!
  // Caffeine preference drops from 1.0 to 0.2!
  const pp4Res = await getContextAwareContentBasedRecommendations({
    email: 'coffee_lover@example.com',
    hour: 21
  });

  assert.equal(pp4Res.strategy, 'PP4');
  assert.equal(pp4Res.timeModulationApplied, true);
  assert.equal(pp4Res.userPreferenceVector.raw.caffeine, 1.0);
  assert.equal(pp4Res.userPreferenceVector.effective.caffeine, 0.2, 'PP4 must modulate caffeine to 0.2 at 21:00');
});

test('PP3-3: PP3 returns Cold-start empty result if customer has no completed orders', async () => {
  Order.find = () => ({
    lean: async () => []
  });

  const res = await getPureContentBasedRecommendations({
    email: 'new_customer@example.com',
    hour: 10
  });

  assert.equal(res.strategy, 'PP3');
  assert.equal(res.recommendations.length, 0);
  assert.ok(res.message.includes('Cold-start'));
});

// ════════════════════════════════════════════════════════════════════════
// SECTION 4: CONTROLLER ENDPOINTS (PP1, PP2, PP3, PP4, COMPARE)
// ════════════════════════════════════════════════════════════════════════

test('CTRL-1: getRecommendationPP1 returns HTTP 200 with PP1 data', async () => {
  Order.aggregate = async () => [
    {
      _id: 'Cà phê đen',
      totalSold: 50,
      productId: 'p1',
      product: { _id: 'p1', name: 'Cà phê đen', price: 25000 },
      categoryDoc: { name: 'Cà phê' }
    }
  ];

  const req = { query: { topK: 5 } };
  const res = createMockResponse();

  await getRecommendationPP1(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.strategy, 'PP1');
  assert.equal(res.body.recommendations.length, 1);
});

test('CTRL-2: getRecommendationPP2 returns HTTP 200 with PP2 data', async () => {
  Order.aggregate = async () => [];
  const req = { query: { hour: 9, topK: 3 } };
  const res = createMockResponse();

  await getRecommendationPP2(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.strategy, 'PP2');
  assert.equal(res.body.slotKey, 'morning');
});

test('CTRL-3: getRecommendationPP3 returns HTTP 400 when email is omitted', async () => {
  const req = { query: {} };
  const res = createMockResponse();

  await getRecommendationPP3(req, res);

  assert.equal(res.statusCode, 400);
  assert.ok(res.body.message.includes('Email'));
});

test('CTRL-4: getRecommendationPP4 returns HTTP 400 when email is omitted', async () => {
  const req = { query: {} };
  const res = createMockResponse();

  await getRecommendationPP4(req, res);

  assert.equal(res.statusCode, 400);
  assert.ok(res.body.message.includes('Email'));
});

test('CTRL-5: compareRecommendations returns all 4 strategies concurrently', async () => {
  Order.aggregate = async () => [];
  Order.find = () => ({ lean: async () => [] });

  const req = { query: { email: 'test@example.com', hour: 14, topK: 5 } };
  const res = createMockResponse();

  await compareRecommendations(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.body.strategies);
  assert.equal(res.body.strategies.PP1.strategy, 'PP1');
  assert.equal(res.body.strategies.PP2.strategy, 'PP2');
  assert.equal(res.body.strategies.PP3.strategy, 'PP3');
  assert.equal(res.body.strategies.PP4.strategy, 'PP4');
  assert.equal(res.body.parameters.customerEmail, 'test@example.com');
  assert.equal(res.body.parameters.hour, 14);
});

test('CTRL-6: getRecommendations supports ?strategy query parameter', async () => {
  Order.aggregate = async () => [];

  // strategy=pp1
  const req1 = { query: { strategy: 'pp1' } };
  const res1 = createMockResponse();
  await getRecommendations(req1, res1);
  assert.equal(res1.statusCode, 200);
  assert.equal(res1.body.strategy, 'PP1');

  // strategy=pp2
  const req2 = { query: { strategy: 'pp2', hour: 10 } };
  const res2 = createMockResponse();
  await getRecommendations(req2, res2);
  assert.equal(res2.statusCode, 200);
  assert.equal(res2.body.strategy, 'PP2');

  // strategy=compare
  const reqCompare = { query: { strategy: 'compare', hour: 10 } };
  const resCompare = createMockResponse();
  await getRecommendations(reqCompare, resCompare);
  assert.equal(resCompare.statusCode, 200);
  assert.ok(resCompare.body.strategies);

  // Invalid strategy returns 400
  const reqInvalid = { query: { strategy: 'unknown_strategy' } };
  const resInvalid = createMockResponse();
  await getRecommendations(reqInvalid, resInvalid);
  assert.equal(resInvalid.statusCode, 400);
  assert.ok(resInvalid.body.message.includes('Invalid strategy'));
});

