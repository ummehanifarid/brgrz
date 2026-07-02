  // Simple add-to-cart interaction for burgers (single price, no size selection).
  // 🔶 Cart storage lives in cart.js (BrgrzCart) — this page never touches
  // localStorage directly, it only calls BrgrzCart.addToCart().

  const navCartCount = document.getElementById('cartCount');

  document.querySelectorAll('.burger-card').forEach(card => {
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

      // Update bottom floating cart bar
      document.getElementById('cart-count').textContent = count + (count === 1 ? ' item' : ' items');
      document.getElementById('cart-total').textContent = 'Rs ' + total.toLocaleString();
      document.getElementById('cart-bar').classList.add('show');

      // Top nav badge bump (the number itself is updated automatically by cart.js)
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
  document.querySelectorAll('.burger-img').forEach(img => {
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
  const burgerToggleBtn = document.getElementById('burgerToggle');
  const navLinksEl = document.getElementById('navLinks');
  if (burgerToggleBtn && navLinksEl) {
    burgerToggleBtn.addEventListener('click', () => {
      const isOpen = navLinksEl.classList.toggle('open');
      burgerToggleBtn.setAttribute('aria-expanded', isOpen);
    });
  }