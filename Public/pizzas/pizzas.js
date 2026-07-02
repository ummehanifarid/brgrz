// Simple add-to-cart interaction: select a size, then add to cart.
  // 🔶 NOTE: actual cart storage lives in cart.js (BrgrzCart). This page
  // never touches localStorage directly — it only calls BrgrzCart.addToCart(),
  // so when MongoDB is connected, only cart.js needs to change.

  const navCartCount = document.getElementById('cartCount');

  document.querySelectorAll('.pizza-card').forEach(card => {
    const sizeBtns = card.querySelectorAll('.size-btn:not(.size-na)');
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

      // 🔶 This is the one line every "Add to Cart" button needs to call.
      await BrgrzCart.addToCart({
        name: pizzaName,
        size: selectedBtn.dataset.size,
        price: selectedBtn.dataset.price,
        image: pizzaImg,
        category: 'Pizza'
      });

      // Update bottom floating cart bar using the real saved cart totals
      const count = await BrgrzCart.getCartCount();
      const total = await BrgrzCart.getCartTotal();
      document.getElementById('cart-count').textContent = count + (count === 1 ? ' item' : ' items');
      document.getElementById('cart-total').textContent = 'Rs ' + total.toLocaleString();
      document.getElementById('cart-bar').classList.add('show');

      // Top nav badge bump animation (the number itself is already
      // updated automatically by cart.js)
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
  });

  // If a real image is set via data-img-for / src, hide the placeholder text.
  document.querySelectorAll('.pizza-img').forEach(img => {
    const placeholder = img.nextElementSibling;
    function checkImg() {
      if (img.getAttribute('src') && img.getAttribute('src').trim() !== '') {
        img.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
      }
    }
    img.addEventListener('load', checkImg);
    checkImg();
  });

  // Mobile nav toggle (burger menu)
  const burgerToggle = document.getElementById('burgerToggle');
  const navLinksEl = document.getElementById('navLinks');
  if (burgerToggle && navLinksEl) {
    burgerToggle.addEventListener('click', () => {
      const isOpen = navLinksEl.classList.toggle('open');
      burgerToggle.setAttribute('aria-expanded', isOpen);
    });
  }