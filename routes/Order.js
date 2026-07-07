const express = require('express');
const router  = express.Router();
const Order   = require('../models/Order');
const Stats   = require('../models/Stats');

// bring orders
router.get('/', async (req, res) => {
  try {
    const filter = req.query.status && req.query.status !== 'all'
      ? { status: req.query.status } : {};
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Place a new order
router.post('/', async (req, res) => {
  try {
    const order = await Order.create(req.body);
    // Sales update karo agar delivered hai
    if (order.status === 'delivered') {
      await Stats.findOneAndUpdate({}, { $inc: { sales: order.total } }, { upsert: true });
    }
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Order update
router.put('/:id', async (req, res) => {
  try {
    const old   = await Order.findById(req.params.id);
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    // Agar status delivered ho gaya toh sales mein add karo
    if (old && old.status !== 'delivered' && order.status === 'delivered') {
      await Stats.findOneAndUpdate({}, { $inc: { sales: order.total } }, { upsert: true });
    }
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Order delete
router.delete('/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;