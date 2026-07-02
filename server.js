require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── STATIC FILES ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/admin', express.static(path.join(__dirname, 'Admin-control')));

// ─── MONGODB CONNECTION ────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected!');
    seedCategories();
  })
  .catch(err => console.log('MongoDB Error:', err.message));

// ─── ROUTES ───────────────────────────────────────────────
app.use('/api/products',   require('./routes/products'));   // routes/products.js ✅
app.use('/api/categories', require('./routes/Category'));   // routes/Category.js ✅
app.use('/api/orders',     require('./routes/Order'));      // routes/Order.js    ✅
app.use('/api/cart',       require('./routes/cart'));       // routes/cart.js     ✅
app.use('/api/stats',      require('./routes/Stats'));      // routes/Stats.js    ✅

// ─── PAGE ROUTES ──────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'home page', 'index.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'Admin-control', 'admin.html'));
});

// ─── SEED DEFAULT CATEGORIES ──────────────────────────────
async function seedCategories() {
  const Category = require('./models/Category');
  const count = await Category.countDocuments();
  if (count === 0) {
    await Category.insertMany([
      { name: 'Best Sellers',  icon: '⭐', catKey: 'best-sellers' },
      { name: 'Burgers',       icon: '🍔', catKey: 'burgers'      },
      { name: 'Pizzas',        icon: '🍕', catKey: 'pizzas'       },
      { name: 'Deals',         icon: '🔥', catKey: 'deals'        },
      { name: 'Beverages',     icon: '🥤', catKey: 'beverages'    },
      { name: 'Dips & Sauces', icon: '🫙', catKey: 'dips'         },
      { name: 'Fries Corner',  icon: '🍟', catKey: 'fries'        },
      { name: 'Wraps',         icon: '🌯', catKey: 'wraps'        },
    ]);
    console.log('✅ Default categories seeded');
  }
}

// ─── START ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🍔 Admin panel: http://localhost:${PORT}/admin`);
});