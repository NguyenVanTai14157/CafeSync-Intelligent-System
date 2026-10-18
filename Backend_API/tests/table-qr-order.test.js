const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { createTableQrToken, verifyTableQrToken, isValidTableNumber } = require('../src/utils/tableQr');
const Order = require('../src/models/Order');
const Table = require('../src/models/Table');
const User = require('../src/models/User');
const PayOS = require('@payos/node');
const orderController = require('../src/controllers/orderController');
const authController = require('../src/controllers/authController');
const recommendationController = require('../src/controllers/recommendationController');
const { getContentBasedRecommendations } = require('../src/services/contentBasedService');

process.env.JWT_SECRET = 'test-jwt-secret-key-12345';
process.env.TABLE_QR_SECRET = 'test-table-qr-secret-key-67890';
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

function createReq(body = {}, headers = {}, params = {}, query = {}) {
  const events = [];
  return {
    body,
    headers,
    params,
    query,
    get: (headerName) => headers[headerName.toLowerCase()] || '',
    app: {
      get: (key) => (key === 'io' ? { emit: (name, data) => events.push({ name, data }) } : null)
    },
    events
  };
}

describe('29 Mandatory Tests for Table QR, Order, RBAC, Recommendation & Workflow', () => {
  const originalOrderCreate = Order.create;
  const originalOrderFind = Order.find;
  const originalOrderFindOne = Order.findOne;
  const originalOrderFindById = Order.findById;
  const originalOrderFindOneAndUpdate = Order.findOneAndUpdate;
  const originalOrderAggregate = Order.aggregate;
  const originalTableFindOneAndUpdate = Table.findOneAndUpdate;
  const originalPayOSCreatePaymentLink = PayOS.prototype.createPaymentLink;
  const originalPayOSVerifyWebhook = PayOS.prototype.verifyPaymentWebhookData;
  const originalUserFindOne = User.findOne;

  beforeEach(() => {
    Table.findOneAndUpdate = async (filter, update) => ({
      tableNumber: filter.tableNumber || 1,
      status: update?.status || update?.$set?.status || 'Đang phục vụ',
      toObject: () => ({ tableNumber: filter.tableNumber || 1, status: 'Đang phục vụ' })
    });
    Order.aggregate = async () => [];
  });

  afterEach(() => {
    Order.create = originalOrderCreate;
    Order.find = originalOrderFind;
    Order.findOne = originalOrderFindOne;
    Order.findById = originalOrderFindById;
    Order.findOneAndUpdate = originalOrderFindOneAndUpdate;
    Order.aggregate = originalOrderAggregate;
    Table.findOneAndUpdate = originalTableFindOneAndUpdate;
    PayOS.prototype.createPaymentLink = originalPayOSCreatePaymentLink;
    PayOS.prototype.verifyPaymentWebhookData = originalPayOSVerifyWebhook;
    User.findOne = originalUserFindOne;
  });

  // 1. Tạo token hợp lệ cho Bàn 1.
  test('1. Tạo token hợp lệ cho Bàn 1', () => {
    const token = createTableQrToken(1);
    assert.ok(typeof token === 'string' && token.length > 20);
    const verified = verifyTableQrToken(token);
    assert.equal(verified.valid, true);
    assert.equal(verified.tableNumber, 1);
  });

  // 2. Tạo token hợp lệ cho Bàn 51.
  test('2. Tạo token hợp lệ cho Bàn 51', () => {
    const token = createTableQrToken(51);
    assert.ok(typeof token === 'string');
    const verified = verifyTableQrToken(token);
    assert.equal(verified.valid, true);
    assert.equal(verified.tableNumber, 51);
  });

  // 3. Token sai chữ ký bị từ chối.
  test('3. Token sai chữ ký bị từ chối', () => {
    const badToken = jwt.sign({ tableNumber: 1, type: 'table_qr' }, 'wrong-secret-key');
    const verified = verifyTableQrToken(badToken);
    assert.equal(verified.valid, false);
    assert.equal(verified.reason, 'INVALID_SIGNATURE');
  });

  // 4. Token hết hạn bị từ chối.
  test('4. Token hết hạn bị từ chối', () => {
    const expiredToken = jwt.sign(
      { tableNumber: 5, type: 'table_qr', exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.TABLE_QR_SECRET
    );
    const verified = verifyTableQrToken(expiredToken);
    assert.equal(verified.valid, false);
    assert.equal(verified.reason, 'EXPIRED');
  });

  // 5. tableNumber body khác tableNumber token bị từ chối.
  test('5. tableNumber body khác tableNumber token bị từ chối', async () => {
    const tokenForTable10 = createTableQrToken(10);
    const req = createReq({
      tableNumber: 12,
      tableToken: tokenForTable10,
      paymentMethod: 'Tiền mặt',
      items: [{ name: 'Cà phê', quantity: 1, price: 30000 }]
    });
    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.message.includes('không khớp'));
  });

  // 6. Có tableNumber nhưng thiếu token bị từ chối.
  test('6. Có tableNumber nhưng thiếu token bị từ chối', async () => {
    const req = createReq({
      tableNumber: 5,
      paymentMethod: 'Tiền mặt',
      items: [{ name: 'Trà đào', quantity: 1, price: 35000 }]
    });
    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.message.includes('Mã QR bàn bị thiếu hoặc không hợp lệ'));
  });

  // 7. tableNumber = 0 bị từ chối.
  test('7. tableNumber = 0 bị từ chối', async () => {
    assert.equal(isValidTableNumber(0), false);
    const req = createReq({
      tableNumber: 0,
      tableToken: 'some-token',
      paymentMethod: 'Tiền mặt',
      items: []
    });
    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.message.includes('Số bàn không hợp lệ'));
  });

  // 8. tableNumber = 52 bị từ chối.
  test('8. tableNumber = 52 bị từ chối', async () => {
    assert.equal(isValidTableNumber(52), false);
    const req = createReq({
      tableNumber: 52,
      tableToken: 'some-token',
      paymentMethod: 'Tiền mặt',
      items: []
    });
    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.message.includes('Số bàn không hợp lệ'));
  });

  // 9. tableNumber là chuỗi không hợp lệ bị từ chối.
  test('9. tableNumber là chuỗi không hợp lệ bị từ chối', async () => {
    assert.equal(isValidTableNumber('ban-vip'), false);
    assert.equal(isValidTableNumber('12.5'), false);
    const req = createReq({
      tableNumber: 'abc',
      tableToken: 'some-token',
      paymentMethod: 'Tiền mặt',
      items: []
    });
    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 400);
  });

  // 10. Guest QR order hợp lệ được tạo.
  test('10. Guest QR order hợp lệ được tạo', async () => {
    const validToken = createTableQrToken(8);
    let createdOrder = null;
    Order.create = async (data) => {
      createdOrder = { _id: 'order-123456', ...data };
      return createdOrder;
    };

    const req = createReq({
      tableNumber: 8,
      tableToken: validToken,
      paymentMethod: 'Tiền mặt',
      totalPrice: 45000,
      items: [{ name: 'Cà phê muối', quantity: 1, price: 45000 }]
    });
    const res = mockRes();
    await orderController.createOrder(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(createdOrder.tableNumber, 8);
    assert.equal(createdOrder.location, 'Bàn 8');
    assert.equal(createdOrder.customerEmail, 'Guest');
  });

  // 11. Guest QR order không có JWT vẫn được tạo nếu token QR hợp lệ.
  test('11. Guest QR order không có JWT vẫn được tạo nếu token QR hợp lệ', async () => {
    const validToken = createTableQrToken(15);
    Order.create = async (data) => ({ _id: 'guest-order-id', ...data });

    const req = createReq({
      tableNumber: 15,
      tableToken: validToken,
      paymentMethod: 'Tiền mặt',
      items: [{ name: 'Trà đào', quantity: 1, price: 30000 }]
    }, /* headers without auth */ {});

    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body._id, 'guest-order-id');
  });

  // 12. Guest QR order token sai không tạo order.
  test('12. Guest QR order token sai không tạo order', async () => {
    let orderCreated = false;
    Order.create = async () => {
      orderCreated = true;
    };

    const req = createReq({
      tableNumber: 15,
      tableToken: 'bad-tampered-token',
      paymentMethod: 'Tiền mặt',
      items: [{ name: 'Trà đào', quantity: 1, price: 30000 }]
    });

    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(orderCreated, false);
  });

  // 13. Takeaway với tableNumber null không cần QR token.
  test('13. Takeaway với tableNumber null không cần QR token', async () => {
    let createdOrder = null;
    Order.create = async (data) => {
      createdOrder = data;
      return { _id: 'takeaway-id', ...data };
    };

    const req = createReq({
      tableNumber: null,
      location: 'Mang đi',
      paymentMethod: 'Tiền mặt',
      totalPrice: 50000,
      items: [{ name: 'Latte', quantity: 1, price: 50000 }]
    });

    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 201);
    assert.equal(createdOrder.tableNumber, null);
    assert.equal(createdOrder.location, 'Mang đi');
  });

  // 14. POS cash order không cần QR token.
  test('14. POS cash order không cần QR token', async () => {
    let createdOrder = null;
    Order.create = async (data) => {
      createdOrder = data;
      return { _id: 'pos-cash-id', ...data };
    };

    const staffToken = jwt.sign({ id: 'staff1', role: 'nhanvien' }, process.env.JWT_SECRET);
    const req = createReq(
      {
        source: 'pos',
        paymentConfirmed: true,
        paymentMethod: 'Tiền mặt',
        tableNumber: 3,
        location: 'Bàn 3',
        totalPrice: 60000,
        items: []
      },
      { authorization: `Bearer ${staffToken}` }
    );

    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 201);
    assert.equal(createdOrder.paymentStatus, 'paid');
    assert.equal(createdOrder.status, 'Chờ pha chế');
  });

  // 15. POS PayOS order không cần QR token.
  test('15. POS PayOS order không cần QR token', async () => {
    let payosCalled = false;
    PayOS.prototype.createPaymentLink = async () => {
      payosCalled = true;
      return { checkoutUrl: 'https://pay.payos.vn/test' };
    };
    Order.create = async (data) => ({ _id: 'pos-payos-id', ...data });

    const staffToken = jwt.sign({ id: 'staff1', role: 'manager' }, process.env.JWT_SECRET);
    const req = createReq(
      {
        source: 'pos',
        paymentMethod: 'Chuyển khoản/Ví điện tử',
        tableNumber: 4,
        totalPrice: 80000,
        items: []
      },
      { authorization: `Bearer ${staffToken}` }
    );

    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(payosCalled, true);
    assert.equal(res.body.checkoutUrl, 'https://pay.payos.vn/test');
  });

  // 16. POS staff authorization vẫn hoạt động.
  test('16. POS staff authorization vẫn hoạt động (chặn non-staff mạo danh POS)', async () => {
    const req = createReq({
      source: 'pos',
      paymentMethod: 'Tiền mặt',
      paymentConfirmed: true,
      items: []
    });
    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 403);
    assert.ok(res.body.message.includes('nhân viên'));
  });

  // 17. QR sai không gọi PayOS.
  test('17. QR sai không gọi PayOS', async () => {
    let payosCalled = false;
    PayOS.prototype.createPaymentLink = async () => {
      payosCalled = true;
      return { checkoutUrl: 'https://test' };
    };

    const req = createReq({
      tableNumber: 10,
      tableToken: 'invalid-qr-token',
      paymentMethod: 'Chuyển khoản/Ví điện tử',
      totalPrice: 100000,
      items: []
    });

    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(payosCalled, false);
  });

  // 18. QR sai không cập nhật Table.
  test('18. QR sai không cập nhật Table', async () => {
    let tableUpdated = false;
    Table.findOneAndUpdate = async () => {
      tableUpdated = true;
    };

    const req = createReq({
      tableNumber: 10,
      tableToken: 'invalid-token',
      paymentMethod: 'Tiền mặt',
      items: []
    });

    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(tableUpdated, false);
  });

  // 19. QR sai không ghi Order.
  test('19. QR sai không ghi Order', async () => {
    let orderWritten = false;
    Order.create = async () => {
      orderWritten = true;
    };

    const req = createReq({
      tableNumber: 20,
      tableToken: 'bad-token',
      paymentMethod: 'Tiền mặt',
      items: []
    });

    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(orderWritten, false);
  });

  // 20. location được backend chuẩn hóa theo tableNumber.
  test('20. location được backend chuẩn hóa theo tableNumber', async () => {
    const validToken = createTableQrToken(25);
    let createdOrder = null;
    Order.create = async (data) => {
      createdOrder = data;
      return { _id: 'ord-20', ...data };
    };

    const req = createReq({
      tableNumber: 25,
      tableToken: validToken,
      location: 'Bàn VIP 999',
      paymentMethod: 'Tiền mặt',
      items: []
    });

    const res = mockRes();
    await orderController.createOrder(req, res);
    assert.equal(res.statusCode, 201);
    assert.equal(createdOrder.location, 'Bàn 25');
  });

  // 21. Customer login vẫn thành công.
  test('21. Customer login vẫn thành công qua login-custom', async () => {
    User.findOne = async () => ({
      _id: 'cust-id',
      name: 'Khách Hàng A',
      email: 'customera@gmail.com',
      role: 'customer',
      comparePassword: async (pwd) => pwd === 'customer123'
    });

    const req = createReq({ email: 'customera@gmail.com', password: 'customer123' });
    const res = mockRes();
    await authController.loginCustom(req, res);
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.role, 'customer');
  });

  // 22. Staff/admin login-custom vẫn HTTP 403.
  test('22. Staff/admin login-custom vẫn HTTP 403', async () => {
    User.findOne = async () => ({
      _id: 'admin-id',
      name: 'Quản Trị Viên',
      email: 'admin@cafesync.com',
      role: 'admin',
      comparePassword: async (pwd) => pwd === 'staff123'
    });

    const req = createReq({ email: 'admin@cafesync.com', password: 'staff123' });
    const res = mockRes();
    await authController.loginCustom(req, res);
    assert.equal(res.statusCode, 403);
    assert.ok(res.body.message.includes('Tài khoản nhân viên'));
  });

  // 23. No-token history vẫn HTTP 401.
  test('23. No-token history vẫn HTTP 401', async () => {
    let orderQueried = false;
    Order.find = () => {
      orderQueried = true;
    };

    const req = createReq({}, /* no auth */ {}, { email: 'customer@gmail.com' });
    const res = mockRes();
    await orderController.getOrdersByEmail(req, res);
    assert.equal(res.statusCode, 401);
    assert.equal(orderQueried, false);
  });

  // 24. Cross-user history vẫn HTTP 403.
  test('24. Cross-user history vẫn HTTP 403', async () => {
    let orderQueried = false;
    Order.find = () => {
      orderQueried = true;
    };

    const attackerToken = jwt.sign({ id: 'user1', email: 'user1@gmail.com', role: 'customer' }, process.env.JWT_SECRET);
    const req = createReq({}, { authorization: `Bearer ${attackerToken}` }, { email: 'victim@gmail.com' });
    const res = mockRes();
    await orderController.getOrdersByEmail(req, res);
    assert.equal(res.statusCode, 403);
    assert.equal(orderQueried, false);
  });

  // 25. Staff recommendation không chạy Layer 2.
  test('25. Staff recommendation không chạy Layer 2', async () => {
    User.findOne = () => ({
      select: () => ({
        lean: async () => ({ role: 'nhanvien' })
      })
    });

    const result = await getContentBasedRecommendations({
      email: 'staff@cafesync.com',
      effectiveHour: 10,
      effectiveTopK: 3
    });
    assert.equal(result, null);
  });

  // 26. Guest recommendation vẫn Layer 1.
  test('26. Guest recommendation vẫn Layer 1', async () => {
    Order.aggregate = async () => [];
    const req = createReq({}, {}, {}, { email: 'Guest', hour: '9' });
    const res = mockRes();
    await recommendationController.getRecommendations(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.recommendationSource, 'TIME_SLOT_POPULARITY');
  });

  // 27. Guest tracking theo order ID vẫn hoạt động.
  test('27. Guest tracking theo order ID vẫn hoạt động', async () => {
    const mockOrder = {
      _id: '661b369d1234567890abcdef',
      orderID: 'CFS12345678',
      status: 'Chờ pha chế',
      paymentStatus: 'paid',
      tableNumber: 12,
      location: 'Bàn 12'
    };
    Order.findById = async (id) => (id === mockOrder._id ? mockOrder : null);

    const req = createReq({}, {}, { id: mockOrder._id });
    const res = mockRes();
    await orderController.getOrderById(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.orderID, 'CFS12345678');
    assert.equal(res.body.status, 'Chờ pha chế');
  });

  // 28. KDS/status update không bị phá.
  test('28. KDS/status update không bị phá', async () => {
    const staffToken = jwt.sign({ id: 'staff1', role: 'nhanvien' }, process.env.JWT_SECRET);
    const existingOrder = {
      _id: 'order-kds-1',
      status: 'Chờ pha chế',
      paymentStatus: 'paid'
    };
    Order.findById = async () => existingOrder;
    Order.findOneAndUpdate = async (filter, update) => {
      assert.equal(update.$set.status, 'Đang pha chế');
      return { ...existingOrder, status: 'Đang pha chế' };
    };

    const req = createReq(
      { status: 'Đang pha chế' },
      { authorization: `Bearer ${staffToken}` },
      { id: 'order-kds-1' }
    );
    const res = mockRes();
    await orderController.updateOrderStatus(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'Đang pha chế');
  });

  // 29. Webhook PayOS không bị phá.
  test('29. Webhook PayOS không bị phá', async () => {
    PayOS.prototype.verifyPaymentWebhookData = () => ({
      code: '00',
      orderCode: 998877,
      amount: 45000
    });

    const pendingOrder = {
      _id: 'ord-payos-998877',
      payosOrderCode: 998877,
      totalPrice: 45000,
      status: 'Chờ thanh toán',
      paymentStatus: 'pending',
      tableNumber: 7
    };

    Order.findOne = async () => pendingOrder;
    let released = false;
    Order.findOneAndUpdate = async (filter, update) => {
      released = true;
      return { ...pendingOrder, ...update.$set };
    };
    Table.findOneAndUpdate = async () => ({ tableNumber: 7, status: 'Đang phục vụ' });

    const req = createReq({ someWebhookPayload: true });
    const res = mockRes();
    await orderController.receiveWebhook(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(released, true);
  });
});
