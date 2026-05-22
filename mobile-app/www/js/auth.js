/* ============================================
   BLOOM — Auth Module (Local login/signup)
   Stores accounts in localStorage under bloom_users
   ============================================ */

const BloomAuth = (() => {
  const USERS_KEY  = 'bloom_users';
  const SESSION_KEY = 'bloom_session';

  /* ── User storage ────────────────────────── */
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  /* ── Simple but reliable PIN hash ────────── 
     djb2 variant — always produces a positive, 
     consistent numeric string on all JS engines  */
  function hashPin(pin) {
    let hash = 5381;
    for (let i = 0; i < pin.length; i++) {
      hash = ((hash << 5) + hash) ^ pin.charCodeAt(i);
      hash = hash >>> 0; // Convert to unsigned 32-bit — always positive
    }
    return hash.toString(16); // hex string, e.g. "1a2b3c4d"
  }

  /* ── Signup ───────────────────────────────── */
  function signup(name, herName, pin) {
    name    = (name    || '').trim();
    herName = (herName || '').trim();
    pin     = (pin     || '').trim();

    if (!name)             return { ok: false, msg: 'Please enter your name' };
    if (!herName)          return { ok: false, msg: "Please enter her name" };
    if (pin.length < 4)    return { ok: false, msg: 'PIN must be at least 4 characters' };

    const users    = getUsers();
    const username = name.toLowerCase();

    if (users[username]) return { ok: false, msg: `Account "${name}" already exists. Try logging in.` };

    users[username] = {
      name,
      herName,
      pin: hashPin(pin),
      createdAt: new Date().toISOString(),
    };
    saveUsers(users);
    setSession(username, name, herName);
    return { ok: true };
  }

  /* ── Login ────────────────────────────────── */
  function login(name, pin) {
    name = (name || '').trim();
    pin  = (pin  || '').trim();

    if (!name) return { ok: false, msg: 'Please enter your name' };
    if (!pin)  return { ok: false, msg: 'Please enter your PIN' };

    const users    = getUsers();
    const username = name.toLowerCase();
    const user     = users[username];

    if (!user)                        return { ok: false, msg: `No account found for "${name}"` };
    if (user.pin !== hashPin(pin))    return { ok: false, msg: 'Wrong PIN. Try again.' };

    setSession(username, user.name, user.herName);
    return { ok: true };
  }

  /* ── Session ──────────────────────────────── */
  function setSession(username, name, herName) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username, name, herName }));
  }
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  }
  function logout() { localStorage.removeItem(SESSION_KEY); }
  function isLoggedIn() { return !!getSession(); }

  /* ── List registered usernames (for login hint) ── */
  function getRegisteredNames() {
    const users = getUsers();
    return Object.values(users).map(u => u.name);
  }

  return { signup, login, logout, isLoggedIn, getSession, getRegisteredNames };
})();
