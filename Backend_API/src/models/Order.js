const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
  orderID: { type: String, required: true },
  items: [
    {
      id_product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      options: {
        size: String,
        sugar: String,
        ice: String,
        toppings: [String]
      },
      note: String
    }
  ],
  totalPrice: { type: Number, required: true },
  location: { type: String, required: true },
  tableNumber: { type: Number, default: null }, // Mới thêm: theo dõi theo bàn
  customerEmail: { type: String, default: 'Guest' }, // Trường để lọc lịch sử
  paymentMethod: { type: String, default: 'Tiền mặt' },
  status: { type: String, default: 'Chờ xác nhận' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);