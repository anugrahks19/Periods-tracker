/* ============================================
   BLOOM — Main App Initialization
   ============================================ */

(async () => {
  const authScreen = document.getElementById('auth-screen');
  const appShell   = document.getElementById('app');
  const pinLock    = document.getElementById('pin-lock');

  // ── Apply theme early (also handles auth screen) ──
  function _applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('bloom-theme', t);
    // Update both theme buttons
    _updateThemeBtn(document.getElementById('theme-toggle'), t);
    _updateThemeBtn(document.getElementById('auth-theme-toggle'), t);
  }
  function _updateThemeBtn(btn, t) {
    if (!btn) return;
    btn.innerHTML = t === 'dark'
      ? '<i data-lucide="moon"></i>'
      : '<i data-lucide="sun"></i>';
    lucide.createIcons({ nodes: [btn] });
  }

  const savedTheme = localStorage.getItem('bloom-theme') || 'dark';
  _applyTheme(savedTheme);

  // ── Auth screen theme toggle ────────────────────
  document.getElementById('auth-theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    _applyTheme(next);
  });

  // ── Eye toggle buttons ──────────────────────────
  document.querySelectorAll('.auth-eye-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.innerHTML = showing ? '<i data-lucide="eye"></i>' : '<i data-lucide="eye-off"></i>';
      btn.setAttribute('aria-label', showing ? 'Show PIN' : 'Hide PIN');
      lucide.createIcons({ nodes: [btn] });
    });
  });

  // ── Auth tab switching ──────────────────────────
  const tabSignup  = document.getElementById('tab-signup');
  const tabLogin   = document.getElementById('tab-login');
  const signupForm = document.getElementById('signup-form');
  const loginForm  = document.getElementById('login-form');

  function showLoginHint() {
    const hint  = document.getElementById('accounts-hint');
    const names = BloomAuth.getRegisteredNames();
    if (!hint) return;
    if (names.length === 0) { hint.style.display = 'none'; return; }
    hint.style.display = 'flex';
    hint.innerHTML = `<span class="auth-accounts-hint__label">Accounts:</span>` +
      names.map(n => `<button type="button" class="auth-accounts-hint__chip" data-name="${n}">${n}</button>`).join('');
    hint.querySelectorAll('.auth-accounts-hint__chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.getElementById('login-name').value = chip.dataset.name;
        document.getElementById('login-pin').focus();
      });
    });
  }

  tabSignup.addEventListener('click', () => {
    tabSignup.classList.add('active'); tabLogin.classList.remove('active');
    signupForm.style.display = ''; loginForm.style.display = 'none';
  });
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active'); tabSignup.classList.remove('active');
    loginForm.style.display = ''; signupForm.style.display = 'none';
    showLoginHint();
  });

  // ── Signup ──────────────────────────────────────
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name       = document.getElementById('signup-name').value;
    const herName    = document.getElementById('signup-her-name').value;
    const pin        = document.getElementById('signup-pin').value;
    const pinConfirm = document.getElementById('signup-pin-confirm').value;

    if (pin !== pinConfirm) {
      UI.toast('PINs do not match — please re-enter', 'error');
      document.getElementById('signup-pin-confirm').focus();
      return;
    }

    const btn = document.getElementById('btn-signup');
    btn.disabled = true; btn.textContent = 'Creating…';

    const result = BloomAuth.signup(name, herName, pin);
    if (!result.ok) {
      UI.toast(result.msg, 'error');
      btn.disabled = false; btn.textContent = '🌸 Create Account';
      return;
    }
    await BloomDB.open();
    await BloomDB.setSetting('partnerName', herName.trim());
    enterApp();
  });

  // ── Login ───────────────────────────────────────
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('login-name').value;
    const pin  = document.getElementById('login-pin').value;

    const btn = document.getElementById('btn-login');
    btn.disabled = true; btn.textContent = 'Logging in…';

    const result = BloomAuth.login(name, pin);
    if (!result.ok) {
      UI.toast(result.msg, 'error');
      btn.disabled = false; btn.textContent = '✨ Log In';
      const card = document.querySelector('.auth-card');
      card.style.animation = 'none'; card.offsetHeight;
      card.style.animation = 'shake 300ms ease';
      document.getElementById('login-pin').value = '';
      document.getElementById('login-pin').focus();
      return;
    }
    await BloomDB.open();
    enterApp();
  });

  // ── Check session & PIN lock ────────────────────
  if (BloomAuth.isLoggedIn()) {
    await BloomDB.open();
    const appPin = await BloomDB.getSetting('pin');
    if (appPin) {
      // Hide auth, show app shell behind pin lock
      authScreen.style.display = 'none';
      appShell.style.display = '';
      showPinLock(appPin, () => initApp());
    } else {
      enterApp();
    }
  } else {
    lucide.createIcons();
    if (BloomAuth.getRegisteredNames().length > 0) {
      tabLogin.click();
    }
  }

  // ── PIN Lock UI ─────────────────────────────────
  function showPinLock(correctPin, onSuccess) {
    pinLock.classList.remove('hidden');
    const inner = pinLock.querySelector('.pin-lock__inner');
    const dots  = pinLock.querySelectorAll('.pin-dot');
    const errEl = document.getElementById('pin-error');
    let entered  = '';

    function updateDots() {
      dots.forEach((d, i) => {
        d.classList.toggle('filled', i < entered.length);
        d.classList.remove('error');
      });
      errEl.textContent = '';
    }

    function tryUnlock() {
      if (entered === correctPin) {
        pinLock.classList.add('hidden');
        onSuccess();
      } else {
        // Wrong PIN — shake + error dots
        dots.forEach(d => { d.classList.remove('filled'); d.classList.add('error'); });
        errEl.textContent = 'Wrong PIN. Try again.';
        inner.classList.remove('shake'); inner.offsetHeight;
        inner.classList.add('shake');
        inner.addEventListener('animationend', () => inner.classList.remove('shake'), { once: true });
        entered = '';
        setTimeout(() => { dots.forEach(d => d.classList.remove('error')); updateDots(); }, 600);
      }
    }

    pinLock.querySelectorAll('.pin-key').forEach(key => {
      key.addEventListener('click', () => {
        const k = key.dataset.key;
        if (k === 'del') {
          entered = entered.slice(0, -1);
          updateDots();
        } else if (entered.length < 4) {
          entered += k;
          updateDots();
          if (entered.length === 4) tryUnlock();
        }
      });
    });

    // Also support physical keyboard
    function onKeyDown(e) {
      if (/^[0-9]$/.test(e.key) && entered.length < 4) {
        entered += e.key; updateDots();
        if (entered.length === 4) tryUnlock();
      } else if (e.key === 'Backspace') {
        entered = entered.slice(0, -1); updateDots();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    // Clean up listener when unlocked
    pinLock.dataset._keyListener = 'active';
    const origSuccess = onSuccess;
    onSuccess = () => {
      document.removeEventListener('keydown', onKeyDown);
      origSuccess();
    };
  }

  // ── Enter app (auth → app) ──────────────────────
  function enterApp() {
    authScreen.style.animation = 'fadeOut 400ms var(--ease-out) forwards';
    setTimeout(() => {
      authScreen.style.display = 'none';
      appShell.style.display = '';
      initApp();
    }, 400);
  }

  // ── Initialize app after auth/pin ──────────────
  async function initApp() {
    // ── Theme toggle in topbar ──────────────
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      _applyTheme(next);
    });

    // ── Register Pages ──────────────────────
    Router.register('home',       HomePage);
    Router.register('calendar',   CalendarPage);
    Router.register('cycles',     CyclesPage);
    Router.register('analytics',  AnalyticsPage);
    Router.register('prediction', PredictionPage);
    Router.register('day',        DayPage);
    Router.register('settings',   SettingsPage);

    Router.init();
    lucide.createIcons();

    // ── Notifications ───────────────────────
    const notifyPrefs = BloomNotify.getPrefs();
    if (notifyPrefs.enabled) BloomNotify.startChecking();

    console.log('🌸 Bloom app ready');
  }

  // ── Keyframes injected at runtime ──────────────
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake   { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
    @keyframes fadeOut { to { opacity: 0; } }
  `;
  document.head.appendChild(style);
})();
