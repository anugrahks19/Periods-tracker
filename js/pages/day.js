/* ============================================
   BLOOM — Day Detail Page
   ============================================ */

const DayPage = (() => {
  function init() {}

  async function render(container, dateStr) {
    if (!dateStr) dateStr = BloomDB.today();
    const log = await BloomDB.getLog(dateStr);
    const dateDisplay = UI.formatDateFull(dateStr);

    if (!log) {
      container.innerHTML = `
        <div class="day-header">
          <div class="day-header__date">${dateDisplay}</div>
        </div>
        <div class="empty-state">
          <div class="empty-state__icon">📝</div>
          <div class="empty-state__title">No Log For This Day</div>
          <div class="empty-state__text">Go to the Home page to log this day's data.</div>
        </div>
        <div style="text-align: center; margin-top: var(--space-4)">
          <a href="#home" class="btn btn--primary">Log This Day</a>
        </div>
      `;
      return;
    }

    const mood = log.mood ? UI.getMoodObj(log.mood) : null;
    const flow = log.flow ? UI.getFlowObj(log.flow) : null;
    const allSymptoms = [...(log.physicalSymptoms || []), ...(log.emotionalSymptoms || [])];

    container.innerHTML = `
      <div class="day-header">
        <div class="day-header__date">${dateDisplay}</div>
        ${log.hasPeriod ? '<span class="phase-badge phase-badge--menstrual">🩸 Period Day</span>' : ''}
      </div>

      <!-- Mood & Energy -->
      ${mood ? `
      <div class="day-detail-section">
        <div class="log-section__title"><span class="log-section__title-icon">😊</span> Mood & Energy</div>
        <div class="card card--gradient" style="margin-top: var(--space-3)">
          <div style="display: flex; align-items: center; gap: var(--space-3)">
            <span style="font-size: 40px">${mood.emoji}</span>
            <div>
              <div style="font-size: var(--font-lg); font-weight: 600">${mood.label}</div>
              <div style="font-size: var(--font-sm); color: var(--text-tertiary)">Energy: ${log.energy || '—'}/10</div>
            </div>
          </div>
        </div>
      </div>` : ''}

      <!-- Flow -->
      ${flow ? `
      <div class="day-detail-section">
        <div class="log-section__title"><span class="log-section__title-icon">💧</span> Flow</div>
        <div class="card" style="margin-top: var(--space-3)">
          <span style="font-size: var(--font-base); font-weight: 500; color: var(--color-rose)">${flow.emoji} ${flow.label}</span>
        </div>
      </div>` : ''}

      <!-- Symptoms -->
      ${allSymptoms.length > 0 ? `
      <div class="day-detail-section">
        <div class="log-section__title"><span class="log-section__title-icon">🩹</span> Symptoms</div>
        <div class="chip-group" style="margin-top: var(--space-3)">
          ${allSymptoms.map(s => `<span class="chip active" style="pointer-events:none">${s}</span>`).join('')}
        </div>
      </div>` : ''}

      <!-- Emotional Tags -->
      ${(log.emotionalTags || []).length > 0 ? `
      <div class="day-detail-section">
        <div class="log-section__title"><span class="log-section__title-icon">🏷️</span> Emotional Vibe</div>
        <div class="chip-group" style="margin-top: var(--space-3)">
          ${log.emotionalTags.map(t => `<span class="chip active" style="pointer-events:none">${t}</span>`).join('')}
        </div>
      </div>` : ''}

      <!-- Pain -->
      ${log.painLevel > 0 ? `
      <div class="day-detail-section">
        <div class="log-section__title"><span class="log-section__title-icon">🔥</span> Pain</div>
        <div class="card" style="margin-top: var(--space-3)">
          <div style="font-size: var(--font-2xl); font-weight: 700; margin-bottom: var(--space-2)">
            ${UI.PAIN_EMOJIS[log.painLevel] || ''} ${log.painLevel}/10
          </div>
          ${(log.painLocations || []).length > 0 ? `<div style="font-size: var(--font-sm); color: var(--text-secondary); margin-bottom: var(--space-1)">📍 ${log.painLocations.join(', ')}</div>` : ''}
          ${(log.painTypes || []).length > 0 ? `<div style="font-size: var(--font-sm); color: var(--text-secondary)">⚡ ${log.painTypes.join(', ')}</div>` : ''}
        </div>
      </div>` : ''}

      <!-- Relief -->
      ${(log.reliefMethods || []).length > 0 ? `
      <div class="day-detail-section">
        <div class="log-section__title"><span class="log-section__title-icon">💊</span> Relief</div>
        <div class="chip-group" style="margin-top: var(--space-3)">
          ${log.reliefMethods.map(r => `<span class="chip active" style="pointer-events:none">${r}</span>`).join('')}
        </div>
        ${log.reliefEffectiveness ? `<div style="margin-top: var(--space-2); font-size: var(--font-sm)">Effectiveness: ${'⭐'.repeat(log.reliefEffectiveness)}${'☆'.repeat(5 - log.reliefEffectiveness)}</div>` : ''}
      </div>` : ''}

      <!-- Needs -->
      ${(log.needs || []).length > 0 ? `
      <div class="day-detail-section">
        <div class="log-section__title"><span class="log-section__title-icon">💕</span> What She Needed</div>
        <div class="need-tags" style="margin-top: var(--space-3)">
          ${log.needs.map(n => {
            const tag = UI.NEED_TAGS.find(t => t.id === n);
            return `<span class="need-tag active" style="pointer-events:none">${tag ? tag.label : n}</span>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- Behaviour & Partner Notes -->
      ${log.behaviourNote || log.partnerAction || log.whatHelped ? `
      <div class="day-detail-section">
        <div class="log-section__title"><span class="log-section__title-icon">🤝</span> Notes</div>
        ${log.behaviourNote ? `<div class="card" style="margin-top: var(--space-3); margin-bottom: var(--space-2)">
          <div class="card__subtitle">Behaviour Notes</div>
          <p style="margin-top: var(--space-1)">${log.behaviourNote}</p>
        </div>` : ''}
        ${log.partnerAction ? `<div class="card" style="margin-bottom: var(--space-2)">
          <div class="card__subtitle">What You Did</div>
          <p style="margin-top: var(--space-1)">${log.partnerAction}</p>
        </div>` : ''}
        ${log.whatHelped ? `<div class="card" style="margin-bottom: var(--space-2)">
          <div class="card__subtitle">What Helped</div>
          <p style="margin-top: var(--space-1)">${log.whatHelped}</p>
          ${log.helpedRating ? `<div style="margin-top: var(--space-1); font-size: var(--font-sm)">${'⭐'.repeat(log.helpedRating)}${'☆'.repeat(5 - log.helpedRating)}</div>` : ''}
        </div>` : ''}
      </div>` : ''}

      <!-- Journal -->
      ${log.journal ? `
      <div class="day-detail-section">
        <div class="log-section__title"><span class="log-section__title-icon">📓</span> Journal</div>
        <div class="card" style="margin-top: var(--space-3)">
          <p>${log.journal}</p>
        </div>
      </div>` : ''}

      <!-- Actions -->
      <div style="display: flex; gap: var(--space-3); margin-top: var(--space-4)">
        <button class="btn btn--danger btn--sm" id="delete-log" style="flex: 1"><i data-lucide="trash-2"></i> Delete</button>
      </div>
    `;

    lucide.createIcons({ nodes: [container] });

    // Delete handler
    container.querySelector('#delete-log')?.addEventListener('click', async () => {
      if (confirm('Delete this log entry? This cannot be undone.')) {
        await BloomDB.deleteLog(dateStr);
        UI.toast('Log deleted', 'success');
        window.location.hash = '#calendar';
      }
    });
  }

  function destroy() {}

  return { init, render, destroy };
})();
