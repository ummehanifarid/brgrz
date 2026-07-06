const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name:   { type: String, required: true },
  icon:   { type: String, default: '📁' },
  catKey: { type: String, required: true, unique: true }, // e.g. 'burgers'
  nav:    { type: Boolean, default: true },
  order:  { type: Number, default: 0 }, // controls display order in nav/menu manager
}, { timestamps: true ,
  collection : 'category'
});

module.exports = mongoose.model('Category', categorySchema);