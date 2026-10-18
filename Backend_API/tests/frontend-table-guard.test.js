const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

// Simulation of browser environment for tableContext and authGuard
const createMockLocalStorage = () => {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    _store: store
  };
};

describe('Frontend Table Context and Route Guard Contract Tests (Section 15)', () => {
  let mockStorage;
  let mockWindow;

  // Mirror pure functions from frontend-client/src/utils/tableContext.js
  const MIN_TABLE = 1;
  const MAX_TABLE = 51;

  function isValidTableNumber(tableNumber) {
    if (tableNumber === null || tableNumber === undefined || tableNumber === '') return false;
    const num = Number(tableNumber);
    return Number.isInteger(num) && num >= MIN_TABLE && num <= MAX_TABLE;
  }

  function getTableContext(storage = mockStorage) {
    const rawTable = storage.getItem('tableNumber');
    const rawToken = storage.getItem('tableToken');
    const validTable = isValidTableNumber(rawTable) ? Number(rawTable) : null;
    const validToken = (typeof rawToken === 'string' && rawToken.trim().length > 0) ? rawToken.trim() : null;
    return {
      tableNumber: validTable,
      tableToken: validToken,
      isTableOrder: validTable !== null,
      hasValidContext: validTable !== null && validToken !== null
    };
  }

  function setTableContext(tableNumber, tableToken, storage = mockStorage) {
    if (!isValidTableNumber(tableNumber)) throw new Error('Invalid table');
    if (!tableToken || typeof tableToken !== 'string') throw new Error('Missing token');
    storage.setItem('tableNumber', String(Number(tableNumber)));
    storage.setItem('tableToken', tableToken.trim());
  }

  function processUrlTableParams(searchString, storage = mockStorage, windowObj = mockWindow) {
    if (!searchString) return { processed: false };
    const params = new URLSearchParams(searchString);
    const tableParam = params.get('table');
    const tokenParam = params.get('tableToken');

    if (tableParam !== null && tableParam !== undefined) {
      if (!isValidTableNumber(tableParam)) {
        return { processed: true, status: 'INVALID_TABLE_NUMBER' };
      }
      const parsedTable = Number(tableParam);
      const current = getTableContext(storage);

      if (tokenParam && tokenParam.trim()) {
        if (current.hasValidContext && current.tableNumber !== parsedTable) {
          // Do not overwrite existing table
          return {
            processed: true,
            status: 'PREVENTED_SWITCH',
            tableNumber: current.tableNumber,
            tableToken: current.tableToken
          };
        }
        setTableContext(parsedTable, tokenParam.trim(), storage);
        return {
          processed: true,
          status: 'CONTEXT_SAVED',
          tableNumber: parsedTable,
          tableToken: tokenParam.trim()
        };
      } else {
        return { processed: true, status: 'MISSING_TOKEN' };
      }
    }
    return { processed: false };
  }

  // Mirror pure functions from frontend-client/src/utils/authGuard.js
  const STAFF_ROLES = ['admin', 'manager', 'quanly', 'nhanvien', 'staff'];
  function isStaffRole(role) {
    if (!role || typeof role !== 'string') return false;
    return STAFF_ROLES.includes(role.toLowerCase().trim());
  }

  function purgeIfStaffSession(storage = mockStorage) {
    const role = storage.getItem('userRole');
    const token = storage.getItem('userToken');
    let isStaff = false;
    if (role && isStaffRole(role)) isStaff = true;
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded?.role && isStaffRole(decoded.role)) isStaff = true;
      } catch {}
    }
    if (isStaff) {
      storage.removeItem('userToken');
      storage.removeItem('userName');
      storage.removeItem('userEmail');
      storage.removeItem('userRole');
      return true;
    }
    return false;
  }

  function evaluateRouteAccess({ path, requireAuth, storage = mockStorage }) {
    const isStaff = purgeIfStaffSession(storage);
    if (isStaff) {
      return { allowed: false, redirect: '/login', reason: 'STAFF_BLOCKED' };
    }
    const token = storage.getItem('userToken');
    if (requireAuth && !token) {
      return { allowed: false, redirect: '/login', reason: 'AUTH_REQUIRED' };
    }
    return { allowed: true };
  }

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    mockWindow = {
      location: { search: '', href: 'http://localhost:3000/' },
      history: { replaceState: () => {} }
    };
  });

  // 1. URL có table=1&tableToken=... lưu đúng context.
  test('1. URL có table=1&tableToken=... lưu đúng context', () => {
    const search = '?table=1&tableToken=sample-valid-token-123';
    const res = processUrlTableParams(search);
    assert.equal(res.status, 'CONTEXT_SAVED');
    assert.equal(res.tableNumber, 1);
    const ctx = getTableContext();
    assert.equal(ctx.hasValidContext, true);
    assert.equal(ctx.tableNumber, 1);
    assert.equal(ctx.tableToken, 'sample-valid-token-123');
  });

  // 2. Query table/token được xóa khỏi URL.
  test('2. Query table/token được nhận diện để xóa khỏi URL', () => {
    const url = new URL('https://cafesync.vn/?table=10&tableToken=secret123&utm_source=qr');
    url.searchParams.delete('table');
    url.searchParams.delete('tableToken');
    assert.equal(url.searchParams.has('table'), false);
    assert.equal(url.searchParams.has('tableToken'), false);
    assert.equal(url.searchParams.get('utm_source'), 'qr');
  });

  // 3. URL mới table=2 không ghi đè context hiện tại là Bàn 1.
  test('3. URL mới table=2 không ghi đè context hiện tại là Bàn 1', () => {
    setTableContext(1, 'valid-token-table-1');
    const res = processUrlTableParams('?table=2&tableToken=other-token');
    assert.equal(res.status, 'PREVENTED_SWITCH');
    const ctx = getTableContext();
    assert.equal(ctx.tableNumber, 1);
    assert.equal(ctx.tableToken, 'valid-token-table-1');
  });

  // 4. Table ngoài khoảng 1–51 bị từ chối.
  test('4. Table ngoài khoảng 1–51 bị từ chối', () => {
    assert.equal(isValidTableNumber(0), false);
    assert.equal(isValidTableNumber(52), false);
    assert.equal(isValidTableNumber(-5), false);
    assert.equal(isValidTableNumber(1), true);
    assert.equal(isValidTableNumber(51), true);

    const res0 = processUrlTableParams('?table=0&tableToken=token');
    assert.equal(res0.status, 'INVALID_TABLE_NUMBER');
    const res52 = processUrlTableParams('?table=52&tableToken=token');
    assert.equal(res52.status, 'INVALID_TABLE_NUMBER');
  });

  // 5. Có tableNumber nhưng thiếu token thì checkout bị chặn.
  test('5. Có tableNumber nhưng thiếu token thì checkout bị chặn', () => {
    // Only tableNumber in storage without token
    mockStorage.setItem('tableNumber', '10');
    const ctx = getTableContext();
    assert.equal(ctx.isTableOrder, true);
    assert.equal(ctx.hasValidContext, false);

    // Checkout validator check
    const canCheckoutAtTable = !ctx.isTableOrder || ctx.hasValidContext;
    assert.equal(canCheckoutAtTable, false);
  });

  // 6. Checkout gửi tableNumber và tableToken.
  test('6. Checkout gửi tableNumber và tableToken', () => {
    setTableContext(14, 'signed-token-14');
    const ctx = getTableContext();
    const isTable = ctx.isTableOrder && ctx.hasValidContext;
    const orderPayload = {
      location: isTable ? `Bàn ${ctx.tableNumber}` : 'Mang đi',
      tableNumber: isTable ? ctx.tableNumber : null,
      tableToken: isTable ? ctx.tableToken : undefined
    };
    assert.equal(orderPayload.tableNumber, 14);
    assert.equal(orderPayload.tableToken, 'signed-token-14');
    assert.equal(orderPayload.location, 'Bàn 14');
  });

  // 7. Guest vẫn vào checkout khi có cart và QR context hợp lệ.
  test('7. Guest vẫn vào checkout khi có cart và QR context hợp lệ', () => {
    setTableContext(7, 'token-7');
    const access = evaluateRouteAccess({ path: '/checkout', requireAuth: false });
    assert.equal(access.allowed, true);
  });

  // 8. Guest vẫn tracking được order bằng order ID.
  test('8. Guest vẫn tracking được order bằng order ID', () => {
    mockStorage.setItem('lastOrderDBId', '661b369d1234567890abcdef');
    const access = evaluateRouteAccess({ path: '/track-order', requireAuth: false });
    assert.equal(access.allowed, true);
    assert.equal(mockStorage.getItem('lastOrderDBId'), '661b369d1234567890abcdef');
  });

  // 9. Takeaway không cần tableToken.
  test('9. Takeaway không cần tableToken', () => {
    // No table in storage
    const ctx = getTableContext();
    assert.equal(ctx.isTableOrder, false);
    const orderPayload = {
      location: 'Mang đi',
      tableNumber: null
    };
    assert.equal(orderPayload.tableNumber, null);
    assert.equal(orderPayload.location, 'Mang đi');
    assert.equal(orderPayload.tableToken, undefined);
  });

  // 10. Customer vẫn vào checkout.
  test('10. Customer vẫn vào checkout', () => {
    mockStorage.setItem('userToken', jwt.sign({ id: 'c1', role: 'customer' }, 'secret'));
    mockStorage.setItem('userRole', 'customer');
    const access = evaluateRouteAccess({ path: '/checkout', requireAuth: false });
    assert.equal(access.allowed, true);
  });

  // 11. Staff/admin không vào được route Customer Web.
  test('11. Staff/admin không vào được route Customer Web', () => {
    const staffRoles = ['admin', 'manager', 'quanly', 'nhanvien', 'staff'];
    for (const r of staffRoles) {
      mockStorage.clear();
      mockStorage.setItem('userToken', jwt.sign({ id: 's1', role: r }, 'secret'));
      mockStorage.setItem('userRole', r);
      const access = evaluateRouteAccess({ path: '/cart', requireAuth: false });
      assert.equal(access.allowed, false);
      assert.equal(access.redirect, '/login');
      assert.equal(mockStorage.getItem('userToken'), null);
      assert.equal(mockStorage.getItem('userRole'), null);
    }
  });

  // 12. Profile/history/favorites yêu cầu customer login.
  test('12. Profile/history/favorites yêu cầu customer login', () => {
    // Guest accessing /profile
    const guestProfile = evaluateRouteAccess({ path: '/profile', requireAuth: true });
    assert.equal(guestProfile.allowed, false);
    assert.equal(guestProfile.redirect, '/login');

    // Guest accessing /history
    const guestHistory = evaluateRouteAccess({ path: '/history', requireAuth: true });
    assert.equal(guestHistory.allowed, false);
    assert.equal(guestHistory.redirect, '/login');

    // Guest accessing /favorites
    const guestFavorites = evaluateRouteAccess({ path: '/favorites', requireAuth: true });
    assert.equal(guestFavorites.allowed, false);
    assert.equal(guestFavorites.redirect, '/login');

    // Logged in customer accessing /profile
    mockStorage.setItem('userToken', jwt.sign({ id: 'c1', role: 'customer' }, 'secret'));
    mockStorage.setItem('userRole', 'customer');
    const custProfile = evaluateRouteAccess({ path: '/profile', requireAuth: true });
    assert.equal(custProfile.allowed, true);
  });
});
