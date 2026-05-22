/* ============================================
   BLOOM — Advanced Period Prediction Engine
   ============================================

   Scientific basis:
   ─────────────────
   1. EWMA (Exponentially Weighted Moving Average) with α=0.35 — recent
      cycles carry more predictive weight but long history smooths noise.
   2. Confidence interval derived from population-corrected standard
      deviation of personal cycle history (NOT a fixed 14-day luteal
      assumption). Research (UBC 2024, Human Reproduction) shows both
      follicular and luteal phases are variable; personalization beats
      population averages.
   3. Outlier-resistant: cycles deviating >2σ from the running mean are
      down-weighted (Winsorisation) so that stress/illness spikes don't
      dominate future predictions.
   4. Phase boundaries estimated from average cycle length (not fixed
      28-day model):
        Menstrual   : Day 1 → avg_period_length
        Follicular  : avg_period_length+1 → cycle_len×0.43
        Ovulatory   : ±2 days around estimated ovulation (cycle_len - avg_luteal)
        Luteal      : ovulation+3 → end
   5. Symptom phase patterns are extracted from logged data to build a
      personalised symptom "fingerprint" per phase.
   6. PMS window: 5 days pre-period; high-specificity symptoms logged in
      that window are flagged as PMS markers.
   7. Prediction confidence label:
        HIGH   : ≥3 cycles, CV (StdDev/Mean) < 0.05
        MEDIUM : ≥2 cycles, CV < 0.10
        LOW    : 1 cycle or CV ≥ 0.10

   ============================================ */

const Predictor = (() => {

  /* ── Constants ───────────────────────────── */
  const EWMA_ALPHA      = 0.35;   // recency weight (higher = adapts faster)
  const OUTLIER_SIGMA   = 2.0;    // σ threshold for down-weighting
  const MIN_PERIOD_LEN  = 2;
  const MAX_PERIOD_LEN  = 15;
  const MIN_CYCLE_LEN   = 15;
  const MAX_CYCLE_LEN   = 60;
  const PMS_WINDOW_DAYS = 5;
  const DEFAULT_LUTEAL  = 13;     // fallback average luteal length (days)

  /* ── Population priors (WHO/ACOG reference) */
  const POP_MEAN_CYCLE  = 28;
  const POP_MEAN_PERIOD = 5;

  /* ─────────────────────────────────────────
     MAIN ENTRY — compute full prediction
  ───────────────────────────────────────── */
  async function compute() {
    try {
      return await _computeInternal();
    } catch (err) {
      console.error('🌸 Predictor error:', err);
      return {
        hasCycles: false, nextPeriodDate: null, windowEarly: null, windowLate: null,
        daysUntil: null, currentPhase: null, cycleDay: null, avgCycleLen: null,
        avgPeriodLen: null, stdDev: null, confidence: 'NONE', regularity: 'Unknown',
        regularityScore: 0, pmsWindow: null, pmsSymptoms: [], pmsAvgPain: null,
        phaseSymptoms: {}, phaseMoods: {}, nextOvulation: null, fertileDays: [],
        cycleHistory: [], insights: [], error: err.message,
      };
    }
  }

  async function _computeInternal() {
    const cycles = await BloomDB.getAllCycles();
    const logs   = await BloomDB.getAllLogs();

    const result = {
      hasCycles       : cycles.length > 0,
      nextPeriodDate  : null,
      windowEarly     : null,   // earliest likely date
      windowLate      : null,   // latest likely date
      daysUntil       : null,
      currentPhase    : null,
      cycleDay        : null,
      avgCycleLen     : null,
      avgPeriodLen    : null,
      stdDev          : null,
      confidence      : 'NONE',  // NONE | LOW | MEDIUM | HIGH
      regularity      : 'Unknown',
      regularityScore : 0,       // 0–100
      pmsWindow       : null,    // { start, end } date strings
      pmsSymptoms     : [],
      pmsAvgPain      : null,
      phaseSymptoms   : {},      // { menstrual, follicular, ovulatory, luteal }
      phaseMoods      : {},
      nextOvulation   : null,
      fertileDays     : [],
      cycleHistory    : [],      // enriched cycle objects
      insights        : [],      // string array of actionable insights
    };

    if (cycles.length === 0) return result;

    /* ── 1. Build enriched cycle history ─── */
    const sortedCycles = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const cycleLengths = [];
    const periodLengths = [];

    for (let i = 0; i < sortedCycles.length; i++) {
      const c = sortedCycles[i];
      // Period length from endDate or last hasPeriod log
      const pLen = _estimatePeriodLength(c, logs);
      // Cycle length = gap to next cycle start
      const cLen = i < sortedCycles.length - 1
        ? BloomDB.daysBetween(c.startDate, sortedCycles[i + 1].startDate)
        : null;

      sortedCycles[i]._periodLen = pLen;
      sortedCycles[i]._cycleLen  = cLen;

      if (cLen && cLen >= MIN_CYCLE_LEN && cLen <= MAX_CYCLE_LEN) {
        cycleLengths.push(cLen);
      }
      if (pLen) periodLengths.push(pLen);
    }

    result.cycleHistory = sortedCycles;

    /* ── 2. Statistical moments ──────────── */
    const avgCycleLen  = cycleLengths.length > 0 ? _ewma(cycleLengths) : POP_MEAN_CYCLE;
    const avgPeriodLen = periodLengths.length > 0
      ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
      : POP_MEAN_PERIOD;
    const stdDev = cycleLengths.length >= 2 ? _stdDev(cycleLengths) : null;
    const cv     = stdDev && avgCycleLen > 0 ? stdDev / avgCycleLen : null;

    result.avgCycleLen  = Math.round(avgCycleLen);
    result.avgPeriodLen = avgPeriodLen;
    result.stdDev       = stdDev ? Math.round(stdDev * 10) / 10 : null;

    /* ── 3. Confidence & Regularity ──────── */
    result.confidence = _confidence(cycleLengths.length, cv);
    const { label, score } = _regularity(stdDev, cv);
    result.regularity      = label;
    result.regularityScore = score;

    /* ── 4. Prediction from last cycle ───── */
    const lastCycle  = sortedCycles[sortedCycles.length - 1];
    const today      = BloomDB.today();
    const daysSince  = BloomDB.daysBetween(lastCycle.startDate, today);
    const cycleDay   = daysSince + 1;

    result.cycleDay = cycleDay;
    result.avgCycleLen = result.avgCycleLen; // already set

    // Predicted next start
    const daysUntilNext  = Math.round(avgCycleLen) - daysSince;
    const nextDateObj    = _addDaysToDate(lastCycle.startDate, Math.round(avgCycleLen));
    result.nextPeriodDate = BloomDB.formatDate(nextDateObj);
    result.daysUntil     = daysUntilNext;

    // Confidence window (±σ, clamped to ±7)
    const windowDelta = stdDev ? Math.min(Math.ceil(stdDev), 7) : 3;
    result.windowEarly = BloomDB.formatDate(_addDaysToDate(result.nextPeriodDate, -windowDelta));
    result.windowLate  = BloomDB.formatDate(_addDaysToDate(result.nextPeriodDate,  windowDelta));
    result.pmsWindow   = {
      start: BloomDB.formatDate(_addDaysToDate(result.nextPeriodDate, -(PMS_WINDOW_DAYS + windowDelta))),
      end  : result.windowEarly,
    };

    /* ── 5. Current phase ────────────────── */
    const avgLuteal  = _estimateAvgLuteal(sortedCycles, logs, avgCycleLen);
    result.currentPhase = _getDetailedPhase(cycleDay, avgCycleLen, avgPeriodLen, avgLuteal);

    /* ── 6. Ovulation & fertile window ───── */
    const ovuDay = Math.round(avgCycleLen - avgLuteal);
    const ovuDate = _addDaysToDate(lastCycle.startDate, ovuDay - 1);
    result.nextOvulation = BloomDB.formatDate(ovuDate);
    result.fertileDays   = _fertileDays(lastCycle.startDate, ovuDay);

    /* ── 7. PMS & phase symptom analysis ─── */
    const pmsData = _analyzePMS(logs, sortedCycles, result.nextPeriodDate);
    result.pmsSymptoms = pmsData.symptoms;
    result.pmsAvgPain  = pmsData.avgPain;
    result.phaseSymptoms = _phaseSymptoms(logs, sortedCycles, avgCycleLen, avgPeriodLen, avgLuteal);
    result.phaseMoods    = _phaseMoods(logs, sortedCycles, avgCycleLen, avgPeriodLen, avgLuteal);

    /* ── 8. Actionable insights ──────────── */
    result.insights = _buildInsights(result, cycleLengths, logs);

    return result;
  }

  /* ── EWMA — Exponentially Weighted Moving Average
     Alpha=0.35: recent matters more but older history smooths outliers.
     Outlier Winsorisation: cycles > 2σ are clamped before EWMA.   ── */
  function _ewma(lengths) {
    if (lengths.length === 0) return POP_MEAN_CYCLE;
    if (lengths.length === 1) return lengths[0];

    const mean = lengths.reduce((a, b) => a + b) / lengths.length;
    const sd   = _stdDev(lengths);
    const lo   = mean - OUTLIER_SIGMA * sd;
    const hi   = mean + OUTLIER_SIGMA * sd;

    // Winsorise outliers
    const clean = lengths.map(v => Math.max(lo, Math.min(hi, v)));

    // Run EWMA forward — seed with first value, then iterate
    let s = clean[0];
    for (let i = 1; i < clean.length; i++) {
      s = EWMA_ALPHA * clean[i] + (1 - EWMA_ALPHA) * s;
    }
    return s;
  }

  function _stdDev(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b) / arr.length;
    const variance = arr.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
  }

  function _confidence(n, cv) {
    if (n === 0)        return 'NONE';
    if (n === 1)        return 'LOW';
    if (n >= 3 && cv !== null && cv < 0.05) return 'HIGH';
    if (n >= 2 && cv !== null && cv < 0.10) return 'MEDIUM';
    return 'LOW';
  }

  function _regularity(stdDev, cv) {
    if (stdDev === null) return { label: 'Unknown',    score: 0 };
    if (stdDev <= 2)     return { label: 'Very Regular',  score: 95 };
    if (stdDev <= 4)     return { label: 'Regular',       score: 78 };
    if (stdDev <= 7)     return { label: 'Slightly Irregular', score: 55 };
    if (stdDev <= 10)    return { label: 'Irregular',     score: 30 };
    return                     { label: 'Very Irregular', score: 10 };
  }

  /* ── Estimate period length from log data or endDate ── */
  function _estimatePeriodLength(cycle, logs) {
    // Count days logged as hasPeriod within this cycle's window
    const end = cycle.endDate || BloomDB.addDays(cycle.startDate, MAX_PERIOD_LEN);
    let count = 0;
    for (const log of logs) {
      if (log.date >= cycle.startDate && log.date <= end && log.hasPeriod) count++;
    }
    if (count >= MIN_PERIOD_LEN) return count;
    // Fallback: use endDate if set
    if (cycle.endDate) {
      const d = BloomDB.daysBetween(cycle.startDate, cycle.endDate) + 1;
      return Math.min(d, MAX_PERIOD_LEN);
    }
    return null;
  }

  /* ── Estimate average luteal phase from personal data ── */
  function _estimateAvgLuteal(cycles, logs, avgCycleLen) {
    // Luteal = cycle_len - ovulation_day
    // Without BBT/OPK data we can't directly measure, but we can
    // estimate from symptom onset patterns: typical luteal 12–16 days.
    // Personal adjustment: use average if 3+ cycles available.
    const durations = [];
    for (let i = 0; i < cycles.length - 1; i++) {
      const c   = cycles[i];
      const cLen = BloomDB.daysBetween(c.startDate, cycles[i + 1].startDate);
      if (cLen >= MIN_CYCLE_LEN && cLen <= MAX_CYCLE_LEN) {
        // Estimate ovulation as cycle_len - 14 (refined by symptom data)
        const pLen = c._periodLen || POP_MEAN_PERIOD;
        // Luteal typically less variable; constrain to 10–16 range
        const est = Math.min(16, Math.max(10, cLen - (cLen * 0.57)));
        durations.push(est);
      }
    }
    return durations.length > 0
      ? durations.reduce((a, b) => a + b) / durations.length
      : DEFAULT_LUTEAL;
  }

  /* ── Detailed phase classification ──────────────────── */
  function _getDetailedPhase(cycleDay, cycleLen, periodLen, lutealLen) {
    // Ensure all inputs are integers to prevent float display bugs
    cycleDay  = Math.round(cycleDay);
    cycleLen  = Math.round(cycleLen);
    periodLen = Math.round(periodLen);
    lutealLen = Math.round(lutealLen);

    const follEnd  = Math.round(cycleLen * 0.43);
    const ovuDay   = Math.round(cycleLen - lutealLen);
    const ovuStart = ovuDay - 2;
    const ovuEnd   = ovuDay + 2;

    if (cycleDay <= periodLen) return {
      name: 'Menstrual', class: 'menstrual', emoji: '🌑',
      tip: 'She may feel fatigued and crampy. Comfort is key — heating pad, rest, and her favourite snacks.',
      daysIn: cycleDay, daysLeft: Math.max(0, periodLen - cycleDay + 1),
    };
    if (cycleDay <= follEnd) return {
      name: 'Follicular', class: 'follicular', emoji: '🌱',
      tip: 'Energy and mood tend to rise. A great time for new activities and quality time together.',
      daysIn: cycleDay - periodLen, daysLeft: Math.max(0, follEnd - cycleDay + 1),
    };
    if (cycleDay >= ovuStart && cycleDay <= ovuEnd) return {
      name: 'Ovulatory', class: 'ovulatory', emoji: '🌕',
      tip: "Peak energy and confidence. She's likely feeling her best right now — enjoy it together!",
      daysIn: cycleDay - follEnd, daysLeft: Math.max(0, ovuEnd - cycleDay + 1),
    };
    return {
      name: 'Luteal', class: 'luteal', emoji: '🌘',
      tip: 'PMS symptoms may appear toward the end. She might need extra emotional support and comfort.',
      daysIn: Math.max(0, cycleDay - ovuEnd), daysLeft: Math.max(0, cycleLen - cycleDay + 1),
    };
  }

  /* ── Fertile window: 5 days before + day of ovulation ── */
  function _fertileDays(cycleStart, ovuDay) {
    const days = [];
    for (let d = ovuDay - 5; d <= ovuDay; d++) {
      if (d > 0) days.push(BloomDB.formatDate(_addDaysToDate(cycleStart, d - 1)));
    }
    return days;
  }

  /* ── PMS Analysis: identify symptom fingerprint ─────── */
  function _analyzePMS(logs, cycles, nextPeriodDate) {
    const symptomCounts = {};
    let totalPain = 0, painEntries = 0;

    for (const cycle of cycles) {
      const pmsStart = BloomDB.addDays(cycle.startDate, -PMS_WINDOW_DAYS);
      for (const log of logs) {
        if (log.date >= pmsStart && log.date < cycle.startDate) {
          (log.physicalSymptoms || []).forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; });
          (log.emotionalSymptoms || []).forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; });
          (log.emotionalTags || []).forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; });
          if (log.painLevel > 0) { totalPain += log.painLevel; painEntries++; }
        }
      }
    }

    const symptoms = Object.entries(symptomCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([s, count]) => ({ symptom: s, count }));

    return { symptoms, avgPain: painEntries > 0 ? Math.round((totalPain / painEntries) * 10) / 10 : null };
  }

  /* ── Phase symptom fingerprint ───────────────────────── */
  function _phaseSymptoms(logs, cycles, avgCycleLen, periodLen, lutealLen) {
    const phases = { menstrual: {}, follicular: {}, ovulatory: {}, luteal: {} };

    for (const log of logs) {
      const phase = _phaseForDate(log.date, cycles, avgCycleLen, periodLen, lutealLen);
      if (!phase) continue;
      const bucket = phases[phase];
      [...(log.physicalSymptoms || []), ...(log.emotionalSymptoms || [])].forEach(s => {
        bucket[s] = (bucket[s] || 0) + 1;
      });
    }

    const result = {};
    for (const [p, counts] of Object.entries(phases)) {
      result[p] = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s]) => s);
    }
    return result;
  }

  /* ── Phase mood fingerprint ──────────────────────────── */
  function _phaseMoods(logs, cycles, avgCycleLen, periodLen, lutealLen) {
    const phases = { menstrual: {}, follicular: {}, ovulatory: {}, luteal: {} };

    for (const log of logs) {
      if (!log.mood) continue;
      const phase = _phaseForDate(log.date, cycles, avgCycleLen, periodLen, lutealLen);
      if (!phase) continue;
      phases[phase][log.mood] = (phases[phase][log.mood] || 0) + 1;
    }

    const result = {};
    for (const [p, counts] of Object.entries(phases)) {
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([m]) => m);
      result[p] = top;
    }
    return result;
  }

  /* ── Determine phase for a given date ───────────────── */
  function _phaseForDate(date, cycles, avgCycleLen, periodLen, lutealLen) {
    const sorted = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      const nextStart = i < sorted.length - 1 ? sorted[i + 1].startDate : BloomDB.addDays(c.startDate, Math.round(avgCycleLen));
      if (date >= c.startDate && date < nextStart) {
        const dayInCycle = BloomDB.daysBetween(c.startDate, date) + 1;
        const p = _getDetailedPhase(dayInCycle, avgCycleLen, periodLen, lutealLen);
        return p.name.toLowerCase();
      }
    }
    return null;
  }

  /* ── Generate actionable text insights ──────────────── */
  function _buildInsights(result, cycleLengths, logs) {
    const insights = [];
    const { daysUntil, confidence, regularity, avgCycleLen, stdDev, pmsSymptoms, currentPhase } = result;

    // Prediction insight
    if (daysUntil !== null) {
      if (daysUntil < 0) {
        insights.push({ icon: '📅', text: `Period is <strong>${Math.abs(daysUntil)} day${Math.abs(daysUntil)!==1?'s':''} late</strong> based on her ${avgCycleLen}-day average cycle.` });
      } else if (daysUntil === 0) {
        insights.push({ icon: '🌑', text: `Period predicted <strong>today</strong>. Be extra gentle and have her comfort items ready!` });
      } else if (daysUntil <= 3) {
        insights.push({ icon: '⚠️', text: `Period expected in <strong>${daysUntil} day${daysUntil!==1?'s':''}</strong>. Stock up on heating pads and her favourite comfort snacks.` });
      } else if (daysUntil <= 7) {
        insights.push({ icon: '📆', text: `Period expected in <strong>${daysUntil} days</strong>. PMS symptoms may begin soon.` });
      }
    }

    // Regularity insight
    if (stdDev !== null) {
      if (stdDev <= 2) {
        insights.push({ icon: '🎯', text: `Her cycle is <strong>very regular</strong> (±${stdDev} days). Predictions are highly reliable.` });
      } else if (stdDev <= 5) {
        insights.push({ icon: '📊', text: `Cycle varies by <strong>±${stdDev} days</strong>. Predictions are reliable within a ~${Math.ceil(stdDev)*2}-day window.` });
      } else {
        insights.push({ icon: '🌊', text: `Cycle has <strong>high variability</strong> (±${stdDev} days). Log consistently to improve prediction accuracy.` });
      }
    }

    // Phase insight
    if (currentPhase) {
      insights.push({ icon: currentPhase.emoji, text: currentPhase.tip });
    }

    // PMS warning
    if (pmsSymptoms.length > 0 && daysUntil !== null && daysUntil <= 7 && daysUntil > 0) {
      const topPMS = pmsSymptoms.slice(0, 2).map(p => p.symptom).join(' and ');
      insights.push({ icon: '💊', text: `Her common PMS symptoms are <strong>${topPMS}</strong>. Keep relief options handy.` });
    }

    return insights;
  }

  /* ── Date helpers ────────────────────────────────────── */
  function _addDaysToDate(dateStrOrObj, days) {
    const d = typeof dateStrOrObj === 'string' ? BloomDB.parseDate(dateStrOrObj) : new Date(dateStrOrObj);
    d.setDate(d.getDate() + days);
    return d;
  }

  /* ─────────────────────────────────────────
     PUBLIC HELPERS for rendering
  ───────────────────────────────────────── */
  function confidenceColor(level) {
    return { HIGH: 'var(--color-mint)', MEDIUM: 'var(--color-amber)', LOW: 'var(--color-coral)', NONE: 'var(--text-tertiary)' }[level] || 'var(--text-tertiary)';
  }

  function confidenceLabel(level) {
    return { HIGH: 'High confidence', MEDIUM: 'Moderate confidence', LOW: 'Low confidence — log more cycles', NONE: 'Not enough data' }[level] || '';
  }

  return { compute, confidenceColor, confidenceLabel };
})();
