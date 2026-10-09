// const mongoose = require("mongoose");

// const ProductSchema = new mongoose.Schema({
//   name: String,
//   price: Number,
//   category: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Category" // 👈 liên kết
//   },
//   image: String,
//   description: String
// });

// module.exports = mongoose.model("Product", ProductSchema);

const mongoose = require("mongoose");
require('./Topping');

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category"
  },
  image: String,
  description: String,
  sizes: [String],           // ["S", "M", "L"]
  toppings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topping' }],
  sugarOptions: [String],    // ["0%", "30%", "50%", "70%", "100%"]
  iceOptions: [String]       // ["0%", "30%", "50%", "70%", "100%"]
});

module.exports = mongoose.model("Product", ProductSchema);
