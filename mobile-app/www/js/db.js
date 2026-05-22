/* ============================================
   BLOOM — Database Layer (IndexedDB + localStorage)
   ============================================ */

const BloomDB = (() => {
  const DB_NAME = 'bloom_tracker';
  const DB_VERSION = 1;
  let db = null;

  // Store names
  const STORES = {
    LOGS: 'daily_logs',       // keyed by date string YYYY-MM-DD
    CYCLES: 'cycles',         // keyed by auto-increment id
    SETTINGS: 'settings',     // keyed by setting name
  };

  // ── Open / Initialize DB ──────────────
  function open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const _db = e.target.result;

        // Daily logs store
        if (!_db.objectStoreNames.contains(STORES.LOGS)) {
          const logStore = _db.createObjectStore(STORES.LOGS, { keyPath: 'date' });
          logStore.createIndex('mood', 'mood', { unique: false });
          logStore.createIndex('hasPeriod', 'hasPeriod', { unique: false });
        }

        // Cycles store
        if (!_db.objectStoreNames.contains(STORES.CYCLES)) {
          const cycleStore = _db.createObjectStore(STORES.CYCLES, { keyPath: 'id', autoIncrement: true });
          cycleStore.createIndex('startDate', 'startDate', { unique: false });
          cycleStore.createIndex('endDate', 'endDate', { unique: false });
        }

        // Settings store
        if (!_db.objectStoreNames.contains(STORES.SETTINGS)) {
          _db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };

      request.onerror = (e) => {
        console.error('DB open error:', e);
        reject(e);
      };
    });
  }

  // ── Generic helpers ───────────────────
  function _tx(storeName, mode = 'readonly') {
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  function _request(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ── Daily Log CRUD ────────────────────
  async function saveLog(dateStr, data) {
    const store = _tx(STORES.LOGS, 'readwrite');
    const entry = { date: dateStr, ...data, updatedAt: new Date().toISOString() };
    return _request(store.put(entry));
  }

  async function getLog(dateStr) {
    const store = _tx(STORES.LOGS, 'readonly');
    return _request(store.get(dateStr));
  }

  async function getAllLogs() {
    const store = _tx(STORES.LOGS, 'readonly');
    return _request(store.getAll());
  }

  async function getLogRange(startDate, endDate) {
    const logs = await getAllLogs();
    return logs.filter(l => l.date >= startDate && l.date <= endDate);
  }

  async function deleteLog(dateStr) {
    const store = _tx(STORES.LOGS, 'readwrite');
    return _request(store.delete(dateStr));
  }

  // ── Cycle CRUD ────────────────────────
  async function saveCycle(cycle) {
    const store = _tx(STORES.CYCLES, 'readwrite');
    return _request(store.put(cycle));
  }

  async function getAllCycles() {
    const store = _tx(STORES.CYCLES, 'readonly');
    const cycles = await _request(store.getAll());
    return cycles.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  async function getActiveCycle() {
    const cycles = await getAllCycles();
    return cycles.find(c => !c.endDate) || null;
  }

  async function deleteCycle(id) {
    const store = _tx(STORES.CYCLES, 'readwrite');
    return _request(store.delete(id));
  }

  // ── Settings ──────────────────────────
  async function setSetting(key, value) {
    const store = _tx(STORES.SETTINGS, 'readwrite');
    return _request(store.put({ key, value }));
  }

  async function getSetting(key) {
    const store = _tx(STORES.SETTINGS, 'readonly');
    const result = await _request(store.get(key));
    return result ? result.value : null;
  }

  // ── Export / Import ───────────────────
  async function exportAll() {
    const logs = await getAllLogs();
    const cycles = await getAllCycles();
    const settingsStore = _tx(STORES.SETTINGS, 'readonly');
    const settings = await _request(settingsStore.getAll());
    return { version: DB_VERSION, exportDate: new Date().toISOString(), logs, cycles, settings };
  }

  async function importAll(data) {
    // Clear existing
    const logStore = _tx(STORES.LOGS, 'readwrite');
    await _request(logStore.clear());
    const cycleStore = _tx(STORES.CYCLES, 'readwrite');
    await _request(cycleStore.clear());
    const settingsStore = _tx(STORES.SETTINGS, 'readwrite');
    await _request(settingsStore.clear());

    // Import logs
    for (const log of (data.logs || [])) {
      const ls = _tx(STORES.LOGS, 'readwrite');
      await _request(ls.put(log));
    }
    // Import cycles
    for (const cycle of (data.cycles || [])) {
      const cs = _tx(STORES.CYCLES, 'readwrite');
      await _request(cs.put(cycle));
    }
    // Import settings
    for (const setting of (data.settings || [])) {
      const ss = _tx(STORES.SETTINGS, 'readwrite');
      await _request(ss.put(setting));
    }
  }

  async function clearAll() {
    // Clear each store in its own transaction
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.LOGS, 'readwrite');
      tx.objectStore(STORES.LOGS).clear();
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CYCLES, 'readwrite');
      tx.objectStore(STORES.CYCLES).clear();
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SETTINGS, 'readwrite');
      tx.objectStore(STORES.SETTINGS).clear();
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  }

  // ── Utility: date helpers ─────────────
  function today() {
    return formatDate(new Date());
  }

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function daysBetween(date1, date2) {
    const d1 = typeof date1 === 'string' ? parseDate(date1) : date1;
    const d2 = typeof date2 === 'string' ? parseDate(date2) : date2;
    return Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
  }

  function addDays(dateStr, days) {
    const d = parseDate(dateStr);
    d.setDate(d.getDate() + days);
    return formatDate(d);
  }

  return {
    open, saveLog, getLog, getAllLogs, getLogRange, deleteLog,
    saveCycle, getAllCycles, getActiveCycle, deleteCycle,
    setSetting, getSetting,
    exportAll, importAll, clearAll,
    today, formatDate, parseDate, daysBetween, addDays,
  };
})();
