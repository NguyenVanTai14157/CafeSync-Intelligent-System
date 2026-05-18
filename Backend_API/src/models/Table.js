const mongoose = require('mongoose');

const tableSchema = mongoose.Schema({
  tableNumber: { type: Number, required: true, unique: true },
  token: { type: String, unique: true, sparse: true }, 
  status: { type: String, enum: ['Trống', 'Đang phục vụ', 'Đã đặt trước'], default: 'Trống' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Table', tableSchema);
