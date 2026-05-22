/* ============================================
   BLOOM — Home / Daily Log Page
   ============================================ */

const HomePage = (() => {
  let state = {
    date: BloomDB.today(),
    mood: '',
    energy: 5,
    flow: '',
    hasPeriod: false,
    physicalSymptoms: [],
    emotionalSymptoms: [],
    emotionalTags: [],
    painLevel: 0,
    painLocations: [],
    painTypes: [],
    reliefMethods: [],
    reliefEffectiveness: 0,
    needs: [],
    behaviourNote: '',
    partnerAction: '',
    whatHelped: '',
    helpedRating: 0,
    journal: '',
  };

  function init() {}

  async function render(container) {
    const todayLog = await BloomDB.getLog(state.date);
    if (todayLog) {
      state = { ...state, ...todayLog };
    } else {
      const d = state.date;
      state = { date: d, mood: '', energy: 5, flow: '', hasPeriod: false,
        physicalSymptoms: [], emotionalSymptoms: [], emotionalTags: [],
        painLevel: 0, painLocations: [], painTypes: [], reliefMethods: [],
        reliefEffectiveness: 0, needs: [], behaviourNote: '', partnerAction: '',
        whatHelped: '', helpedRating: 0, journal: '' };
    }

    // Check if this date falls within any cycle
    const cycles = await BloomDB.getAllCycles();
    let cycleDay = null;
    let phase = null;
    let inCycle = false;
    for (const c of cycles) {
      const end = c.endDate || BloomDB.today();
      if (state.date >= c.startDate && state.date <= end) {
        cycleDay = BloomDB.daysBetween(c.startDate, state.date) + 1;
        phase = UI.getCyclePhase(cycleDay);
        inCycle = true;
        break;
      }
    }
    if (inCycle && !todayLog) state.hasPeriod = true;
    if (todayLog) state.hasPeriod = todayLog.hasPeriod;

    const dateObj = BloomDB.parseDate(state.date);
    const isToday = state.date === BloomDB.today();
    const greeting = isToday ? getGreeting() : '📅 Logging for';
    const dateDisplay = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: isToday ? undefined : 'numeric' });

    // Logging streak
    const logs = await BloomDB.getAllLogs();
    const streak = calcStreak(logs);

    container.innerHTML = `
      <!-- Date Picker Bar -->
      <div class="date-picker-bar">
        <button class="date-picker-bar__btn" id="date-prev"><i data-lucide="chevron-left"></i></button>
        <button class="date-picker-bar__current" id="date-pick">
          <i data-lucide="calendar"></i>
          <span>${isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          ${!isToday ? '<span class="date-picker-bar__badge">Past</span>' : ''}
        </button>
        <button class="date-picker-bar__btn" id="date-next" ${state.date >= BloomDB.today() ? 'disabled' : ''}>
          <i data-lucide="chevron-right"></i>
        </button>
        ${!isToday ? `<button class="btn btn--ghost btn--sm" id="go-today" style="margin-left: var(--space-2)">Today</button>` : ''}
      </div>
      <input type="date" id="hidden-date-input" value="${state.date}" max="${BloomDB.today()}" style="position:absolute;opacity:0;pointer-events:none;height:0" />

      <!-- Hero Card -->
      <div class="home-hero">
        <div class="home-hero__greeting">${greeting}</div>
        <div class="home-hero__date">${dateDisplay}</div>
        <div class="home-hero__meta">
          ${cycleDay ? `<div class="home-hero__cycle">
            <span class="home-hero__cycle-dot"></span>
            Day ${cycleDay} of cycle
            ${phase ? `<span class="phase-badge phase-badge--${phase.class}">${phase.emoji} ${phase.name}</span>` : ''}
          </div>` : ''}
          ${streak > 1 ? `<div class="home-hero__streak">🔥 ${streak}-day logging streak!</div>` : ''}
        </div>
        ${todayLog ? '<div class="home-hero__saved"><i data-lucide="check-circle-2"></i> Already logged</div>' : ''}
        <div class="period-toggle">
          <button class="period-toggle__btn ${state.hasPeriod ? 'active' : ''}" id="toggle-period-on">
            <i data-lucide="droplets"></i> Period ${isToday ? 'Today' : 'This Day'}
          </button>
          <button class="period-toggle__btn ${!state.hasPeriod ? 'active' : ''}" id="toggle-period-off">
            <i data-lucide="circle-off"></i> No Period
          </button>
        </div>
      </div>

      <!-- Mood Section -->
      <div class="log-section">
        <div class="log-section__title"><span class="log-section__title-icon">😊</span> How is she feeling?</div>
        ${UI.renderEmojiGrid(UI.MOODS, state.mood, 'mood')}
      </div>

      <!-- Energy Level -->
      <div class="log-section">
        <div class="log-section__title"><span class="log-section__title-icon">⚡</span> Energy Level</div>
        ${UI.renderSlider('energy-slider', 'Energy', 1, 10, state.energy)}
      </div>

      <!-- Flow Intensity (if period) -->
      <div class="log-section" id="flow-section" style="display: ${state.hasPeriod ? 'block' : 'none'}">
        <div class="log-section__title"><span class="log-section__title-icon">💧</span> Flow Intensity</div>
        ${UI.renderEmojiGrid(UI.FLOW_LEVELS.map(f => ({ ...f, emoji: f.emoji })), state.flow, 'flow')}
      </div>

      <!-- Physical Symptoms -->
      <div class="log-section">
        <div class="log-section__title"><span class="log-section__title-icon">🩹</span> Physical Symptoms</div>
        ${UI.renderChipGroup(UI.PHYSICAL_SYMPTOMS, state.physicalSymptoms)}
      </div>

      <!-- Emotional Symptoms -->
      <div class="log-section">
        <div class="log-section__title"><span class="log-section__title-icon">💭</span> Emotional Symptoms</div>
        ${UI.renderChipGroup(UI.EMOTIONAL_SYMPTOMS, state.emotionalSymptoms, 'emotional-chips')}
      </div>

      <!-- Emotional Tags -->
      <div class="log-section">
        <div class="log-section__title"><span class="log-section__title-icon">🏷️</span> Emotional Vibe</div>
        ${UI.renderChipGroup(UI.EMOTIONAL_TAGS, state.emotionalTags, 'vibe-chips')}
      </div>

      <!-- Pain Intensity -->
      <div class="log-section">
        <div class="log-section__title"><span class="log-section__title-icon">🔥</span> Pain Level</div>
        ${UI.renderSlider('pain-slider', 'Pain', 0, 10, state.painLevel, true)}
      </div>

      <!-- Pain Details (shown if pain > 0) -->
      <div class="log-section" id="pain-details" style="display: ${state.painLevel > 0 ? 'block' : 'none'}">
        <div class="log-section__title"><span class="log-section__title-icon">📍</span> Pain Location</div>
        ${UI.renderChipGroup(UI.PAIN_LOCATIONS, state.painLocations, 'pain-loc-chips')}
        <div class="log-section__title" style="margin-top: var(--space-4)"><span class="log-section__title-icon">⚡</span> Pain Type</div>
        ${UI.renderChipGroup(UI.PAIN_TYPES, state.painTypes, 'pain-type-chips')}
      </div>

      <!-- Relief Methods -->
      <div class="log-section" id="relief-section" style="display: ${state.painLevel > 0 ? 'block' : 'none'}">
        <div class="log-section__title"><span class="log-section__title-icon">💊</span> Relief Methods</div>
        ${UI.renderChipGroup(UI.RELIEF_METHODS, state.reliefMethods, 'relief-chips')}
        <div style="margin-top: var(--space-3)">
          <div class="slider-group__label" style="margin-bottom: var(--space-2)">Did it help?</div>
          ${UI.renderStarRating('relief-stars', state.reliefEffectiveness)}
        </div>
      </div>

      <!-- Sleep Quality -->
      <div class="log-section">
        <div class="log-section__title"><span class="log-section__title-icon">😴</span> Sleep Quality</div>
        ${UI.renderSlider('sleep-slider', 'Sleep', 1, 10, state.sleepQuality || 5)}
      </div>

      <!-- Cravings -->
      <div class="log-section">
        <div class="log-section__title"><span class="log-section__title-icon">🍫</span> Cravings</div>
        ${UI.renderChipGroup(UI.CRAVINGS, state.cravings || [], 'craving-chips')}
      </div>

      <!-- Her Needs -->
      <div class="log-section">
        <div class="log-section__title"><span class="log-section__title-icon">💕</span> What Does She Need?</div>
        <div class="need-tags">${UI.NEED_TAGS.map(n => `
          <button class="need-tag ${state.needs.includes(n.id) ? 'active' : ''}" data-value="${n.id}">${n.label}</button>
        `).join('')}</div>
      </div>

      <!-- Behaviour Note -->
      <div class="log-section">
        <div class="log-section__title"><span class="log-section__title-icon">📝</span> Behaviour Notes</div>
        <div class="input-group">
          <textarea class="input" id="behaviour-note" placeholder="How was she today? What did you notice?">${state.behaviourNote}</textarea>
        </div>
      </div>

      <!-- Partner Action -->
      <div class="log-section">
        <div class="log-section__title"><span class="log-section__title-icon">🤝</span> What Did You Do For Her?</div>
        <div class="input-group">
          <textarea class="input" id="partner-action" placeholder="Made her favorite tea, gave a back rub...">${state.partnerAction}</textarea>
        </div>
        <div style="margin-top: var(--space-3)">
          <div class="input-group">
            <label class="input-group__label">What helped / didn't help?</label>
            <input class="input" id="what-helped" placeholder="e.g., Chocolate helped, talking didn't" value="${state.whatHelped || ''}" />
          </div>
          <div style="margin-top: var(--space-2)">
            <div class="slider-group__label" style="margin-bottom: var(--space-2)">How much did it help?</div>
            ${UI.renderStarRating('helped-stars', state.helpedRating)}
          </div>
        </div>
      </div>

      <!-- Journal -->
      <div class="log-section">
        <div class="log-section__title"><span class="log-section__title-icon">📓</span> Daily Journal</div>
        <div class="input-group">
          <textarea class="input" id="journal" placeholder="Any notes for today...">${state.journal}</textarea>
        </div>
      </div>

      <!-- Save Button -->
      <button class="btn btn--primary btn--full btn--lg" id="save-log">
        <i data-lucide="save"></i> Save ${isToday ? "Today's" : 'This'} Log
      </button>
      <div style="height: var(--space-4)"></div>
    `;

    lucide.createIcons({ nodes: [container] });
    bindEvents(container);
  }

  function calcStreak(logs) {
    let streak = 0;
    let d = BloomDB.today();
    const logSet = new Set(logs.map(l => l.date));
    while (logSet.has(d)) {
      streak++;
      d = BloomDB.addDays(d, -1);
    }
    return streak;
  }

  function bindEvents(container) {
    // Date navigation
    container.querySelector('#date-prev').addEventListener('click', () => {
      state.date = BloomDB.addDays(state.date, -1);
      render(container);
    });
    container.querySelector('#date-next')?.addEventListener('click', () => {
      if (state.date < BloomDB.today()) {
        state.date = BloomDB.addDays(state.date, 1);
        render(container);
      }
    });
    container.querySelector('#go-today')?.addEventListener('click', () => {
      state.date = BloomDB.today();
      render(container);
    });

    // Date picker click
    container.querySelector('#date-pick').addEventListener('click', () => {
      const inp = container.querySelector('#hidden-date-input');
      inp.style.pointerEvents = 'auto';
      inp.showPicker ? inp.showPicker() : inp.click();
    });
    container.querySelector('#hidden-date-input').addEventListener('change', (e) => {
      if (e.target.value && e.target.value <= BloomDB.today()) {
        state.date = e.target.value;
        render(container);
      }
    });

    // Period toggle
    container.querySelector('#toggle-period-on').addEventListener('click', () => handlePeriodToggle(true, container));
    container.querySelector('#toggle-period-off').addEventListener('click', () => handlePeriodToggle(false, container));

    // Mood select
    container.querySelectorAll('[data-name="mood"]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('[data-name="mood"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.mood = btn.dataset.value;
      });
    });

    // Flow select
    container.querySelectorAll('[data-name="flow"]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('[data-name="flow"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.flow = btn.dataset.value;
      });
    });

    // Energy slider
    const energySlider = container.querySelector('#energy-slider');
    energySlider.addEventListener('input', (e) => {
      state.energy = parseInt(e.target.value);
      e.target.closest('.slider-group').querySelector('.slider-group__value').textContent = state.energy;
    });

    // Sleep slider
    const sleepSlider = container.querySelector('#sleep-slider');
    if (sleepSlider) {
      sleepSlider.addEventListener('input', (e) => {
        state.sleepQuality = parseInt(e.target.value);
        e.target.closest('.slider-group').querySelector('.slider-group__value').textContent = state.sleepQuality;
      });
    }

    // Pain slider
    const painSlider = container.querySelector('#pain-slider');
    painSlider.addEventListener('input', (e) => {
      state.painLevel = parseInt(e.target.value);
      const emoji = UI.PAIN_EMOJIS[state.painLevel] || '';
      e.target.closest('.slider-group').querySelector('.slider-group__value').textContent = `${emoji} ${state.painLevel}`;
      container.querySelector('#pain-details').style.display = state.painLevel > 0 ? 'block' : 'none';
      container.querySelector('#relief-section').style.display = state.painLevel > 0 ? 'block' : 'none';
    });

    // All chip groups
    container.querySelectorAll('.chip-group').forEach(group => {
      group.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => chip.classList.toggle('active'));
      });
    });

    // Need tags
    container.querySelectorAll('.need-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        tag.classList.toggle('active');
        const val = tag.dataset.value;
        if (state.needs.includes(val)) {
          state.needs = state.needs.filter(v => v !== val);
        } else {
          state.needs.push(val);
        }
      });
    });

    // Star ratings
    container.querySelectorAll('.star-rating').forEach(rating => {
      rating.querySelectorAll('.star-rating__star').forEach(star => {
        star.addEventListener('click', () => {
          const val = parseInt(star.dataset.star);
          const id = rating.dataset.id;
          rating.querySelectorAll('.star-rating__star').forEach((s, i) => {
            s.textContent = i < val ? '⭐' : '☆';
          });
          if (id === 'relief-stars') state.reliefEffectiveness = val;
          if (id === 'helped-stars') state.helpedRating = val;
        });
      });
    });

    // Save
    container.querySelector('#save-log').addEventListener('click', saveLog);
  }

  async function handlePeriodToggle(isOn, container) {
    state.hasPeriod = isOn;
    document.querySelector('#toggle-period-on').classList.toggle('active', isOn);
    document.querySelector('#toggle-period-off').classList.toggle('active', !isOn);
    document.querySelector('#flow-section').style.display = isOn ? 'block' : 'none';

    if (isOn) {
      const active = await BloomDB.getActiveCycle();
      if (!active) {
        await BloomDB.saveCycle({ startDate: state.date, endDate: null });
        UI.toast('Period started! Take care of her 💕');
      }
    } else {
      const active = await BloomDB.getActiveCycle();
      if (active) {
        active.endDate = state.date;
        await BloomDB.saveCycle(active);
        UI.toast('Period ended! 🎉');
      }
    }
  }

  async function saveLog() {
    const container = document.getElementById('page-home');
    state.physicalSymptoms = [...container.querySelectorAll('.chip-group:not(.emotional-chips):not(.vibe-chips):not(.pain-loc-chips):not(.pain-type-chips):not(.relief-chips):not(.craving-chips) .chip.active')].map(c => c.dataset.value);
    state.emotionalSymptoms = [...container.querySelectorAll('.emotional-chips .chip.active')].map(c => c.dataset.value);
    state.emotionalTags = [...container.querySelectorAll('.vibe-chips .chip.active')].map(c => c.dataset.value);
    state.painLocations = [...container.querySelectorAll('.pain-loc-chips .chip.active')].map(c => c.dataset.value);
    state.painTypes = [...container.querySelectorAll('.pain-type-chips .chip.active')].map(c => c.dataset.value);
    state.reliefMethods = [...container.querySelectorAll('.relief-chips .chip.active')].map(c => c.dataset.value);
    state.cravings = [...container.querySelectorAll('.craving-chips .chip.active')].map(c => c.dataset.value);
    state.sleepQuality = parseInt(container.querySelector('#sleep-slider')?.value || 5);
    state.behaviourNote = container.querySelector('#behaviour-note').value;
    state.partnerAction = container.querySelector('#partner-action').value;
    state.whatHelped = container.querySelector('#what-helped').value;
    state.journal = container.querySelector('#journal').value;

    await BloomDB.saveLog(state.date, state);
    UI.toast('Saved! You\'re doing great 🌸', 'success');

    const btn = container.querySelector('#save-log');
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => { btn.style.transform = ''; render(container); }, 200);
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Good morning';
    if (hour < 17) return '☀️ Good afternoon';
    if (hour < 21) return '🌆 Good evening';
    return '🌙 Good night';
  }

  function destroy() {}

  return { init, render, destroy };
})();
