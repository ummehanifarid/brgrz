

const navCartCount = document.getElementById('cartCount');
const pageTitle = document.getElementById('pageTitle');
const pageSub = document.getElementById('pageSub');
const categoryContent = document.getElementById('categoryContent');

const catKey = decodeURIComponent(location.pathname.replace(/^\/category\//, '').replace(/\/$/, ''));

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function cardHtml(product, index) {
  const num = String(index + 1).padStart(2, '0');
  const hasVariants = product.variants && product.variants.length > 0;

  const bodyHtml = hasVariants
    ? `<div class="variant-grid">${product.variants.map(v => `
        <button class="variant-btn" data-variant="${esc(v.label)}" data-price="${v.price}">
          <span class="variant-label">${esc(v.label)}</span><span class="variant-price">Rs ${v.price.toLocaleString()}</span>
        </button>`).join('')}
      </div>
      <button class="add-cart-btn" disabled>Add to Cart</button>`
    : `${product.desc ? `<p class="item-desc">${esc(product.desc)}</p>` : ''}
      <p class="item-price">Rs ${product.price.toLocaleString()}</p>
      <button class="add-cart-btn single" data-price="${product.price}">Add to Cart</button>`;

  return `
    <article class="item-card" data-id="${product._id}">
      <div class="card-number">${num}</div>
      <div class="item-image-frame">
        <img src="${esc(product.image || '')}" alt="${esc(product.name)}" class="item-img">
        <div class="img-placeholder">Add image</div>
      </div>
      <div class="card-body">
        <h4 class="item-name">${esc(product.name)}</h4>
        ${bodyHtml}
      </div>
    </article>`;
}

function flashAdded(addBtn) {
  addBtn.textContent = 'Added ✓';
  addBtn.classList.add('added');
  setTimeout(() => {
    addBtn.textContent = 'Add to Cart';
    addBtn.classList.remove('added');
  }, 900);
}

async function addItemToCart({ name, size = '', price, image = '' }, categoryLabel) {
  await BrgrzCart.addToCart({ name, size, price, image, category: categoryLabel });

  const count = await BrgrzCart.getCartCount();
  const total = await BrgrzCart.getCartTotal();

  document.getElementById('cart-count').textContent = count + (count === 1 ? ' item' : ' items');
  document.getElementById('cart-total').textContent = 'Rs ' + total.toLocaleString();
  document.getElementById('cart-bar').classList.add('show');

  if (navCartCount) {
    navCartCount.classList.add('bump');
    setTimeout(() => navCartCount.classList.remove('bump'), 300);
  }
}

function wireCard(card, categoryLabel) {
  const variantBtns = card.querySelectorAll('.variant-btn');
  const addBtn = card.querySelector('.add-cart-btn');
  let selectedBtn = null;

  if (variantBtns.length > 0) {
    variantBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        variantBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedBtn = btn;
        addBtn.disabled = false;
      });
    });

    addBtn.addEventListener('click', () => {
      if (!selectedBtn) return;
      addItemToCart({
        name: card.querySelector('.item-name').textContent.trim(),
        size: selectedBtn.dataset.variant,
        price: parseInt(selectedBtn.dataset.price, 10),
        image: card.querySelector('.item-img').getAttribute('src')
      }, categoryLabel);
      flashAdded(addBtn);
    });
  } else {
    addBtn.addEventListener('click', () => {
      addItemToCart({
        name: card.querySelector('.item-name').textContent.trim(),
        price: parseInt(addBtn.dataset.price, 10),
        image: card.querySelector('.item-img').getAttribute('src')
      }, categoryLabel);
      flashAdded(addBtn);
    });
  }

  const img = card.querySelector('.item-img');
  const placeholder = img.nextElementSibling;
  function checkImg() {
    if (img.getAttribute('src') && img.getAttribute('src').trim() !== '') {
      img.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
    }
  }
  img.addEventListener('load', checkImg);
  checkImg();
}

function groupBySection(products) {
  const flat = [];
  const sections = [];
  const sectionIndex = new Map();

  for (const product of products) {
    const section = (product.section || '').trim();
    if (!section) {
      flat.push(product);
      continue;
    }
    if (!sectionIndex.has(section)) {
      sectionIndex.set(section, sections.length);
      sections.push({ name: section, items: [] });
    }
    sections[sectionIndex.get(section)].items.push(product);
  }

  return { flat, sections };
}

async function loadCategory() {
  try {
    const [catRes, productsRes] = await Promise.all([
      fetch('/api/categories'),
      fetch(`/api/products?category=${encodeURIComponent(catKey)}`),
    ]);
    const categories = await catRes.json();
    const products = await productsRes.json();

    const category = categories.find(c => c.catKey === catKey);
    const displayName = category ? category.name : catKey;
    pageTitle.textContent = displayName;
    pageSub.textContent = `Explore our ${displayName.toLowerCase()} — pick your favorite below.`;
    document.title = `The Brgrz — ${displayName}`;

    if (products.length === 0) {
      categoryContent.innerHTML = `
        <div class="item-grid-wrap">
          <div class="item-grid">
            <p class="grid-empty">No items available in this category yet.</p>
          </div>
        </div>`;
      return;
    }

    const { flat, sections } = groupBySection(products);
    let html = '';

    if (flat.length > 0) {
      html += `
        <div class="item-grid-wrap">
          <div class="item-grid">${flat.map(cardHtml).join('')}</div>
        </div>`;
    }

    sections.forEach(sec => {
      html += `
        <section class="category-block">
          <h3 class="category-title">${esc(sec.name)}</h3>
          <div class="item-grid">${sec.items.map(cardHtml).join('')}</div>
        </section>`;
    });

    categoryContent.innerHTML = html;
    categoryContent.querySelectorAll('.item-card').forEach(card => wireCard(card, displayName));
  } catch (err) {
    console.error('Failed to load category:', err);
    categoryContent.innerHTML = `
      <div class="item-grid-wrap">
        <div class="item-grid">
          <p class="grid-empty">Could not load the menu. Please refresh.</p>
        </div>
      </div>`;
  }
}

loadCategory();
