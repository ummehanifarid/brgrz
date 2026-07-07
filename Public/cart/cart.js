/* =====================================================================
   THE BRGRZ — CART DATA LAYER  (cart.js)
   ---------------------------------------------------------------------
   ===================================================================== */

const BrgrzCart = (() => {

  // ── Session ID ──────────────────────────────────────────────────────
  // Har browser ko ek unique ID milta hai. Yeh sessionStorage mein
  // rehta hai — tab close hone par khatam hota hai.
  function _getSessionId() {
    let sid = sessionStorage.getItem('brgrz_sid');
    if (!sid) {
      sid = 'sess-' + Math.random().toString(36).slice(2) + Date.now();
      sessionStorage.setItem('brgrz_sid', sid);
    }
    return sid;
  }

  // ── Delivery rule ───────────────────────────────────────────────────
  const FREE_DELIVERY_THRESHOLD = 500;
  const DELIVERY_FEE            = 150;

  // ── API helpers ─────────────────────────────────────────────────────
  async function _readCart() {
    try {
      const res = await fetch(`/api/cart/${_getSessionId()}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  async function _saveCart(items) {
    try {
      await fetch(`/api/cart/${_getSessionId()}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ items }),
      });
    } catch (err) {
      console.error('Cart save error:', err);
    }
    _refreshBadges(items);
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  function _makeId(name, size) {
    return (name + '__' + (size || '')).toLowerCase().trim().replace(/\s+/g, '-');
  }

  function _refreshBadges(items) {
    const count = items.reduce((sum, it) => sum + it.qty, 0);
    document.querySelectorAll('#cartCount, .cart-count').forEach(el => {
      el.textContent = count;
    });
  }

  // ── PUBLIC API ───────────────────────────────────────────────────────

  async function getCart() {
    return await _readCart();
  }

  async function addToCart({ name, size = '', price, image = '', category = '' }) {
    const items    = await _readCart();
    const id       = _makeId(name, size);
    const existing = items.find(it => it.id === id);

    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ id, name, size, price: Number(price) || 0, qty: 1, image, category });
    }

    await _saveCart(items);
    return items;
  }

  async function updateQty(id, qty) {
    let items = await _readCart();
    if (qty <= 0) {
      items = items.filter(it => it.id !== id);
    } else {
      const it = items.find(i => i.id === id);
      if (it) it.qty = qty;
    }
    await _saveCart(items);
    return items;
  }

  async function removeFromCart(id) {
    return updateQty(id, 0);
  }

  async function clearCart() {
    await fetch(`/api/cart/${_getSessionId()}`, { method: 'DELETE' });
    _refreshBadges([]);
  }

  async function getCartTotal() {
    const items = await _readCart();
    return items.reduce((sum, it) => sum + it.price * it.qty, 0);
  }

  async function getCartCount() {
    const items = await _readCart();
    return items.reduce((sum, it) => sum + it.qty, 0);
  }

  async function getCartSummary() {
    const items     = await _readCart();
    const subtotal  = items.reduce((sum, it) => sum + it.price * it.qty, 0);
    const deliveryFee = items.length === 0
      ? 0
      : (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE);
    return {
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
    };
  }

  async function placeOrder(orderDetails) {
    const items   = await _readCart();
    const summary = await getCartSummary();

    const order = {
      ...orderDetails,
      items,
      subtotal:    summary.subtotal,
      deliveryFee: summary.deliveryFee,
      total:       summary.total,
      status:      'pending',
    };

    const res  = await fetch('/api/orders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(order),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to place order');
    }

    await clearCart();
    // Return short order ID for confirmation screen
    return data._id.toString().slice(-6).toUpperCase();
  }

  // Nav badge refresh on every page load
  document.addEventListener('DOMContentLoaded', async () => {
    const items = await _readCart();
    _refreshBadges(items);
  });

  return {
    getCart,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartCount,
    getCartSummary,
    placeOrder,
  };

})();

/* =====================================================================
   CART PAGE VIEW — renders #cartItemsContainer / receipt / checkout.
   Only runs on cart.html (guarded by the cartItemsContainer check),
   since this file is also loaded on every other page just for BrgrzCart.
   ===================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const itemsContainer = document.getElementById('cartItemsContainer');
  if (!itemsContainer) return;

  const cartView       = document.getElementById('cartView');
  const checkoutView   = document.getElementById('checkoutView');
  const confirmView    = document.getElementById('confirmView');
  const stepTracker     = document.getElementById('stepTracker');

  const cartReceiptRows   = document.getElementById('cartReceiptRows');
  const cartDeliveryFee   = document.getElementById('cartDeliveryFee');
  const cartReceiptTotal  = document.getElementById('cartReceiptTotal');
  const proceedBtn        = document.getElementById('proceedToCheckoutBtn');

  const checkoutReceiptRows  = document.getElementById('checkoutReceiptRows');
  const checkoutDeliveryFee  = document.getElementById('checkoutDeliveryFee');
  const checkoutReceiptTotal = document.getElementById('checkoutReceiptTotal');
  const placeOrderBtn        = document.getElementById('placeOrderBtn');
  const backToCartBtn        = document.getElementById('backToCartBtn');

  const custName    = document.getElementById('custName');
  const custPhone   = document.getElementById('custPhone');
  const custArea    = document.getElementById('custArea');
  const custAddress = document.getElementById('custAddress');
  const payCOD      = document.getElementById('payCOD');
  const payOnline   = document.getElementById('payOnline');
  const onlinePayBox= document.getElementById('onlinePayBox');
  const paidConfirm = document.getElementById('paidConfirm');
  const paymentError= document.getElementById('paymentError');
  const confirmOrderId = document.getElementById('confirmOrderId');

  let paymentMethod = null;

  function esc(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function receiptRowsHtml(items) {
    return items.map(it => `
      <div class="receipt-row">
        <span>${esc(it.name)}${it.size ? ' (' + esc(it.size) + ')' : ''} x${it.qty}</span>
        <span>Rs ${(it.price * it.qty).toLocaleString()}</span>
      </div>`).join('');
  }

  async function renderReceipts() {
    const summary = await BrgrzCart.getCartSummary();
    const items   = await BrgrzCart.getCart();
    const rowsHtml = receiptRowsHtml(items);

    cartReceiptRows.innerHTML = rowsHtml;
    cartDeliveryFee.textContent = 'Rs ' + summary.deliveryFee.toLocaleString();
    cartReceiptTotal.textContent = 'Rs ' + summary.total.toLocaleString();
    proceedBtn.disabled = items.length === 0;

    checkoutReceiptRows.innerHTML = rowsHtml;
    checkoutDeliveryFee.textContent = 'Rs ' + summary.deliveryFee.toLocaleString();
    checkoutReceiptTotal.textContent = 'Rs ' + summary.total.toLocaleString();
  }

  function cartItemHtml(it) {
    return `
      <div class="cart-item" data-id="${esc(it.id)}">
        <div class="cart-item-thumb"><img src="${esc(it.image)}" alt="${esc(it.name)}"></div>
        <div class="cart-item-info">
          <h4>${esc(it.name)}</h4>
          <div class="cart-item-meta">
            ${it.size ? `<span class="size-tag">${esc(it.size)}</span>` : ''}
            <span class="unit-price">Rs ${it.price.toLocaleString()} each</span>
          </div>
        </div>
        <div class="cart-item-right">
          <div class="qty-stepper">
            <button type="button" class="qty-btn" data-action="dec" data-id="${esc(it.id)}">&minus;</button>
            <span>${it.qty}</span>
            <button type="button" class="qty-btn" data-action="inc" data-id="${esc(it.id)}">+</button>
          </div>
          <div class="line-total">Rs ${(it.price * it.qty).toLocaleString()}</div>
          <button type="button" class="remove-btn" data-id="${esc(it.id)}">Remove</button>
        </div>
      </div>`;
  }

  async function renderCartItems() {
    const items = await BrgrzCart.getCart();

    if (items.length === 0) {
      itemsContainer.innerHTML = `
        <div class="empty-cart">
          <div class="icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Looks like you haven't added anything yet.</p>
          <a href="/category/menu">Browse Menu</a>
        </div>`;
    } else {
      itemsContainer.innerHTML = `<div class="cart-items">${items.map(cartItemHtml).join('')}</div>`;
    }

    await renderReceipts();
  }

  itemsContainer.addEventListener('click', async (e) => {
    const qtyBtn = e.target.closest('.qty-btn');
    const removeBtn = e.target.closest('.remove-btn');

    if (qtyBtn) {
      const id = qtyBtn.dataset.id;
      const items = await BrgrzCart.getCart();
      const item = items.find(it => it.id === id);
      if (!item) return;
      const newQty = qtyBtn.dataset.action === 'inc' ? item.qty + 1 : item.qty - 1;
      await BrgrzCart.updateQty(id, newQty);
      await renderCartItems();
    } else if (removeBtn) {
      await BrgrzCart.removeFromCart(removeBtn.dataset.id);
      await renderCartItems();
    }
  });

  function setStep(step) {
    stepTracker.querySelectorAll('.step').forEach(el => {
      el.classList.remove('active', 'done');
      const order = ['cart', 'checkout', 'confirm'];
      if (order.indexOf(el.dataset.step) < order.indexOf(step)) el.classList.add('done');
      if (el.dataset.step === step) el.classList.add('active');
    });
  }

  function showView(view) {
    [cartView, checkoutView, confirmView].forEach(v => v.classList.remove('active'));
    view.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  proceedBtn.addEventListener('click', async () => {
    await renderReceipts();
    placeOrderBtn.disabled = false;
    setStep('checkout');
    showView(checkoutView);
  });

  backToCartBtn.addEventListener('click', () => {
    setStep('cart');
    showView(cartView);
  });

  function validateField(input, isValid) {
    const row = input.closest('.form-row');
    row.classList.toggle('invalid', !isValid);
    return isValid;
  }

  const fieldChecks = {
    custName:    () => custName.value.trim().length > 0,
    custPhone:   () => /^0\d{9,10}$/.test(custPhone.value.trim()),
    custArea:    () => custArea.value.trim().length > 0,
    custAddress: () => custAddress.value.trim().length > 0,
  };

  function validateForm() {
    const nameValid    = validateField(custName, fieldChecks.custName());
    const phoneValid   = validateField(custPhone, fieldChecks.custPhone());
    const areaValid    = validateField(custArea, fieldChecks.custArea());
    const addressValid = validateField(custAddress, fieldChecks.custAddress());

    let paymentValid = !!paymentMethod;
    if (paymentMethod === 'Online') paymentValid = paidConfirm.checked;
    paymentError.style.display = paymentValid ? 'none' : 'block';

    const allValid = nameValid && phoneValid && areaValid && addressValid && paymentValid;

    if (!allValid) {
      // Make sure the customer actually sees why the order didn't go through —
      // scroll to and briefly flash the first problem field instead of failing silently.
      const firstInvalid = document.querySelector('.form-row.invalid, #paymentError[style*="block"]');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.classList.add('shake');
        setTimeout(() => firstInvalid.classList.remove('shake'), 500);
        const focusable = firstInvalid.querySelector('input, select, textarea');
        if (focusable) focusable.focus();
      }
    }

    return allValid;
  }

  [custName, custPhone, custArea, custAddress].forEach(input => {
    const fieldName = input.id;
    input.addEventListener('input', () => validateField(input, fieldChecks[fieldName]()));
  });

  function selectPayment(method) {
    paymentMethod = method;
    payCOD.classList.toggle('selected', method === 'COD');
    payOnline.classList.toggle('selected', method === 'Online');
    onlinePayBox.classList.toggle('show', method === 'Online');
    paymentError.style.display = 'none';
  }

  payCOD.addEventListener('click', () => selectPayment('COD'));
  payOnline.addEventListener('click', () => selectPayment('Online'));

  const paymentErrorDefaultText = paymentError.textContent;

  placeOrderBtn.addEventListener('click', async () => {
    if (!validateForm()) return;

    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Placing Order...';
    paymentError.textContent = paymentErrorDefaultText;
    paymentError.style.display = 'none';

    try {
      const orderId = await BrgrzCart.placeOrder({
        customer:      custName.value.trim(),
        phone:         custPhone.value.trim(),
        area:          custArea.value.trim(),
        address:       custAddress.value.trim(),
        paymentMethod,
      });

      placeOrderBtn.classList.add('success');
      placeOrderBtn.textContent = 'Order Placed! ✓';

      setTimeout(() => {
        confirmOrderId.textContent = 'BRGRZ-' + orderId;
        setStep('confirm');
        showView(confirmView);
        placeOrderBtn.classList.remove('success');
        placeOrderBtn.textContent = 'Place Order';
        placeOrderBtn.disabled = true;
      }, 900);
    } catch (err) {
      console.error('Place order error:', err);
      paymentError.textContent = 'Something went wrong placing your order. Please check your internet connection and try again.';
      paymentError.style.display = 'block';
      paymentError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      paymentError.classList.add('shake');
      setTimeout(() => paymentError.classList.remove('shake'), 500);
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = 'Place Order';
    }
  });

  renderCartItems();
});