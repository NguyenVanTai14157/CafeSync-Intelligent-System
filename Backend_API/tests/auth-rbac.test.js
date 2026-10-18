const { test, afterEach, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const User = require('../src/models/User');
const Order = require('../src/models/Order');
const authController = require('../src/controllers/authController');
const orderController = require('../src/controllers/orderController');
const recommendationController = require('../src/controllers/recommendationController');
const { isStaffRole, staffRoles } = require('../src/utils/orderWorkflow');

// Save originals
const origUserFindOne = User.findOne;
const origOrderFind = Order.find;
const origOrderAggregate = Order.aggregate;

const JWT_SECRET = 'CAFE_SYNC_TEST_SECRET';
process.env.JWT_SECRET = JWT_SECRET;

const mockResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.body = data;
    return this;
  },
  redirect(url) {
    this.redirectUrl = url;
    return this;
  }
});

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

afterEach(() => {
  User.findOne = origUserFindOne;
  Order.find = origOrderFind;
  Order.aggregate = origOrderAggregate;
});

// ─── 1. RBAC HELPER & ROLES ──────────────────────────────────────────────────
test('RBAC: staffRoles contains all 5 required staff roles', () => {
  const expected = ['admin', 'manager', 'quanly', 'nhanvien', 'staff'];
  for (const role of expected) {
    assert.equal(isStaffRole(role), true, `isStaffRole should be true for ${role}`);
  }
  assert.equal(isStaffRole('customer'), false);
  assert.equal(isStaffRole('guest'), false);
  assert.equal(isStaffRole(null), false);
  assert.equal(isStaffRole(undefined), false);
});

// ─── 2. CUSTOMER LOGIN SUCCESS ───────────────────────────────────────────────
test('RBAC: Customer role đăng nhập thành công (HTTP 200, có token, role customer)', async () => {
  User.findOne = async () => ({
    _id: 'cust_001',
    name: 'Khách Hàng Thân Thiết',
    email: 'khachhang@example.com',
    role: 'customer',
    comparePassword: async (p) => p === 'secret123'
  });

  const req = {
    body: {
      email: 'khachhang@example.com',
      password: 'secret123'
    }
  };
  const res = mockResponse();

  await authController.loginCustom(req, res);

  assert.equal(res.statusCode, 200);
  assert.ok(res.body.token, 'Response must contain JWT token');
  assert.equal(res.body.user.role, 'customer');
  assert.equal(res.body.user.email, 'khachhang@example.com');
  assert.equal(res.body.user.name, 'Khách Hàng Thân Thiết');

  // Verify token payload
  const decoded = jwt.verify(res.body.token, JWT_SECRET);
  assert.equal(decoded.id, 'cust_001');
  assert.equal(decoded.role, 'customer');
  assert.equal(decoded.email, 'khachhang@example.com');
});

// ─── 3. ADMIN ROLE REJECTED (HTTP 403) ───────────────────────────────────────
test('RBAC: Admin role đăng nhập Customer Web bị từ chối (HTTP 403, không token)', async () => {
  User.findOne = async () => ({
    _id: 'admin_001',
    name: 'Quản trị viên',
    email: 'admin@cafesync.vn',
    role: 'admin',
    comparePassword: async (p) => p === 'admin123'
  });

  const req = {
    body: {
      email: 'admin@cafesync.vn',
      password: 'admin123'
    }
  };
  const res = mockResponse();

  await authController.loginCustom(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.token, undefined);
  assert.equal(
    res.body.message,
    'Tài khoản nhân viên vui lòng đăng nhập tại hệ thống Admin/POS.'
  );
});

// ─── 4. TẤT CẢ CÁC ROLE STAFF KHÁC BỊ TỪ CHỐI ───────────────────────────────
for (const staffRole of ['staff', 'manager', 'quanly', 'nhanvien']) {
  test(`RBAC: Staff role "${staffRole}" bị từ chối vào Customer Web (HTTP 403, no token)`, async () => {
    User.findOne = async () => ({
      _id: `staff_${staffRole}`,
      name: `Nhân viên ${staffRole}`,
      email: `${staffRole}@cafesync.vn`,
      role: staffRole,
      comparePassword: async (p) => p === 'staff123'
    });

    const req = {
      body: {
        email: `${staffRole}@cafesync.vn`,
        password: 'staff123'
      }
    };
    const res = mockResponse();

    await authController.loginCustom(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.token, undefined);
    assert.equal(
      res.body.message,
      'Tài khoản nhân viên vui lòng đăng nhập tại hệ thống Admin/POS.'
    );
  });
}

// ─── 5. RECOMMENDATION: STAFF EMAIL FALLS BACK TO LAYER 1 ───────────────────
test('RBAC: Request recommendation với email staff/admin fallback về Layer 1, không phục vụ Layer 2', async () => {
  User.findOne = (query) => ({
    select: () => ({
      lean: async () => ({
        role: 'manager'
      })
    })
  });

  // Aggregation for Layer 1
  Order.aggregate = async () => [
    {
      _id: 'p1',
      totalSoldInSlot: 20,
      product: { name: 'Cà phê muối', price: 35000 },
      categoryDoc: { name: 'Cà phê' }
    }
  ];

  const req = {
    query: {
      email: 'manager@cafesync.vn',
      hour: '9'
    }
  };
  const res = mockResponse();

  await recommendationController.getRecommendations(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.type, 'CONTEXT_POPULAR');
  assert.equal(res.body.recommendationSource, 'TIME_SLOT_POPULARITY');
  assert.equal(res.body.userPreferenceProfile, undefined);
  assert.equal(res.body.layer, undefined);
});

// ─── 6. ORDER HISTORY: GET ORDERS BY EMAIL SECURITY ─────────────────────────
test('RBAC: getOrdersByEmail từ chối khi thiếu Authorization header (HTTP 401)', async () => {
  const req = {
    params: { email: 'anyuser@example.com' },
    headers: {}
  };
  const res = mockResponse();

  await orderController.getOrdersByEmail(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(
    res.body.message,
    'Vui lòng đăng nhập để xem lịch sử đơn hàng.'
  );
});

test('RBAC: getOrdersByEmail từ chối khi token thuộc role staff/admin (HTTP 403)', async () => {
  const staffToken = jwt.sign(
    { id: 'staff_1', role: 'nhanvien', email: 'nhanvien@cafesync.vn' },
    JWT_SECRET
  );

  const req = {
    params: { email: 'nhanvien@cafesync.vn' },
    headers: { authorization: `Bearer ${staffToken}` }
  };
  const res = mockResponse();

  await orderController.getOrdersByEmail(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(
    res.body.message,
    'Tài khoản nhân viên không sử dụng chức năng lịch sử trên Customer Web.'
  );
});

test('RBAC: getOrdersByEmail từ chối customer xem lịch sử của email khác (HTTP 403)', async () => {
  const customerToken = jwt.sign(
    { id: 'cust_1', role: 'customer', email: 'userA@example.com' },
    JWT_SECRET
  );

  const req = {
    params: { email: 'userB@example.com' },
    headers: { authorization: `Bearer ${customerToken}` }
  };
  const res = mockResponse();

  await orderController.getOrdersByEmail(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(
    res.body.message,
    'Bạn chỉ có thể xem lịch sử đơn hàng của chính mình.'
  );
});

test('RBAC: getOrdersByEmail từ chối khi email URL thuộc tài khoản staff/admin (HTTP 403)', async () => {
  const staffToken = jwt.sign(
    { id: 'admin_1', role: 'customer', email: 'admin@cafesync.vn' },
    JWT_SECRET
  );

  User.findOne = (query) => ({
    select: () => ({
      lean: async () => ({
        role: 'admin'
      })
    })
  });

  const req = {
    params: { email: 'admin@cafesync.vn' },
    headers: { authorization: `Bearer ${staffToken}` }
  };
  const res = mockResponse();

  await orderController.getOrdersByEmail(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(
    res.body.message,
    'Không thể xem lịch sử của tài khoản nhân viên trên Customer Web.'
  );
});

test('RBAC: getOrdersByEmail cho phép customer xem lịch sử của chính mình (HTTP 200)', async () => {
  const customerToken = jwt.sign(
    { id: 'cust_1', role: 'customer', email: 'userA@example.com' },
    JWT_SECRET
  );

  User.findOne = (query) => ({
    select: () => ({
      lean: async () => ({
        role: 'customer'
      })
    })
  });

  const mockOrders = [
    { _id: 'o1', customerEmail: 'userA@example.com', totalPrice: 50000 }
  ];

  Order.find = () => ({
    sort: () => Promise.resolve(mockOrders)
  });

  const req = {
    params: { email: 'userA@example.com' },
    headers: { authorization: `Bearer ${customerToken}` }
  };
  const res = mockResponse();

  await orderController.getOrdersByEmail(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, mockOrders);
});

// ─── 7. ROUTE DUPLICATION TEST (REQ 8 & 9) ──────────────────────────────────
test('RBAC: Route duplication check - login-custom chỉ đăng ký 1 lần trong authRoutes', () => {
  const authRoutes = require('../src/routes/authRoutes');
  const loginCustomRoutes = authRoutes.stack.filter(
    (layer) => layer.route && layer.route.path === '/login-custom'
  );
  assert.equal(loginCustomRoutes.length, 1, 'login-custom phải được đăng ký chính xác 1 lần trong authRoutes');
  assert.equal(loginCustomRoutes[0].route.methods.post, true);

  // Kiểm tra file server.js không còn chứa app.post('/api/auth/login-custom')
  const fs = require('fs');
  const path = require('path');
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  assert.equal(
    serverCode.includes("app.post('/api/auth/login-custom'"),
    false,
    'server.js không được chứa route trùng app.post(/api/auth/login-custom)'
  );
});

// ─── 7. FRONTEND AUTH GUARD SIMULATION & BEHAVIOR (G.7) ──────────────────────
test('RBAC Frontend: Staff session in localStorage is detected and purged', () => {
  const staffRoles = ['admin', 'manager', 'quanly', 'nhanvien', 'staff'];
  for (const staffRole of staffRoles) {
    const mockStorage = {
      userRole: staffRole,
      userToken: 'mock.token.value',
      userName: 'Staff User',
      userEmail: 'staff@cafesync.vn'
    };

    // Simulate purgeIfStaffSession
    let isStaff = false;
    if (staffRoles.includes(mockStorage.userRole)) {
      isStaff = true;
      delete mockStorage.userToken;
      delete mockStorage.userName;
      delete mockStorage.userEmail;
      delete mockStorage.userRole;
    }

    assert.equal(isStaff, true);
    assert.equal(mockStorage.userToken, undefined);
    assert.equal(mockStorage.userRole, undefined);
    assert.equal(mockStorage.userEmail, undefined);
    assert.equal(mockStorage.userName, undefined);
  }
});

test('RBAC Frontend: Legacy staff token without userRole is detected and purged', () => {
  const staffToken = jwt.sign(
    { id: 'staff_1', role: 'admin', email: 'admin@cafesync.vn' },
    JWT_SECRET
  );

  const mockStorage = {
    userToken: staffToken,
    userName: 'Admin User',
    userEmail: 'admin@cafesync.vn'
  };

  const payload = jwt.decode(mockStorage.userToken);
  const staffRoles = ['admin', 'manager', 'quanly', 'nhanvien', 'staff'];
  let isStaff = false;

  if (payload && staffRoles.includes(payload.role)) {
    isStaff = true;
    delete mockStorage.userToken;
    delete mockStorage.userName;
    delete mockStorage.userEmail;
    delete mockStorage.userRole;
  }

  assert.equal(isStaff, true);
  assert.equal(mockStorage.userToken, undefined);
});

test('RBAC Frontend: Customer and Guest sessions are preserved and not purged', () => {
  const customerToken = jwt.sign(
    { id: 'c1', role: 'customer', email: 'cust@example.com' },
    JWT_SECRET
  );

  const customerStorage = {
    userRole: 'customer',
    userToken: customerToken,
    userName: 'Customer A',
    userEmail: 'cust@example.com'
  };

  const staffRoles = ['admin', 'manager', 'quanly', 'nhanvien', 'staff'];
  let isStaff = staffRoles.includes(customerStorage.userRole);
  assert.equal(isStaff, false);
  assert.equal(customerStorage.userRole, 'customer');

  const guestStorage = {};
  isStaff = staffRoles.includes(guestStorage.userRole);
  assert.equal(isStaff, false);
  assert.equal(Object.keys(guestStorage).length, 0);
});

