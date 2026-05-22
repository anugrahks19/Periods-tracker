/* ============================================
   BLOOM — Cycles History Page (v2 — with past cycle logging)
   ============================================ */

const CyclesPage = (() => {
  function init() {}

  async function render(container) {
    const cycles = await BloomDB.getAllCycles();
    const logs = await BloomDB.getAllLogs();

    // Calculate stats
    const completedCycles = cycles.filter(c => c.endDate);
    const avgDuration = completedCycles.length > 0
      ? Math.round(completedCycles.reduce((sum, c) => sum + BloomDB.daysBetween(c.startDate, c.endDate), 0) / completedCycles.length)
      : 0;
    
    const cycleLengths = [];
    for (let i = 0; i < cycles.length - 1; i++) {
      if (cycles[i].startDate && cycles[i + 1].startDate) {
        cycleLengths.push(BloomDB.daysBetween(cycles[i + 1].startDate, cycles[i].startDate));
      }
    }
    const avgCycleLength = cycleLengths.length > 0
      ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
      : 0;

    const shortest = completedCycles.length > 0 ? Math.min(...completedCycles.map(c => BloomDB.daysBetween(c.startDate, c.endDate) + 1)) : 0;
    const longest = completedCycles.length > 0 ? Math.max(...completedCycles.map(c => BloomDB.daysBetween(c.startDate, c.endDate) + 1)) : 0;

    container.innerHTML = `
      <div class="section-header">
        <h2 class="section-header__title">Cycle History</h2>
        <button class="btn btn--primary btn--sm" id="add-past-cycle">
          <i data-lucide="plus"></i> Add Past Cycle
        </button>
      </div>

      ${cycles.length > 0 ? `
      <div class="stat-row" style="margin-bottom: var(--space-5)">
        <div class="stat-card">
          <div class="stat-card__value">${avgDuration || '—'}</div>
          <div class="stat-card__label">Avg Period Days</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">${avgCycleLength || '—'}</div>
          <div class="stat-card__label">Avg Cycle Length</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">${shortest || '—'}</div>
          <div class="stat-card__label">Shortest</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">${longest || '—'}</div>
          <div class="stat-card__label">Longest</div>
        </div>
      </div>

      <!-- Cycle Length Regularity -->
      ${cycleLengths.length > 1 ? `
      <div class="card card--gradient" style="margin-bottom: var(--space-5)">
        <div class="card__title" style="margin-bottom: var(--space-2)">📏 Cycle Regularity</div>
        <div style="display: flex; align-items: center; gap: var(--space-3)">
          <div class="regularity-bar">
            ${cycleLengths.map((len, i) => {
              const pct = ((len - 20) / 20) * 100;
              return `<div class="regularity-bar__segment" style="height: ${Math.max(10, Math.min(100, pct))}%; background: ${Math.abs(len - avgCycleLength) <= 3 ? 'var(--color-mint)' : 'var(--color-amber)'}" title="Cycle ${i+1}: ${len} days"></div>`;
            }).join('')}
          </div>
          <div>
            <div style="font-size: var(--font-sm); color: var(--text-secondary)">
              ${(() => {
                const variance = cycleLengths.reduce((s, l) => s + Math.abs(l - avgCycleLength), 0) / cycleLengths.length;
                if (variance <= 2) return '✅ <strong>Very regular</strong> — her cycle is consistent!';
                if (variance <= 5) return '⚠️ <strong>Somewhat irregular</strong> — some variation between cycles';
                return '🔴 <strong>Irregular</strong> — significant variation detected';
              })()}
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      <div id="cycles-list">
        ${cycles.map((cycle, i) => renderCycleCard(cycle, logs, cycles[i + 1])).join('')}
      </div>
      ` : `
      <div class="empty-state">
        <div class="empty-state__icon">📅</div>
        <div class="empty-state__title">No Cycles Yet</div>
        <div class="empty-state__text">Tap "Add Past Cycle" to log her previous period dates, or mark a period on the Home page.</div>
      </div>
      `}
    `;

    lucide.createIcons({ nodes: [container] });

    // Add past cycle button
    container.querySelector('#add-past-cycle').addEventListener('click', () => showAddCycleModal(container));

    // Cycle card clicks
    container.querySelectorAll('.cycle-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.cycle-card__delete')) return;
        const startDate = card.dataset.start;
        window.location.hash = `#day/${startDate}`;
      });
    });

    // Delete buttons
    container.querySelectorAll('.cycle-card__delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        if (confirm('Delete this cycle?')) {
          await BloomDB.deleteCycle(id);
          UI.toast('Cycle deleted');
          render(container);
        }
      });
    });
  }

  function showAddCycleModal(container) {
    UI.showModal(`
      <h3 style="margin-bottom: var(--space-2)">Add Past Cycle</h3>
      <p style="font-size: var(--font-sm); color: var(--text-tertiary); margin-bottom: var(--space-4)">Log a period that already happened. Enter the start and end dates.</p>

      <div class="input-group" style="margin-bottom: var(--space-3)">
        <label class="input-group__label">Period Start Date *</label>
        <input type="date" class="input" id="modal-cycle-start" max="${BloomDB.today()}" required />
      </div>
      <div class="input-group" style="margin-bottom: var(--space-4)">
        <label class="input-group__label">Period End Date *</label>
        <input type="date" class="input" id="modal-cycle-end" max="${BloomDB.today()}" required />
      </div>

      <div class="card" style="padding: var(--space-3); margin-bottom: var(--space-4); font-size: var(--font-sm); color: var(--text-tertiary)">
        💡 <strong>Tip:</strong> If you don't remember the exact end date, estimate — a typical period lasts 3–7 days.
      </div>

      <button class="btn btn--primary btn--full" id="modal-save-cycle">
        <i data-lucide="plus"></i> Add Cycle
      </button>
    `);

    document.getElementById('modal-save-cycle').addEventListener('click', async () => {
      const start = document.getElementById('modal-cycle-start').value;
      const end = document.getElementById('modal-cycle-end').value;

      if (!start || !end) {
        UI.toast('Please enter both dates', 'error');
        return;
      }
      if (end < start) {
        UI.toast('End date must be after start date', 'error');
        return;
      }
      if (BloomDB.daysBetween(start, end) > 15) {
        UI.toast('Period duration seems too long (>15 days). Please check dates.', 'error');
        return;
      }

      await BloomDB.saveCycle({ startDate: start, endDate: end });

      // Auto-create log entries for period days with hasPeriod flag
      let d = start;
      while (d <= end) {
        const existing = await BloomDB.getLog(d);
        if (!existing) {
          await BloomDB.saveLog(d, { date: d, hasPeriod: true, flow: 'moderate' });
        } else if (!existing.hasPeriod) {
          existing.hasPeriod = true;
          await BloomDB.saveLog(d, existing);
        }
        d = BloomDB.addDays(d, 1);
      }

      UI.closeModal();
      UI.toast('Past cycle added! 📅');
      render(container);
    });
  }

  function renderCycleCard(cycle, logs, nextCycle) {
    const startDisplay = UI.formatDateDisplay(cycle.startDate);
    const endDisplay = cycle.endDate ? UI.formatDateDisplay(cycle.endDate) : 'Ongoing';
    const duration = cycle.endDate ? BloomDB.daysBetween(cycle.startDate, cycle.endDate) + 1 : '—';
    const isActive = !cycle.endDate;

    // Gap to next cycle
    const gapDays = nextCycle ? BloomDB.daysBetween(cycle.startDate, nextCycle.startDate) : null;

    // Get logs for this cycle
    const cycleLogs = logs.filter(l => {
      const end = cycle.endDate || BloomDB.today();
      return l.date >= cycle.startDate && l.date <= end;
    });

    const avgPain = cycleLogs.length > 0
      ? (cycleLogs.reduce((sum, l) => sum + (l.painLevel || 0), 0) / cycleLogs.length).toFixed(1)
      : '—';

    const moodCounts = {};
    cycleLogs.forEach(l => { if (l.mood) moodCounts[l.mood] = (moodCounts[l.mood] || 0) + 1; });
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    const topMoodObj = topMood ? UI.getMoodObj(topMood[0]) : null;

    // Symptoms for this cycle
    const symCounts = {};
    cycleLogs.forEach(l => {
      [...(l.physicalSymptoms || []), ...(l.emotionalSymptoms || [])].forEach(s => {
        symCounts[s] = (symCounts[s] || 0) + 1;
      });
    });
    const topSymptoms = Object.entries(symCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return `
      <div class="cycle-card" data-start="${cycle.startDate}">
        <div class="cycle-card__header">
          <div>
            <div class="cycle-card__dates">${startDisplay} → ${endDisplay}</div>
            ${gapDays ? `<div style="font-size: var(--font-xs); color: var(--text-tertiary); margin-top: 2px">Cycle length: ${gapDays} days</div>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: var(--space-2)">
            ${isActive ? '<span class="phase-badge phase-badge--menstrual">Active</span>' : ''}
            <button class="cycle-card__delete btn btn--ghost btn--sm" data-id="${cycle.id}" title="Delete cycle">
              <i data-lucide="trash-2" style="width:14px;height:14px"></i>
            </button>
          </div>
        </div>
        <div class="cycle-card__stats">
          <div class="cycle-card__stat">
            <div class="cycle-card__stat-value">${duration}</div>
            <div class="cycle-card__stat-label">Days</div>
          </div>
          <div class="cycle-card__stat">
            <div class="cycle-card__stat-value">${avgPain}</div>
            <div class="cycle-card__stat-label">Avg Pain</div>
          </div>
          <div class="cycle-card__stat">
            <div class="cycle-card__stat-value">${topMoodObj ? topMoodObj.emoji : '—'}</div>
            <div class="cycle-card__stat-label">${topMoodObj ? topMoodObj.label : 'Mood'}</div>
          </div>
        </div>
        ${topSymptoms.length > 0 ? `<div class="chip-group" style="margin-top: var(--space-3)">
          ${topSymptoms.map(([s]) => `<span class="chip" style="pointer-events:none; font-size: var(--font-xs); padding: 4px 10px; min-height: auto">${s}</span>`).join('')}
        </div>` : ''}
      </div>
    `;
  }

  function destroy() {}

  return { init, render, destroy };
})();
