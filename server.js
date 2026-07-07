require('dotenv').config();
const dns      = require('dns');
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

// Some networks/routers fail Node's direct SRV DNS query (used to resolve
// mongodb+srv:// URIs) even though normal DNS lookups work fine on the same
// network. Pointing Node at public resolvers avoids that failure mode.
dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]);

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────
app.use(cors());
// MongoDB has a hard 16MB per-document limit, and base64-encoded images

app.use(express.json({ limit: '15mb' }));

// ─── STATIC FILES ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'Public')));
app.use('/admin', express.static(path.join(__dirname, 'Admin-control')));

// ─── MONGODB CONNECTION ────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected!'))
  .catch(err => console.log('MongoDB Error:', err.message));

// ─── ROUTES ───────────────────────────────────────────────
app.use('/api/products',   require('./routes/products'));   // routes/products.js ✅
app.use('/api/categories', require('./routes/Category'));   // routes/Category.js ✅
app.use('/api/orders',     require('./routes/Order'));      // routes/Order.js    ✅
app.use('/api/cart',       require('./routes/cart'));       // routes/cart.js     ✅
app.use('/api/stats',      require('./routes/Stats'));      // routes/Stats.js    ✅

// ─── PAGE ROUTES ──────────────────────────────────────────
app.get('/', (req, res) => {
  res.redirect('/home page/index.html');
});
app.get('/admin', (req, res) => {
  res.redirect('/admin/admin.html');
});

// One generic route serves every category — adding a new category in admin
// needs zero code changes, since the page reads the catKey from the URL.
app.get('/category/:catKey', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'category', 'category.html'));
});

// ─── LEGACY URL REDIRECTS ──────────────────────────────────
// Old per-category static pages have been replaced by /category/:catKey.
const legacyCategoryRedirects = {
  '/bestseller/bestseller.html': 'best-sellers',
  '/burgers/burgers.html':       'burgers',
  '/pizzas/pizzas.html':         'pizzas',
  '/beverages/beverages.html':   'beverages',
  '/dips/dips.html':             'dips',
  '/deals/deals.html':           'deals',
  '/menu/menu.html':             'menu',
};
for (const [oldPath, catKey] of Object.entries(legacyCategoryRedirects)) {
  app.get(oldPath, (req, res) => res.redirect(`/category/${catKey}`));
}

// ─── START ────────────────────────────────────────────────
// Vercel imports this file to get the Express app as a request handler —
// it must not call app.listen() there, since Vercel runs it as a
// serverless function rather than a long-lived server.
const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🍔 Admin panel: http://localhost:${PORT}/admin`);
  });
}

module.exports = app;