/* =====================================================================
   THE BRGRZ — CART DATA LAYER  (cart.js)
   ---------------------------------------------------------------------
   Ab yeh localStorage ki jagah MongoDB API use karta hai.
   Baaki saari files (pizzas.js, burgers.js, etc.) bilkul nahi badle —
   woh BrgrzCart.addToCart() etc. exactly pehle ki tarah call karte hain.
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

    await clearCart();
    // Return short order ID for confirmation screen
    return data._id ? data._id.toString().slice(-6).toUpperCase() : 'ORDER';
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