/* Notification Service - Handles all Chrome notifications */
// Compatible with service worker (importScripts) environment

const NotificationService = (() => {
  const LOG_PREFIX = '[NotificationService]';
  const DAILY_ID = 'daily-exercise';
  const TEST_ID = 'test-notification';
  // Fallback icon must be a packaged resource (data URIs are not supported by Chrome notifications)
  // const FALLBACK_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAKdSURBVFhH7ZdLSFRRGMdnxkfmI1NLTc1MM1vYwo2htVGhRYs2bVy0aBFBBBG0aOOmRdCmRQu3LVpECy2CoBYRC4IWQVBBtCiCaBG0CIKghZsvtKn/d+45zp2599x7Z8aFP/zde873/c93vnPPnXsGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaD/x4+B/gN4L9gqAo8h/gd4P8A';
  const FALLBACK_ICON = 'icons/icon128.png';

  let initialized = false;

  function log(...args) { console.log(LOG_PREFIX, ...args); }
  function warn(...args) { console.warn(LOG_PREFIX, ...args); }
  function error(...args) { console.error(LOG_PREFIX, ...args); }

  async function ensureAPI() {
    if (!chrome || !chrome.notifications) {
      error('chrome.notifications API not available');
      return { ok: false, reason: 'api_unavailable' };
    }
    try {
      if (chrome.notifications.getPermissionLevel) {
        const level = await chrome.notifications.getPermissionLevel();
        log('Permission level:', level);
        if (level === 'denied') return { ok: false, reason: 'permission_denied' };
      }
    } catch (e) {
      warn('Permission level check failed:', e.message);
    }
    return { ok: true };
  }

  function buildOptions(overrides) {
    const base = {
      type: 'basic',
      priority: overrides?.priority ?? 2,
      requireInteraction: overrides?.requireInteraction ?? false,
      silent: overrides?.silent ?? false,
      iconUrl: overrides?.iconUrl || FALLBACK_ICON
    };
    return { ...base, ...overrides };
  }

  async function send(id, options) {
    const api = await ensureAPI();
    if (!api.ok) return { success: false, error: api.reason };

    try {
      // Clear existing with same id to avoid stale state
      try { await chrome.notifications.clear(id); } catch (_) {}
      const finalOptions = buildOptions(options);
      log('Sending notification', id, finalOptions);
      const createdId = await chrome.notifications.create(id, finalOptions);
      return { success: true, id: createdId };
    } catch (e) {
      error('Failed to create notification', id, e);
      // Retry once with fallback icon if the error is about image download and a custom icon was used
      const msg = e?.message || '';
      if (options?.iconUrl && msg.includes('images')) {
        try {
          warn('Retrying notification with fallback icon');
          const retryId = await chrome.notifications.create(id, buildOptions({ ...options, iconUrl: FALLBACK_ICON }));
          return { success: true, id: retryId, retriedWithFallback: true };
        } catch (e2) {
          error('Retry with fallback icon failed', e2);
        }
      }
      return { success: false, error: e.message };
    }
  }

  async function sendDailyExerciseNotification() {
    let dueCount = null;
    try {
      if (typeof ExerciseService?.getDueCount === 'function') {
        dueCount = await ExerciseService.getDueCount();
      }
    } catch (e) {
      warn('Failed to fetch due count for notification', e.message);
    }
    const countPart = (dueCount != null) ? ` (${dueCount} due)` : '';
    const msgDetail = (dueCount != null)
      ? (dueCount === 0
          ? 'No cards are due — great time to add new words or review anyway.'
          : `${dueCount} word${dueCount===1?'':'s'} ready for review. Click to start.`)
      : 'Time for your daily vocabulary practice! Click to start.';
    return send(DAILY_ID, {
      title: 'Daily Vocabulary Exercise' + countPart,
      message: msgDetail,
      priority: 1,
      requireInteraction: true
    });
  }

  async function testNotification(extra = {}) {
    return send(TEST_ID, {
      title: 'Test Notification',
      message: 'This is a test notification from your extension.',
      ...extra
    });
  }

  async function clear(id) {
    try { return await chrome.notifications.clear(id); } catch { return false; }
  }

  async function clearAll() {
    if (chrome.notifications && chrome.notifications.getAll) {
      chrome.notifications.getAll(ids => {
        Object.keys(ids || {}).forEach(id => chrome.notifications.clear(id));
      });
    }
  }

  function setupListeners() {
    if (!chrome?.notifications) return;
    chrome.notifications.onClicked.addListener((id) => {
      log('Clicked', id);
      if (id === DAILY_ID) {
        try {
          chrome.tabs.create({ url: chrome.runtime.getURL('exercise/exercise.html') });
        } catch (e) { error('Failed to open exercise page', e); }
      }
      chrome.notifications.clear(id);
    });
  }

  function setup() {
    if (initialized) return;
    initialized = true;
    log('Initializing');
    setupListeners();
  }

  return {
    setup,
    sendNotification: send, // generic
    sendDailyExerciseNotification,
    testNotification,
    clear,
    clearAll
  };
})();

// Expose globally (optional clarity)
self.NotificationService = NotificationService;