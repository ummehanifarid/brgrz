const express  = require('express');
const router   = express.Router();
const Category = require('../models/Category');
const Product  = require('../models/Product');

// Saari categories lao
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Nai category banao
router.post('/', async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Category update karo
router.put('/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Category delete karo (saath mein uske products bhi)
router.delete('/:id', async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (cat) await Product.deleteMany({ category: cat.catKey });
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;