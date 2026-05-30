const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Category = require('../models/Category'); 
const Product = require('../models/Product');
const Order = require('../models/Order');

const email = 'yenlythi03@gmail.com';

const seedYenLyThi = async () => {
  try {
    console.log(`🔌 Đang kết nối tới Database: ${process.env.MONGO_URI}`);
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'CafeSyncDB'
    });
    console.log("✅ Đã kết nối thành công tới Database!");

    // 1. Tìm các sản phẩm cụ thể để seeding
    const pDacBiet = await Product.findOne({ name: "Cà phê đặc biệt" });
    const pTraDao = await Product.findOne({ name: "Trà đào" });
    const pBo = await Product.findOne({ name: "Sinh tố bơ" });
    const pDen = await Product.findOne({ name: "Cà phê đen" });

    if (!pDacBiet || !pTraDao || !pBo || !pDen) {
      console.log("❌ Không tìm thấy một trong các sản phẩm bắt buộc: Cà phê đặc biệt, Trà đào, Sinh tố bơ, Cà phê đen");
      process.exit(1);
    }

    // 2. Cập nhật sugarOptions của Cà phê đặc biệt và Trà đào để hỗ trợ đường 30% và 70%
    // Đảm bảo các tùy chọn đường này có sẵn để hiển thị đúng nhãn gợi ý thói quen
    await Product.updateOne(
      { _id: pDacBiet._id },
      { $set: { sugarOptions: ["0%", "50%", "70%", "100%"] } }
    );
    console.log("🛠️ Đã cập nhật sugarOptions cho Cà phê đặc biệt: [0%, 50%, 70%, 100%]");

    await Product.updateOne(
      { _id: pTraDao._id },
      { $set: { sugarOptions: ["0%", "30%", "50%", "70%", "100%"] } }
    );
    console.log("🛠️ Đã cập nhật sugarOptions cho Trà đào: [0%, 30%, 50%, 70%, 100%]");

    // 3. Xóa các đơn hàng cũ của email này để bắt đầu kiểm thử sạch
    const deleteRes = await Order.deleteMany({ customerEmail: email });
    console.log(`🗑️ Đã dọn dẹp ${deleteRes.deletedCount} đơn hàng cũ của ${email}.`);

    // Danh sách 15 giao dịch với cấu hình chính xác
    const orderDefinitions = [
      {
        orderId: "CFS100001",
        items: [{ product: pDacBiet, sugar: "100%", ice: "100%" }]
      },
      {
        orderId: "CFS100002",
        items: [{ product: pTraDao, sugar: "30%", ice: "50%" }]
      },
      {
        orderId: "CFS100003",
        items: [{ product: pBo, sugar: "30%", ice: "50%" }]
      },
      {
        orderId: "CFS100004",
        items: [
          { product: pDacBiet, sugar: "100%", ice: "100%" },
          { product: pTraDao, sugar: "30%", ice: "50%" }
        ]
      },
      {
        orderId: "CFS100005",
        items: [
          { product: pDacBiet, sugar: "100%", ice: "100%" },
          { product: pBo, sugar: "30%", ice: "50%" }
        ]
      },
      {
        orderId: "CFS100006",
        items: [
          { product: pTraDao, sugar: "100%", ice: "100%" },
          { product: pDen, sugar: "100%", ice: "100%" }
        ]
      },
      {
        orderId: "CFS100007",
        items: [
          { product: pDacBiet, sugar: "100%", ice: "100%" },
          { product: pTraDao, sugar: "30%", ice: "50%" }
        ]
      },
      {
        orderId: "CFS100008",
        items: [
          { product: pBo, sugar: "30%", ice: "50%" },
          { product: pTraDao, sugar: "30%", ice: "50%" }
        ]
      },
      {
        orderId: "CFS100009",
        items: [
          { product: pDacBiet, sugar: "50%", ice: "100%" },
          { product: pBo, sugar: "70%", ice: "50%" }
        ]
      },
      {
        orderId: "CFS100010",
        items: [
          { product: pTraDao, sugar: "100%", ice: "100%" },
          { product: pBo, sugar: "70%", ice: "50%" }
        ]
      },
      {
        orderId: "CFS100011",
        items: [
          { product: pDacBiet, sugar: "70%", ice: "100%" },
          { product: pDen, sugar: "50%", ice: "100%" }
        ]
      },
      {
        orderId: "CFS100012",
        items: [
          { product: pTraDao, sugar: "100%", ice: "100%" },
          { product: pBo, sugar: "50%", ice: "50%" }
        ]
      },
      {
        orderId: "CFS100013",
        items: [
          { product: pDacBiet, sugar: "100%", ice: "100%" },
          { product: pBo, sugar: "50%", ice: "50%" }
        ]
      },
      {
        orderId: "CFS100014",
        items: [
          { product: pTraDao, sugar: "70%", ice: "100%" },
          { product: pBo, sugar: "30%", ice: "50%" }
        ]
      },
      // Đơn 15 (mới nhất) - Thiết lập thói quen gần nhất: Cà phê đặc biệt (100% đường, 100% đá), Trà đào (30% đường, 50% đá)
      {
        orderId: "CFS181728",
        items: [
          { product: pDacBiet, sugar: "100%", ice: "100%", note: "Ít sữa, nhiều đá" },
          { product: pTraDao, sugar: "30%", ice: "50%" }
        ]
      }
    ];

    const ordersToInsert = [];

    orderDefinitions.forEach((def, index) => {
      const orderItems = [];
      let totalPrice = 0;

      def.items.forEach(item => {
        let size = "M";
        let extra = 5000; // Phụ thu size M

        const itemPrice = item.product.price + extra;
        totalPrice += itemPrice * 1; // Số lượng mặc định là 1

        orderItems.push({
          id_product: item.product._id,
          name: item.product.name,
          quantity: 1,
          price: itemPrice,
          options: {
            size,
            sugar: item.sugar,
            ice: item.ice,
            toppings: [] // Không có topping theo yêu cầu
          },
          note: item.note || ""
        });
      });

      const order = new Order({
        orderID: def.orderId,
        customerEmail: email,
        totalPrice,
        location: index % 2 === 0 ? "Tại quán" : "Mang đi",
        tableNumber: index % 2 === 0 ? (index % 5) + 1 : null,
        status: "Hoàn thành",
        paymentMethod: "Tiền mặt",
        items: orderItems,
        createdAt: new Date(Date.now() - (15 - index) * 2 * 24 * 60 * 60 * 1000) // Trải đều thời gian về quá khứ
      });

      ordersToInsert.push(order);
    });

    await Order.insertMany(ordersToInsert);
    console.log(`✨ Đã tạo thành công chính xác 15 đơn hàng hoàn thành cho ${email}!`);
    console.log(`-------------------------------------------------`);
    console.log(`📊 Bảng tần suất đã tạo:`);
    console.log(`1. Cà phê đặc biệt (8 đơn): 6 lần [100% đường], 1 lần [50% đường], 1 lần [70% đường].`);
    console.log(`   -> Habit gần nhất (Đơn CFS181728): Size M, 100% đường, 100% đá, Ghi chú: "Ít sữa, nhiều đá"`);
    console.log(`2. Trà đào (9 đơn): 5 lần [30% đường], 3 lần [100% đường], 1 lần [70% đường].`);
    console.log(`   -> Habit gần nhất (Đơn CFS181728): Size M, 30% đường, 50% đá, không topping.`);
    console.log(`3. Sinh tố bơ (8 đơn): 2 lần [70% đường], 4 lần [30% đường], 2 lần [50% đường].`);
    console.log(`4. Cà phê đen (2 đơn): 1 lần [100% đường], 1 lần [50% đường].`);
    console.log(`💡 Không có bất kỳ sản phẩm nào khác ngoài 4 sản phẩm trên.`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi khi sinh dữ liệu giả lập:", err);
    process.exit(1);
  }
};

seedYenLyThi();
