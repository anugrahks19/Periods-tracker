/* ============================================
   BLOOM — Settings Page
   ============================================ */

const SettingsPage = (() => {
  function init() {}

  async function render(container) {
    const theme = document.documentElement.dataset.theme || 'dark';
    const pin = await BloomDB.getSetting('pin');
    const name = await BloomDB.getSetting('partnerName') || '';
    const logs = await BloomDB.getAllLogs();
    const cycles = await BloomDB.getAllCycles();
    const notifyPrefs = BloomNotify.getPrefs();

    const session = BloomAuth.getSession();

    container.innerHTML = `
      <div class="section-header"><h2 class="section-header__title">Settings</h2></div>

      ${session ? `
      <!-- Logged In User -->
      <div class="card card--gradient" style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-4); margin-bottom: var(--space-5)">
        <div>
          <div style="font-weight: 600">👋 Hey, ${session.name}</div>
          <div style="font-size: var(--font-sm); color: var(--text-tertiary)">Tracking for <strong style="color: var(--color-rose)">${session.herName}</strong></div>
        </div>
        <button class="btn btn--ghost btn--sm" id="setting-logout" style="color: var(--color-red)">
          <i data-lucide="log-out" style="width:16px;height:16px"></i> Logout
        </button>
      </div>
      ` : ''}

      <!-- Profile -->
      <div class="settings-group">
        <div class="settings-group__title">Profile</div>
        <div class="settings-item" id="setting-name">
          <div class="settings-item__left">
            <div class="settings-item__icon" style="background: var(--color-rose-soft); color: var(--color-rose)">
              <i data-lucide="heart"></i>
            </div>
            <div>
              <div class="settings-item__label">Her Name</div>
              <div class="settings-item__desc">${name || 'Tap to set'}</div>
            </div>
          </div>
          <i data-lucide="chevron-right"></i>
        </div>
      </div>

      <!-- Appearance -->
      <div class="settings-group">
        <div class="settings-group__title">Appearance</div>
        <div class="settings-item" id="setting-theme">
          <div class="settings-item__left">
            <div class="settings-item__icon" style="background: var(--color-lavender-soft); color: var(--color-lavender)">
              <i data-lucide="${theme === 'dark' ? 'moon' : 'sun'}"></i>
            </div>
            <div>
              <div class="settings-item__label">Theme</div>
              <div class="settings-item__desc">${theme === 'dark' ? 'Dark mode' : 'Light mode'}</div>
            </div>
          </div>
          <div class="toggle__switch ${theme === 'dark' ? '' : 'active'}" id="theme-switch"></div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="settings-group">
        <div class="settings-group__title">Notifications</div>
        <div class="settings-item" id="setting-notify-enable">
          <div class="settings-item__left">
            <div class="settings-item__icon" style="background: var(--color-amber-soft); color: var(--color-amber)">
              <i data-lucide="bell"></i>
            </div>
            <div>
              <div class="settings-item__label">Enable Reminders</div>
              <div class="settings-item__desc">${notifyPrefs.enabled ? 'On' : 'Off'}</div>
            </div>
          </div>
          <div class="toggle__switch ${notifyPrefs.enabled ? 'active' : ''}" id="notify-switch"></div>
        </div>
        ${notifyPrefs.enabled ? `
        <div class="settings-item" id="setting-notify-time">
          <div class="settings-item__left">
            <div class="settings-item__icon" style="background: var(--color-sky-soft); color: var(--color-sky)">
              <i data-lucide="clock"></i>
            </div>
            <div>
              <div class="settings-item__label">Reminder Time</div>
              <div class="settings-item__desc">${notifyPrefs.reminderTime}</div>
            </div>
          </div>
          <input type="time" id="notify-time-input" value="${notifyPrefs.reminderTime}" style="background:transparent;border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);padding:var(--space-2);font-family:var(--font-family)" />
        </div>
        <div class="settings-item" id="setting-notify-daily">
          <div class="settings-item__left">
            <div class="settings-item__icon" style="background: var(--color-mint-soft); color: var(--color-mint)">
              <i data-lucide="clipboard-check"></i>
            </div>
            <div>
              <div class="settings-item__label">Daily Log Reminder</div>
              <div class="settings-item__desc">Remind to log if not done today</div>
            </div>
          </div>
          <div class="toggle__switch ${notifyPrefs.dailyReminder ? 'active' : ''}" id="notify-daily-switch"></div>
        </div>
        <div class="settings-item" id="setting-notify-period">
          <div class="settings-item__left">
            <div class="settings-item__icon" style="background: var(--color-rose-soft); color: var(--color-rose)">
              <i data-lucide="calendar-heart"></i>
            </div>
            <div>
              <div class="settings-item__label">Period Alert</div>
              <div class="settings-item__desc">Alert 3 days before predicted period</div>
            </div>
          </div>
          <div class="toggle__switch ${notifyPrefs.periodReminder ? 'active' : ''}" id="notify-period-switch"></div>
        </div>
        ` : ''}
      </div>

      <!-- Security -->
      <div class="settings-group">
        <div class="settings-group__title">Security</div>
        <div class="settings-item" id="setting-pin">
          <div class="settings-item__left">
            <div class="settings-item__icon" style="background: var(--color-amber-soft); color: var(--color-amber)">
              <i data-lucide="lock"></i>
            </div>
            <div>
              <div class="settings-item__label">PIN Lock</div>
              <div class="settings-item__desc">${pin ? 'Enabled — tap to change' : 'Not set'}</div>
            </div>
          </div>
          <i data-lucide="chevron-right"></i>
        </div>
      </div>

      <!-- Data -->
      <div class="settings-group">
        <div class="settings-group__title">Data Management</div>

        <div class="stat-row" style="margin-bottom: var(--space-3)">
          <div class="stat-card">
            <div class="stat-card__value">${logs.length}</div>
            <div class="stat-card__label">Log Entries</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">${cycles.length}</div>
            <div class="stat-card__label">Cycles</div>
          </div>
        </div>

        <div class="settings-item" id="setting-export">
          <div class="settings-item__left">
            <div class="settings-item__icon" style="background: var(--color-mint-soft); color: var(--color-mint)">
              <i data-lucide="download"></i>
            </div>
            <div>
              <div class="settings-item__label">Export Data</div>
              <div class="settings-item__desc">Download as JSON</div>
            </div>
          </div>
          <i data-lucide="chevron-right"></i>
        </div>

        <div class="settings-item" id="setting-import">
          <div class="settings-item__left">
            <div class="settings-item__icon" style="background: var(--color-sky-soft); color: var(--color-sky)">
              <i data-lucide="upload"></i>
            </div>
            <div>
              <div class="settings-item__label">Import Data</div>
              <div class="settings-item__desc">Restore from JSON backup</div>
            </div>
          </div>
          <i data-lucide="chevron-right"></i>
        </div>

        <div class="settings-item" id="setting-clear">
          <div class="settings-item__left">
            <div class="settings-item__icon" style="background: var(--color-red-soft); color: var(--color-red)">
              <i data-lucide="trash-2"></i>
            </div>
            <div>
              <div class="settings-item__label">Clear All Data</div>
              <div class="settings-item__desc">Delete everything permanently</div>
            </div>
          </div>
          <i data-lucide="chevron-right"></i>
        </div>

        <div class="settings-item" id="setting-export-csv">
          <div class="settings-item__left">
            <div class="settings-item__icon" style="background: var(--color-coral-soft); color: var(--color-coral)">
              <i data-lucide="file-spreadsheet"></i>
            </div>
            <div>
              <div class="settings-item__label">Export as CSV</div>
              <div class="settings-item__desc">Open in Excel/Sheets</div>
            </div>
          </div>
          <i data-lucide="chevron-right"></i>
        </div>
      </div>

      <!-- Demo Data -->
      <div class="settings-group">
        <div class="settings-group__title">Developer</div>
        <div class="settings-item" id="setting-demo">
          <div class="settings-item__left">
            <div class="settings-item__icon" style="background: var(--color-lavender-soft); color: var(--color-lavender)">
              <i data-lucide="sparkles"></i>
            </div>
            <div>
              <div class="settings-item__label">Load Demo Data</div>
              <div class="settings-item__desc">Fill with 3 months of sample data to explore charts</div>
            </div>
          </div>
          <i data-lucide="chevron-right"></i>
        </div>
      </div>

      <!-- About -->
      <div class="settings-group">
        <div class="settings-group__title">About</div>
        <div class="card card--gradient" style="text-align: center; padding: var(--space-6)">
          <div style="font-size: 36px; margin-bottom: var(--space-2)">🌸</div>
          <div style="font-size: var(--font-lg); font-weight: 600; margin-bottom: var(--space-1)">Bloom</div>
          <div style="font-size: var(--font-sm); color: var(--text-tertiary)">Period & Wellness Tracker</div>
          <div style="font-size: var(--font-xs); color: var(--text-tertiary); margin-top: var(--space-2)">Made with 💕 for the one you love</div>
          <div style="font-size: var(--font-xs); color: var(--text-tertiary); margin-top: var(--space-1)">v1.0.0 • All data stays on your device</div>
        </div>
      </div>
      <input type="file" id="import-file" accept=".json" style="display:none" />
    `;

    lucide.createIcons({ nodes: [container] });
    bindEvents(container);
  }

  function bindEvents(container) {
    // Theme toggle
    container.querySelector('#setting-theme').addEventListener('click', () => {
      const current = document.documentElement.dataset.theme;
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('bloom-theme', next);
      render(container);
      UI.toast(`Switched to ${next} mode`);
    });

    // Notification toggles
    container.querySelector('#setting-notify-enable').addEventListener('click', async () => {
      const prefs = BloomNotify.getPrefs();
      if (!prefs.enabled) {
        const ok = await BloomNotify.requestPermission();
        if (!ok) {
          UI.toast('Notifications not allowed. Please enable in your device settings.', 'error');
          return;
        }
      }
      prefs.enabled = !prefs.enabled;
      BloomNotify.savePrefs(prefs);
      if (prefs.enabled) {
        BloomNotify.startChecking();
      } else {
        BloomNotify.stopChecking();
      }
      UI.toast(prefs.enabled ? 'Reminders enabled 🔔' : 'Reminders disabled');
      render(container);
    });
    container.querySelector('#notify-time-input')?.addEventListener('change', (e) => {
      const prefs = BloomNotify.getPrefs();
      prefs.reminderTime = e.target.value;
      BloomNotify.savePrefs(prefs);
      UI.toast(`Reminder set for ${e.target.value}`);
    });
    container.querySelector('#notify-daily-switch')?.addEventListener('click', () => {
      const prefs = BloomNotify.getPrefs();
      prefs.dailyReminder = !prefs.dailyReminder;
      BloomNotify.savePrefs(prefs);
      render(container);
    });
    container.querySelector('#notify-period-switch')?.addEventListener('click', () => {
      const prefs = BloomNotify.getPrefs();
      prefs.periodReminder = !prefs.periodReminder;
      BloomNotify.savePrefs(prefs);
      render(container);
    });

    // Name
    container.querySelector('#setting-name').addEventListener('click', async () => {
      const current = await BloomDB.getSetting('partnerName') || '';
      UI.showModal(`
        <h3 style="margin-bottom: var(--space-4)">Her Name</h3>
        <div class="input-group">
          <input class="input" id="modal-name" placeholder="Enter her name" value="${current}" />
        </div>
        <button class="btn btn--primary btn--full" style="margin-top: var(--space-4)" id="modal-save-name">Save</button>
      `);
      document.getElementById('modal-save-name').addEventListener('click', async () => {
        const val = document.getElementById('modal-name').value.trim();
        await BloomDB.setSetting('partnerName', val);
        UI.closeModal();
        UI.toast('Name saved 💕');
        render(container);
      });
    });

    // PIN
    container.querySelector('#setting-pin').addEventListener('click', () => {
      let pin = '';
      UI.showModal(`
        <h3 style="margin-bottom: var(--space-4)">Set PIN Lock</h3>
        <p style="margin-bottom: var(--space-4); font-size: var(--font-sm)">Set a 4-digit PIN to lock the app. Leave empty to disable.</p>
        <div class="input-group">
          <input class="input" id="modal-pin" type="password" maxlength="4" placeholder="4-digit PIN" inputmode="numeric" pattern="[0-9]*" />
        </div>
        <div style="display: flex; gap: var(--space-3); margin-top: var(--space-4)">
          <button class="btn btn--danger btn--sm" id="modal-remove-pin" style="flex: 1">Remove PIN</button>
          <button class="btn btn--primary btn--sm" id="modal-save-pin" style="flex: 1">Save PIN</button>
        </div>
      `);
      document.getElementById('modal-save-pin').addEventListener('click', async () => {
        const val = document.getElementById('modal-pin').value.trim();
        if (val && val.length === 4 && /^\d{4}$/.test(val)) {
          await BloomDB.setSetting('pin', val);
          UI.closeModal();
          UI.toast('PIN set! App will be locked on next visit 🔒');
          render(container);
        } else {
          UI.toast('Please enter a 4-digit number', 'error');
        }
      });
      document.getElementById('modal-remove-pin').addEventListener('click', async () => {
        await BloomDB.setSetting('pin', null);
        UI.closeModal();
        UI.toast('PIN removed');
        render(container);
      });
    });

    // Export
    container.querySelector('#setting-export').addEventListener('click', async () => {
      const data = await BloomDB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bloom-backup-${BloomDB.today()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      UI.toast('Data exported! 📦');
    });

    // Import
    container.querySelector('#setting-import').addEventListener('click', () => {
      container.querySelector('#import-file').click();
    });
    container.querySelector('#import-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.logs && !data.cycles) throw new Error('Invalid format');
        if (confirm('This will replace ALL existing data. Are you sure?')) {
          await BloomDB.importAll(data);
          UI.toast('Data imported! 🎉');
          render(container);
        }
      } catch (err) {
        UI.toast('Invalid backup file', 'error');
      }
    });

    // Clear data — use modal instead of confirm()
    container.querySelector('#setting-clear').addEventListener('click', () => {
      UI.showModal(`
        <h3 style="margin-bottom: var(--space-2)">⚠️ Clear All Data?</h3>
        <p style="font-size: var(--font-sm); color: var(--text-tertiary); margin-bottom: var(--space-4)">This will permanently delete all logs, cycles, and settings. This cannot be undone.</p>
        <div style="display: flex; gap: var(--space-2)">
          <button class="btn btn--ghost btn--full" id="modal-cancel-clear">Cancel</button>
          <button class="btn btn--full" id="modal-confirm-clear" style="background: var(--color-red); color: white">Delete Everything</button>
        </div>
      `);
      document.getElementById('modal-cancel-clear').addEventListener('click', () => UI.closeModal());
      document.getElementById('modal-confirm-clear').addEventListener('click', async () => {
        await BloomDB.clearAll();
        UI.closeModal();
        UI.toast('All data cleared 🗑️');
        render(container);
      });
    });

    // Logout
    container.querySelector('#setting-logout')?.addEventListener('click', () => {
      UI.showModal(`
        <h3 style="margin-bottom: var(--space-2)">Log Out?</h3>
        <p style="font-size: var(--font-sm); color: var(--text-tertiary); margin-bottom: var(--space-4)">You can log back in anytime. Your data stays safe on this device.</p>
        <div style="display: flex; gap: var(--space-2)">
          <button class="btn btn--ghost btn--full" id="modal-cancel-logout">Cancel</button>
          <button class="btn btn--primary btn--full" id="modal-confirm-logout">Log Out</button>
        </div>
      `);
      document.getElementById('modal-cancel-logout').addEventListener('click', () => UI.closeModal());
      document.getElementById('modal-confirm-logout').addEventListener('click', () => {
        BloomAuth.logout();
        UI.closeModal();
        location.reload();
      });
    });

    // Demo data — use modal instead of confirm()
    container.querySelector('#setting-demo')?.addEventListener('click', () => {
      UI.showModal(`
        <h3 style="margin-bottom: var(--space-2)">Load Demo Data?</h3>
        <p style="font-size: var(--font-sm); color: var(--text-tertiary); margin-bottom: var(--space-4)">This will add 3 months of sample data. Existing data will be kept.</p>
        <div style="display: flex; gap: var(--space-2)">
          <button class="btn btn--ghost btn--full" id="modal-cancel-demo">Cancel</button>
          <button class="btn btn--primary btn--full" id="modal-confirm-demo">Load Data</button>
        </div>
      `);
      document.getElementById('modal-cancel-demo').addEventListener('click', () => UI.closeModal());
      document.getElementById('modal-confirm-demo').addEventListener('click', async () => {
        UI.closeModal();
        UI.toast('Generating demo data... ⏳');
        await DemoData.seed();
        UI.toast('Demo data loaded! Check Insights 📊');
        render(container);
      });
    });

    // CSV Export
    container.querySelector('#setting-export-csv')?.addEventListener('click', async () => {
      const logs = await BloomDB.getAllLogs();
      if (logs.length === 0) {
        UI.toast('No data to export', 'error');
        return;
      }
      const headers = ['Date', 'Mood', 'Energy', 'Period', 'Flow', 'Pain Level', 'Sleep Quality',
        'Physical Symptoms', 'Emotional Symptoms', 'Emotional Tags', 'Pain Locations', 'Pain Types',
        'Relief Methods', 'Relief Rating', 'Cravings', 'Needs', 'Behaviour Note', 'Partner Action',
        'What Helped', 'Helped Rating', 'Journal'];
      const rows = logs.sort((a, b) => a.date.localeCompare(b.date)).map(l => [
        l.date, l.mood || '', l.energy || '', l.hasPeriod ? 'Yes' : 'No', l.flow || '', l.painLevel || 0, l.sleepQuality || '',
        (l.physicalSymptoms || []).join('; '), (l.emotionalSymptoms || []).join('; '), (l.emotionalTags || []).join('; '),
        (l.painLocations || []).join('; '), (l.painTypes || []).join('; '),
        (l.reliefMethods || []).join('; '), l.reliefEffectiveness || '', (l.cravings || []).join('; '),
        (l.needs || []).join('; '), `"${(l.behaviourNote || '').replace(/"/g, '""')}"`,
        `"${(l.partnerAction || '').replace(/"/g, '""')}"`,
        `"${(l.whatHelped || '').replace(/"/g, '""')}"`, l.helpedRating || '',
        `"${(l.journal || '').replace(/"/g, '""')}"`
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bloom-data-${BloomDB.today()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      UI.toast('CSV exported! 📊');
    });
  }

  function destroy() {}

  return { init, render, destroy };
})();
