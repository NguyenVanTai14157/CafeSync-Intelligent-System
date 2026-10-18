const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const Order = require('../src/models/Order');
const orderController = require('../src/controllers/orderController');
const { getTimeSlotPopularRecommendations } = require('../src/services/recommendationService');
const { buildUserPreferenceVector } = require('../src/services/contentBasedService');

process.env.JWT_SECRET = 'test-secret-key-for-id-product';
process.env.PAYOS_CLIENT_ID = 'test-client';
process.env.PAYOS_API_KEY = 'test-key';
process.env.PAYOS_CHECKSUM_KEY = 'test-checksum';

const mockRes = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.body = data;
    return this;
  }
});

function createReq(body = {}, headers = {}, params = {}) {
  const mergedHeaders = { host: 'localhost', ...headers };
  return {
    body,
    headers: mergedHeaders,
    params,
    get: (h) => mergedHeaders[h.toLowerCase()] || '',
    app: {
      get: (key) => (key === 'io' ? { emit: () => {} } : null)
    }
  };
}

describe('Xác thực id_product xuyên suốt từ Client -> Backend -> Layer 1 & Layer 2', () => {
  const origOrderCreate = Order.create;
  const origOrderFindById = Order.findById;
  const origOrderFindOne = Order.findOne;
  const origOrderAggregate = Order.aggregate;

  beforeEach(() => {
    Order.create = origOrderCreate;
    Order.findById = origOrderFindById;
    Order.findOne = origOrderFindOne;
    Order.aggregate = origOrderAggregate;
  });

  afterEach(() => {
    Order.create = origOrderCreate;
    Order.findById = origOrderFindById;
    Order.findOne = origOrderFindOne;
    Order.aggregate = origOrderAggregate;
  });

  // 1. Kiểm tra logic sinh payload của Customer Web (Checkout.jsx contract)
  test('1. Customer Web Checkout payload mapping bổ sung id_product: item._id', () => {
    const mockCart = [
      {
        _id: '661b369d1234567890abcdef',
        name: 'Cà phê Muối',
        price: 35000,
        quantity: 2,
        options: { size: 'M', sugar: '70%', ice: '100%' },
        note: 'Ít đá'
      },
      {
        _id: '661b369d1234567890fedcba',
        name: 'Trà đào cam sả',
        price: 40000,
        quantity: 1,
        options: { size: 'L', sugar: '100%', ice: '50%' },
        note: ''
      }
    ];

    // Mô phỏng logic map trong Checkout.jsx: cart.map(item => ({ id_product: item._id, ... }))
    const mappedItems = mockCart.map(item => ({
      id_product: item._id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      options: item.options,
      note: item.note
    }));

    assert.equal(mappedItems.length, 2);
    assert.equal(mappedItems[0].id_product, '661b369d1234567890abcdef');
    assert.equal(mappedItems[0].name, 'Cà phê Muối');
    assert.equal(mappedItems[1].id_product, '661b369d1234567890fedcba');
    assert.equal(mappedItems[1].name, 'Trà đào cam sả');
  });

  // 2. Backend createOrder giữ nguyên id_product khi lưu đơn tiền mặt
  test('2. Backend createOrder bảo toàn id_product khi tạo đơn tiền mặt', async () => {
    let savedOrderData = null;
    Order.create = async (data) => {
      savedOrderData = data;
      return { _id: 'new_order_db_id_1', ...data };
    };

    const validProductId = new mongoose.Types.ObjectId().toString();
    const req = createReq({
      orderID: 'CFS11223344',
      paymentMethod: 'Tiền mặt',
      totalPrice: 70000,
      location: 'Mang đi',
      customerEmail: 'customer@test.com',
      items: [
        {
          id_product: validProductId,
          name: 'Cà phê Sữa đá',
          quantity: 2,
          price: 35000,
          options: { size: 'M', sugar: '100%', ice: '100%' },
          note: ''
        }
      ]
    });
    const res = mockRes();

    await orderController.createOrder(req, res);

    assert.equal(res.statusCode, 201);
    assert.ok(savedOrderData, 'Order.create phải được gọi');
    assert.equal(savedOrderData.items.length, 1);
    assert.equal(savedOrderData.items[0].id_product, validProductId);
    assert.equal(savedOrderData.items[0].name, 'Cà phê Sữa đá');
  });

  // 3. Backend createOrder giữ nguyên id_product khi tạo đơn PayOS
  test('3. Backend createOrder bảo toàn id_product khi tạo đơn PayOS', async () => {
    const PayOS = require('@payos/node');
    const origCreatePaymentLink = PayOS.prototype.createPaymentLink;
    PayOS.prototype.createPaymentLink = async () => ({ checkoutUrl: 'https://pay.payos.vn/web/test' });

    let savedOrderData = null;
    Order.create = async (data) => {
      savedOrderData = data;
      return { _id: 'new_payos_order_id', ...data };
    };

    const validProductId = new mongoose.Types.ObjectId().toString();
    const req = createReq({
      orderID: 'CFS55667788',
      paymentMethod: 'Chuyển khoản/Ví điện tử',
      totalPrice: 45000,
      location: 'Mang đi',
      customerEmail: 'guest@test.com',
      items: [
        {
          id_product: validProductId,
          name: 'Bạc xỉu',
          quantity: 1,
          price: 45000,
          options: { size: 'S', sugar: '50%', ice: '100%' }
        }
      ]
    });
    const res = mockRes();

    try {
      await orderController.createOrder(req, res);
      assert.equal(res.statusCode, 200);
      assert.ok(savedOrderData);
      assert.equal(savedOrderData.items[0].id_product, validProductId);
    } finally {
      PayOS.prototype.createPaymentLink = origCreatePaymentLink;
    }
  });

  // 4. Regression: Item không có id_product (legacy order) không gây crash
  test('4. Regression: Item thiếu id_product không làm createOrder bị crash', async () => {
    let savedOrderData = null;
    Order.create = async (data) => {
      savedOrderData = data;
      return { _id: 'legacy_order_id', ...data };
    };

    const req = createReq({
      orderID: 'CFS99001122',
      paymentMethod: 'Tiền mặt',
      totalPrice: 30000,
      location: 'Mang đi',
      items: [
        {
          name: 'Trà tắc',
          quantity: 1,
          price: 30000,
          options: { size: 'M' }
        }
      ]
    });
    const res = mockRes();

    await orderController.createOrder(req, res);

    assert.equal(res.statusCode, 201);
    assert.ok(savedOrderData);
    assert.equal(savedOrderData.items[0].name, 'Trà tắc');
    assert.equal(savedOrderData.items[0].id_product, undefined);
  });

  // 5. Regression: id_product chứa chuỗi không hợp lệ được lọc bỏ an toàn
  test('5. Regression: id_product chứa chuỗi rỗng hoặc không hợp lệ được xử lý an toàn', async () => {
    let savedOrderData = null;
    Order.create = async (data) => {
      savedOrderData = data;
      return { _id: 'sanitized_order_id', ...data };
    };

    const req = createReq({
      orderID: 'CFS33445566',
      paymentMethod: 'Tiền mặt',
      totalPrice: 50000,
      location: 'Mang đi',
      items: [
        {
          id_product: '', // rỗng
          name: 'Nước chanh',
          quantity: 1,
          price: 25000
        },
        {
          id_product: 'invalid-non-hex-id', // không hợp lệ
          name: 'Nước cam',
          quantity: 1,
          price: 25000
        }
      ]
    });
    const res = mockRes();

    await orderController.createOrder(req, res);

    assert.equal(res.statusCode, 201);
    assert.ok(savedOrderData);
    assert.equal(savedOrderData.items[0].id_product, undefined);
    assert.equal(savedOrderData.items[1].id_product, undefined);
  });

  // 6. Layer 1 đọc id_product từ order items khi gom nhóm bán chạy theo khung giờ
  test('6. Layer 1 recommendationService gom nhóm theo id_product', async () => {
    let capturedPipeline = null;
    Order.aggregate = async (pipeline) => {
      capturedPipeline = pipeline;
      return [
        {
          _id: new mongoose.Types.ObjectId('661b369d1234567890abcdef'),
          totalSoldInSlot: 15,
          product: {
            name: 'Cà phê Muối',
            price: 35000,
            image: 'ca-phe-muoi.jpg'
          },
          categoryDoc: {
            name: 'Cà phê'
          }
        }
      ];
    };

    const result = await getTimeSlotPopularRecommendations({ hour: 9, topK: 3 });

    assert.ok(result);
    assert.ok(Array.isArray(capturedPipeline));
    // Kiểm tra pipeline có lọc items.id_product và group theo $items.id_product
    const matchItemsStage = capturedPipeline.find(s => s.$match && s.$match['items.id_product']);
    assert.ok(matchItemsStage, 'Pipeline phải có stage match items.id_product tồn tại');
    assert.deepEqual(matchItemsStage.$match['items.id_product'], { $exists: true, $ne: null });

    const groupStage = capturedPipeline.find(s => s.$group && s.$group._id === '$items.id_product');
    assert.ok(groupStage, 'Pipeline phải group theo $items.id_product');
  });

  // 7. Layer 2 đọc id_product và tính preference vector chính xác
  test('7. Layer 2 contentBasedService đọc id_product từ order items thực tế', () => {
    const prodId1 = '661b369d1234567890abcdef';
    const prodId2 = '661b369d1234567890fedcba';

    const completedOrders = [
      {
        status: 'Hoàn thành',
        items: [
          {
            id_product: prodId1,
            name: 'Cà phê Sữa đá',
            quantity: 2,
            options: { sugar: '100%', ice: '100%' }
          },
          {
            id_product: prodId2,
            name: 'Trà sen vàng',
            quantity: 1,
            options: { sugar: '50%', ice: '50%' }
          },
          {
            // Item thiếu id_product được bỏ qua an toàn
            name: 'Bánh ngọt legacy',
            quantity: 1,
            options: { sugar: '100%' }
          }
        ]
      }
    ];

    const categoryLookup = new Map([
      [prodId1, 'Cà phê'],
      [prodId2, 'Trà']
    ]);

    const userVector = buildUserPreferenceVector(completedOrders, categoryLookup);

    assert.ok(userVector, 'User vector phải được tính thành công từ items có id_product');
    // Sweetness: (1.0*2 + 0.5*1) / 3 = 2.5/3 ≈ 0.833
    assert.ok(Math.abs(userVector.sweetness - (2.5 / 3)) < 0.01);
    // Coldness: (1.0*2 + 0.5*1) / 3 = 2.5/3 ≈ 0.833
    assert.ok(Math.abs(userVector.coldness - (2.5 / 3)) < 0.01);
    // Caffeine: 2 cà phê / 3 món hợp lệ = 2/3 ≈ 0.667
    assert.ok(Math.abs(userVector.caffeine - (2 / 3)) < 0.01);
  });
});
