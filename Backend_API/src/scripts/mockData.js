const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');

const email = process.argv[2] || 'yenluna60@gmail.com';

const generateMockData = async () => {
  try {
    console.log(`🔌 Đang kết nối tới Database: ${process.env.MONGO_URI}`);
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'CafeSyncDB'
    });
    console.log("✅ Đã kết nối thành công tới Database!");

    // 1. Lấy danh sách sản phẩm hiện có
    const products = await Product.find().populate('category');
    if (products.length === 0) {
      console.log("❌ Không tìm thấy sản phẩm nào trong database để làm giả lập. Vui lòng nhập sản phẩm trước!");
      process.exit(1);
    }

    console.log(`📚 Đang tạo đơn hàng mẫu cho email: ${email}`);

    // Xóa các đơn hàng cũ của email này để tránh trùng lặp khi chạy lại test
    const deleteRes = await Order.deleteMany({ customerEmail: email });
    console.log(`🗑️ Đã dọn dẹp ${deleteRes.deletedCount} đơn hàng cũ của email này.`);

    // Phân loại sản phẩm theo danh mục để giả lập
    const cafeProducts = products.filter(p => p.category && p.category.name && p.category.name.includes('Cà phê'));
    const otherProducts = products.filter(p => !p.category || !p.category.name || !p.category.name.includes('Cà phê'));

    if (cafeProducts.length === 0) {
      console.log("⚠️ Cảnh báo: Không tìm thấy sản phẩm Cà phê nào, sẽ sử dụng ngẫu nhiên sản phẩm.");
    }

    // Chọn sản phẩm làm "món tủ" (Ví dụ: sản phẩm đầu tiên của nhóm cà phê)
    const favoriteProduct = cafeProducts[0] || products[0];
    const secondFavorite = cafeProducts[1] || products[1] || products[0];
    const otherDrink = otherProducts[0] || products[2] || products[0];

    console.log(`⭐ Món tủ được chỉ định để test: ${favoriteProduct.name}`);
    console.log(`⭐ Món phụ để test: ${secondFavorite.name}`);

    // Tạo đơn hàng 1: Khẩu vị quen thuộc cho món tủ (Ví dụ: Size L, Đường 50%, Đá 50%, Topping)
    const order1 = new Order({
      orderID: `CFS${Math.floor(Math.random() * 900000 + 100000)}`,
      customerEmail: email,
      totalPrice: (favoriteProduct.price + 15000) * 2,
      location: "Tại quán",
      tableNumber: 3,
      status: "Hoàn thành",
      paymentMethod: "Tiền mặt",
      items: [
        {
          id_product: favoriteProduct._id,
          name: favoriteProduct.name,
          quantity: 2,
          price: favoriteProduct.price + 5000,
          options: {
            size: "L",
            sugar: "50%",
            ice: "50%",
            toppings: favoriteProduct.toppings?.[0] ? [favoriteProduct.toppings[0]] : []
          },
          note: "Ít ngọt, đá riêng"
        }
      ],
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 ngày trước
    });

    // Tạo đơn hàng 2: Đặt món tủ tiếp (để làm tăng tần suất mua và làm mới habit)
    // Habit gần nhất của món tủ: Size M, Đường 70%, Đá 30%
    const order2 = new Order({
      orderID: `CFS${Math.floor(Math.random() * 900000 + 100000)}`,
      customerEmail: email,
      totalPrice: favoriteProduct.price * 1 + secondFavorite.price * 1,
      location: "Mang đi",
      tableNumber: null,
      status: "Hoàn thành",
      paymentMethod: "Chuyển khoản/Ví điện tử",
      items: [
        {
          id_product: favoriteProduct._id,
          name: favoriteProduct.name,
          quantity: 1,
          price: favoriteProduct.price,
          options: {
            size: "M",
            sugar: "70%",
            ice: "30%",
            toppings: []
          },
          note: ""
        },
        {
          id_product: secondFavorite._id,
          name: secondFavorite.name,
          quantity: 1,
          price: secondFavorite.price,
          options: {
            size: "M",
            sugar: "100%",
            ice: "100%",
            toppings: []
          }
        }
      ],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 ngày trước
    });

    // Tạo đơn hàng 3: Đặt món khác để có lịch sử phong phú
    const order3 = new Order({
      orderID: `CFS${Math.floor(Math.random() * 900000 + 100000)}`,
      customerEmail: email,
      totalPrice: otherDrink.price * 1,
      location: "Tại quán",
      tableNumber: 5,
      status: "Hoàn thành",
      paymentMethod: "Tiền mặt",
      items: [
        {
          id_product: otherDrink._id,
          name: otherDrink.name,
          quantity: 1,
          price: otherDrink.price,
          options: {
            size: "S",
            sugar: "100%",
            ice: "100%",
            toppings: []
          }
        }
      ],
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 tiếng trước
    });

    await Order.insertMany([order1, order2, order3]);
    console.log("✨ Đã tạo thành công dữ liệu đơn hàng giả lập!");
    console.log("-------------------------------------------------");
    console.log(`🎯 Để kiểm tra trên trình duyệt:`);
    console.log(`1. Đăng nhập vào tài khoản có email: ${email}`);
    console.log(`2. Tại trang chủ: Bạn sẽ thấy "Món tủ" chứa: ${favoriteProduct.name}, ${secondFavorite.name}, ${secondFavorite._id !== otherDrink._id ? otherDrink.name : ''}`);
    console.log(`3. Mục "Thử chút vị mới" sẽ chứa các món cà phê khác mà bạn CHƯA TỪNG MUA.`);
    console.log(`4. Click vào món tủ: ${favoriteProduct.name}`);
    console.log(`   - Mức size tự động chọn: M`);
    console.log(`   - Mức đường tự động chọn: 70%`);
    console.log(`   - Mức đá tự động chọn: 30%`);
    console.log(`   - Tự động hiển thị nhãn vàng [Khẩu vị quen thuộc ✨] bên cạnh các mục này.`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi khi sinh dữ liệu giả lập:", err);
    process.exit(1);
  }
};

generateMockData();
