/**
 * HTML Templates for Content Script UI Components
 * Extracted from content_script.js and ui.js for better maintainability
 */

export const ContentTemplates = {
  // Translation bubble template
  translationBubble: (
    sourceText,
    translatedText,
    isLoading = false,
    languageInfo = null
  ) => {
    const languageIndicator =
      languageInfo && !isLoading
        ? `
        <div class="language-indicator">
          <div class="language-badge source-lang">
            <span class="lang-label">${escapeHtml(
              languageInfo.sourceLang
            )}</span>
          </div>
          <div class="language-arrow">→</div>
          <div class="language-badge target-lang">
            <span class="lang-label">${escapeHtml(
              languageInfo.targetLang
            )}</span>
          </div>
        </div>
      `
        : "";

    return `
      <div class="close-btn" title="Close">×</div>
      ${languageIndicator}
      <div class="source-text">${escapeHtml(sourceText)}</div>
      <div class="translated-text">${escapeHtml(translatedText)}</div>
      <div class="word-breakdown">
        <div class="combination-controls">
          <div class="combination-status show">
            <div class="combination-info">
              <span>Click words for individual translations</span>
            </div>
          </div>
          <button class="combination-btn" title="Enter combination mode for multiple words">🔗</button>
        </div>
        <div class="word-pills"></div>
        <div class="word-translation"></div>
      </div>
      <div class="save-section">
        <button class="save-button-translate">
          <span>💾</span>
          <span>Save</span>
          <span class="save-count">0</span>
        </button>
        <div class="save-status"></div>
      </div>
      <div class="meta">Built-in Translation</div>
    `;
  },

  // Trigger icon template
  triggerIcon: () => `V`,

  // Language menu template
  languageMenu: (codes, currentLang) => `
    <div class="__lang_menu_header">
      <input type="text" placeholder="Search language..." class="__lang_menu_search" />
    </div>
    <div class="__lang_menu_list">
      ${codes
        .map(
          (code) => `
        <div class="__lang_menu_item ${
          code === currentLang ? "active" : ""
        }" data-code="${code}">
          <span class="code">${ContentTemplates.getLanguageName(code)}</span>
          <span class="name">${ContentTemplates.getFullLanguageName(
            code
          )}</span>
        </div>
      `
        )
        .join("")}
    </div>
  `,

  // Word pill template
  wordPill: (word, index) => `
    <span class="word-pill" data-word="${escapeHtml(
      word
    )}" data-index="${index}">
      ${escapeHtml(word)}
    </span>
  `,

  // Word translation item template
  wordTranslationItem: (word, translation, index) => `
    <div class="word-translation-item">
      <div class="word-translation-content">
        <span class="word-original">${escapeHtml(word)}</span>
        <span class="word-translated">${escapeHtml(translation)}</span>
        <button class="add-word-btn" data-index="${index}">+</button>
      </div>
    </div>
  `,

  // Combination translation template
  combinationTranslation: (originalText, translatedText) => `
    <div class="combination-translation">
      <div class="combination-header">Combined Translation</div>
      <div class="combination-content">
        <div class="combination-original">${escapeHtml(originalText)}</div>
        <div class="combination-translated">${escapeHtml(translatedText)}</div>
        <button class="save-combination-btn">Save Combination</button>
      </div>
    </div>
  `,

  // Instant combination template
  instantCombination: (
    originalText,
    translatedText,
    isLoading = false,
    isError = false
  ) => {
    const statusClass = isLoading ? "loading" : isError ? "error" : "";
    const translationText = isError ? "Translation failed" : translatedText;

    return `
      <div class="instant-combination-translation">
        <div class="combination-instant ${statusClass}">
          <span class="combination-label">Combo:</span>
          <span class="word-original">${escapeHtml(originalText)}</span>
          <span class="word-translated ${isError ? "error" : ""}">${escapeHtml(
      translationText
    )}</span>
          ${
            !isLoading && !isError
              ? '<button class="combination-add">Add</button>'
              : ""
          }
        </div>
      </div>
    `;
  },

  // Combination error template
  combinationError: (errorMessage) => `
    <div class="combination-error">
      <div class="combination-header">Translation Error</div>
      <div class="error-message">${escapeHtml(errorMessage)}</div>
    </div>
  `,

  // Helper methods for language names (these should be imported from utils)
  getLanguageName: (code) => {
    // This should be imported from utils.js in actual implementation
    const languageNames = {
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
      ar: "AR",
      hi: "HI",
      tr: "TR",
      nl: "NL",
      pl: "PL",
      sv: "SV",
      da: "DA",
      no: "NO",
      fi: "FI",
      cs: "CS",
      sk: "SK",
      hu: "HU",
      ro: "RO",
      bg: "BG",
      hr: "HR",
      uk: "UK",
      el: "EL",
      he: "HE",
      fa: "FA",
      th: "TH",
      vi: "VI",
      id: "ID",
      ms: "MS",
      auto: "AUTO",
    };
    return languageNames[code] || code.toUpperCase();
  },

  getFullLanguageName: (code) => {
    // This should be imported from utils.js in actual implementation
    const fullNames = {
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
      auto: "Auto-detected",
    };
    return fullNames[code] || code;
  },
};

// Helper function for HTML escaping
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Make escapeHtml available for templates
ContentTemplates.escapeHtml = escapeHtml;
