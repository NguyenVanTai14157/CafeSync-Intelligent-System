const express = require("express");
const router = express.Router();

const {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
    getOrdersByEmail,
    cancelOrder,
    receiveWebhook, // <--- PHẢI CÓ hàm này để xử lý tín hiệu "Đã thanh toán"
    paymentSuccess
} = require("../controllers/orderController");

// 1. Nhận đơn hàng
router.post("/", createOrder);

// 2. WEBHOOK - Đây là chìa khóa để tự đổi trạng thái đơn hàng!
// Route này phải khớp với link Ngrok con dán trên Dashboard PayOS
router.post("/webhook", receiveWebhook);

// 2.5 Endpoint dự phòng cho localhost (bắt ReturnURL)
router.post("/payment-success", paymentSuccess);

// 3. Lấy danh sách & Lịch sử
router.get("/", getOrders);
router.get("/user/:email", getOrdersByEmail);

// 4. Hủy đơn (Xử lý khi khách bấm nút Hủy trên PayOS)
router.get('/cancel/:orderId', cancelOrder);

// 5. Chi tiết & Cập nhật
router.get("/:id", getOrderById);
router.put("/:id/status", updateOrderStatus);
router.delete("/:id", deleteOrder);

module.exports = router;