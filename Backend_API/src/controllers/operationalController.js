const Order = require('../models/Order');
const Product = require('../models/Product');
const Table = require('../models/Table');
const { operationalStats } = require('../utils/operationalStats');
exports.getOperationalStats = async (req, res) => {
  try {
    const [orders, products, tables] = await Promise.all([
      Order.find({ $or: [{ paymentStatus: 'paid' }, { paymentStatus: { $exists: false }, status: { $in: ['Hoàn thành','Đã thanh toán','Đã xong'] } }] }).select('createdAt status paymentStatus customerEmail tableNumber items.id_product items.name items.quantity').lean(),
      Product.find().select('name').lean(), Table.find().select('tableNumber').lean()
    ]);
    res.json(operationalStats(orders,products,tables));
  } catch { res.status(500).json({ message: 'Không tải được thống kê vận hành' }); }
};
