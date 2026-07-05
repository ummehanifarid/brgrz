require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');

function readFile(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&middot;/g, '·')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

// Splits an HTML file into { heading, blockHtml } chunks, one per
// <section class="category-block">...<h3 class="category-title">HEADING</h3>...</section>
function splitByCategoryBlock(html) {
  const blocks = [];
  const blockRe = /<section class="category-block">([\s\S]*?)<\/section>/g;
  let m;
  while ((m = blockRe.exec(html))) {
    const block = m[1];
    const headingMatch = block.match(/<h3 class="category-title">([\s\S]*?)<\/h3>/);
    let heading = headingMatch ? headingMatch[1] : '';
    // Strip any nested <span class="category-sub">...</span>, folding its text into the heading.
    const subMatch = heading.match(/<span class="category-sub">([\s\S]*?)<\/span>/);
    heading = heading.replace(/<span class="category-sub">[\s\S]*?<\/span>/, '').trim();
    if (subMatch) heading += ' ' + subMatch[1].trim();
    blocks.push({ heading: decodeEntities(heading.trim()), block });
  }
  return blocks;
}

// ---- deals.html: deal-card, always single price + description ----
function extractDeals(html, category) {
  const items = [];
  for (const { heading, block } of splitByCategoryBlock(html)) {
    const cardRe = /<article class="deal-card"[\s\S]*?<\/article>/g;
    const cards = block.match(cardRe) || [];
    for (const card of cards) {
      const img = (card.match(/<img src="([^"]*)" alt="([^"]*)" class="deal-img"/) || [])[1] || '';
      const name = (card.match(/<h4 class="deal-name">([\s\S]*?)<\/h4>/) || [])[1] || '';
      const desc = (card.match(/<p class="deal-desc">([\s\S]*?)<\/p>/) || [])[1] || '';
      const priceMatch = card.match(/<p class="deal-price">Rs\s*([\d,]+)<\/p>/);
      const price = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : 0;
      items.push({
        name: decodeEntities(name.trim()),
        category,
        section: heading,
        desc: decodeEntities(desc.trim()),
        image: img,
        price,
        variants: [],
      });
    }
  }
  return items;
}

// ---- menu.html: item-card, either variant-grid or single item-price ----
function extractMenuItems(html, category) {
  const items = [];
  for (const { heading, block } of splitByCategoryBlock(html)) {
    const cardRe = /<article class="item-card"[\s\S]*?<\/article>/g;
    const cards = block.match(cardRe) || [];
    for (const card of cards) {
      const img = (card.match(/<img src="([^"]*)" alt="([^"]*)" class="item-img"/) || [])[1] || '';
      const name = (card.match(/<h4 class="item-name">([\s\S]*?)<\/h4>/) || [])[1] || '';
      const desc = (card.match(/<p class="item-desc">([\s\S]*?)<\/p>/) || [])[1] || '';
      const variants = [];
      const btnRe = /<button class="variant-btn[^"]*" data-variant="([^"]*)" data-price="([^"]*)"[^>]*>/g;
      let bm;
      while ((bm = btnRe.exec(card))) {
        if (bm[2] === '') continue;
        variants.push({ label: bm[1], price: Number(bm[2]) });
      }
      let price = 0;
      if (variants.length === 0) {
        const priceMatch = card.match(/<p class="item-price">Rs\s*([\d,]+)<\/p>/);
        price = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : 0;
      }
      items.push({
        name: decodeEntities(name.trim()),
        category,
        section: heading,
        desc: decodeEntities(desc.trim()),
        image: img,
        price,
        variants,
      });
    }
  }
  return items;
}

async function main() {
  const deals = extractDeals(readFile('Public/deals/deals.html'), 'deals');
  const menu = extractMenuItems(readFile('Public/menu/menu.html'), 'menu');
  const all = [...deals, ...menu];

  console.log(`Extracted ${deals.length} deals, ${menu.length} menu items.`);
  const sections = {};
  for (const it of all) sections[`${it.category}: ${it.section}`] = (sections[`${it.category}: ${it.section}`] || 0) + 1;
  console.log(sections);

  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  // Ensure the 'menu' category exists.
  const existingMenuCat = await Category.findOne({ catKey: 'menu' });
  if (!existingMenuCat) {
    await Category.create({ name: 'Menu', icon: '📋', catKey: 'menu' });
    console.log('Created "Menu" category');
  }

  // Remove the unused Fries Corner / Wraps categories (folded into Menu instead).
  const removed = await Category.deleteMany({ catKey: { $in: ['fries', 'wraps'] } });
  console.log(`Removed ${removed.deletedCount} unused categories (fries/wraps)`);

  let inserted = 0, skipped = 0;
  for (const item of all) {
    const exists = await Product.findOne({ name: item.name, category: item.category, section: item.section });
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
