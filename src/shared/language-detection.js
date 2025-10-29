/**
 * Shared Language Detection Module
 * Provides unified language detection functionality for both content scripts and service workers
 */

/**
 * LanguageDetector class for managing language detection with caching
 */
export class LanguageDetector {
  constructor() {
    this.cache = {
      language: null,
      timestamp: 0,
      url: null,
    };
    this.CACHE_DURATION = 30000; // 30 seconds
  }

  /**
   * Check if language cache is valid for current URL
   * @param {string} currentUrl - The current page URL
   * @param {number} now - Current timestamp
   * @returns {boolean} True if cache is valid
   */
  isCacheValid(currentUrl, now) {
    return (
      this.cache.language &&
      this.cache.url === currentUrl &&
      now - this.cache.timestamp < this.CACHE_DURATION
    );
  }

  /**
   * Update language cache with new values
   * @param {string} language - Detected language code
   * @param {string} url - Current URL
   * @param {number} timestamp - Current timestamp
   */
  updateCache(language, url, timestamp) {
    this.cache = {
      language,
      timestamp,
      url,
    };
  }

  /**
   * Clear the language cache
   */
  clearCache() {
    this.cache = {
      language: null,
      timestamp: 0,
      url: null,
    };
  }

  /**
   * Get source language from storage
   * @returns {Promise<string|null>} Language code or null if not found
   */
  async getFromStorage() {
    try {
      const storageResult = await chrome.storage.sync.get(["sourceLanguage"]);
      if (
        storageResult.sourceLanguage &&
        storageResult.sourceLanguage !== "und"
      ) {
        return storageResult.sourceLanguage;
      }
    } catch (err) {
      console.warn("Could not get source language from storage:", err);
    }
    return null;
  }

  /**
   * Detect language using background script message
   * @returns {Promise<string|null>} Detected language code or null if failed
   */
  async detectViaBackground() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "DETECT_PAGE_LANGUAGE",
      });

      if (
        response &&
        response.ok &&
        response.language &&
        response.language !== "und"
      ) {
        return response.language;
      }
    } catch (err) {
      console.warn("Language detection via background failed:", err);
    }
    return null;
  }

  /**
   * Robust language detection with caching and fallback
   * (For use in content scripts)
   * @param {string} currentUrl - Current page URL
   * @param {boolean} fallbackToAuto - Whether to fallback to 'auto' if detection fails
   * @returns {Promise<string>} Detected language code
   */
  async detect(currentUrl, fallbackToAuto = true) {
    const now = Date.now();

    // Check if we have a fresh cache for this URL
    if (this.isCacheValid(currentUrl, now)) {
      return this.cache.language;
    }

    // First, try to get from storage (set by background script)
    const storageLanguage = await this.getFromStorage();
    if (storageLanguage) {
      this.updateCache(storageLanguage, currentUrl, now);
      return storageLanguage;
    }

    // If no language in storage, try direct detection via background script
    const detectedLanguage = await this.detectViaBackground();
    if (detectedLanguage) {
      this.updateCache(detectedLanguage, currentUrl, now);
      return detectedLanguage;
    }

    // Fallback to 'auto' if detection fails
    if (fallbackToAuto) {
      const fallbackLang = "auto";
      this.updateCache(fallbackLang, currentUrl, now);
      return fallbackLang;
    }

    return null;
  }
}

/**
 * Background Script Language Detection Utilities
 * (For use in service workers)
 */
export const BackgroundLanguageDetector = {
  /**
   * Detect language for a specific tab and store it
   * @param {number} tabId - Chrome tab ID
   * @param {Function} callback - Optional callback for success/error
   */
  detectAndStore(tabId, callback = null) {
    chrome.tabs.detectLanguage(tabId, (language) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "Language detection error:",
          chrome.runtime.lastError.message
        );
        if (callback) callback(null, chrome.runtime.lastError);
      } else if (language && language !== "und") {
        chrome.storage.sync.set({ sourceLanguage: language }, () => {
          if (chrome.runtime.lastError) {
            console.error("Persist error:", chrome.runtime.lastError.message);
            if (callback) callback(null, chrome.runtime.lastError);
          } else {
            console.log(
              `Language detected and stored: ${language} for tab ${tabId}`
            );
            if (callback) callback(language, null);
          }
        });
      } else {
        console.log(
          `Language detection returned: ${language} (undetermined) for tab ${tabId}`
        );
        if (callback) callback(null, new Error("Language undetermined"));
      }
    });
  },

  /**
   * Set up automatic language detection on tab events
   * @param {number} delayMs - Delay before detection (default 500ms)
   */
  setupAutoDetection(delayMs = 500) {
    // Detect language when tab is updated
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (
        changeInfo.status === "complete" &&
        tab.url &&
        !tab.url.startsWith("chrome://")
      ) {
        setTimeout(() => {
          this.detectAndStore(tabId);
        }, delayMs);
      }
    });

    // Detect language when tab becomes active
    chrome.tabs.onActivated.addListener((activeInfo) => {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime.lastError) return;

        if (
          tab.url &&
          !tab.url.startsWith("chrome://") &&
          tab.status === "complete"
        ) {
          this.detectAndStore(activeInfo.tabId);
        }
      });
    });
  },
};

// Create a singleton instance for content scripts
export const languageDetector = new LanguageDetector();
