const mongoose = require('mongoose');

// Cart is stored per browser session (sessionId = random string generated client-side)
const cartSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  items: [{
    id:       String,
    name:     String,
    size:     String,
    price:    Number,
    qty:      Number,
    image:    String,
    category: String,
  }],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Cart', cartSchema);