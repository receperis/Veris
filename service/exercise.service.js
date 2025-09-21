/* Exercise Service - Handles daily exercise notifications and scheduling */
// Works in service worker (importScripts) context

const ExerciseService = (() => {
  const LOG_PREFIX = '[ExerciseService]';
  const DAILY_ALARM = 'daily-exercise';
  const META_KEY = 'exerciseAlarmInfo';
  // Leitner configuration (A:y -> keep random fallback when due < limit; B:drop-one penalty; C: box0 cooldown minutes=2)
  const LEITNER_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30];
  const BOX0_COOLDOWN_MINUTES = 2;
  const MAX_BOX = LEITNER_INTERVALS_DAYS.length - 1;

  function log(...args) { console.log(LOG_PREFIX, ...args); }
  function warn(...args) { console.warn(LOG_PREFIX, ...args); }
  function error(...args) { console.error(LOG_PREFIX, ...args); }

  function defaultSettings() {
    return { enabled: true, time: '09:00', days: [1,2,3,4,5], difficulty: 'mixed', questionsPerSession: 10 };
  }

  function validateSettings(raw) {
    const base = defaultSettings();
    if (!raw || typeof raw !== 'object') return base;
    const s = { ...base, ...raw };
    if (!/^\d{2}:\d{2}$/.test(s.time)) s.time = base.time;
    if (!Array.isArray(s.days) || !s.days.length) s.days = base.days;
    s.days = [...new Set(s.days.filter(d => Number.isInteger(d) && d>=0 && d<=6))].sort();
    if (!s.days.length) s.days = base.days;
    return s;
  }

  function computeNextOccurrence(timeStr, days) {
    const [h,m] = timeStr.split(':').map(Number);
    const now = new Date();
    for (let offset=0; offset<14; offset++) { // look ahead max 2 weeks safety
      const d = new Date(now);
      d.setDate(now.getDate()+offset);
      d.setHours(h, m, 0, 0);
      if (d <= now) continue;
      if (days.includes(d.getDay())) return d;
    }
    return null;
  }

  async function getSettings() {
    const stored = await chrome.storage.sync.get(['exerciseSettings']);
    return validateSettings(stored.exerciseSettings);
  }

  async function setupDailyAlarm(force = false) {
    try {
      const settings = await getSettings();
      if (!settings.enabled) { log('Disabled; skipping alarm setup'); return { skipped: true, reason: 'disabled' }; }

      const next = computeNextOccurrence(settings.time, settings.days);
      if (!next) { warn('No next occurrence could be computed'); return { skipped: true, reason: 'no_next_time' }; }

      // Check existing alarm to avoid churn
      const existing = await chrome.alarms.get(DAILY_ALARM);
      if (existing && !force) {
        const existingDate = new Date(existing.scheduledTime);
        if (Math.abs(existingDate - next) < 60000) { // within 1 minute
          log('Existing alarm already set for ~same time:', existingDate.toString());
          return { reused: true, when: existingDate };
        }
      }

      await chrome.alarms.clear(DAILY_ALARM);
      await chrome.alarms.create(DAILY_ALARM, { when: next.getTime() });
      await chrome.storage.local.set({ [META_KEY]: { scheduledFor: next.toISOString(), createdAt: new Date().toISOString() } });
      log('Scheduled daily alarm for', next.toString());
      return { scheduled: true, when: next };
    } catch (e) {
      error('Failed to setup daily alarm', e);
      return { error: e.message };
    }
  }

  async function handleDailyExerciseAlarm() {
    try {
      log('Alarm fired');
      const hasWords = await checkUserHasVocabulary();
      if (!hasWords) { log('Skipping: no vocabulary'); await setupDailyAlarm(); return; }

      // const done = await checkExerciseDoneToday();
      // if (done) { log('Already completed today; rescheduling only'); await setupDailyAlarm(); return; }

      const result = await NotificationService.sendDailyExerciseNotification();
      if (!result.success) {
        warn('Notification failed', result.error);
      } else {
        log('Notification dispatched id=', result.id);
      }
      await setupDailyAlarm();
    } catch (e) {
      error('Error in handleDailyExerciseAlarm', e);
      await setupDailyAlarm();
    }
  }

  async function checkUserHasVocabulary() {
    try {
      const stats = await DatabaseService.getStats();
      return !!(stats && stats.totalEntries && stats.totalEntries > 0);
    } catch (e) { error('checkUserHasVocabulary', e); return false; }
  }

  async function checkExerciseDoneToday() {
    try {
      const { vocabularyStats } = await chrome.storage.local.get(['vocabularyStats']);
      if (!vocabularyStats || !vocabularyStats.lastExercise) return false;
      const last = new Date(vocabularyStats.lastExercise);
      const now = new Date();
      return last.toDateString() === now.toDateString();
    } catch (e) { error('checkExerciseDoneToday', e); return false; }
  }

  async function handleExerciseCompleted(exerciseData) {
    try {
      const { vocabularyStats } = await chrome.storage.local.get(['vocabularyStats']);
      const stats = vocabularyStats || { totalWords:0, uniqueWords:0, lastExercise:null, exercisesCompleted:0, averageScore:0, totalScore:0 };
      stats.lastExercise = new Date().toISOString();
      stats.exercisesCompleted = (stats.exercisesCompleted||0)+1;
      stats.totalScore = (stats.totalScore||0) + (exerciseData?.score || 0);
      stats.averageScore = stats.exercisesCompleted ? Math.round(stats.totalScore / stats.exercisesCompleted) : 0;
      await chrome.storage.local.set({ vocabularyStats: stats });
      log('Updated stats after exercise', stats);
    } catch (e) { error('handleExerciseCompleted', e); }
  }

  // Debug helper: schedule a test alarm in N seconds (default 10)
  async function setupTestAlarm(seconds = 10) {
    try {
      await chrome.alarms.clear('test-exercise');
      const when = Date.now() + seconds * 1000;
      await chrome.alarms.create('test-exercise', { when });
      log(`Test alarm scheduled in ${seconds}s at`, new Date(when).toString());
      return { success: true, when };
    } catch (e) { error('setupTestAlarm', e); return { success:false, error:e.message }; }
  }

  // --- Leitner Helpers (moved inside closure for access to MAX_BOX etc.) ---
  function ensureLeitnerMeta(word){
    if (!word.srs || typeof word.srs !== 'object') {
      word.srs = { boxIndex:0, dueAt:null, totalCorrect:0, totalWrong:0, streak:0, lastResult:null, lastReviewedAt:null, createdAt:new Date().toISOString() };
    } else {
      if (word.srs.boxIndex == null || word.srs.boxIndex < 0) word.srs.boxIndex = 0;
      if (word.srs.boxIndex > MAX_BOX) word.srs.boxIndex = MAX_BOX;
    }
    return word;
  }

  function updateLeitnerMeta(word, wasCorrect){
    const now = Date.now();
    const meta = word.srs;
    if (wasCorrect){
      meta.totalCorrect++;
      meta.streak = (meta.streak||0)+1;
      meta.boxIndex = Math.min(meta.boxIndex + 1, MAX_BOX);
      meta.lastResult = 'correct';
    } else {
      meta.totalWrong++;
      meta.streak = 0;
      meta.boxIndex = Math.max(meta.boxIndex - 1, 0); // drop-one penalty
      meta.lastResult = 'wrong';
    }
    const intervalDays = LEITNER_INTERVALS_DAYS[meta.boxIndex] || 0;
    let nextTime = now + intervalDays * 86400000;
    if (intervalDays === 0) nextTime = now + BOX0_COOLDOWN_MINUTES * 60 * 1000;
    meta.lastReviewedAt = new Date(now).toISOString();
    meta.dueAt = new Date(nextTime).toISOString();
    return meta;
  }

  function selectLeitnerSession(words, limit){
    const now = Date.now();
    const due=[]; const fresh=[]; const nearDue=[];
    for (const w of words){
      ensureLeitnerMeta(w);
      if (!w.srs.dueAt){ fresh.push(w); continue; }
      const dueAt = Date.parse(w.srs.dueAt);
      if (dueAt <= now) due.push(w); else if (dueAt - now < 2*86400000) nearDue.push(w);
    }
    due.sort((a,b)=>Date.parse(a.srs.dueAt)-Date.parse(b.srs.dueAt));
    const selected=[];
    for (const list of [due, fresh, nearDue]){
      for (const w of list){ if (selected.length>=limit) break; selected.push(w);} if (selected.length>=limit) break;
    }
    if (selected.length < limit){
      const pool = words.filter(w=>!selected.includes(w));
      shuffle(pool);
      for (const w of pool){ if (selected.length>=limit) break; selected.push(w); }
    }
    return selected;
  }

  function countDue(words){
    const now = Date.now();
    let c=0; for (const w of words){ if (w.srs && w.srs.dueAt && Date.parse(w.srs.dueAt)<=now) c++; }
    return c;
  }

  function leitnerCounts(words){
    const counts = { total: words.length, due:0 };
    for (let i=0;i<=MAX_BOX;i++) counts['box'+i]=0;
    const now=Date.now();
    for (const w of words){ ensureLeitnerMeta(w); counts['box'+w.srs.boxIndex]++; if (w.srs.dueAt && Date.parse(w.srs.dueAt)<=now) counts.due++; }
    return counts;
  }

  function shuffle(arr){ for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()* (i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

  return {
    setupDailyAlarm,
    handleDailyExerciseAlarm,
    handleExerciseCompleted,
    setupTestAlarm,
    // Leitner API
    prepareLeitnerSession: async (limit = 10) => {
      try {
        const words = await DatabaseService.getAllVocabulary();
        const enriched = words.map(w => ensureLeitnerMeta(w));
        const selection = selectLeitnerSession(enriched, limit);
        // Strip heavy fields if any
        return { success: true, words: selection.map(w => ({
          id: w.id,
            originalWord: w.originalWord,
            translatedWord: w.translatedWord,
            sourceLanguage: w.sourceLanguage,
            targetLanguage: w.targetLanguage,
            context: w.context || w.sentence || '',
            srs: { boxIndex: w.srs.boxIndex, dueAt: w.srs.dueAt }
        })), counts: leitnerCounts(enriched) };
      } catch (e) { error('prepareLeitnerSession', e); return { success:false, error:e.message }; }
    },
    recordLeitnerResult: async ({ id, correct, usedHint, skipped }) => {
      try {
        const all = await DatabaseService.getAllVocabulary();
        const target = all.find(w => w.id === id);
        if (!target) return { success:false, error:'word_not_found' };
        ensureLeitnerMeta(target);
        // Determine correctness policy (hint or skip counts as wrong)
        const wasCorrect = correct && !usedHint && !skipped;
        updateLeitnerMeta(target, wasCorrect);
        await DatabaseService.updateVocabulary(target.id, { srs: target.srs });
        return { success:true, srs: target.srs };
      } catch (e) { error('recordLeitnerResult', e); return { success:false, error:e.message }; }
    },
    getDueCount: async () => {
      try { const all = await DatabaseService.getAllVocabulary(); return countDue(all); } catch { return 0; }
    },
    // Expose for potential external debugging
    _internal: { computeNextOccurrence, validateSettings }
  };
})();

self.ExerciseService = ExerciseService;