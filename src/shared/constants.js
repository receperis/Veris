/**
 * Shared constants used across the extension
 */

// Exercise difficulty levels
export const DIFFICULTY_LEVELS = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
  MIXED: "mixed",
};

// Exercise question types
export const QUESTION_TYPES = {
  FORWARD: "forward", // source -> target
  REVERSE: "reverse", // target -> source
  CONTEXT: "context", // context-based questions
  MIXED: "mixed",
};

// Days of the week (0 = Sunday, 1 = Monday, etc.)
export const DAYS_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

// Day names for display
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Bubble trigger modes
export const BUBBLE_MODES = {
  AUTO: "auto",
  ICON: "icon",
  HOTKEY: "hotkey",
};

// Stats time periods
export const TIME_PERIODS = {
  TODAY: "today",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
  ALL_TIME: "all_time",
};

// Notification types
export const NOTIFICATION_TYPES = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
};

// Message types for chrome.runtime communication
export const MESSAGE_TYPES = {
  // Content script messages
  TRANSLATE_TEXT: "TRANSLATE_TEXT",
  DETECT_PAGE_LANGUAGE: "DETECT_PAGE_LANGUAGE",

  // Vocabulary management
  SAVE_VOCABULARY: "SAVE_VOCABULARY",
  GET_ALL_VOCABULARY: "GET_ALL_VOCABULARY",
  UPDATE_VOCABULARY: "UPDATE_VOCABULARY",
  DELETE_VOCABULARY: "DELETE_VOCABULARY",
  SEARCH_VOCABULARY: "SEARCH_VOCABULARY",

  // Exercise system
  CHECK_EXERCISE_TIME: "CHECK_EXERCISE_TIME",
  UPDATE_EXERCISE_SETTINGS: "UPDATE_EXERCISE_SETTINGS",
  GET_EXERCISE_WORDS: "GET_EXERCISE_WORDS",
  SUBMIT_EXERCISE_RESULTS: "SUBMIT_EXERCISE_RESULTS",

  // Statistics
  GET_STATS: "GET_STATS",
  GET_DETAILED_STATS: "GET_DETAILED_STATS",
  UPDATE_STATS: "UPDATE_STATS",

  // Settings
  GET_SETTINGS: "GET_SETTINGS",
  SAVE_SETTINGS: "SAVE_SETTINGS",
};

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: "settings",
  VOCABULARY: "vocabulary",
  EXERCISE_SETTINGS: "exerciseSettings",
  STATS: "stats",
  SELECTED_VOCABULARY_LANGUAGE: "selectedVocabularyLanguage",
  EXTENSION_ENABLED: "extensionEnabled",
  SOURCE_LANGUAGE: "sourceLanguage",
  TARGET_LANGUAGE: "target_lang",
  BUBBLE_MODE: "bubbleMode",
  BUBBLE_ICON_DELAY: "bubbleIconDelay",
  BUBBLE_HOTKEY: "bubbleHotkey",
};

// UI constants
export const UI_CONSTANTS = {
  SEARCH_DEBOUNCE_DELAY: 300,
  BUBBLE_ICON_DELAY_DEFAULT: 450,
  LANGUAGE_CACHE_DURATION: 30000, // 30 seconds
  SEQUENCE_TIMEOUT: 1200, // hotkey sequence timeout
  DOUBLE_COPY_TIMEOUT: 500,
  TOAST_DURATION: 2000,
  ANIMATION_DURATION: 300,
};

// File size limits
export const FILE_LIMITS = {
  MAX_IMPORT_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_EXPORT_SIZE: 10 * 1024 * 1024, // 10MB
};

// Validation constraints
export const VALIDATION = {
  MAX_WORD_LENGTH: 500,
  MAX_TRANSLATION_LENGTH: 500,
  MAX_CONTEXT_LENGTH: 1000,
  MIN_SEARCH_LENGTH: 1,
  MAX_SEARCH_LENGTH: 100,
  MAX_EXERCISE_QUESTIONS: 50,
  MIN_EXERCISE_QUESTIONS: 1,
};

// Error codes
export const ERROR_CODES = {
  TRANSLATION_FAILED: "TRANSLATION_FAILED",
  STORAGE_FAILED: "STORAGE_FAILED",
  NETWORK_ERROR: "NETWORK_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
};

// Success codes
export const SUCCESS_CODES = {
  TRANSLATION_SUCCESS: "TRANSLATION_SUCCESS",
  VOCABULARY_SAVED: "VOCABULARY_SAVED",
  SETTINGS_SAVED: "SETTINGS_SAVED",
  EXERCISE_COMPLETED: "EXERCISE_COMPLETED",
};
