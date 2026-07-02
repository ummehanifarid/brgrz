const express = require('express');
const router  = express.Router();
const Stats   = require('../models/Stats');
const Order   = require('../models/Order');

// Stats lao
router.get('/', async (req, res) => {
  try {
    let stats = await Stats.findOne();
    if (!stats) stats = await Stats.create({});
    const activeOrders = await Order.countDocuments({ status: { $ne: 'delivered' } });
    const totalOrders  = await Order.countDocuments();
    res.json({ ...stats.toObject(), activeOrders, totalOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Visitor count badao
router.post('/visitor', async (req, res) => {
  try {
    const stats = await Stats.findOneAndUpdate(
      {}, { $inc: { visitors: 1 } }, { upsert: true, new: true }
    );
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily reset
router.post('/reset', async (req, res) => {
  try {
    await Order.deleteMany({});
    await Stats.findOneAndUpdate(
      {}, { visitors: 0, sales: 0, lastReset: new Date() }, { upsert: true }
    );
    res.json({ message: 'Reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;