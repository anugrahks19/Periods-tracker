/* ============================================
   BLOOM — Hash Router
   ============================================ */

const Router = (() => {
  const pages = {};
  let currentPage = null;

  function register(name, { init, render, destroy }) {
    pages[name] = { init, render, destroy };
  }

  function navigate(hash) {
    if (!hash || hash === '#') hash = '#home';
    const parts = hash.replace('#', '').split('/');
    const pageName = parts[0];
    const params = parts.slice(1);

    if (!pages[pageName]) {
      console.warn(`Page not found: ${pageName}`);
      return;
    }

    // Destroy current page
    if (currentPage && pages[currentPage] && pages[currentPage].destroy) {
      pages[currentPage].destroy();
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show target page
    const pageEl = document.querySelector(`[data-page="${pageName}"]`);
    if (pageEl) {
      pageEl.classList.add('active');
      // Re-trigger animation
      pageEl.style.animation = 'none';
      pageEl.offsetHeight; // reflow
      pageEl.style.animation = '';
    }

    // Update nav
    document.querySelectorAll('.bottom-nav__item').forEach(item => {
      item.classList.toggle('active', item.dataset.nav === pageName);
    });

    // Update back button
    const backBtn = document.getElementById('back-btn');
    const showBack = ['day', 'cycles'].includes(pageName) && params.length > 0;
    backBtn.classList.toggle('hidden', !showBack);

    // Render page
    currentPage = pageName;
    if (pages[pageName].render) {
      pages[pageName].render(pageEl, ...params);
    }

    // Scroll to top
    window.scrollTo(0, 0);
  }

  function init() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      navigate(window.location.hash);
    });

    // Back button
    document.getElementById('back-btn').addEventListener('click', () => {
      window.history.back();
    });

    // Initialize all pages
    Object.values(pages).forEach(p => {
      if (p.init) p.init();
    });

    // Navigate to current hash or default
    navigate(window.location.hash || '#home');
  }

  return { register, navigate, init };
})();
