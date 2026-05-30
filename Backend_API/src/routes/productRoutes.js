const express = require('express');
const router = express.Router();

const { 
    getProducts, 
    createProduct, 
    deleteProduct, 
    updateProduct,
    getProductById,
    getRecommendations
} = require('../controllers/productController');

const upload = require('../config/upload');
// upload nhiều ảnh
router.post('/upload', upload.array('images', 10), (req, res) => {
    const imageUrls = req.files.map(file => file.filename); // chỉ lấy tên file
    res.json({
        imageUrls
    });
});
// GET tất cả sản phẩm
router.get('/', getProducts);

// GET sản phẩm gợi ý (phải khai báo TRƯỚC /:id để tránh trùng lặp)
router.get('/recommendations', getRecommendations);

// GET sản phẩm theo ID
router.get('/:id', getProductById);

// Thêm sản phẩm
router.post('/', createProduct);

// Xóa sản phẩm
router.delete('/:id', deleteProduct);

// Update sản phẩm
router.put('/:id', updateProduct);

module.exports = router;