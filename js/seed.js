/* ============================================
   BLOOM — Demo Data Seeder
   Generates 3 months of realistic sample data
   ============================================ */

const DemoData = (() => {
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function pickN(arr, min, max) {
    const n = min + Math.floor(Math.random() * (max - min + 1));
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }
  function rand(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  async function seed() {
    const today = BloomDB.today();
    const startDate = BloomDB.addDays(today, -90); // 3 months ago

    // Generate 3 cycles (roughly 28 days apart)
    const cycles = [];
    let cycleStart = startDate;
    for (let i = 0; i < 3; i++) {
      const duration = rand(4, 6);
      const cycleEnd = BloomDB.addDays(cycleStart, duration);
      cycles.push({ startDate: cycleStart, endDate: cycleEnd });
      await BloomDB.saveCycle({ startDate: cycleStart, endDate: cycleEnd });
      cycleStart = BloomDB.addDays(cycleStart, rand(26, 32)); // next cycle
    }

    // Generate daily logs for 90 days
    for (let dayOffset = 0; dayOffset <= 90; dayOffset++) {
      const date = BloomDB.addDays(startDate, dayOffset);
      if (date > today) break;

      // Determine if this is a period day
      let isPeriod = false;
      let periodDay = 0;
      let cycleDay = 0;
      for (const c of cycles) {
        if (date >= c.startDate && date <= c.endDate) {
          isPeriod = true;
          periodDay = BloomDB.daysBetween(c.startDate, date) + 1;
        }
        if (date >= c.startDate) {
          cycleDay = BloomDB.daysBetween(c.startDate, date) + 1;
        }
      }

      // Determine cycle phase for realistic data
      const phase = cycleDay <= 5 ? 'menstrual' : cycleDay <= 13 ? 'follicular' : cycleDay <= 16 ? 'ovulatory' : 'luteal';

      // Mood varies by phase
      let moodPool;
      switch (phase) {
        case 'menstrual': moodPool = ['sad', 'irritable', 'overwhelmed', 'numb', 'calm']; break;
        case 'follicular': moodPool = ['happy', 'calm', 'excited', 'loved', 'happy']; break;
        case 'ovulatory': moodPool = ['happy', 'excited', 'loved', 'calm', 'excited']; break;
        case 'luteal': moodPool = ['irritable', 'anxious', 'sad', 'overwhelmed', 'calm', 'numb']; break;
        default: moodPool = ['calm', 'happy'];
      }

      // Energy varies by phase
      let energy;
      switch (phase) {
        case 'menstrual': energy = rand(2, 5); break;
        case 'follicular': energy = rand(5, 9); break;
        case 'ovulatory': energy = rand(6, 10); break;
        case 'luteal': energy = rand(3, 6); break;
        default: energy = rand(4, 7);
      }

      // Pain during period
      let painLevel = 0;
      let painLocations = [];
      let painTypes = [];
      let reliefMethods = [];
      let reliefEffectiveness = 0;
      if (isPeriod) {
        painLevel = periodDay <= 2 ? rand(4, 8) : rand(1, 4);
        painLocations = pickN(UI.PAIN_LOCATIONS, 1, 2);
        painTypes = pickN(UI.PAIN_TYPES, 1, 2);
        reliefMethods = pickN(UI.RELIEF_METHODS.filter(r => r !== 'None'), 1, 2);
        reliefEffectiveness = rand(2, 5);
      } else if (phase === 'luteal' && cycleDay > 22) {
        // PMS pain
        painLevel = rand(1, 4);
        if (painLevel > 2) {
          painLocations = pickN(UI.PAIN_LOCATIONS, 1, 2);
          painTypes = pickN(UI.PAIN_TYPES, 1, 1);
        }
      }

      // Flow during period
      let flow = '';
      if (isPeriod) {
        if (periodDay === 1) flow = pick(['light', 'moderate']);
        else if (periodDay === 2) flow = pick(['heavy', 'very-heavy', 'heavy']);
        else if (periodDay === 3) flow = pick(['heavy', 'moderate']);
        else if (periodDay === 4) flow = pick(['moderate', 'light']);
        else flow = pick(['light', 'spotting']);
      }

      // Symptoms
      let physicalSymptoms = [];
      let emotionalSymptoms = [];
      if (isPeriod) {
        physicalSymptoms = pickN(UI.PHYSICAL_SYMPTOMS, 2, 5);
        emotionalSymptoms = pickN(UI.EMOTIONAL_SYMPTOMS, 1, 3);
      } else if (phase === 'luteal' && cycleDay > 20) {
        physicalSymptoms = pickN(UI.PHYSICAL_SYMPTOMS, 1, 3);
        emotionalSymptoms = pickN(UI.EMOTIONAL_SYMPTOMS, 1, 2);
      } else if (Math.random() < 0.3) {
        physicalSymptoms = pickN(UI.PHYSICAL_SYMPTOMS, 0, 1);
      }

      // Emotional tags
      let emotionalTags = [];
      if (phase === 'menstrual') emotionalTags = pickN(['Clingy', 'Withdrawn', 'Antisocial'], 0, 2);
      else if (phase === 'ovulatory') emotionalTags = pickN(['Social', 'Romantic', 'Independent'], 0, 2);
      else if (phase === 'luteal') emotionalTags = pickN(['Clingy', 'Withdrawn', 'Antisocial'], 0, 2);
      else emotionalTags = pickN(UI.EMOTIONAL_TAGS, 0, 1);

      // Needs
      let needs = [];
      if (isPeriod || phase === 'luteal') {
        needs = pickN(UI.NEED_TAGS.map(n => n.id), 1, 3);
      } else if (Math.random() < 0.4) {
        needs = pickN(UI.NEED_TAGS.map(n => n.id), 0, 2);
      }

      // Sleep
      let sleepQuality;
      if (isPeriod) sleepQuality = rand(3, 6);
      else if (phase === 'luteal') sleepQuality = rand(4, 7);
      else sleepQuality = rand(5, 9);

      // Cravings
      let cravings = [];
      if (isPeriod || (phase === 'luteal' && cycleDay > 22)) {
        cravings = pickN(UI.CRAVINGS.filter(c => c !== 'No appetite'), 1, 3);
      } else if (Math.random() < 0.2) {
        cravings = pickN(UI.CRAVINGS, 0, 1);
      }

      // Partner actions (sometimes)
      const partnerActions = [
        'Made her tea', 'Got her chocolate', 'Gave a back massage', 'Watched her favorite show with her',
        'Made dinner', 'Got her flowers', 'Let her rest', 'Ran her a warm bath', 'Brought her heat pad',
        'Just held her', 'Listened without giving advice', 'Took care of chores',
      ];
      let partnerAction = '';
      let whatHelped = '';
      let helpedRating = 0;
      let behaviourNote = '';
      if (Math.random() < 0.5) {
        partnerAction = pick(partnerActions);
        helpedRating = rand(3, 5);
        whatHelped = helpedRating >= 4 ? 'Helped a lot' : 'Helped somewhat';
      }

      // Behaviour notes (sometimes)
      const behaviourNotes = [
        'She was extra cuddly today', 'Wanted space to herself', 'Was feeling really sensitive',
        'Seemed happier than usual', 'Needed lots of reassurance', 'Was very energetic and social',
        'Got emotional during a movie', 'Feeling bloated and uncomfortable', 'Had a tough day at work',
        'Really appreciated the little things', 'Was craving junk food all day',
      ];
      if (Math.random() < 0.4) {
        behaviourNote = pick(behaviourNotes);
      }

      const log = {
        date,
        mood: pick(moodPool),
        energy,
        hasPeriod: isPeriod,
        flow,
        physicalSymptoms,
        emotionalSymptoms,
        emotionalTags,
        painLevel,
        painLocations,
        painTypes,
        reliefMethods,
        reliefEffectiveness,
        needs,
        sleepQuality,
        cravings,
        behaviourNote,
        partnerAction,
        whatHelped,
        helpedRating,
        journal: '',
      };

      await BloomDB.saveLog(date, log);
    }
  }

  return { seed };
})();
