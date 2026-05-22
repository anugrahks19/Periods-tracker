/* ============================================
   BLOOM — Calendar Page
   ============================================ */

const CalendarPage = (() => {
  let currentYear, currentMonth;

  function init() {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
  }

  async function render(container) {
    if (currentYear === undefined) init();

    const logs = await BloomDB.getAllLogs();
    const cycles = await BloomDB.getAllCycles();
    const logMap = {};
    logs.forEach(l => logMap[l.date] = l);

    // Build period date set
    const periodDates = new Set();
    const periodStarts = new Set();
    const periodEnds = new Set();
    cycles.forEach(c => {
      let d = c.startDate;
      const end = c.endDate || BloomDB.today();
      periodStarts.add(c.startDate);
      if (c.endDate) periodEnds.add(c.endDate);
      while (d <= end) {
        periodDates.add(d);
        d = BloomDB.addDays(d, 1);
      }
    });

    const monthTitle = UI.formatMonthYear(currentYear, currentMonth);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const today = BloomDB.today();

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let calendarHTML = '';
    // Headers
    dayHeaders.forEach(d => {
      calendarHTML += `<div class="calendar-grid__header">${d}</div>`;
    });

    // Empty cells before first day
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarHTML += `<div class="calendar-day calendar-day--empty"></div>`;
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const log = logMap[dateStr];
      const isPeriod = periodDates.has(dateStr);
      const isPeriodStart = periodStarts.has(dateStr);
      const isPeriodEnd = periodEnds.has(dateStr);
      const isToday = dateStr === today;
      const hasLog = !!log;
      const moodObj = log && log.mood ? UI.getMoodObj(log.mood) : null;

      let classes = 'calendar-day';
      if (isToday) classes += ' calendar-day--today';
      if (isPeriod) classes += ' calendar-day--period';
      if (isPeriodStart) classes += ' calendar-day--period-start';
      if (isPeriodEnd) classes += ' calendar-day--period-end';
      if (hasLog && !isPeriod) classes += ' calendar-day--has-log';

      calendarHTML += `<div class="${classes}" data-date="${dateStr}">
        <span>${day}</span>
        ${moodObj ? `<span class="calendar-day__mood">${moodObj.emoji}</span>` : ''}
      </div>`;
    }

    container.innerHTML = `
      <div class="calendar-nav">
        <button class="calendar-nav__btn" id="cal-prev"><i data-lucide="chevron-left"></i></button>
        <h2 class="calendar-nav__title">${monthTitle}</h2>
        <button class="calendar-nav__btn" id="cal-next"><i data-lucide="chevron-right"></i></button>
      </div>

      <div class="calendar-grid">${calendarHTML}</div>

      <div class="calendar-legend">
        <div class="calendar-legend__item">
          <span class="calendar-legend__dot" style="background: var(--color-rose)"></span> Period
        </div>
        <div class="calendar-legend__item">
          <span class="calendar-legend__dot" style="background: var(--color-lavender)"></span> Logged
        </div>
        <div class="calendar-legend__item">
          <span class="calendar-legend__dot" style="background: var(--color-rose); opacity: 0.5"></span> Today
        </div>
      </div>

      <!-- Day summary popup area -->
      <div id="cal-day-summary"></div>
    `;

    lucide.createIcons({ nodes: [container] });

    // Nav events
    container.querySelector('#cal-prev').addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      render(container);
    });
    container.querySelector('#cal-next').addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      render(container);
    });

    // Day click
    container.querySelectorAll('.calendar-day:not(.calendar-day--empty)').forEach(dayEl => {
      dayEl.addEventListener('click', () => {
        const dateStr = dayEl.dataset.date;
        showDaySummary(dateStr, logMap[dateStr], container);
      });
    });
  }

  function showDaySummary(dateStr, log, container) {
    const summaryEl = container.querySelector('#cal-day-summary');
    const dateDisplay = UI.formatDateFull(dateStr);

    if (!log) {
      summaryEl.innerHTML = `
        <div class="card card--gradient" style="margin-top: var(--space-4)">
          <div class="card__header">
            <div>
              <div class="card__title">${dateDisplay}</div>
              <div class="card__subtitle">No log for this day</div>
            </div>
          </div>
          <a href="#day/${dateStr}" class="btn btn--secondary btn--sm">
            <i data-lucide="plus"></i> Add Log
          </a>
        </div>
      `;
    } else {
      const mood = log.mood ? UI.getMoodObj(log.mood) : null;
      const symptoms = [...(log.physicalSymptoms || []), ...(log.emotionalSymptoms || [])];
      summaryEl.innerHTML = `
        <div class="card card--gradient" style="margin-top: var(--space-4)">
          <div class="card__header">
            <div>
              <div class="card__title">${dateDisplay}</div>
              ${mood ? `<div class="card__subtitle">${mood.emoji} ${mood.label} • Energy: ${log.energy || '-'}/10</div>` : ''}
            </div>
            <a href="#day/${dateStr}" class="btn btn--ghost btn--sm">
              <i data-lucide="pencil"></i>
            </a>
          </div>
          ${log.hasPeriod && log.flow ? `<div style="margin-bottom: var(--space-2); font-size: var(--font-sm); color: var(--color-rose)">
            💧 Flow: ${UI.getFlowObj(log.flow).label}
          </div>` : ''}
          ${log.painLevel > 0 ? `<div style="margin-bottom: var(--space-2); font-size: var(--font-sm)">
            🔥 Pain: ${log.painLevel}/10
          </div>` : ''}
          ${symptoms.length > 0 ? `<div class="chip-group" style="margin-bottom: var(--space-2)">
            ${symptoms.slice(0, 5).map(s => `<span class="chip active" style="pointer-events:none; font-size: var(--font-xs)">${s}</span>`).join('')}
            ${symptoms.length > 5 ? `<span class="chip" style="pointer-events:none; font-size: var(--font-xs)">+${symptoms.length - 5}</span>` : ''}
          </div>` : ''}
          ${log.journal ? `<div style="font-size: var(--font-sm); color: var(--text-tertiary); margin-top: var(--space-2)">📓 "${log.journal.substring(0, 100)}${log.journal.length > 100 ? '...' : ''}"</div>` : ''}
        </div>
      `;
    }
    lucide.createIcons({ nodes: [summaryEl] });
  }

  function destroy() {}

  return { init, render, destroy };
})();
