/* ============================================
   BLOOM — Prediction Dashboard Page (v2)
   Mobile-first, advanced, polished
   ============================================ */

const PredictionPage = (() => {
  function init() {}
  function destroy() {}

  async function render(container) {
    container.innerHTML = `
      <div class="section-header"><h2 class="section-header__title">🔮 Predictions</h2></div>
      <div class="pred-loading"><div class="pred-spinner"></div><p>Analysing cycle patterns…</p></div>`;

    // Wait for DB to be fully open on first navigation
    await new Promise(r => setTimeout(r, 300));

    const predPromise = Predictor.compute();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Prediction timed out — please reload')), 8000)
    );

    let pred;
    try {
      pred = await Promise.race([predPromise, timeoutPromise]);
    } catch (err) {
      container.innerHTML = `
        <div class="section-header"><h2 class="section-header__title">🔮 Predictions</h2></div>
        <div class="card" style="border-color:var(--color-red-soft)">
          <p style="color:var(--color-red);font-weight:600;margin-bottom:var(--space-2)">⚠️ ${err.message}</p>
          <p style="color:var(--text-tertiary);font-size:var(--font-sm)">Try refreshing the page (Ctrl+R).</p>
        </div>`;
      return;
    }

    if (pred.error) {
      container.innerHTML = `
        <div class="section-header"><h2 class="section-header__title">🔮 Predictions</h2></div>
        <div class="card">
          <p style="color:var(--color-red);font-weight:600">Prediction Error: ${pred.error}</p>
        </div>`;
      return;
    }

    if (!pred.hasCycles) {
      container.innerHTML = `
        <div class="section-header"><h2 class="section-header__title">🔮 Predictions</h2></div>
        <div class="empty-state">
          <div class="empty-state__icon">🌙</div>
          <div class="empty-state__title">No Cycles Logged Yet</div>
          <div class="empty-state__text">Add your first period on the Cycles page to unlock personalised predictions.</div>
          <a href="#cycles" class="btn btn--primary" style="margin-top:var(--space-4)">➕ Add a Cycle</a>
        </div>`;
      return;
    }

    const today     = BloomDB.today();
    const confColor = Predictor.confidenceColor(pred.confidence);
    const confLabel = Predictor.confidenceLabel(pred.confidence);

    container.innerHTML = `
      <div class="section-header"><h2 class="section-header__title">🔮 Predictions</h2></div>
      ${_heroCard(pred, today, confColor, confLabel)}
      ${_phaseCard(pred)}
      ${_statsRow(pred)}
      ${_historyBar(pred)}
      ${_fertileCard(pred, today)}
      ${_pmsCard(pred, today)}
      ${_fingerCard(pred)}
      ${_insightsSection(pred)}
    `;

    lucide.createIcons({ nodes: [container] });
    _animateCountup(container);
    _animateProgress(container);
    _animateHistoryBars(container);
  }

  /* ── Hero — countdown card ─────────────────────────── */
  function _heroCard(pred, today, confColor, confLabel) {
    const { daysUntil, nextPeriodDate, windowEarly, windowLate } = pred;
    if (!nextPeriodDate) return '';

    const nextFmt  = _fmtDate(nextPeriodDate);
    const earlyFmt = _fmtDate(windowEarly);
    const lateFmt  = _fmtDate(windowLate);

    let mainNum = '', mainLabel = '', isLate = false;
    if (daysUntil < 0) {
      isLate    = true;
      mainNum   = Math.abs(daysUntil).toString();
      mainLabel = `day${Math.abs(daysUntil) !== 1 ? 's' : ''} late`;
    } else if (daysUntil === 0) {
      mainNum   = '🌑';
      mainLabel = 'period may start today';
    } else {
      mainNum   = daysUntil.toString();
      mainLabel = `day${daysUntil !== 1 ? 's' : ''} until next period`;
    }

    const urgencyColor = daysUntil <= 2  ? 'var(--color-rose)' :
                         daysUntil <= 5  ? 'var(--color-amber)' :
                         daysUntil <= 10 ? 'var(--color-lavender)' : 'var(--color-sky)';

    return `
    <div class="pred-hero">
      <div class="pred-hero__bg"></div>
      <div class="pred-hero__content">
        <div class="pred-hero__label">Next Period</div>
        <span class="pred-hero__number" data-countup="${daysUntil > 0 ? daysUntil : 0}"
              style="background: none; -webkit-text-fill-color: ${urgencyColor}; color: ${urgencyColor};">
          ${mainNum}
        </span>
        <div class="pred-hero__sub">${mainLabel}</div>
        <div class="pred-hero__date">${nextFmt}</div>
        <div class="pred-hero__window">
          <i data-lucide="calendar-range" style="width:12px;height:12px;flex-shrink:0"></i>
          Likely window: <strong>${earlyFmt} – ${lateFmt}</strong>
        </div>
        <div class="pred-hero__confidence" style="color:${confColor}">
          <div class="pred-hero__conf-dot" style="background:${confColor}"></div>
          ${confLabel}
        </div>
      </div>
    </div>`;
  }

  /* ── Current phase card ────────────────────────────── */
  function _phaseCard(pred) {
    const { currentPhase, cycleDay, avgCycleLen } = pred;
    if (!currentPhase) return '';

    const day    = Math.round(cycleDay);
    const total  = Math.round(avgCycleLen);
    const dLeft  = Math.round(currentPhase.daysLeft);
    const pct    = Math.min(100, Math.round((day / total) * 100));

    const phaseColors = {
      Menstrual:  'var(--color-rose)',
      Follicular: 'var(--color-mint)',
      Ovulatory:  'var(--color-amber)',
      Luteal:     'var(--color-lavender)',
    };
    const phaseBg = {
      Menstrual:  'var(--color-rose-soft)',
      Follicular: 'var(--color-mint-soft)',
      Ovulatory:  'var(--color-amber-soft)',
      Luteal:     'var(--color-lavender-soft)',
    };
    const col = phaseColors[currentPhase.name] || 'var(--color-rose)';
    const bg  = phaseBg[currentPhase.name]     || 'var(--color-rose-soft)';

    return `
    <div class="card pred-phase" style="border-color: ${col}22; background: ${bg}; --phase-color: ${col};">
      <div class="pred-phase__header">
        <div class="pred-phase__left">
          <span class="pred-phase__emoji">${currentPhase.emoji}</span>
          <div class="pred-phase__name" style="color:${col}">${currentPhase.name} Phase</div>
          <div class="pred-phase__sub">Day ${day} of ~${total}-day cycle</div>
        </div>
        <div class="pred-phase__right">
          <div class="pred-phase__days-num" style="color:${col}">${dLeft}</div>
          <div class="pred-phase__days-label">days left</div>
        </div>
      </div>
      <div class="pred-progress">
        <div class="pred-progress__bar" data-width="${pct}" style="width:0%;background:${col}"></div>
      </div>
      <div class="pred-progress__labels">
        <span>Day 1</span><span>Day ${total}</span>
      </div>
      <div class="pred-phase__tip">${currentPhase.tip}</div>
    </div>`;
  }

  /* ── Stats grid ────────────────────────────────────── */
  function _statsRow(pred) {
    const reg = pred.regularity || 'Unknown';
    const regShort = reg.replace('Very ', 'V.').replace('Slightly ', 'Sl.');
    const stats = [
      { label: 'Avg Cycle', value: pred.avgCycleLen ? `${Math.round(pred.avgCycleLen)}d` : '—', icon: '🔄' },
      { label: 'Avg Period', value: pred.avgPeriodLen ? `${Math.round(pred.avgPeriodLen)}d` : '—', icon: '🌑' },
      { label: 'Std Dev', value: pred.stdDev !== null ? `±${pred.stdDev}d` : '—', icon: '📊' },
      { label: 'Pattern', value: regShort, icon: '📈' },
    ];
    return `
    <div class="pred-stats">
      ${stats.map(s => `
        <div class="pred-stat">
          <div style="font-size:14px;margin-bottom:3px">${s.icon}</div>
          <div class="pred-stat__value">${s.value}</div>
          <div class="pred-stat__label">${s.label}</div>
        </div>`).join('')}
    </div>`;
  }

  /* ── Mini cycle history bar chart ─────────────────── */
  function _historyBar(pred) {
    const { cycleHistory } = pred;
    if (!cycleHistory || cycleHistory.length < 2) return '';

    const lengths = cycleHistory
      .map(c => c._cycleLen)
      .filter(l => l && l >= 15 && l <= 60);

    if (lengths.length < 2) return '';

    const maxL = Math.max(...lengths);
    const minL = Math.min(...lengths);
    const avg  = Math.round(pred.avgCycleLen);

    const bars = lengths.map((l, i) => {
      const h   = Math.round(((l - minL + 2) / (maxL - minL + 4)) * 100);
      const isCurrent = i === lengths.length - 1;
      return `<div class="pred-history__bar ${isCurrent ? 'pred-history__bar--current' : ''}"
                   style="height:${h}%" title="Cycle ${i + 1}: ${l} days"></div>`;
    }).join('');

    return `
    <div class="card" style="padding:var(--space-4)">
      <div class="pred-section-title">📆 Cycle Length History
        <span style="font-size:var(--font-xs);color:var(--text-tertiary);font-weight:400;margin-left:auto">avg ~${avg}d</span>
      </div>
      <div class="pred-history">${bars}</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-tertiary)">
        <span>${lengths.length} cycles</span>
        <span>range: ${minL}–${maxL} days</span>
      </div>
    </div>`;
  }

  /* ── Fertile window ─────────────────────────────────  */
  function _fertileCard(pred, today) {
    const { nextOvulation, fertileDays } = pred;
    if (!nextOvulation || !fertileDays || fertileDays.length === 0) return '';

    const ovuParsed = BloomDB.parseDate(nextOvulation);
    const todayParsed = BloomDB.parseDate(today);
    const ovuDays = Math.round((ovuParsed - todayParsed) / 86400000);
    const isFertileNow = fertileDays.includes(today);
    const isOvuPast    = ovuDays < 0;

    const ovuStatus = isOvuPast
      ? `${Math.abs(ovuDays)}d ago`
      : ovuDays === 0 ? 'Today!'
      : `in ${ovuDays}d`;

    return `
    <div class="card" style="margin-bottom:var(--space-3)">
      <div class="pred-section-title">🥚 Ovulation & Fertile Window
        ${isFertileNow ? '<span class="pred-badge" style="background:rgba(110,231,183,0.15);color:var(--color-mint)">🌿 Fertile Now</span>' : ''}
      </div>
      <div class="pred-fertile-row">
        <div class="pred-fertile-item ${isFertileNow || isOvuPast ? '' : 'pred-fertile-item--active'}">
          <div class="pred-fertile-label">Est. Ovulation</div>
          <div class="pred-fertile-date">${_fmtDate(nextOvulation)}</div>
          <div class="pred-fertile-sub">${ovuStatus}</div>
        </div>
        <div class="pred-fertile-item">
          <div class="pred-fertile-label">Fertile Window</div>
          <div class="pred-fertile-date">${_fmtDate(fertileDays[0])}</div>
          <div class="pred-fertile-sub">→ ${_fmtDate(fertileDays[fertileDays.length - 1])}</div>
        </div>
      </div>
      <div class="pred-fertile-note">⚠️ Estimates based on average cycle — not BBT or OPK data</div>
    </div>`;
  }

  /* ── PMS Pattern ────────────────────────────────────── */
  function _pmsCard(pred, today) {
    const { pmsSymptoms, pmsAvgPain, pmsWindow } = pred;
    if (!pmsSymptoms || pmsSymptoms.length === 0) return '';

    const inPMS = pmsWindow && today >= pmsWindow.start && today <= pmsWindow.end;

    return `
    <div class="card pred-pms${inPMS ? ' pred-pms--active' : ''}" style="margin-bottom:var(--space-3)">
      <div class="pred-section-title">⚠️ Her PMS Pattern
        ${inPMS ? '<span class="pred-badge pred-badge--warn">PMS Window Active</span>' : ''}
      </div>
      <div class="pred-pms-symptoms">
        ${pmsSymptoms.map(p => `
          <div class="pred-pms-tag">
            ${p.symptom}
            <span class="pred-pms-tag__count">${p.count}×</span>
          </div>`).join('')}
      </div>
      ${pmsAvgPain !== null
        ? `<div class="pred-pms-pain">Average PMS pain: <strong style="color:var(--color-amber)">${pmsAvgPain}/10</strong></div>`
        : ''}
    </div>`;
  }

  /* ── Phase Fingerprint ──────────────────────────────── */
  function _fingerCard(pred) {
    const { phaseSymptoms, phaseMoods } = pred;
    if (!phaseSymptoms) return '';

    const phases = [
      { key: 'menstrual',  label: 'Menstrual',  emoji: '🌑', color: 'var(--color-rose)' },
      { key: 'follicular', label: 'Follicular', emoji: '🌱', color: 'var(--color-mint)' },
      { key: 'ovulatory',  label: 'Ovulatory',  emoji: '🌕', color: 'var(--color-amber)' },
      { key: 'luteal',     label: 'Luteal',     emoji: '🌘', color: 'var(--color-lavender)' },
    ];

    const hasData = phases.some(p =>
      (phaseSymptoms[p.key] || []).length > 0 || (phaseMoods[p.key] || []).length > 0
    );
    if (!hasData) return '';

    return `
    <div class="card" style="margin-bottom:var(--space-3)">
      <div class="pred-section-title">🧬 Phase Symptom Fingerprint</div>
      <div class="pred-fingerprint">
        ${phases.map(p => {
          const syms  = phaseSymptoms[p.key] || [];
          const moods = phaseMoods[p.key]    || [];
          if (!syms.length && !moods.length) return '';
          return `
          <div class="pred-finger-phase">
            <div class="pred-finger-header" style="color:${p.color}">${p.emoji} ${p.label}</div>
            ${syms.length ? `<div class="pred-finger-tags">${syms.map(s =>
              `<span class="pred-finger-tag">${s}</span>`).join('')}</div>` : ''}
            ${moods.length ? `<div class="pred-finger-moods">${moods.map(_moodEmoji).join(' ')}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  /* ── Insights section ───────────────────────────────── */
  function _insightsSection(pred) {
    if (!pred.insights || pred.insights.length === 0) return '';
    return `
      <div class="section-header" style="margin-top:var(--space-4)">
        <h3 class="section-header__title" style="font-size:var(--font-base)">💡 Insights for You</h3>
      </div>
      ${pred.insights.map(i => `
        <div class="insight-card">
          <div class="insight-card__icon">${i.icon}</div>
          <div class="insight-card__text">${i.text}</div>
        </div>`).join('')}
    `;
  }

  /* ── Helpers ─────────────────────────────────────────── */
  function _fmtDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = BloomDB.parseDate(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  }

  function _moodEmoji(mood) {
    const map = {
      happy: '😊', calm: '😌', loved: '🥰', excited: '🤩',
      anxious: '😰', irritable: '😤', sad: '😢', overwhelmed: '😩', numb: '😶',
    };
    return map[mood] || mood;
  }

  function _animateCountup(container) {
    container.querySelectorAll('[data-countup]').forEach(el => {
      const target = parseInt(el.dataset.countup);
      if (isNaN(target) || target <= 0) return;
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 20));
      const iv = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current;
        if (current >= target) clearInterval(iv);
      }, 35);
    });
  }

  function _animateProgress(container) {
    requestAnimationFrame(() => {
      container.querySelectorAll('[data-width]').forEach(el => {
        el.style.width = el.dataset.width + '%';
      });
    });
  }

  function _animateHistoryBars(container) {
    const bars = container.querySelectorAll('.pred-history__bar');
    bars.forEach((bar, i) => {
      const targetH = bar.style.height;
      bar.style.height = '0%';
      setTimeout(() => { bar.style.height = targetH; }, i * 40);
    });
  }

  return { init, render, destroy };
})();
