/* Leitner SRS Service - Spaced Repetition System Algorithm */
// Works in service worker (importScripts) context

const LeitnerService = (() => {
  const { log, warn, error } = createLogger("[LeitnerService]");

  // Leitner configuration
  const LEITNER_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30];
  const BOX0_COOLDOWN_MINUTES = 2;
  const MAX_BOX = LEITNER_INTERVALS_DAYS.length - 1;

  /**
   * Ensure word has proper Leitner metadata structure
   */
  function ensureLeitnerMeta(word) {
    if (!word.srs || typeof word.srs !== "object") {
      word.srs = {
        boxIndex: 0,
        dueAt: null,
        interval: 1,
        totalCorrect: 0,
        totalWrong: 0,
        streak: 0,
        skippedCount: 0,
        lastResult: null,
        lastReviewedAt: null,
        createdAt: new Date().toISOString(),
      };
    } else {
      // Normalize boxIndex
      if (word.srs.boxIndex == null || word.srs.boxIndex < 0)
        word.srs.boxIndex = 0;
      if (word.srs.boxIndex > MAX_BOX) word.srs.boxIndex = MAX_BOX;

      // Ensure numeric fields are properly typed
      if (
        typeof word.srs.totalCorrect !== "number" ||
        isNaN(word.srs.totalCorrect)
      )
        word.srs.totalCorrect = 0;
      if (typeof word.srs.totalWrong !== "number" || isNaN(word.srs.totalWrong))
        word.srs.totalWrong = 0;
      if (typeof word.srs.streak !== "number" || isNaN(word.srs.streak))
        word.srs.streak = 0;
      if (
        typeof word.srs.skippedCount !== "number" ||
        isNaN(word.srs.skippedCount)
      )
        word.srs.skippedCount = 0;
      if (typeof word.srs.interval !== "number" || isNaN(word.srs.interval))
        word.srs.interval = LEITNER_INTERVALS_DAYS[word.srs.boxIndex] || 1;

      // Ensure required string fields
      if (!word.srs.createdAt) word.srs.createdAt = new Date().toISOString();
    }
    return word;
  }

  /**
   * Update Leitner metadata based on answer result
   */
  function updateLeitnerMeta(
    word,
    wasCorrect,
    usedHint = false,
    skipped = false
  ) {
    const now = Date.now();
    const meta = word.srs;

    // Handle skip action
    if (skipped) {
      meta.skippedCount = (meta.skippedCount || 0) + 1;
      meta.lastResult = "skipped";

      let intervalDays = LEITNER_INTERVALS_DAYS[meta.boxIndex] || 0;
      intervalDays = Math.ceil(intervalDays * 0.5);
      meta.interval = intervalDays;

      let nextTime = now + intervalDays * 86400000;
      if (intervalDays === 0)
        nextTime = now + BOX0_COOLDOWN_MINUTES * 60 * 1000;

      meta.lastReviewedAt = new Date(now).toISOString();
      meta.dueAt = new Date(nextTime).toISOString();
      return meta;
    }

    // Handle correct/incorrect answers
    if (wasCorrect) {
      meta.totalCorrect++;
      meta.streak = (meta.streak || 0) + 1;

      if (meta.boxIndex < MAX_BOX) {
        meta.boxIndex = Math.min(meta.boxIndex + 1, MAX_BOX);
      }
      meta.lastResult = "correct";
    } else {
      meta.totalWrong++;
      meta.streak = 0;

      const originalBox = meta.boxIndex;

      if (originalBox >= MAX_BOX) {
        meta.boxIndex = 0;
      } else if (originalBox >= 3) {
        meta.boxIndex = Math.max(originalBox - 3, 0);
      } else if (originalBox > 0) {
        meta.boxIndex = originalBox - 1;
      } else {
        meta.boxIndex = 0;
      }
      meta.lastResult = "wrong";
    }

    let intervalDays = LEITNER_INTERVALS_DAYS[meta.boxIndex] || 0;

    // For mastered words, use longer intervals
    if (meta.boxIndex >= 4 && wasCorrect) {
      const masteryMultiplier = 1.2 + meta.streak * 0.1;
      intervalDays = Math.ceil(intervalDays * masteryMultiplier);
    }

    meta.interval = intervalDays;

    let nextTime = now + intervalDays * 86400000;
    if (intervalDays === 0) nextTime = now + BOX0_COOLDOWN_MINUTES * 60 * 1000;

    meta.lastReviewedAt = new Date(now).toISOString();
    meta.dueAt = new Date(nextTime).toISOString();
    return meta;
  }

  /**
   * Select words for a Leitner session
   */
  function selectLeitnerSession(words, limit) {
    const now = Date.now();
    const due = [];
    const fresh = [];
    const nearDue = [];

    for (const w of words) {
      ensureLeitnerMeta(w);
      if (!w.srs.dueAt) {
        fresh.push(w);
        continue;
      }
      const dueAt = Date.parse(w.srs.dueAt);
      if (dueAt <= now) due.push(w);
      else if (dueAt - now < 2 * 86400000) nearDue.push(w);
    }

    due.sort((a, b) => Date.parse(a.srs.dueAt) - Date.parse(b.srs.dueAt));

    const selected = [];
    for (const list of [due, fresh, nearDue]) {
      for (const w of list) {
        if (selected.length >= limit) break;
        selected.push(w);
      }
      if (selected.length >= limit) break;
    }

    if (selected.length < limit) {
      const pool = words.filter((w) => !selected.includes(w));
      shuffle(pool);
      for (const w of pool) {
        if (selected.length >= limit) break;
        selected.push(w);
      }
    }

    return selected;
  }

  /**
   * Count words that are due for review
   */
  function countDue(words) {
    const now = Date.now();
    let c = 0;
    for (const w of words) {
      ensureLeitnerMeta(w);
      if (!w.srs.dueAt || Date.parse(w.srs.dueAt) <= now) {
        c++;
      }
    }
    return c;
  }

  /**
   * Get count statistics for Leitner boxes
   */
  function leitnerCounts(words) {
    const counts = { total: words.length, due: 0 };
    for (let i = 0; i <= MAX_BOX; i++) counts["box" + i] = 0;

    const now = Date.now();
    for (const w of words) {
      ensureLeitnerMeta(w);
      counts["box" + w.srs.boxIndex]++;
      if (!w.srs.dueAt || Date.parse(w.srs.dueAt) <= now) counts.due++;
    }
    return counts;
  }

  /**
   * Shuffle array in place
   */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Public API
  return {
    ensureLeitnerMeta,
    updateLeitnerMeta,
    selectLeitnerSession,
    countDue,
    leitnerCounts,
  };
})();

self.LeitnerService = LeitnerService;
