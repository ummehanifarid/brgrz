const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer:      { type: String, required: true },
  phone:         { type: String, required: true },
  area:          { type: String, default: '' },
  address:       { type: String, default: '' },
  paymentMethod: { type: String, default: 'COD' },
  items:         { type: Array,  required: true },  // full cart snapshot
  subtotal:      { type: Number, default: 0 },
  deliveryFee:   { type: Number, default: 0 },
  total:         { type: Number, required: true },
  status:        { type: String, default: 'pending',
                   enum: ['pending','preparing','ready','delivered'] },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);