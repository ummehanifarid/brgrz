 // ---------- Tab switching ----------
  const tabs = document.querySelectorAll('.deal-tab');
  const panels = document.querySelectorAll('.deal-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.target);
      if (target) target.classList.add('active');
    });
  });

  // ---------- Add to cart ----------
  // 🔶 Cart storage lives in cart.js (BrgrzCart) — this page never touches
  // localStorage directly, it only calls BrgrzCart.addToCart().
  const navCartCount = document.getElementById('cartCount');

  document.querySelectorAll('.deal-card').forEach(card => {
    const addBtn = card.querySelector('.add-cart-btn');
    const itemName = card.querySelector('.deal-name').textContent.trim();
    const itemImg = card.querySelector('.deal-img').getAttribute('src');

    addBtn.addEventListener('click', async () => {
      await BrgrzCart.addToCart({
        name: itemName,
        price: parseInt(addBtn.dataset.price, 10),
        image: itemImg,
        category: 'Deal'
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
  });

  // ---------- Image placeholder swap ----------
  document.querySelectorAll('.deal-img').forEach(img => {
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

  // ---------- Mobile nav toggle ----------
  const burgerToggleBtn = document.getElementById('burgerToggle');
  const navLinksEl = document.getElementById('navLinks');
  if (burgerToggleBtn && navLinksEl) {
    burgerToggleBtn.addEventListener('click', () => {
      const isOpen = navLinksEl.classList.toggle('open');
      burgerToggleBtn.setAttribute('aria-expanded', isOpen);
    });
  }