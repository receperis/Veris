/**
 * Storage utilities for consistent data management
 * Handles Chrome extension storage operations with proper error handling
 */

// Default settings for the extension
export const DEFAULT_SETTINGS = {
  target_lang: "en",
  bubbleMode: "auto", // 'auto' | 'icon' | 'hotkey'
  bubbleIconDelay: 450,
  bubbleHotkey: "", // empty -> use double copy gesture
  extensionEnabled: true,
  exerciseSettings: {
    enabled: true,
    time: "09:00",
    days: [1, 2, 3, 4, 5], // Monday to Friday
    difficulty: "mixed",
    questionsPerSession: 10,
  },
};

/**
 * Get settings from storage with defaults
 * @param {object} defaults - Default values to use
 * @returns {Promise<object>} Settings object
 */
export async function getSettings(defaults = DEFAULT_SETTINGS) {
  try {
    const stored = await chrome.storage.sync.get(defaults);
    return stored;
  } catch (error) {
    console.error("Failed to get settings from storage:", error);
    return defaults;
  }
}

/**
 * Save settings to storage
 * @param {object} settings - Settings object to save
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function saveSettings(settings) {
  try {
    await chrome.storage.sync.set(settings);
    return true;
  } catch (error) {
    console.error("Failed to save settings to storage:", error);
    return false;
  }
}

/**
 * Get a specific setting value
 * @param {string} key - Setting key to retrieve
 * @param {*} defaultValue - Default value if not found
 * @returns {Promise<*>} The setting value
 */
export async function getSetting(key, defaultValue = null) {
  try {
    const result = await chrome.storage.sync.get({ [key]: defaultValue });
    return result[key];
  } catch (error) {
    console.error(`Failed to get setting '${key}' from storage:`, error);
    return defaultValue;
  }
}

/**
 * Save a specific setting value
 * @param {string} key - Setting key to save
 * @param {*} value - Value to save
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function saveSetting(key, value) {
  try {
    await chrome.storage.sync.set({ [key]: value });
    return true;
  } catch (error) {
    console.error(`Failed to save setting '${key}' to storage:`, error);
    return false;
  }
}

/**
 * Listen for storage changes
 * @param {Function} callback - Callback function to handle changes
 * @returns {Function} Cleanup function to remove the listener
 */
export function onStorageChanged(callback) {
  const listener = (changes, area) => {
    if (area === "sync") {
      callback(changes);
    }
  };

  chrome.storage.onChanged.addListener(listener);

  // Return cleanup function
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}

/**
 * Clear all extension settings (reset to defaults)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function clearSettings() {
  try {
    await chrome.storage.sync.clear();
    return true;
  } catch (error) {
    console.error("Failed to clear settings:", error);
    return false;
  }
}

/**
 * Get storage usage information
 * @returns {Promise<object>} Storage usage stats
 */
export async function getStorageInfo() {
  try {
    const bytesInUse = await chrome.storage.sync.getBytesInUse();
    const quota = chrome.storage.sync.QUOTA_BYTES || 102400; // 100KB default

    return {
      used: bytesInUse,
      total: quota,
      percentage: Math.round((bytesInUse / quota) * 100),
      available: quota - bytesInUse,
    };
  } catch (error) {
    console.error("Failed to get storage info:", error);
    return {
      used: 0,
      total: 102400,
      percentage: 0,
      available: 102400,
    };
  }
}

/**
 * Backup settings to a JSON object
 * @returns {Promise<object>} Settings backup object
 */
export async function backupSettings() {
  try {
    const allSettings = await chrome.storage.sync.get(null);
    return {
      timestamp: new Date().toISOString(),
      version: chrome.runtime.getManifest().version,
      settings: allSettings,
    };
  } catch (error) {
    console.error("Failed to backup settings:", error);
    throw error;
  }
}

/**
 * Restore settings from a backup object
 * @param {object} backup - Backup object from backupSettings()
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function restoreSettings(backup) {
  try {
    if (!backup || !backup.settings) {
      throw new Error("Invalid backup format");
    }

    await chrome.storage.sync.clear();
    await chrome.storage.sync.set(backup.settings);
    return true;
  } catch (error) {
    console.error("Failed to restore settings:", error);
    return false;
  }
}
