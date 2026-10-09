const Order = require("../models/Order");
const { isStaff, nextStatus } = require('../utils/orderWorkflow');
const getPayOS = () => {
  const PayOS = require('@payos/node');
  return new PayOS(process.env.PAYOS_CLIENT_ID, process.env.PAYOS_API_KEY, process.env.PAYOS_CHECKSUM_KEY);
};

// 📌 1. Xử lý đặt hàng
const createOrder = async (req, res) => {
  try {
    const { items, totalPrice, location, tableNumber, paymentMethod, orderID, customerEmail } = req.body;

    const finalOrderID = orderID || `CFS${Math.floor(Math.random() * 900000 + 100000)}`;
    const Table = require('../models/Table');
    const paidPOS = paymentMethod === 'Tiền mặt' && req.body.source === 'pos' && req.body.paymentConfirmed === true;
    if (paidPOS && !isStaff(req)) return res.status(403).json({ message: 'Chỉ nhân viên được xác nhận thu tiền tại quầy' });

    // Cập nhật trạng thái bàn nếu có chọn bàn
    if (tableNumber && paidPOS) {
      const updatedTable = await Table.findOneAndUpdate({ tableNumber }, { status: 'Đang phục vụ' }, { new: true });
      const io = req.app.get('io');
      if (io && updatedTable) {
        io.emit('table_updated', updatedTable.toObject());
      }
    }

    // --- TRƯỜNG HỢP 1: THANH TOÁN TIỀN MẶT ---
    if (paymentMethod === "Tiền mặt") {
      const newOrder = await Order.create({
        orderID: finalOrderID,
        items,
        totalPrice,
        location,
        tableNumber: tableNumber || null,
        paymentMethod: "Tiền mặt",
        customerEmail: customerEmail || "Guest",
        status: paidPOS ? 'Chờ pha chế' : 'Chờ thanh toán',
        paymentStatus: paidPOS ? 'paid' : 'pending',
        paidAt: paidPOS ? new Date() : undefined,
        createdAt: Date.now(),
      });

      // Bắn tín hiệu socket.io cho Admin
      const io = req.app.get('io');
      if (io && paidPOS) io.emit('new_order', newOrder);

      return res.status(201).json(newOrder);
    }

    // --- TRƯỜNG HỢP 2: THANH TOÁN ONLINE (PAYOS) ---
    try {
      const PayOS = require("@payos/node");

      const payosInstance = new PayOS(
        process.env.PAYOS_CLIENT_ID,
        process.env.PAYOS_API_KEY,
        process.env.PAYOS_CHECKSUM_KEY
      );

      const orderCode = Number(finalOrderID.replace(/[^0-9]/g, ""));

      const requestHost = req.get('host') || '';
      const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1');

      const FRONTEND_URL = isLocalhost 
        ? (req.get('origin') || "http://localhost:3001")
        : (process.env.FRONTEND_URL || "https://cafe-sync-intelligent-system.vercel.app");

      const BACKEND_URL = isLocalhost
        ? `${req.protocol}://${requestHost}`
        : (process.env.BACKEND_URL || "https://cafesync-intelligent-system-sntf.onrender.com");

      const paymentData = {
        orderCode: orderCode,
        amount: totalPrice,
        description: `TT don ${finalOrderID.slice(-8)}`, // Viết tắt và chỉ lấy 8 số cuối của ID cho ngắn
        returnUrl: `${FRONTEND_URL}/track-order`,
        cancelUrl: `${BACKEND_URL}/api/orders/cancel/${finalOrderID}`,
      };

      const paymentLinkRes = await payosInstance.createPaymentLink(paymentData);

      const pendingOrder = await Order.create({
        orderID: finalOrderID,
        items,
        totalPrice,
        location,
        tableNumber: tableNumber || null,
        paymentMethod: "Chuyển khoản/Ví điện tử",
        customerEmail: customerEmail || "Guest",
        status: "Chờ thanh toán",
        paymentStatus: 'pending',
        payosOrderCode: orderCode,
        createdAt: Date.now(),
      });

      // Pending payments do not enter the preparation queue.

      return res.status(200).json({
        _id: pendingOrder._id,
        checkoutUrl: paymentLinkRes.checkoutUrl,
        message: "Vui lòng quét mã QR để hoàn tất."
      });

    } catch (payError) {
      console.error("Lỗi PayOS:", payError);
      return res.status(500).json({ message: "Lỗi kết nối cổng thanh toán!" });
    }

  } catch (err) {
    console.error("Lỗi tổng quát:", err);
    res.status(500).json({ message: err.message });
  }
};

// 📌 2. Lấy tất cả đơn hàng
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📌 3. Lấy lịch sử theo Email
const getOrdersByEmail = async (req, res) => {
  try {
    const identifier = req.params.email;
    const orders = await Order.find({ customerEmail: identifier }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy lịch sử!", error: err.message });
  }
};

// 📌 4. Lấy chi tiết đơn theo ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📌 5. Cập nhật trạng thái (Tiếp nhận/Hoàn thành)
const updateOrderStatus = async (req, res) => {
  try {
    if (!isStaff(req)) return res.status(403).json({ message: 'Chỉ nhân viên được điều phối đơn' });
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (!status || nextStatus(order) !== status) return res.status(409).json({ message: 'Đơn chưa thanh toán hoặc chuyển trạng thái không hợp lệ' });
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status, paymentStatus: 'paid' },
      { $set: { status } }, { new: true }
    );
    if (!updated) return res.status(409).json({ message: 'Đơn đã được nhân viên khác cập nhật' });
    const io = req.app.get('io');
    if (io) io.emit('order_updated', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📌 6. Xóa đơn hàng
const deleteOrder = async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Đã xóa đơn hàng thành công" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📌 7. Hủy đơn khi khách nhấn Hủy trên PayOS
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const requestHost = req.get('host') || '';
    const isLocalhost = requestHost.includes('localhost') || requestHost.includes('127.0.0.1');
    const FRONTEND_URL = isLocalhost 
      ? "http://localhost:3001" 
      : (process.env.FRONTEND_URL || "https://cafe-sync-intelligent-system.vercel.app");

    const cancelled = await Order.findOneAndUpdate(
      { orderID: orderId, status: 'Chờ thanh toán', paymentStatus: { $ne: 'paid' } },
      { $set: { status: 'Đã hủy' } }, { new: true }
    );
    if (cancelled) req.app.get('io')?.emit('order_updated', cancelled);
    res.redirect(`${FRONTEND_URL}/cart?status=cancelled`);
  } catch (error) {
    console.error("Lỗi khi hủy đơn hàng:", error);
    res.status(500).json({ message: "Không thể xử lý yêu cầu xóa đơn." });
  }
};
// 📌 8. Nhận Webhook từ PayOS để tự động cập nhật trạng thái
async function releasePaidOrder(req, orderCode, amount) {
  const code = Number(orderCode);
  if (!Number.isSafeInteger(code) || code <= 0) throw new Error('Invalid code');
  const order = await Order.findOne({ $or: [{ payosOrderCode: code }, { orderID: String(code) }, { orderID: 'CFS' + code }] });
  if (!order) return null;
  if (Number(amount) !== order.totalPrice) throw new Error('Amount mismatch');
  if (order.paymentStatus === 'paid') return order;
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: 'Chờ thanh toán', paymentStatus: { $ne: 'paid' } },
    { $set: { paymentStatus: 'paid', paidAt: new Date(), status: 'Chờ pha chế' } }, { new: true }
  );
  if (!updated) return null;
  const io = req.app.get('io');
  if (updated.tableNumber) {
    const Table = require('../models/Table');
    const table = await Table.findOneAndUpdate({ tableNumber: updated.tableNumber }, { $set: { status: 'Đang phục vụ' } }, { new: true });
    if (table) io?.emit('table_updated', table);
  }
  io?.emit('new_order', updated);
  io?.emit('order_updated', updated);
  return updated;
}
const receiveWebhook = async (req, res) => {
  let data;
  try { data = getPayOS().verifyPaymentWebhookData(req.body); }
  catch { return res.status(400).json({ message: 'Chữ ký webhook không hợp lệ' }); }
  if (data.code !== '00') return res.json({ message: 'Ignored unsuccessful payment' });
  try {
    await releasePaidOrder(req, data.orderCode, data.amount);
    return res.json({ message: 'Webhook received' });
  } catch { return res.status(500).json({ message: 'Không xác nhận được thanh toán' }); }
};
const paymentSuccess = async (req, res) => {
  const code = Number(req.body.orderCode);
  if (!Number.isSafeInteger(code) || code <= 0) return res.status(400).json({ message: 'Mã thanh toán không hợp lệ' });
  try {
    const payment = await getPayOS().getPaymentLinkInformation(code);
    if (payment.status !== 'PAID') return res.status(409).json({ message: 'PayOS chưa xác nhận đã thanh toán' });
    const order = await releasePaidOrder(req, code, payment.amountPaid);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn chờ thanh toán' });
    return res.json({ message: 'Thành công', order });
  } catch { return res.status(502).json({ message: 'Không xác minh được thanh toán với PayOS' }); }
};

// Cash orders created on the customer website can be released after staff collect money.
const confirmCashPayment = async (req, res) => {
  if (!isStaff(req)) return res.status(403).json({ message: 'Chỉ nhân viên được xác nhận thu tiền' });
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn' });
    if (order.paymentMethod !== 'Tiền mặt' || order.paymentStatus === 'paid' || order.status === 'Đã hủy') {
      return res.status(409).json({ message: 'Đơn không thể xác nhận thu tiền mặt' });
    }
    // Explicit staff confirmation also handles legacy cash orders without migrating history.
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status, paymentStatus: { $ne: 'paid' } },
      { $set: { paymentStatus: 'paid', paidAt: new Date(), status: 'Chờ pha chế' } }, { new: true }
    );
    if (!updated) return res.status(409).json({ message: 'Đơn đã được cập nhật' });
    req.app.get('io')?.emit('new_order', updated);
    req.app.get('io')?.emit('order_updated', updated);
    return res.json(updated);
  } catch { return res.status(500).json({ message: 'Không xác nhận được thu tiền' }); }
};

module.exports = {
  createOrder,
  getOrders,
  getOrdersByEmail,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  cancelOrder,
  receiveWebhook,
  paymentSuccess,
  confirmCashPayment,
};
