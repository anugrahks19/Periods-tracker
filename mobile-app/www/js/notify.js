/* ============================================
   BLOOM — Notification & Reminder System
   Hybrid: Capacitor LocalNotifications (native)
           + Web Notifications API (browser)
   ============================================ */

const BloomNotify = (() => {
  const PREF_KEY = 'bloom_notify_prefs';
  let reminderInterval = null;

  /* ── Is this running inside a Capacitor native shell? ── */
  function _isNative() {
    return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform();
  }

  /* ── Preference helpers ─────────────────────────────── */
  function getPrefs() {
    return JSON.parse(localStorage.getItem(PREF_KEY) || JSON.stringify({
      enabled: false,
      dailyReminder: true,
      periodReminder: true,
      reminderTime: '20:00',
      lastNotified: null,
    }));
  }

  function savePrefs(prefs) {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  }

  /* ── Request permission (native or web) ─────────────── */
  async function requestPermission() {
    if (_isNative()) {
      return _requestNativePermission();
    }
    return _requestWebPermission();
  }

  async function _requestNativePermission() {
    try {
      const { LocalNotifications } = Capacitor.Plugins;
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (e) {
      console.warn('Native notification permission error:', e);
      return false;
    }
  }

  function _requestWebPermission() {
    if (!('Notification' in window)) return Promise.resolve(false);
    if (Notification.permission === 'granted') return Promise.resolve(true);
    if (Notification.permission === 'denied') return Promise.resolve(false);
    return Notification.requestPermission().then(r => r === 'granted');
  }

  /* ── Send a notification ────────────────────────────── */
  async function send(title, body, icon = '🌸') {
    if (_isNative()) {
      return _sendNative(title, body);
    }
    return _sendWeb(title, body, icon);
  }

  async function _sendNative(title, body) {
    try {
      const { LocalNotifications } = Capacitor.Plugins;
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now() % 2147483647, // Unique int32 ID
          title: title,
          body: body,
          largeBody: body,
          summaryText: 'Bloom Reminder',
          schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
          sound: 'default',
          smallIcon: 'ic_stat_bloom',
          iconColor: '#E8647A',
          channelId: 'bloom-reminders',
        }],
      });
    } catch (e) {
      console.warn('Native notification send error:', e);
    }
  }

  function _sendWeb(title, body, icon) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, {
        body,
        icon: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${icon}</text></svg>`,
        tag: 'bloom-reminder',
        silent: false,
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch (e) { console.warn('Web notification failed:', e); }
  }

  /* ── Create notification channel (Android 8+) ─────── */
  async function _createChannel() {
    if (!_isNative()) return;
    try {
      const { LocalNotifications } = Capacitor.Plugins;
      await LocalNotifications.createChannel({
        id: 'bloom-reminders',
        name: 'Bloom Reminders',
        description: 'Daily check-in and period reminders',
        importance: 4, // HIGH
        visibility: 1, // PUBLIC
        sound: 'default',
        vibration: true,
      });
    } catch (e) {
      console.warn('Channel creation error:', e);
    }
  }

  /* ── Schedule daily repeating reminder (native only) ── */
  async function _scheduleDaily(time) {
    if (!_isNative()) return;
    try {
      const { LocalNotifications } = Capacitor.Plugins;

      // Cancel any existing daily reminders
      const pending = await LocalNotifications.getPending();
      const dailyIds = pending.notifications
        .filter(n => n.id >= 9000 && n.id <= 9010)
        .map(n => ({ id: n.id }));
      if (dailyIds.length) await LocalNotifications.cancel({ notifications: dailyIds });

      // Parse time
      const [hours, minutes] = time.split(':').map(Number);
      const now = new Date();
      const scheduleDate = new Date();
      scheduleDate.setHours(hours, minutes, 0, 0);
      if (scheduleDate <= now) scheduleDate.setDate(scheduleDate.getDate() + 1);

      await LocalNotifications.schedule({
        notifications: [{
          id: 9001,
          title: '🌸 Daily Check-in',
          body: "Don't forget to log today's entry! How is she feeling?",
          schedule: {
            at: scheduleDate,
            repeats: true,
            every: 'day',
          },
          sound: 'default',
          smallIcon: 'ic_stat_bloom',
          iconColor: '#E8647A',
          channelId: 'bloom-reminders',
        }],
      });
      console.log('📅 Daily reminder scheduled for', time);
    } catch (e) {
      console.warn('Schedule daily error:', e);
    }
  }

  /* ── Cancel all scheduled reminders (native) ────────── */
  async function _cancelAll() {
    if (!_isNative()) return;
    try {
      const { LocalNotifications } = Capacitor.Plugins;
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) {
        await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
      }
    } catch (e) {
      console.warn('Cancel all error:', e);
    }
  }

  /* ── Start the reminder check loop ──────────────────── */
  function startChecking() {
    const prefs = getPrefs();

    // Native: schedule repeating notifications via OS
    if (_isNative()) {
      _createChannel().then(() => {
        if (prefs.dailyReminder) _scheduleDaily(prefs.reminderTime);
        // Also start the in-app interval for period alerts
        _startInAppInterval();
      });
      return;
    }

    // Web: use setInterval polling
    _startInAppInterval();
  }

  function _startInAppInterval() {
    if (reminderInterval) clearInterval(reminderInterval);
    reminderInterval = setInterval(() => checkReminders(), 60000);
    checkReminders();
  }

  /* ── Check reminders (runs in-app) ──────────────────── */
  async function checkReminders() {
    const prefs = getPrefs();
    if (!prefs.enabled) return;

    const now = new Date();
    const todayStr = BloomDB.today();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Only notify once per day at the configured time
    if (prefs.lastNotified === todayStr) return;
    if (timeStr < prefs.reminderTime) return;

    // Daily logging reminder (web only — native uses OS scheduler)
    if (!_isNative() && prefs.dailyReminder) {
      const log = await BloomDB.getLog(todayStr);
      if (!log || !log.mood) {
        send('🌸 Daily Check-in', "Don't forget to log today's entry! How is she feeling?");
        prefs.lastNotified = todayStr;
        savePrefs(prefs);
        return;
      }
    }

    // Period reminder — check if period might be coming
    if (prefs.periodReminder) {
      try {
        const cycles = await BloomDB.getAllCycles();
        if (cycles.length >= 2) {
          const lengths = [];
          for (let i = 0; i < cycles.length - 1; i++) {
            lengths.push(BloomDB.daysBetween(cycles[i + 1].startDate, cycles[i].startDate));
          }
          const avgLen = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
          const lastCycle = cycles[0];
          const daysSinceLast = BloomDB.daysBetween(lastCycle.startDate, todayStr);
          const daysUntilNext = avgLen - daysSinceLast;

          if (daysUntilNext >= 0 && daysUntilNext <= 3) {
            send('📅 Period Alert', `Her period may start in ~${daysUntilNext} day${daysUntilNext !== 1 ? 's' : ''}. Time to stock up on her favorites! 💕`);
            prefs.lastNotified = todayStr;
            savePrefs(prefs);
            return;
          }
        }
      } catch (e) {
        console.warn('Period check error:', e);
      }
    }

    prefs.lastNotified = todayStr;
    savePrefs(prefs);
  }

  /* ── Stop all reminders ──────────────────────────────── */
  function stopChecking() {
    if (reminderInterval) { clearInterval(reminderInterval); reminderInterval = null; }
    _cancelAll();
  }

  return { getPrefs, savePrefs, requestPermission, send, startChecking, stopChecking };
})();
