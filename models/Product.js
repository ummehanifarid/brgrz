const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  category: { type: String, required: true }, // e.g. 'burgers', 'pizzas'
  price:    { type: Number, default: 0 },
  desc:     { type: String, default: '' },
  image:    { type: String, default: null },  // base64 or URL
  variants: [{ label: String, price: Number }], // e.g. [{label:'Small', price:350}]
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);