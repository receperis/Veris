/* Language Service - Handles language detection and tab monitoring */

export const LanguageService = {
  // Setup tab update listener for language detection
  setupTabListener() {
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
  },

  // Get detected language from storage
  async getDetectedLanguage() {
    try {
      const result = await chrome.storage.sync.get(['sourceLanguage']);
      return result.sourceLanguage || 'auto';
    } catch (error) {
      console.error('Error getting detected language:', error);
      return 'auto';
    }
  }
};