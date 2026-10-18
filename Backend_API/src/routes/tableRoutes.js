const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { requireStaff } = require('../middleware/auth.middleware');

// Toàn bộ API quản lý bàn chỉ dành cho tài khoản nhân viên / quản trị (Staff / Admin)
router.use(requireStaff);

// Lấy danh sách tất cả bàn
router.get('/', tableController.getAllTables);

// Tạo bàn mới
router.post('/', tableController.createTable);

// Cập nhật trạng thái bàn (có thể bằng ObjectId hoặc tableNumber)
router.put('/:id/status', tableController.updateTableStatus);

// Khởi tạo 50 bàn (chỉ tạo nếu thiếu)
router.post('/initialize', tableController.initializeTables);

// (Dành cho Admin) Xoá tất cả bàn 
router.delete('/delete-all', tableController.deleteAllTables);

module.exports = router;
