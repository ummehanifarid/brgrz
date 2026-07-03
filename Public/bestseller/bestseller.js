// Fetches best sellers from /api/products?category=best-sellers and renders
// them into #gridLoading's parent (.item-grid), then wires the same
// add-to-cart interaction as before:
// - Variant items (sizes / Half-Full): button stays disabled until picked.
// - Single-price items: button is enabled immediately.
// 🔶 Cart storage lives in cart.js (BrgrzCart) — this page never touches
// localStorage directly, it only calls BrgrzCart.addToCart().

const navCartCount = document.getElementById('cartCount');
const grid = document.querySelector('.item-grid');

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

async function addItemToCart({ name, size = '', price, image = '' }) {
  await BrgrzCart.addToCart({ name, size, price, image, category: 'Best Seller' });

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

function wireCard(card) {
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
      });
      flashAdded(addBtn);
    });
  } else {
    addBtn.addEventListener('click', () => {
      addItemToCart({
        name: card.querySelector('.item-name').textContent.trim(),
        price: parseInt(addBtn.dataset.price, 10),
        image: card.querySelector('.item-img').getAttribute('src')
      });
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

async function loadBestSellers() {
  try {
    const res = await fetch('/api/products?category=best-sellers');
    const products = await res.json();

    if (products.length === 0) {
      grid.innerHTML = '<p class="grid-empty">No best sellers available right now.</p>';
      return;
    }

    grid.innerHTML = products.map(cardHtml).join('');
    grid.querySelectorAll('.item-card').forEach(wireCard);
  } catch (err) {
    console.error('Failed to load best sellers:', err);
    grid.innerHTML = '<p class="grid-empty">Could not load the menu. Please refresh.</p>';
  }
}

loadBestSellers();

// Mobile nav toggle (burger menu)
const burgerToggleBtn = document.getElementById('burgerToggle');
const navLinksEl = document.getElementById('navLinks');
if (burgerToggleBtn && navLinksEl) {
  burgerToggleBtn.addEventListener('click', () => {
    const isOpen = navLinksEl.classList.toggle('open');
    burgerToggleBtn.setAttribute('aria-expanded', isOpen);
  });
}
