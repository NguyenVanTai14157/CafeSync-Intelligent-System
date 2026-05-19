const Order = require("../models/Order");

// 📌 1. Xử lý đặt hàng
const createOrder = async (req, res) => {
  try {
    const { items, totalPrice, location, tableNumber, paymentMethod, orderID, customerEmail } = req.body;

    const finalOrderID = orderID || `CFS${Math.floor(Math.random() * 900000 + 100000)}`;
    const Table = require('../models/Table');

    // Cập nhật trạng thái bàn nếu có chọn bàn
    if (tableNumber) {
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
        status: "Chờ xác nhận",
        createdAt: Date.now(),
      });

      // Bắn tín hiệu socket.io cho Admin
      const io = req.app.get('io');
      if (io) io.emit('new_order', newOrder);

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

      const FRONTEND_URL = process.env.FRONTEND_URL || "https://cafe-sync-intelligent-system.vercel.app";
      const BACKEND_URL = process.env.BACKEND_URL || "https://cafesync-intelligent-system-sntf.onrender.com";

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
        createdAt: Date.now(),
      });

      // Bắn tín hiệu socket.io cho Admin (để biết có đơn đang đợi tiền)
      const io = req.app.get('io');
      if (io) io.emit('new_order', pendingOrder);

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
    const { status } = req.body;
    const updated = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
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
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://cafe-sync-intelligent-system.vercel.app";
    await Order.findOneAndDelete({ orderID: orderId });
    console.log(`🗑️ Đã xóa vĩnh viễn đơn hàng hủy: ${orderId}`);
    res.redirect(`${FRONTEND_URL}/cart?status=cancelled`);
  } catch (error) {
    res.status(500).json({ message: "Không thể xử lý yêu cầu xóa đơn." });
  }
};
// 📌 8. Nhận Webhook từ PayOS để tự động cập nhật trạng thái
const receiveWebhook = async (req, res) => {
  try {
    console.log("🔔 Đã nhận tín hiệu từ PayOS:", req.body);
    // Trong hàm receiveWebhook (orderController.js)
    const { data } = req.body;
    if (data) {
      const orderCodeStr = data.orderCode.toString();
      // Tìm đơn hàng có orderID chứa dãy số orderCode từ PayOS gửi về
      const updatedOrder = await Order.findOneAndUpdate(
        { orderID: { $regex: orderCodeStr } },
        { status: "Đã thanh toán" },
        { new: true }
      );

      if (updatedOrder) {
        console.log(`✅ Tuyệt vời! Đơn ${updatedOrder.orderID} đã tự động đổi sang Đã thanh toán`);
        
        // Cập nhật trạng thái bàn sang "Đang phục vụ" nếu chưa cập nhật
        if (updatedOrder.tableNumber) {
          const Table = require('../models/Table');
          const updatedTable = await Table.findOneAndUpdate(
            { tableNumber: updatedOrder.tableNumber }, 
            { status: 'Đang phục vụ' },
            { new: true }
          );
          const io = req.app.get('io');
          if (io && updatedTable) io.emit('table_updated', updatedTable.toObject());
        }

        // Bắn socket cho admin thấy luôn
        const io = req.app.get('io');
        if (io) io.emit('order_updated', updatedOrder);
      }
    }

    // Luôn trả về 200 cho PayOS để họ không gửi lại tín hiệu nữa
    return res.status(200).json({ message: "Webhook received" });
  } catch (error) {
    console.error("Lỗi xử lý Webhook:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// 📌 9. Cập nhật trạng thái từ Frontend (Dự phòng cho Localhost khi không có Ngrok)
const paymentSuccess = async (req, res) => {
  try {
    const { orderCode } = req.body;
    if (orderCode) {
      const orderCodeStr = orderCode.toString();
      const updatedOrder = await Order.findOneAndUpdate(
        { orderID: { $regex: orderCodeStr } },
        { status: "Đã thanh toán" },
        { new: true }
      );

      if (updatedOrder) {
        console.log(`✅ Đơn ${updatedOrder.orderID} đã Đã thanh toán (qua Client SDK/ReturnURL)`);
        const io = req.app.get('io');
        if (io) io.emit('order_updated', updatedOrder);
        return res.status(200).json({ message: "Thành công", order: updatedOrder });
      }
    }
    return res.status(400).json({ message: "Không tìm thấy đơn hoặc thiếu mã!" });
  } catch (error) {
    console.error("Lỗi Return URL:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
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
};