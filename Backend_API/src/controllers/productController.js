const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const Order = require('../models/Order');

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

    const { email } = req.query;
    let habit = null;

    if (email && email !== 'Guest') {
      const lastOrderWithProduct = await Order.findOne({
        customerEmail: email,
        "items.id_product": req.params.id,
        status: { $nin: ["Chờ thanh toán", "Đã hủy", "Cancelled"] }
      }).sort({ createdAt: -1 });

      if (lastOrderWithProduct) {
        const matchItem = lastOrderWithProduct.items.find(
          item => item.id_product && item.id_product.toString() === req.params.id
        );
        if (matchItem && matchItem.options) {
          habit = matchItem.options;
        }
      }
    }

    const productObj = product.toObject();
    res.json({
      ...productObj,
      habit
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/products/recommendations
const getRecommendations = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || email === 'Guest') {
      return res.json({ favorites: [], newFlavors: [] });
    }

    // Lấy tất cả đơn hàng đã hoàn thành (không bị hủy/chờ thanh toán) của email này
    const orders = await Order.find({ 
      customerEmail: email,
      status: { $nin: ["Chờ thanh toán", "Đã hủy", "Cancelled"] }
    });

    if (!orders || orders.length === 0) {
      return res.json({ favorites: [], newFlavors: [] });
    }

    // Đếm tần suất đặt mua của từng sản phẩm
    const productFrequency = {};
    const purchasedProductIds = new Set();
    const categoryFrequency = {};

    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item.id_product) {
            const pId = item.id_product.toString();
            const qty = item.quantity || 1;
            
            productFrequency[pId] = (productFrequency[pId] || 0) + qty;
            purchasedProductIds.add(pId);
          }
        });
      }
    });

    // Sắp xếp các sản phẩm được đặt nhiều nhất
    const sortedProductIds = Object.keys(productFrequency).sort((a, b) => productFrequency[b] - productFrequency[a]);
    const favoriteProductIds = sortedProductIds.slice(0, 4);

    // Lấy chi tiết sản phẩm món tủ
    const favoriteProducts = await Product.find({ _id: { $in: favoriteProductIds } }).populate('category');
    const sortedFavorites = favoriteProducts.sort((a, b) => {
      return favoriteProductIds.indexOf(a._id.toString()) - favoriteProductIds.indexOf(b._id.toString());
    });

    // Lấy danh mục được mua nhiều nhất của người dùng
    const populatedProducts = await Product.find({ _id: { $in: Array.from(purchasedProductIds) } });
    populatedProducts.forEach(p => {
      if (p.category) {
        const catId = p.category.toString();
        const freq = productFrequency[p._id.toString()] || 1;
        categoryFrequency[catId] = (categoryFrequency[catId] || 0) + freq;
      }
    });

    const sortedCategoryIds = Object.keys(categoryFrequency).sort((a, b) => categoryFrequency[b] - categoryFrequency[a]);
    const favoriteCategoryId = sortedCategoryIds[0];

    let newFlavors = [];
    if (favoriteCategoryId) {
      // Gợi ý sản phẩm cùng danh mục yêu thích nhưng chưa từng mua
      newFlavors = await Product.find({
        category: favoriteCategoryId,
        _id: { $nin: Array.from(purchasedProductIds) }
      }).populate('category').limit(4);
    }

    res.json({
      favorites: sortedFavorites,
      newFlavors
    });

  } catch (err) {
    console.error("Lỗi gợi ý sản phẩm:", err);
    res.status(500).json({ message: "Lỗi tính toán gợi ý sản phẩm", error: err.message });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getRecommendations
};
