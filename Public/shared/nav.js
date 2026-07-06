// Shared across every page: renders the nav links from /api/categories
// (so a category created in admin shows up here automatically, no code
// change needed). On narrow screens, the nav becomes a horizontally
// scrollable strip below the header row (see the .nav-links media
// queries in each page's CSS) — no hamburger menu needed.
// Expects each page to have an empty <nav id="navLinks"> in its header.

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

renderNav();
