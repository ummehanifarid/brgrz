const express = require('express');
const router  = express.Router();
const Cart    = require('../models/cart');

// Cart lao sessionId se
router.get('/:sessionId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ sessionId: req.params.sessionId });
    res.json(cart ? cart.items : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cart save karo
router.post('/:sessionId', async (req, res) => {
  try {
    const { items } = req.body;
    const cart = await Cart.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { items, updatedAt: Date.now() },
      { upsert: true, new: true }
    );
    res.json(cart.items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cart clear karo
router.delete('/:sessionId', async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { items: [] }
    );
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;