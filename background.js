/* Background Service Worker - Main entry point */

// Import all service modules using importScripts
importScripts('./service/database.service.js');
importScripts('./service/exercise.service.js');
importScripts('./service/stats.service.js');
importScripts('./service/notification.service.js');
importScripts('./service/message.service.js');

// Services are now available globally
// Initialize notification service listeners immediately
try {
    NotificationService.setup();
} catch (e) {
    console.error('[Background] Failed to initialize NotificationService:', e);
}

// Install event
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Chrome extension installed');

    // Initialize IndexedDB
    try {
        await DatabaseService.init();
        console.log('Database service initialized');
    } catch (error) {
        console.error('Failed to initialize database:', error);
    }

    // Set default exercise settings
    chrome.storage.sync.set({
        exerciseSettings: {
            enabled: true,
            time: '09:00',
            days: [1, 2, 3, 4, 5],
            difficulty: 'mixed',
            questionsPerSession: 10
        }
    });

    // Setup daily alarm
    ExerciseService.setupDailyAlarm();
});

// Startup event
chrome.runtime.onStartup.addListener(async () => {
    console.log('Chrome browser started');

    try {
        await DatabaseService.init();
        console.log('Database service initialized on startup');
    } catch (error) {
        console.error('Failed to initialize database on startup:', error);
    }

    ExerciseService.setupDailyAlarm();
});

// Setup message listener using MessageService
MessageService.setupMessageListener();

// (Notification click handling is now managed inside NotificationService)

// Setup alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'daily-exercise') {
        ExerciseService.handleDailyExerciseAlarm();
    } else if (alarm.name === 'test-exercise') {
        console.log('[Background] test-exercise alarm fired');
        // Reuse same flow but do not reschedule permanently
        ExerciseService.handleDailyExerciseAlarm();
    }
});

// Setup tab listener for language detection
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
        chrome.tabs.detectLanguage(tabId, (language) => {
            if (chrome.runtime.lastError) {
                console.error('Language detection error:', chrome.runtime.lastError.message);
            } else {
                chrome.storage.sync.set({ sourceLanguage: language }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Persist error:', chrome.runtime.lastError.message);
                    }
                });
            }
        });
    }
});

console.log('Background service worker initialized with modular services');
