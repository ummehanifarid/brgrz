// Fetches burgers from /api/products?category=burgers and renders them into
// #burger-grid, then wires the same add-to-cart interaction as before
// (single price, no size selection).
// 🔶 Cart storage lives in cart.js (BrgrzCart) — this page never touches
// localStorage directly, it only calls BrgrzCart.addToCart().

const navCartCount = document.getElementById('cartCount');
const grid = document.getElementById('burger-grid');

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function cardHtml(product, index) {
  const num = String(index + 1).padStart(2, '0');
  return `
    <article class="burger-card" data-id="${product._id}">
      <div class="card-number">${num}</div>
      <div class="burger-image-frame">
        <img src="${esc(product.image || '')}" alt="${esc(product.name)}" class="burger-img">
        <div class="img-placeholder">Add image</div>
      </div>
      <div class="card-body">
        <h3 class="burger-name">${esc(product.name)}</h3>
        <p class="burger-price">Rs ${product.price.toLocaleString()}</p>
        <button class="add-cart-btn" data-price="${product.price}">Add to Cart</button>
      </div>
    </article>`;
}

function wireCard(card) {
  const addBtn = card.querySelector('.add-cart-btn');
  const itemName = card.querySelector('.burger-name').textContent.trim();
  const itemImg = card.querySelector('.burger-img').getAttribute('src');

  addBtn.addEventListener('click', async () => {
    await BrgrzCart.addToCart({
      name: itemName,
      price: parseInt(addBtn.dataset.price, 10),
      image: itemImg,
      category: 'Burger'
    });

    const count = await BrgrzCart.getCartCount();
    const total = await BrgrzCart.getCartTotal();

    document.getElementById('cart-count').textContent = count + (count === 1 ? ' item' : ' items');
    document.getElementById('cart-total').textContent = 'Rs ' + total.toLocaleString();
    document.getElementById('cart-bar').classList.add('show');

    if (navCartCount) {
      navCartCount.classList.add('bump');
      setTimeout(() => navCartCount.classList.remove('bump'), 300);
    }

    addBtn.textContent = 'Added ✓';
    addBtn.classList.add('added');
    setTimeout(() => {
      addBtn.textContent = 'Add to Cart';
      addBtn.classList.remove('added');
    }, 900);
  });

  const img = card.querySelector('.burger-img');
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

async function loadBurgers() {
  try {
    const res = await fetch('/api/products?category=burgers');
    const products = await res.json();

    if (products.length === 0) {
      grid.innerHTML = '<p class="grid-empty">No burgers available right now.</p>';
      return;
    }

    grid.innerHTML = products.map(cardHtml).join('');
    grid.querySelectorAll('.burger-card').forEach(wireCard);
  } catch (err) {
    console.error('Failed to load burgers:', err);
    grid.innerHTML = '<p class="grid-empty">Could not load the menu. Please refresh.</p>';
  }
}

loadBurgers();

// Mobile nav toggle (burger menu)
const burgerToggleBtn = document.getElementById('burgerToggle');
const navLinksEl = document.getElementById('navLinks');
if (burgerToggleBtn && navLinksEl) {
  burgerToggleBtn.addEventListener('click', () => {
    const isOpen = navLinksEl.classList.toggle('open');
    burgerToggleBtn.setAttribute('aria-expanded', isOpen);
  });
}
