const jwt = require('jsonwebtoken');
const staffRoles = ['admin', 'manager', 'quanly', 'nhanvien', 'staff'];
function isStaff(req) {
  return !staffAuthError(req);
}
function staffAuthError(req) {
  const header = req.headers.authorization;
  if (!header || !/^Bearer\s+\S+$/i.test(header)) {
    return { status: 401, message: 'Vui lòng đăng nhập lại để tiếp tục.' };
  }
  try {
    const token = header.split(/\s+/)[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'CAFE_SYNC_SECRET_KEY');
    if (!isStaffRole(decoded.role)) return { status: 403, message: 'Tài khoản không có quyền điều phối đơn. Vui lòng dùng tài khoản nhân viên hoặc quản lý.' };
    return null;
  } catch (error) {
    return { status: 401, message: error.name === 'TokenExpiredError'
      ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      : 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.' };
  }
}
function isStaffRole(role) {
  return typeof role === 'string' && staffRoles.includes(role.toLowerCase().trim());
}
function isPaid(order) { return order.paymentStatus === 'paid'; }
function nextStatus(order) {
  if (!isPaid(order)) return null;
  if (order.status === 'Chờ pha chế') return 'Đang pha chế';
  if (order.status === 'Đang pha chế') return 'Hoàn thành';
  return null;
}
module.exports = { isStaff, staffAuthError, isStaffRole, isPaid, nextStatus, staffRoles };
