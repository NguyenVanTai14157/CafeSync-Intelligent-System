const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Order = require('../src/models/Order');
const {
  resolveSlot,
  getTimeSlotPopularRecommendations,
  getCurrentHourVietnam,
  TIMEZONE
} = require('../src/services/recommendationService');
const { getRecommendations } = require('../src/controllers/recommendationController');

const originalAggregate = Order.aggregate;
afterEach(() => {
  Order.aggregate = originalAggregate;
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

test('1. Missing email defaults to Guest/cold-start and Layer 1', async () => {
  Order.aggregate = async () => [];
  const res = await getTimeSlotPopularRecommendations({});
  assert.equal(res.customerEmail, 'Guest');
  assert.equal(res.type, 'CONTEXT_POPULAR');
});

test('2. email=Guest explicitly uses Layer 1', async () => {
  Order.aggregate = async () => [];
  const res = await getTimeSlotPopularRecommendations({ email: 'Guest' });
  assert.equal(res.customerEmail, 'Guest');
  assert.equal(res.type, 'CONTEXT_POPULAR');
});

test('3. hour=7 maps to Morning slot', () => {
  const slot = resolveSlot(7);
  assert.equal(slot.slotKey, 'morning');
  assert.equal(slot.slotName, 'Morning');
  assert.equal(slot.bannerTitle, 'Morning Recommendations');
});

test('4. hour=11 maps to Morning slot', () => {
  const slot = resolveSlot(11);
  assert.equal(slot.slotKey, 'morning');
  assert.equal(slot.slotName, 'Morning');
});

test('5. hour=12 maps to Afternoon slot', () => {
  const slot = resolveSlot(12);
  assert.equal(slot.slotKey, 'afternoon');
  assert.equal(slot.slotName, 'Afternoon');
  assert.equal(slot.bannerTitle, 'Afternoon Refreshments');
});

test('6. hour=17 maps to Afternoon slot', () => {
  const slot = resolveSlot(17);
  assert.equal(slot.slotKey, 'afternoon');
  assert.equal(slot.slotName, 'Afternoon');
});

test('7. hour=18 maps to Evening slot', () => {
  const slot = resolveSlot(18);
  assert.equal(slot.slotKey, 'evening');
  assert.equal(slot.slotName, 'Evening');
  assert.equal(slot.bannerTitle, 'Evening Selections');
});

test('8. hour=22 maps to Evening slot', () => {
  const slot = resolveSlot(22);
  assert.equal(slot.slotKey, 'evening');
  assert.equal(slot.slotName, 'Evening');
});

test('9. hour=23 maps to Late Night slot', () => {
  const slot = resolveSlot(23);
  assert.equal(slot.slotKey, 'late_night');
  assert.equal(slot.slotName, 'Late Night');
  assert.equal(slot.bannerTitle, 'Late Night Selections');
});

test('10. hour=0 maps to Late Night slot', () => {
  const slot = resolveSlot(0);
  assert.equal(slot.slotKey, 'late_night');
  assert.equal(slot.slotName, 'Late Night');
});

test('11. Invalid hour returns HTTP 400', async () => {
  const invalidHours = [-1, 24, 'abc', '12.5', ''];
  for (const invalid of invalidHours) {
    if (invalid === '') continue;
    const req = { query: { hour: invalid } };
    const res = createMockResponse();
    await getRecommendations(req, res);
    assert.equal(res.statusCode, 400, `Expected 400 for hour=${invalid}`);
    assert.ok(res.body.message.includes('Invalid hour'));
  }
});

test('12. Invalid topK returns HTTP 400', async () => {
  const invalidTopKs = [0, 11, -5, 'foo', '3.5'];
  for (const invalid of invalidTopKs) {
    const req = { query: { topK: invalid } };
    const res = createMockResponse();
    await getRecommendations(req, res);
    assert.equal(res.statusCode, 400, `Expected 400 for topK=${invalid}`);
    assert.ok(res.body.message.includes('Invalid topK'));
  }
});

test('13. Ranking sums items.quantity and checks aggregation pipeline stages', async () => {
  let capturedPipeline = null;
  Order.aggregate = async (pipeline) => {
    capturedPipeline = pipeline;
    return [
      {
        _id: 'prod1',
        totalSoldInSlot: 10,
        product: { name: 'Cà phê đen', price: 30000, image: 'cafe-den.jpg' },
        categoryDoc: { name: 'Cà phê' }
      },
      {
        _id: 'prod2',
        totalSoldInSlot: 25,
        product: { name: 'Bạc xỉu', price: 35000, image: 'bac-xiu.jpg' },
        categoryDoc: { name: 'Cà phê' }
      }
    ];
  };

  const res = await getTimeSlotPopularRecommendations({ hour: 8, topK: 3 });
  
  // Pipeline assertions
  assert.ok(capturedPipeline);
  const matchStage = capturedPipeline.find(s => s.$match && s.$match.status === 'Hoàn thành');
  assert.ok(matchStage, 'Must match completed orders with status: Hoàn thành');
  
  const groupStage = capturedPipeline.find(s => s.$group);
  assert.ok(groupStage, 'Must have a $group stage');
  assert.deepEqual(groupStage.$group.totalSoldInSlot, { $sum: '$items.quantity' });

  // Output order: prod2 (sold 25) must be before prod1 (sold 10)
  assert.equal(res.recommendations.length, 2);
  assert.equal(res.recommendations[0].productId, 'prod2');
  assert.equal(res.recommendations[0].totalSoldInSlot, 25);
  assert.equal(res.recommendations[1].productId, 'prod1');
  assert.equal(res.recommendations[1].totalSoldInSlot, 10);
});

test('14. Only completed orders are matched in aggregation', async () => {
  let capturedPipeline = null;
  Order.aggregate = async (pipeline) => {
    capturedPipeline = pipeline;
    return [];
  };

  await getTimeSlotPopularRecommendations({ hour: 14 });
  const matchStage = capturedPipeline[0].$match;
  assert.equal(matchStage.status, 'Hoàn thành');
});

test('15. Products are not duplicated', async () => {
  Order.aggregate = async () => [
    {
      _id: 'prod1',
      totalSoldInSlot: 15,
      product: { name: 'Trà đào', price: 40000, image: 'tra-dao.jpg' },
      categoryDoc: { name: 'Trà' }
    },
    {
      _id: 'prod2',
      totalSoldInSlot: 10,
      product: { name: 'Trà vải', price: 35000, image: 'tra-vai.jpg' },
      categoryDoc: { name: 'Trà' }
    }
  ];

  const res = await getTimeSlotPopularRecommendations({ hour: 14 });
  const ids = res.recommendations.map(r => r.productId);
  const uniqueIds = new Set(ids);
  assert.equal(ids.length, uniqueIds.size);
});

test('16. Empty slot returns HTTP 200 with an empty array and clear message', async () => {
  Order.aggregate = async () => [];
  const req = { query: { hour: 2 } };
  const res = createMockResponse();
  await getRecommendations(req, res);
  
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.recommendations, []);
  assert.ok(res.body.message);
  assert.equal(res.body.slotKey, 'late_night');
});

test('17. Database error returns 500 error response', async () => {
  Order.aggregate = async () => {
    throw new Error('Atlas network connectivity failure');
  };
  const req = { query: { hour: 8 } };
  const res = createMockResponse();
  await getRecommendations(req, res);
  
  assert.equal(res.statusCode, 500);
  assert.ok(res.body.message.includes('Lỗi hệ thống'));
  assert.ok(!res.body.message.includes('Atlas network connectivity failure'), 'No sensitive internal details exposed');
});

test('18. Product metadata comes from DB and is not fabricated', async () => {
  Order.aggregate = async () => [
    {
      _id: 'real_id_12345',
      totalSoldInSlot: 42,
      product: {
        name: 'Sinh tố bơ',
        price: 45000,
        image: 'real-image-123.jpg'
      },
      categoryDoc: { name: 'Sinh tố' }
    }
  ];

  const res = await getTimeSlotPopularRecommendations({ hour: 19 });
  const first = res.recommendations[0];
  assert.equal(first.productId, 'real_id_12345');
  assert.equal(first.name, 'Sinh tố bơ');
  assert.equal(first.price, 45000);
  assert.equal(first.image, 'real-image-123.jpg');
  assert.equal(first.category, 'Sinh tố');
  assert.equal(first.totalSoldInSlot, 42);
  assert.equal(first.badge, 'Top Seller');
  assert.equal(first.reason, 'Popular caffeine-free selection for the evening');
});
