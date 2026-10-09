const jwt = require('jsonwebtoken');
const staffRoles = ['admin', 'manager', 'quanly', 'nhanvien', 'staff'];
function isStaff(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    return staffRoles.includes(jwt.verify(token, process.env.JWT_SECRET).role);
  } catch { return false; }
}
function isPaid(order) { return order.paymentStatus === 'paid'; }
function nextStatus(order) {
  if (!isPaid(order)) return null;
  if (order.status === 'Chờ pha chế') return 'Đang pha chế';
  if (order.status === 'Đang pha chế') return 'Hoàn thành';
  return null;
}
module.exports = { isStaff, isPaid, nextStatus };
