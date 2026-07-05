// Mobile nav toggle is handled by /shared/nav.js (loaded before this file).

        // Nav shrink / solidify on scroll
        const nav = document.getElementById('nav');
        const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 30);
        document.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        // Scroll-reveal for feature cards (progressive enhancement —
        // elements are only hidden once JS confirms it can reveal them again)
        const revealEls = document.querySelectorAll('.feature-card, .section-header');
        revealEls.forEach(el => el.classList.add('pre-reveal'));

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.18 });
        revealEls.forEach(el => observer.observe(el));

        // Hero "Order Now" button: just a nice bump flourish on the cart icon.
        // 🔶 This button isn't tied to a real item, so it never touches the
        // cart count itself — that number always comes from cart.js (BrgrzCart),
        // which already keeps #cartCount accurate on every page load.
        const cartBtn = document.getElementById('cartBtn');
        document.querySelectorAll('.btn-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (btn.getAttribute('href') === '#order') {
                    e.preventDefault();
                    cartBtn.classList.remove('bump');
                    requestAnimationFrame(() => cartBtn.classList.add('bump'));
                }
            });
        });