/* Exercise Service - Handles daily exercise notifications and scheduling */
// Works in service worker (importScripts) context

const ExerciseService = (() => {
  const { log, warn, error } = createLogger("[ExerciseService]");
  const DAILY_ALARM = "daily-exercise";
  const META_KEY = "exerciseAlarmInfo";

  function defaultSettings() {
    return {
      enabled: true,
      time: "09:00",
      days: [1, 2, 3, 4, 5],
      difficulty: "mixed",
      questionsPerSession: 10,
    };
  }

  function validateSettings(raw) {
    const base = defaultSettings();
    if (!raw || typeof raw !== "object") return base;
    const s = { ...base, ...raw };
    if (!/^\d{2}:\d{2}$/.test(s.time)) s.time = base.time;
    if (!Array.isArray(s.days) || !s.days.length) s.days = base.days;
    s.days = [
      ...new Set(s.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)),
    ].sort();
    if (!s.days.length) s.days = base.days;
    return s;
  }

  function computeNextOccurrence(timeStr, days) {
    const [h, m] = timeStr.split(":").map(Number);
    const now = new Date();
    for (let offset = 0; offset < 14; offset++) {
      // look ahead max 2 weeks safety
      const d = new Date(now);
      d.setDate(now.getDate() + offset);
      d.setHours(h, m, 0, 0);
      if (d <= now) continue;
      if (days.includes(d.getDay())) return d;
    }
    return null;
  }

  async function getSettings() {
    const stored = await chrome.storage.sync.get(["exerciseSettings"]);
    return validateSettings(stored.exerciseSettings);
  }

  async function setupDailyAlarm(force = false) {
    try {
      const settings = await getSettings();
      if (!settings.enabled) {
        log("Disabled; skipping alarm setup");
        return { skipped: true, reason: "disabled" };
      }

      const next = computeNextOccurrence(settings.time, settings.days);
      if (!next) {
        warn("No next occurrence could be computed");
        return { skipped: true, reason: "no_next_time" };
      }

      // Check existing alarm to avoid churn
      const existing = await chrome.alarms.get(DAILY_ALARM);
      if (existing && !force) {
        const existingDate = new Date(existing.scheduledTime);
        if (Math.abs(existingDate - next) < 60000) {
          // within 1 minute
          log(
            "Existing alarm already set for ~same time:",
            existingDate.toString()
          );
          return { reused: true, when: existingDate };
        }
      }

      await chrome.alarms.clear(DAILY_ALARM);
      await chrome.alarms.create(DAILY_ALARM, { when: next.getTime() });
      await chrome.storage.local.set({
        [META_KEY]: {
          scheduledFor: next.toISOString(),
          createdAt: new Date().toISOString(),
        },
      });
      log("Scheduled daily alarm for", next.toString());
      return { scheduled: true, when: next };
    } catch (e) {
      error("Failed to setup daily alarm", e);
      return { error: e.message };
    }
  }

  async function handleDailyExerciseAlarm() {
    try {
      log("Alarm fired");
      const hasWords = await checkUserHasVocabulary();
      if (!hasWords) {
        log("Skipping: no vocabulary");
        await setupDailyAlarm();
        return;
      }

      // const done = await checkExerciseDoneToday();
      // if (done) { log('Already completed today; rescheduling only'); await setupDailyAlarm(); return; }

      const result = await NotificationService.sendDailyExerciseNotification();
      if (!result.success) {
        warn("Notification failed", result.error);
      } else {
        log("Notification dispatched id=", result.id);
      }
      await setupDailyAlarm();
    } catch (e) {
      error("Error in handleDailyExerciseAlarm", e);
      await setupDailyAlarm();
    }
  }

  async function checkUserHasVocabulary() {
    try {
      const stats = await DatabaseService.getStats();
      return !!(stats && stats.totalEntries && stats.totalEntries > 0);
    } catch (e) {
      error("checkUserHasVocabulary", e);
      return false;
    }
  }

  async function checkExerciseDoneToday() {
    try {
      const { vocabularyStats } = await chrome.storage.local.get([
        "vocabularyStats",
      ]);
      if (!vocabularyStats || !vocabularyStats.lastExercise) return false;
      const last = new Date(vocabularyStats.lastExercise);
      const now = new Date();
      return last.toDateString() === now.toDateString();
    } catch (e) {
      error("checkExerciseDoneToday", e);
      return false;
    }
  }

  async function handleExerciseCompleted(exerciseData) {
    try {
      const { vocabularyStats } = await chrome.storage.local.get([
        "vocabularyStats",
      ]);
      const stats = vocabularyStats || {
        totalWords: 0,
        uniqueWords: 0,
        lastExercise: null,
        exercisesCompleted: 0,
        averageScore: 0,
        totalScore: 0,
      };
      stats.lastExercise = new Date().toISOString();
      stats.exercisesCompleted = (stats.exercisesCompleted || 0) + 1;
      stats.totalScore = (stats.totalScore || 0) + (exerciseData?.score || 0);
      stats.averageScore = stats.exercisesCompleted
        ? Math.round(stats.totalScore / stats.exercisesCompleted)
        : 0;
      await chrome.storage.local.set({ vocabularyStats: stats });
      log("Updated stats after exercise", stats);
    } catch (e) {
      error("handleExerciseCompleted", e);
    }
  }

  // Debug helper: schedule a test alarm in N seconds (default 10)
  async function setupTestAlarm(seconds = 10) {
    try {
      await chrome.alarms.clear("test-exercise");
      const when = Date.now() + seconds * 1000;
      await chrome.alarms.create("test-exercise", { when });
      log(`Test alarm scheduled in ${seconds}s at`, new Date(when).toString());
      return { success: true, when };
    } catch (e) {
      error("setupTestAlarm", e);
      return { success: false, error: e.message };
    }
  }

  return {
    setupDailyAlarm,
    handleDailyExerciseAlarm,
    handleExerciseCompleted,
    setupTestAlarm,
    // Leitner API - delegated to LeitnerService
    prepareLeitnerSession: async (limit = 10, selectedLanguage = null) => {
      try {
        const words = await DatabaseService.getAllVocabulary();

        // Filter by language if specified
        let filteredWords = words;
        if (selectedLanguage) {
          filteredWords = words.filter(
            (w) =>
              (w.sourceLanguage || "").toLowerCase() ===
              selectedLanguage.toLowerCase()
          );
        }

        if (filteredWords.length === 0) {
          return {
            success: false,
            error: selectedLanguage
              ? "no_words_for_language"
              : "no_words_available",
          };
        }

        const enriched = filteredWords.map((w) =>
          LeitnerService.ensureLeitnerMeta(w)
        );
        const selection = LeitnerService.selectLeitnerSession(enriched, limit);

        return {
          success: true,
          words: selection.map((w) => ({
            id: w.id,
            originalWord: w.originalWord,
            translatedWord: w.translatedWord,
            sourceLanguage: w.sourceLanguage,
            targetLanguage: w.targetLanguage,
            context: w.context || "",
            srs: { boxIndex: w.srs.boxIndex, dueAt: w.srs.dueAt },
          })),
          counts: LeitnerService.leitnerCounts(enriched),
          selectedLanguage: selectedLanguage,
        };
      } catch (e) {
        error("prepareLeitnerSession", e);
        return { success: false, error: e.message };
      }
    },
    recordLeitnerResult: async ({ id, correct, usedHint, skipped }) => {
      try {
        const all = await DatabaseService.getAllVocabulary();
        const target = all.find((w) => w.id === id);
        if (!target) return { success: false, error: "word_not_found" };

        LeitnerService.ensureLeitnerMeta(target);
        const wasCorrect = correct && !usedHint && !skipped;
        LeitnerService.updateLeitnerMeta(target, wasCorrect, usedHint, skipped);

        await DatabaseService.updateVocabulary(target.id, { srs: target.srs });
        return { success: true, srs: target.srs };
      } catch (e) {
        error("recordLeitnerResult", e);
        return { success: false, error: e.message };
      }
    },
    getDueCount: async () => {
      try {
        const all = await DatabaseService.getAllVocabulary();
        return LeitnerService.countDue(all);
      } catch {
        return 0;
      }
    },
    getAvailableLanguages: async () => {
      try {
        const words = await DatabaseService.getAllVocabulary();
        const languages = new Set();

        words.forEach((word) => {
          if (word.sourceLanguage)
            languages.add(word.sourceLanguage.toLowerCase());
        });

        return { success: true, languages: Array.from(languages).sort() };
      } catch (e) {
        error("getAvailableLanguages", e);
        return { success: false, error: e.message };
      }
    },
    getDueCountByLanguage: async (selectedLanguage = null) => {
      try {
        const all = await DatabaseService.getAllVocabulary();
        let filteredWords = all;

        if (selectedLanguage) {
          filteredWords = all.filter(
            (w) =>
              (w.sourceLanguage || "").toLowerCase() ===
              selectedLanguage.toLowerCase()
          );
        }

        return LeitnerService.countDue(filteredWords);
      } catch {
        return 0;
      }
    },
    isExerciseTime: async () => {
      try {
        const settings = await getSettings();
        if (!settings.enabled) return false;

        const now = new Date();
        const today = now.getDay();

        // Check if today is an exercise day
        if (!settings.days.includes(today)) return false;

        // Check if it's the right time (within 1 hour window)
        const [h, m] = settings.time.split(":").map(Number);
        const exerciseTime = new Date();
        exerciseTime.setHours(h, m, 0, 0);

        const timeDiff = Math.abs(now - exerciseTime);
        const oneHour = 60 * 60 * 1000;

        return timeDiff <= oneHour;
      } catch (e) {
        error("isExerciseTime", e);
        return false;
      }
    },
    // Expose for potential external debugging
    _internal: { computeNextOccurrence, validateSettings },
  };
})();

self.ExerciseService = ExerciseService;
