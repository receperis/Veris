/**
 * Language utilities and constants
 * Centralized language handling for the extension
 */

// Complete language code to name mapping
export const LANGUAGE_NAMES = {
  auto: "Auto-detected",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  "zh-cn": "Chinese (Simplified)",
  "zh-tw": "Chinese (Traditional)",
  ar: "Arabic",
  hi: "Hindi",
  tr: "Turkish",
  nl: "Dutch",
  pl: "Polish",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian",
  fi: "Finnish",
  cs: "Czech",
  sk: "Slovak",
  hu: "Hungarian",
  ro: "Romanian",
  bg: "Bulgarian",
  hr: "Croatian",
  uk: "Ukrainian",
  el: "Greek",
  he: "Hebrew",
  fa: "Persian",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  ms: "Malay",
  ur: "Urdu",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  kn: "Kannada",
  gu: "Gujarati",
  pa: "Punjabi",
  ne: "Nepali",
  si: "Sinhala",
  my: "Burmese",
  km: "Khmer",
  lo: "Lao",
  ka: "Georgian",
  am: "Amharic",
  sw: "Swahili",
  af: "Afrikaans",
  sr: "Serbian",
  sl: "Slovenian",
  et: "Estonian",
  lv: "Latvian",
  lt: "Lithuanian",
  be: "Belarusian",
  mk: "Macedonian",
  mt: "Maltese",
  ca: "Catalan",
  eu: "Basque",
  gl: "Galician",
  is: "Icelandic",
  sq: "Albanian",
  unknown: "Unknown",
};

// Short language codes for compact display
export const SHORT_LANGUAGE_CODES = {
  auto: "Auto",
  en: "EN",
  es: "ES",
  fr: "FR",
  de: "DE",
  it: "IT",
  pt: "PT",
  ru: "RU",
  ja: "JA",
  ko: "KO",
  zh: "ZH",
  "zh-cn": "CN",
  "zh-tw": "TW",
  ar: "AR",
  hi: "HI",
  tr: "TR",
  nl: "NL",
  sv: "SV",
  da: "DA",
  no: "NO",
  fi: "FI",
  pl: "PL",
  cs: "CS",
  sk: "SK",
  hu: "HU",
  ro: "RO",
  bg: "BG",
  hr: "HR",
  sr: "SR",
  sl: "SL",
  et: "ET",
  lv: "LV",
  lt: "LT",
  uk: "UK",
  be: "BE",
  mk: "MK",
  mt: "MT",
  ca: "CA",
  eu: "EU",
  gl: "GL",
  is: "IS",
  sq: "SQ",
  el: "EL",
  he: "HE",
  fa: "FA",
  th: "TH",
  vi: "VI",
  id: "ID",
  ms: "MS",
  ur: "UR",
  bn: "BN",
  ta: "TA",
  te: "TE",
  ml: "ML",
  kn: "KN",
  gu: "GU",
  pa: "PA",
  ne: "NE",
  si: "SI",
  my: "MY",
  km: "KM",
  lo: "LO",
  ka: "KA",
  am: "AM",
  sw: "SW",
  af: "AF",
};

// Commonly used languages in order of popularity
export const COMMON_LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "ru",
  "ja",
  "ko",
  "zh",
  "ar",
  "hi",
  "tr",
  "nl",
  "sv",
  "da",
  "no",
  "fi",
  "pl",
  "cs",
  "sk",
  "hu",
  "ro",
  "bg",
  "hr",
  "uk",
  "el",
  "he",
  "fa",
  "th",
  "vi",
  "id",
  "ms",
  "sw",
];

/**
 * Get the full display name for a language code
 * @param {string} langCode - The language code (e.g., 'en', 'es')
 * @returns {string} The full language name (e.g., 'English', 'Spanish')
 */
export function getLanguageDisplayName(langCode) {
  if (!langCode) return "Unknown";
  return LANGUAGE_NAMES[langCode] || langCode.toUpperCase();
}

/**
 * Get the short code for a language (for UI badges, etc.)
 * @param {string} langCode - The language code
 * @returns {string} The short language code (e.g., 'EN', 'ES')
 */
export function getLanguageName(langCode) {
  if (!langCode) return "??";
  return SHORT_LANGUAGE_CODES[langCode] || langCode.toUpperCase().slice(0, 3);
}

/**
 * Get the full language name (alias for getLanguageDisplayName for backwards compatibility)
 * @param {string} code - The language code
 * @returns {string} The full language name
 */
export function getFullLanguageName(code) {
  return getLanguageDisplayName(code);
}

/**
 * Build a list of common languages for dropdowns
 * @returns {string[]} Array of language codes
 */
export function buildLanguageList() {
  return [...COMMON_LANGUAGES];
}

/**
 * Check if a language code is valid
 * @param {string} langCode - The language code to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidLanguageCode(langCode) {
  return (
    langCode && (LANGUAGE_NAMES.hasOwnProperty(langCode) || langCode === "auto")
  );
}

/**
 * Normalize a language code (handle common variations)
 * @param {string} langCode - The language code to normalize
 * @returns {string} The normalized language code
 */
export function normalizeLanguageCode(langCode) {
  if (!langCode) return "auto";

  const normalized = langCode.toLowerCase().trim();

  // Handle common variations
  const variations = {
    chinese: "zh",
    "simplified chinese": "zh-cn",
    "traditional chinese": "zh-tw",
    arabic: "ar",
    japanese: "ja",
    korean: "ko",
    english: "en",
    spanish: "es",
    french: "fr",
    german: "de",
    italian: "it",
    portuguese: "pt",
    russian: "ru",
  };

  return variations[normalized] || normalized;
}
