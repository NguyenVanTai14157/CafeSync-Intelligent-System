const Order = require("../models/Order");
const Ingredient = require("../models/Ingredient");

function formatVNDate(date) {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000); // +7h
  return vn.toISOString().split("T")[0];
}

// 💰 1. Tổng doanh thu
const getTotalRevenue = async (req, res) => {
  try {
    const orders = await Order.find({ status: { $in: ["Hoàn thành", "Đã thanh toán"] } });

    const totalRevenue = orders.reduce((sum, order) => {
      return sum + order.totalPrice;
    }, 0);

    res.json({ totalRevenue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 📅 2. Doanh thu hôm nay
const getTodayRevenue = async (req, res) => {
  try {
    // Tính toán đầu ngày hôm nay theo múi giờ VN (GMT+7) một cách chuẩn xác
    const now = new Date();
    const start = new Date(now);
    start.setUTCHours(start.getUTCHours() + 7); // Phóng tới giờ VN
    start.setUTCHours(0, 0, 0, 0); // Đưa về 00:00 của ngày VN đó
    start.setUTCHours(start.getUTCHours() - 7); // Trả về UTC để query Mongo

    const end = new Date(start);
    end.setUTCHours(end.getUTCHours() + 23, 59, 59, 999);

    const orders = await Order.find({
      status: { $in: ["Hoàn thành", "Đã thanh toán"] },
      createdAt: { $gte: start, $lte: end },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);

    res.json({ todayRevenue: totalRevenue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 📆 3. Doanh thu theo tháng
const getMonthRevenue = async (req, res) => {
  try {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const orders = await Order.find({
      status: { $in: ["Hoàn thành", "Đã thanh toán"] },
      createdAt: { $gte: startMonth, $lte: endMonth },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);

    res.json({ monthRevenue: totalRevenue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 📊 4. Doanh thu theo ngày (chart data)
const getRevenueByDay = async (req, res) => {
  try {
    const days = 7;
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setUTCHours(start.getUTCHours() + 7);
      start.setUTCDate(start.getUTCDate() - i);
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCHours(start.getUTCHours() - 7);

      const end = new Date(start);
      end.setUTCHours(end.getUTCHours() + 23, 59, 59, 999);

      const orders = await Order.find({
        status: { $in: ["Hoàn thành", "Đã thanh toán"] },
        createdAt: { $gte: start, $lte: end },
      });

      const total = orders.reduce((sum, o) => sum + o.totalPrice, 0);

      result.push({
        date: formatVNDate(start),
        revenue: total,
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📈 5. Thống kê tổng hợp cho Dashboard
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setUTCHours(startToday.getUTCHours() + 7);
    startToday.setUTCHours(0, 0, 0, 0);
    startToday.setUTCHours(startToday.getUTCHours() - 7);

    // Run parallel queries
    const [totalRevenueData, todayOrders, pendingOrders, lowStockIngredients] = await Promise.all([
      Order.find({ status: { $in: ["Hoàn thành", "Đã thanh toán"] } }),
      Order.find({ createdAt: { $gte: startToday } }),
      Order.find({ status: "Chờ xác nhận" }),
      Ingredient.find({ $expr: { $lte: ["$quantity", "$minStock"] } })
    ]);

    const totalRevenue = totalRevenueData.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const todayRevenue = todayOrders
      .filter(o => ["Hoàn thành", "Đã thanh toán"].includes(o.status))
      .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

    res.json({
      totalRevenue,
      todayRevenue,
      todayOrdersCount: todayOrders.length,
      pendingOrdersCount: pendingOrders.length,
      lowStockCount: lowStockIngredients.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getTotalRevenue,
  getTodayRevenue,
  getMonthRevenue,
  getRevenueByDay,
  getDashboardStats,
};