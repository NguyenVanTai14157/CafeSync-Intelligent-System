const mongoose = require('mongoose');

const toppingSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  price: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { autoCreate: false, autoIndex: false });

module.exports = mongoose.model('Topping', toppingSchema);
