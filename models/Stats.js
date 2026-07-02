const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
  visitors:  { type: Number, default: 0 },
  sales:     { type: Number, default: 0 },
  lastReset: { type: Date,   default: null },
});

module.exports = mongoose.model('Stats', statsSchema);