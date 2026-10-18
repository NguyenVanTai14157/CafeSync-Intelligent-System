const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const Table = require('../src/models/Table');
const Order = require('../src/models/Order');
const User = require('../src/models/User');
const tableController = require('../src/controllers/tableController');
const orderController = require('../src/controllers/orderController');
const { requireStaff } = require('../src/middleware/auth.middleware');
const { createTableQrToken } = require('../src/utils/tableQr');

// Mock secrets cho test runtime - tuyệt đối không dùng secret production
const TEST_JWT_SECRET = 'test-jwt-secret-for-auth-tracking-suite';
const TEST_QR_SECRET = 'test-qr-secret-for-auth-tracking-suite';
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.TABLE_QR_SECRET = TEST_QR_SECRET;

const mockRes = () => ({
  statusCode: 200,
  headers: {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.body = data;
    return this;
  },
  setHeader(k, v) {
    this.headers[k] = v;
    return this;
  }
});

function createReq({ body = {}, headers = {}, params = {}, query = {} } = {}) {
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

describe('Bảo vệ API Table, Guest Tracking và Secret Hygiene', () => {
  const origTableFind = Table.find;
  const origTableFindOne = Table.findOne;
  const origTableFindOneAndUpdate = Table.findOneAndUpdate;
  const origOrderFind = Order.find;
  const origOrderFindById = Order.findById;
  const origOrderFindOne = Order.findOne;
  const origOrderCreate = Order.create;
  const origUserFindOne = User.findOne;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    process.env.TABLE_QR_SECRET = TEST_QR_SECRET;
  });

  afterEach(() => {
    Table.find = origTableFind;
    Table.findOne = origTableFindOne;
    Table.findOneAndUpdate = origTableFindOneAndUpdate;
    Order.find = origOrderFind;
    Order.findById = origOrderFindById;
    Order.findOne = origOrderFindOne;
    Order.create = origOrderCreate;
    User.findOne = origUserFindOne;
  });

  // =========================================================================
  // 1. BẢO VỆ API LẤY TABLE TOKEN (requireStaff & tableController)
  // =========================================================================

  test('1. Staff/admin gọi GET /api/tables được phép qua middleware và nhận tableToken', async () => {
    const adminToken = jwt.sign({ id: 'adm_1', role: 'admin' }, TEST_JWT_SECRET);
    const req = createReq({ headers: { authorization: `Bearer ${adminToken}` } });
    const res = mockRes();

    let passedMiddleware = false;
    requireStaff(req, res, () => {
      passedMiddleware = true;
    });
    assert.equal(passedMiddleware, true, 'Staff phải vượt qua requireStaff');
    assert.equal(req.user.role, 'admin');

    // Controller trả danh sách kèm tableToken
    Table.find = () => ({
      sort: () => ({
        lean: async () => [
          { _id: 'tbl_1', tableNumber: 1, status: 'Trống' },
          { _id: 'tbl_2', tableNumber: 5, status: 'Đang phục vụ' }
        ]
      })
    });

    await tableController.getAllTables(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(Array.isArray(res.body), true);
    assert.equal(res.body.length, 2);
    assert.ok(res.body[0].tableToken, 'Phải có tableToken cho Admin quản lý QR');
    assert.equal(res.body[0].tableNumber, 1);
  });

  test('2. Customer gọi GET /api/tables bị từ chối 403', async () => {
    const customerToken = jwt.sign({ id: 'cust_1', role: 'customer', email: 'cust@cafesync.com' }, TEST_JWT_SECRET);
    const req = createReq({ headers: { authorization: `Bearer ${customerToken}` } });
    const res = mockRes();

    let passedMiddleware = false;
    requireStaff(req, res, () => {
      passedMiddleware = true;
    });
    assert.equal(passedMiddleware, false, 'Customer không được vượt qua requireStaff');
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /chỉ dành cho nhân viên/i);
  });

  test('3. Guest gọi GET /api/tables bị từ chối 401', async () => {
    const req = createReq({ headers: {} });
    const res = mockRes();

    let passedMiddleware = false;
    requireStaff(req, res, () => {
      passedMiddleware = true;
    });
    assert.equal(passedMiddleware, false, 'Guest không được vượt qua requireStaff');
    assert.equal(res.statusCode, 401);
  });

  test('4. Request không có token bị từ chối 401', async () => {
    const req = createReq({ headers: { authorization: '' } });
    const res = mockRes();

    let passed = false;
    requireStaff(req, res, () => { passed = true; });
    assert.equal(passed, false);
    assert.equal(res.statusCode, 401);
  });

  test('5. Token staff không hợp lệ bị từ chối 401', async () => {
    const req = createReq({ headers: { authorization: 'Bearer invalid.token.payload' } });
    const res = mockRes();

    let passed = false;
    requireStaff(req, res, () => { passed = true; });
    assert.equal(passed, false);
    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /không hợp lệ/i);
  });

  test('6. Không làm hỏng TableManagementPage của Admin (các role admin, manager, quanly, nhanvien, staff đều hợp lệ)', async () => {
    const staffRoles = ['admin', 'manager', 'quanly', 'nhanvien', 'staff'];
    for (const role of staffRoles) {
      const token = jwt.sign({ id: `user_${role}`, role }, TEST_JWT_SECRET);
      const req = createReq({ headers: { authorization: `Bearer ${token}` } });
      const res = mockRes();
      let passed = false;
      requireStaff(req, res, () => { passed = true; });
      assert.equal(passed, true, `Role ${role} phải truy cập được table management`);
    }
  });

  // =========================================================================
  // 2. BẢO VỆ GUEST TRACKING & DTO PROJECTION
  // =========================================================================

  test('7. Guest gọi tracking bằng order ID hợp lệ nhận status và thông tin hiển thị cần thiết', async () => {
    const mockOrderDoc = {
      _id: '661b369d1234567890abcdef',
      orderID: 'CFS998877',
      status: 'Chờ pha chế',
      paymentStatus: 'paid',
      paymentMethod: 'Chuyển khoản/Ví điện tử',
      payosOrderCode: 998877,
      customerEmail: 'secret_user@example.com',
      customerName: 'Nguyen Van A',
      totalPrice: 65000,
      location: 'Bàn 8',
      tableNumber: 8,
      items: [
        {
          name: 'Cà phê Muối',
          quantity: 2,
          price: 30000,
          options: { size: 'M', sugar: '70%', ice: '100%', toppings: ['Trân châu trắng'] },
          note: 'Ít ngọt'
        }
      ],
      createdAt: 1713430000000,
      internalStaffNotes: 'Khách VIP quầy 1',
      gatewayTransactionId: 'txn_xyz_123456'
    };

    Order.findById = async (id) => (id === mockOrderDoc._id ? mockOrderDoc : null);

    const req = createReq({ params: { id: mockOrderDoc._id } });
    const res = mockRes();
    await orderController.trackOrderById(req, res);

    assert.equal(res.statusCode, 200);
    const data = res.body;

    // Các field cần thiết cho giao diện theo dõi
    assert.equal(data.orderID, 'CFS998877');
    assert.equal(data.status, 'Chờ pha chế');
    assert.equal(data.paymentStatus, 'paid');
    assert.equal(data.totalPrice, 65000);
    assert.equal(data.tableNumber, 8);
    assert.equal(data.location, 'Bàn 8');
    assert.equal(data.items.length, 1);
    assert.equal(data.items[0].name, 'Cà phê Muối');
    assert.equal(data.items[0].quantity, 2);
    assert.equal(data.items[0].price, 30000);
    assert.equal(data.items[0].options.size, 'M');
    assert.equal(data.items[0].options.sugar, '70%');
    assert.equal(data.items[0].options.ice, '100%');
  });

  test('8. Response Guest không chứa customerEmail', async () => {
    const mockOrderDoc = {
      _id: '661b369d1234567890abcdef',
      orderID: 'CFS998877',
      customerEmail: 'sensitive_email@example.com',
      status: 'Đang pha chế',
      items: []
    };
    Order.findById = async () => mockOrderDoc;

    const req = createReq({ params: { id: mockOrderDoc._id } });
    const res = mockRes();
    await orderController.trackOrderById(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.customerEmail, undefined, 'Guest response không được chứa customerEmail');
  });

  test('9. Response Guest không chứa payosOrderCode', async () => {
    const mockOrderDoc = {
      _id: '661b369d1234567890abcdef',
      orderID: 'CFS998877',
      payosOrderCode: 998877,
      status: 'Đang pha chế',
      items: []
    };
    Order.findById = async () => mockOrderDoc;

    const req = createReq({ params: { id: mockOrderDoc._id } });
    const res = mockRes();
    await orderController.trackOrderById(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.payosOrderCode, undefined, 'Guest response không được chứa payosOrderCode');
  });

  test('10. Response Guest không chứa metadata nội bộ hay customerName', async () => {
    const mockOrderDoc = {
      _id: '661b369d1234567890abcdef',
      orderID: 'CFS998877',
      customerName: 'Private Name',
      internalStaffNotes: 'Sensitive memo',
      gatewayTransactionId: 'gw_secret_token',
      __v: 0,
      status: 'Đang pha chế',
      items: []
    };
    Order.findById = async () => mockOrderDoc;

    const req = createReq({ params: { id: mockOrderDoc._id } });
    const res = mockRes();
    await orderController.trackOrderById(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.customerName, undefined);
    assert.equal(res.body.internalStaffNotes, undefined);
    assert.equal(res.body.gatewayTransactionId, undefined);
    assert.equal(res.body.__v, undefined);
  });

  test('11. Order ID không tồn tại trả 404', async () => {
    Order.findById = async () => null;
    Order.findOne = async () => null;

    const req = createReq({ params: { id: '661b369d1234567890ffffff' } });
    const res = mockRes();
    await orderController.trackOrderById(req, res);

    assert.equal(res.statusCode, 404);
    assert.match(res.body.message, /không tìm thấy/i);
  });

  test('12. Guest không thể gọi history theo email để xem nhiều order (trả 401)', async () => {
    const req = createReq({ params: { email: 'target_victim@example.com' }, headers: {} });
    const res = mockRes();
    await orderController.getOrdersByEmail(req, res);

    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /vui lòng đăng nhập/i);
  });

  test('13. Customer history vẫn hoạt động qua JWT đúng email', async () => {
    const targetEmail = 'mycustomer@cafesync.com';
    const customerToken = jwt.sign({ id: 'c1', role: 'customer', email: targetEmail }, TEST_JWT_SECRET);

    User.findOne = () => ({
      select: () => ({
        lean: async () => ({ role: 'customer' })
      })
    });

    const mockOrders = [
      { orderID: 'CFS1001', customerEmail: targetEmail, totalPrice: 50000 }
    ];
    Order.find = () => ({
      sort: async () => mockOrders
    });

    const req = createReq({
      params: { email: targetEmail },
      headers: { authorization: `Bearer ${customerToken}` }
    });
    const res = mockRes();
    await orderController.getOrdersByEmail(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(Array.isArray(res.body), true);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].orderID, 'CFS1001');
  });

  test('14. Admin/POS/KDS vẫn nhận đủ dữ liệu nội bộ qua GET /api/orders/:id', async () => {
    const staffToken = jwt.sign({ id: 'staff_pos_1', role: 'staff' }, TEST_JWT_SECRET);
    const fullOrderDoc = {
      _id: '661b369d1234567890abcdef',
      orderID: 'CFS998877',
      customerEmail: 'customer@example.com',
      payosOrderCode: 998877,
      status: 'Chờ pha chế',
      paymentStatus: 'paid',
      internalStaffNotes: 'Ghi chú nội bộ cho KDS',
      items: [{ name: 'Trà đào', quantity: 1, price: 35000 }]
    };

    Order.findById = async () => fullOrderDoc;

    const req = createReq({
      params: { id: fullOrderDoc._id },
      headers: { authorization: `Bearer ${staffToken}` }
    });
    const res = mockRes();
    await orderController.getOrderById(req, res);

    assert.equal(res.statusCode, 200);
    // Staff nhận toàn bộ document nội bộ
    assert.equal(res.body.customerEmail, 'customer@example.com');
    assert.equal(res.body.payosOrderCode, 998877);
    assert.equal(res.body.internalStaffNotes, 'Ghi chú nội bộ cho KDS');
  });

  // =========================================================================
  // 3. BẢO MẬT SECRET TRONG TEST RUNTIME
  // =========================================================================

  test('15. Secret giả định không bị rò rỉ trong response DTO', async () => {
    const mockOrderDoc = {
      _id: '661b369d1234567890abcdef',
      orderID: 'CFS12345',
      status: 'Hoàn thành',
      tableNumber: 3
    };
    Order.findById = async () => mockOrderDoc;

    const req = createReq({ params: { id: mockOrderDoc._id } });
    const res = mockRes();
    await orderController.trackOrderById(req, res);

    const serialized = JSON.stringify(res.body);
    assert.equal(serialized.includes(TEST_JWT_SECRET), false);
    assert.equal(serialized.includes(TEST_QR_SECRET), false);
    assert.equal(serialized.includes('mongodb'), false);
  });
});
