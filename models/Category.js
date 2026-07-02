const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name:   { type: String, required: true },
  icon:   { type: String, default: '📁' },
  catKey: { type: String, required: true, unique: true }, // e.g. 'burgers'
  nav:    { type: Boolean, default: true },
}, { timestamps: true ,
  collection : 'category'
});

module.exports = mongoose.model('Category', categorySchema);