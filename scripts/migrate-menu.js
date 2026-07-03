require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');

function readFile(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

// ---- pizzas.html: pizza-card, size-grid (variants), pizza-ingredients desc ----
function extractPizzas(html, category) {
  const items = [];
  const cardRe = /<article class="pizza-card"[\s\S]*?<\/article>/g;
  const cards = html.match(cardRe) || [];
  for (const card of cards) {
    const img = (card.match(/<img src="([^"]*)" alt="([^"]*)" class="pizza-img"/) || [])[1] || '';
    const name = (card.match(/<h3 class="pizza-name">([\s\S]*?)<\/h3>/) || [])[1] || '';
    const desc = (card.match(/<p class="pizza-ingredients">([\s\S]*?)<\/p>/) || [])[1] || '';
    const variants = [];
    const btnRe = /<button class="size-btn[^"]*" data-size="([^"]*)" data-price="([^"]*)"[^>]*>/g;
    let m;
    while ((m = btnRe.exec(card))) {
      if (m[2] === '') continue; // disabled/unavailable size
      variants.push({ label: m[1], price: Number(m[2]) });
    }
    items.push({
      name: decodeEntities(name.trim()),
      category,
      desc: decodeEntities(desc.trim()),
      image: img,
      price: 0,
      variants,
    });
  }
  return items;
}

// ---- bestseller.html: item-card, either variant-grid or single item-price ----
function extractBestSellers(html, category) {
  const items = [];
  const cardRe = /<article class="item-card"[\s\S]*?<\/article>/g;
  const cards = html.match(cardRe) || [];
  for (const card of cards) {
    const img = (card.match(/<img src="([^"]*)" alt="([^"]*)" class="item-img"/) || [])[1] || '';
    const name = (card.match(/<h4 class="item-name">([\s\S]*?)<\/h4>/) || [])[1] || '';
    const desc = (card.match(/<p class="item-desc">([\s\S]*?)<\/p>/) || [])[1] || '';
    const variants = [];
    const btnRe = /<button class="variant-btn[^"]*" data-variant="([^"]*)" data-price="([^"]*)"[^>]*>/g;
    let m;
    while ((m = btnRe.exec(card))) {
      if (m[2] === '') continue;
      variants.push({ label: m[1], price: Number(m[2]) });
    }
    let price = 0;
    if (variants.length === 0) {
      const priceMatch = card.match(/<p class="item-price">Rs\s*([\d,]+)<\/p>/);
      price = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : 0;
    }
    items.push({
      name: decodeEntities(name.trim()),
      category,
      desc: decodeEntities(desc.trim()),
      image: img,
      price,
      variants,
    });
  }
  return items;
}

// ---- burgers.html / beverages.html / dips.html: burger-card, single price ----
function extractSinglePrice(html, category) {
  const items = [];
  const cardRe = /<article class="burger-card"[\s\S]*?<\/article>/g;
  const cards = html.match(cardRe) || [];
  for (const card of cards) {
    const img = (card.match(/<img src="([^"]*)" alt="([^"]*)" class="burger-img"/) || [])[1] || '';
    const name = (card.match(/<h3 class="burger-name">([\s\S]*?)<\/h3>/) || [])[1] || '';
    const priceMatch = card.match(/<p class="burger-price">Rs\s*([\d,]+)<\/p>/);
    const price = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : 0;
    items.push({
      name: decodeEntities(name.trim()),
      category,
      desc: '',
      image: img,
      price,
      variants: [],
    });
  }
  return items;
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&middot;/g, '·')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

async function main() {
  const all = [
    ...extractBestSellers(readFile('Public/bestseller/bestseller.html'), 'best-sellers'),
    ...extractSinglePrice(readFile('Public/burgers/burgers.html'), 'burgers'),
    ...extractPizzas(readFile('Public/pizzas/pizzas.html'), 'pizzas'),
    ...extractSinglePrice(readFile('Public/beverages/beverages.html'), 'beverages'),
    ...extractSinglePrice(readFile('Public/dips/dips.html'), 'dips'),
  ];

  console.log(`Extracted ${all.length} items:`);
  const byCategory = {};
  for (const it of all) byCategory[it.category] = (byCategory[it.category] || 0) + 1;
  console.log(byCategory);

  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  let inserted = 0, skipped = 0;
  for (const item of all) {
    const exists = await Product.findOne({ name: item.name, category: item.category });
    if (exists) { skipped++; continue; }
    await Product.create(item);
    inserted++;
  }

  console.log(`Inserted: ${inserted}, Skipped (already existed): ${skipped}`);
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}
