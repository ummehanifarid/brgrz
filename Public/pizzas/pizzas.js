// Fetches pizzas from /api/products?category=pizzas and renders them into
// #pizza-grid, then wires the same add-to-cart interaction as before:
// button stays disabled until a size is picked.
// 🔶 Cart storage lives in cart.js (BrgrzCart) — this page never touches
// localStorage directly, it only calls BrgrzCart.addToCart().

const navCartCount = document.getElementById('cartCount');
const grid = document.getElementById('pizza-grid');
const gridLoading = document.getElementById('gridLoading');

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function cardHtml(product, index) {
  const num = String(index + 1).padStart(2, '0');
  const variantsHtml = product.variants.map(v => `
    <button class="size-btn" data-size="${esc(v.label)}" data-price="${v.price}">
      <span class="size-label">${esc(v.label)}</span><span class="size-price">Rs ${v.price.toLocaleString()}</span>
    </button>`).join('');

  return `
    <article class="pizza-card" data-id="${product._id}">
      <div class="card-number">${num}</div>
      <div class="pizza-image-frame">
        <img src="${esc(product.image || '')}" alt="${esc(product.name)}" class="pizza-img">
        <div class="img-placeholder">Add image</div>
      </div>
      <div class="card-body">
        <h3 class="pizza-name">${esc(product.name)}</h3>
        <p class="pizza-ingredients">${esc(product.desc || '')}</p>
        <div class="size-grid">${variantsHtml}</div>
        <button class="add-cart-btn" disabled>Add to Cart</button>
      </div>
    </article>`;
}

function wireCard(card) {
  const sizeBtns = card.querySelectorAll('.size-btn');
  const addBtn = card.querySelector('.add-cart-btn');
  const pizzaName = card.querySelector('.pizza-name').textContent.trim();
  const pizzaImg = card.querySelector('.pizza-img').getAttribute('src');
  let selectedBtn = null;

  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedBtn = btn;
      addBtn.disabled = false;
    });
  });

  addBtn.addEventListener('click', async () => {
    if (!selectedBtn) return;

    await BrgrzCart.addToCart({
      name: pizzaName,
      size: selectedBtn.dataset.size,
      price: selectedBtn.dataset.price,
      image: pizzaImg,
      category: 'Pizza'
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

  const img = card.querySelector('.pizza-img');
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

async function loadPizzas() {
  try {
    const res = await fetch('/api/products?category=pizzas');
    const products = await res.json();

    if (products.length === 0) {
      grid.innerHTML = '<p class="grid-empty">No pizzas available right now.</p>';
      return;
    }

    grid.innerHTML = products.map(cardHtml).join('');
    grid.querySelectorAll('.pizza-card').forEach(wireCard);
  } catch (err) {
    console.error('Failed to load pizzas:', err);
    grid.innerHTML = '<p class="grid-empty">Could not load the menu. Please refresh.</p>';
  }
}

loadPizzas();

// Mobile nav toggle (burger menu)
const burgerToggle = document.getElementById('burgerToggle');
const navLinksEl = document.getElementById('navLinks');
if (burgerToggle && navLinksEl) {
  burgerToggle.addEventListener('click', () => {
    const isOpen = navLinksEl.classList.toggle('open');
    burgerToggle.setAttribute('aria-expanded', isOpen);
  });
}
