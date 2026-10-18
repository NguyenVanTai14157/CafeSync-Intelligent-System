export const STAFF_ROLES = ['admin', 'manager', 'quanly', 'nhanvien', 'staff'];

/**
 * Kiểm tra xem một role có thuộc nhóm nhân viên / quản trị hay không.
 * @param {string} role
 * @returns {boolean}
 */
export function isStaffRole(role) {
  if (!role || typeof role !== 'string') return false;
  return STAFF_ROLES.includes(role.toLowerCase().trim());
}

/**
 * Giải mã phần payload của JWT một cách an toàn mà không cần thêm thư viện ngoài.
 * @param {string} token
 * @returns {object|null}
 */
export function parseJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Xóa sạch dữ liệu phiên đăng nhập của customer khỏi localStorage.
 */
export function clearCustomerAuth() {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userRole');
}

/**
 * Kiểm tra xem phiên đăng nhập hiện tại có thuộc tài khoản nhân viên / quản trị hay không.
 * Nếu phát hiện role thuộc staff/admin trong localStorage hoặc trong token cũ:
 * 1. Xóa userToken, userName, userEmail, userRole.
 * 2. Trả về true (phát hiện tài khoản staff).
 * Ngược lại trả về false.
 * @returns {boolean}
 */
export function purgeIfStaffSession() {
  const role = localStorage.getItem('userRole');
  const token = localStorage.getItem('userToken');

  let isStaff = false;

  if (role && isStaffRole(role)) {
    isStaff = true;
  }

  if (token) {
    const payload = parseJwt(token);
    if (payload && payload.role && isStaffRole(payload.role)) {
      isStaff = true;
    }
  }

  if (isStaff) {
    clearCustomerAuth();
    return true;
  }

  return false;
}
