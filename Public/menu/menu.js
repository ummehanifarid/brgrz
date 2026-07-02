// Add-to-cart interaction:
  // - Variant items (Half/Full, 5pc/10pc): button stays disabled until a variant is picked.
  // - Single-price items: button is enabled immediately.
  // 🔶 Cart storage lives in cart.js (BrgrzCart) — this page never touches
  // localStorage directly, it only calls BrgrzCart.addToCart().

  const navCartCount = document.getElementById('cartCount');

  function flashAdded(addBtn) {
    addBtn.textContent = 'Added ✓';
    addBtn.classList.add('added');
    setTimeout(() => {
      addBtn.textContent = 'Add to Cart';
      addBtn.classList.remove('added');
    }, 900);
  }

  async function addItemToCart({ name, size = '', price, image = '' }) {
    await BrgrzCart.addToCart({ name, size, price, image, category: 'Menu' });

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

  document.querySelectorAll('.item-card').forEach(card => {
    const variantBtns = card.querySelectorAll('.variant-btn');
    const addBtn = card.querySelector('.add-cart-btn');
    let selectedBtn = null;

    if (variantBtns.length > 0) {
      // Variant-based item (e.g. Half/Full, 5pc/10pc)
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
      // Single-price item
      addBtn.addEventListener('click', () => {
        addItemToCart({
          name: card.querySelector('.item-name').textContent.trim(),
          price: parseInt(addBtn.dataset.price, 10),
          image: card.querySelector('.item-img').getAttribute('src')
        });
        flashAdded(addBtn);
      });
    }
  });

  // If a real image is set via data-img-for / src, hide the placeholder text.
  document.querySelectorAll('.item-img').forEach(img => {
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