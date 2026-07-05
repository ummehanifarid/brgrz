// Shared across every page: renders the nav links from /api/categories
// (so a category created in admin shows up here automatically, no code
// change needed) and wires the mobile burger-menu toggle.
// Expects each page to have an empty <nav id="navLinks"> and a
// <button id="burgerToggle"> in its header markup.

async function renderNav() {
  const navLinks = document.getElementById('navLinks');
  if (!navLinks) return;

  try {
    const res = await fetch('/api/categories');
    const categories = await res.json();

    navLinks.innerHTML = categories
      .filter(cat => cat.nav !== false)
      .map(cat => `<a href="/category/${encodeURIComponent(cat.catKey)}">${esc(cat.name)}</a>`)
      .join('');
  } catch (err) {
    console.error('Failed to load nav categories:', err);
  }
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function wireBurgerToggle() {
  const burgerToggle = document.getElementById('burgerToggle');
  const navLinks = document.getElementById('navLinks');
  if (!burgerToggle || !navLinks) return;

  burgerToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    burgerToggle.classList.toggle('active', isOpen);
    burgerToggle.setAttribute('aria-expanded', isOpen);
  });

  navLinks.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      navLinks.classList.remove('open');
      burgerToggle.classList.remove('active');
      burgerToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

renderNav();
wireBurgerToggle();
