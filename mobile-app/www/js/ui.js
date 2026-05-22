/* ============================================
   BLOOM — UI Helpers
   ============================================ */

const UI = (() => {
  // ── Data constants ────────────────────
  const MOODS = [
    { id: 'happy', emoji: '😊', label: 'Happy', color: 'var(--mood-happy)' },
    { id: 'calm', emoji: '😌', label: 'Calm', color: 'var(--mood-calm)' },
    { id: 'loved', emoji: '🥰', label: 'Loved', color: 'var(--mood-loved)' },
    { id: 'excited', emoji: '🤩', label: 'Excited', color: 'var(--mood-excited)' },
    { id: 'anxious', emoji: '😰', label: 'Anxious', color: 'var(--mood-anxious)' },
    { id: 'irritable', emoji: '😤', label: 'Irritable', color: 'var(--mood-irritable)' },
    { id: 'sad', emoji: '😢', label: 'Sad', color: 'var(--mood-sad)' },
    { id: 'overwhelmed', emoji: '😩', label: 'Overwhelmed', color: 'var(--mood-overwhelmed)' },
    { id: 'numb', emoji: '😶', label: 'Numb', color: 'var(--mood-numb)' },
  ];

  const FLOW_LEVELS = [
    { id: 'spotting', label: 'Spotting', color: 'var(--flow-spotting)', emoji: '💧' },
    { id: 'light', label: 'Light', color: 'var(--flow-light)', emoji: '💧' },
    { id: 'moderate', label: 'Moderate', color: 'var(--flow-moderate)', emoji: '💧💧' },
    { id: 'heavy', label: 'Heavy', color: 'var(--flow-heavy)', emoji: '💧💧💧' },
    { id: 'very-heavy', label: 'Very Heavy', color: 'var(--flow-very-heavy)', emoji: '🌊' },
  ];

  const PHYSICAL_SYMPTOMS = [
    'Cramps', 'Bloating', 'Headache', 'Backache', 'Breast tenderness',
    'Nausea', 'Fatigue', 'Acne', 'Hot flashes', 'Dizziness', 'Insomnia',
  ];

  const EMOTIONAL_SYMPTOMS = [
    'Mood swings', 'Irritability', 'Anxiety', 'Brain fog',
    'Crying spells', 'Low self-esteem', 'Sensitivity',
  ];

  const EMOTIONAL_TAGS = [
    'Clingy', 'Independent', 'Romantic', 'Withdrawn', 'Social', 'Antisocial',
  ];

  const PAIN_LOCATIONS = [
    'Lower abdomen', 'Back', 'Hips', 'Head', 'Legs', 'Full body',
  ];

  const PAIN_TYPES = [
    'Cramping', 'Stabbing', 'Throbbing', 'Dull ache', 'Pressure',
  ];

  const RELIEF_METHODS = [
    'Heat pad', 'Medication', 'Rest', 'Exercise', 'Massage', 'Food', 'None',
  ];

  const CRAVINGS = [
    'Chocolate', 'Sweet', 'Salty', 'Spicy', 'Carbs', 'Ice cream',
    'Coffee', 'Fruit', 'Comfort food', 'No appetite',
  ];

  const MOOD_SCORE = { happy: 5, calm: 4, loved: 5, excited: 5, anxious: 2, irritable: 1, sad: 1, overwhelmed: 1, numb: 2 };

  const NEED_TAGS = [
    { id: 'physical-touch', label: '🤗 Physical touch' },
    { id: 'words', label: '💬 Words of affirmation' },
    { id: 'acts', label: '🎁 Acts of service' },
    { id: 'quality-time', label: '⏰ Quality time' },
    { id: 'alone-time', label: '🧘 Alone time' },
    { id: 'comfort-food', label: '🍫 Comfort food' },
    { id: 'distraction', label: '🎮 Distraction' },
    { id: 'listening', label: '👂 Just listening' },
  ];

  const PAIN_EMOJIS = ['😊', '🙂', '😐', '😕', '😣', '😖', '😫', '😭', '🤯', '💀', '☠️'];

  // ── Toast ─────────────────────────────
  function toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'toastOut 300ms var(--ease-out) forwards';
      setTimeout(() => el.remove(), 300);
    }, 2500);
  }

  // ── Modal ─────────────────────────────
  function showModal(html) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = `<div class="modal-content__handle"></div>${html}`;
    overlay.classList.remove('hidden');
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
    lucide.createIcons({ nodes: [content] });
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  // ── Formatters ────────────────────────
  function formatDateDisplay(dateStr) {
    const d = BloomDB.parseDate(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatDateFull(dateStr) {
    const d = BloomDB.parseDate(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function formatMonthYear(year, month) {
    const d = new Date(year, month);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function getMoodObj(id) {
    return MOODS.find(m => m.id === id) || MOODS[0];
  }

  function getFlowObj(id) {
    return FLOW_LEVELS.find(f => f.id === id) || FLOW_LEVELS[0];
  }

  // ── Cycle phase detection ─────────────
  function getCyclePhase(dayOfCycle, cycleLength) {
    if (!cycleLength) cycleLength = 28;
    if (dayOfCycle <= 5) return { name: 'Menstrual', class: 'menstrual', emoji: '🩸' };
    if (dayOfCycle <= 13) return { name: 'Follicular', class: 'follicular', emoji: '🌱' };
    if (dayOfCycle <= 16) return { name: 'Ovulatory', class: 'ovulatory', emoji: '🌟' };
    return { name: 'Luteal', class: 'luteal', emoji: '🌙' };
  }

  // ── Render helpers ────────────────────
  function renderChipGroup(items, selected = [], groupClass = '') {
    return `<div class="chip-group ${groupClass}">${items.map(item => {
      const isActive = selected.includes(item);
      return `<button class="chip ${isActive ? 'active' : ''}" data-value="${item}">${item}</button>`;
    }).join('')}</div>`;
  }

  function renderEmojiGrid(options, selectedId = '', name = 'mood') {
    return `<div class="emoji-grid">${options.map(opt => `
      <button class="emoji-option ${opt.id === selectedId ? 'active' : ''}" data-name="${name}" data-value="${opt.id}">
        <span class="emoji-option__icon">${opt.emoji}</span>
        <span class="emoji-option__label">${opt.label}</span>
      </button>`).join('')}</div>`;
  }

  function renderSlider(id, label, min, max, value, showEmoji = false) {
    const emoji = showEmoji && PAIN_EMOJIS[value] ? PAIN_EMOJIS[value] : '';
    return `<div class="slider-group">
      <div class="slider-group__header">
        <span class="slider-group__label">${label}</span>
        <span class="slider-group__value">${emoji} ${value}</span>
      </div>
      <input type="range" id="${id}" min="${min}" max="${max}" value="${value}" />
    </div>`;
  }

  function renderStarRating(id, value = 0, max = 5) {
    return `<div class="star-rating" data-id="${id}">${
      Array.from({ length: max }, (_, i) =>
        `<span class="star-rating__star" data-star="${i + 1}">${i < value ? '⭐' : '☆'}</span>`
      ).join('')
    }</div>`;
  }

  return {
    MOODS, FLOW_LEVELS, PHYSICAL_SYMPTOMS, EMOTIONAL_SYMPTOMS, EMOTIONAL_TAGS,
    PAIN_LOCATIONS, PAIN_TYPES, RELIEF_METHODS, NEED_TAGS, PAIN_EMOJIS, CRAVINGS, MOOD_SCORE,
    toast, showModal, closeModal,
    formatDateDisplay, formatDateFull, formatMonthYear,
    getMoodObj, getFlowObj, getCyclePhase,
    renderChipGroup, renderEmojiGrid, renderSlider, renderStarRating,
  };
})();
