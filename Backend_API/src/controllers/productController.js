const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');

// GET /api/products
const getProducts = async (req, res) => {
  try {
    const { category } = req.query;

    let filter = {};

    // nếu có category thì lọc
    if (category) {
      filter.category = category;
    }

    const products = await Product.find(filter).populate('category');

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST create product

// POST /products
const createProduct = async (req, res) => {
  try {
    const data = req.body;

    if (Array.isArray(data)) {
      const products = await Product.insertMany(data);
      return res.status(201).json(products);
    } else {
      const product = new Product(data);
      await product.save();
      return res.status(201).json(product);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProduct = async (req, res) => {
    try {
        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// DELETE product
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

        // Xóa file ảnh nếu có
        if (product.image) {
            const imagePath = path.join(__dirname, '../../public/images', product.image);
            fs.unlink(imagePath, (err) => {
                // Không cần trả lỗi nếu file không tồn tại
            });
        }

        res.json({ message: "Đã xóa sản phẩm" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET single product by ID
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category');
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductById
};