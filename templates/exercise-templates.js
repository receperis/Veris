/**
 * HTML Templates for Exercise Component
 * Extracted from exercise.js for better maintainability
 */

export const ExerciseTemplates = {
  // Answer choice button template
  answerChoice: (
    choice,
    correctAnswer,
    selectedAnswer = null,
    isAnswered = false
  ) => {
    let classes = "answer-btn";
    if (isAnswered) {
      classes += " disabled";
      if (choice.toLowerCase() === correctAnswer.toLowerCase()) {
        classes += " correct";
      } else if (
        choice === selectedAnswer &&
        choice.toLowerCase() !== correctAnswer.toLowerCase()
      ) {
        classes += " incorrect";
      }
    }

    return `
      <button class="${classes}" data-choice="${escapeHtml(choice)}">
        ${escapeHtml(choice)}
      </button>
    `;
  },

  // Language option for dropdown
  languageOption: (langCode, displayName) => `
    <option value="${escapeHtml(langCode)}">${escapeHtml(displayName)}</option>
  `,

  // Review word item for results
  reviewWordItem: (word) => `
    <div class="review-word-item">
      <span class="review-original">${escapeHtml(word.original)}</span>
      <span class="review-translation">${escapeHtml(word.translation)}</span>
    </div>
  `,

  // Answer toast notification
  answerToast: (message, type) => {
    const icons = {
      correct: "✓",
      incorrect: "✕",
      skipped: "ℹ",
    };

    return `
      <div class="answer-toast ${type}" role="status" aria-live="polite" aria-atomic="true">
        <span class="icon">${icons[type] || "ℹ"}</span>
        <div class="message">${escapeHtml(message)}</div>
      </div>
    `;
  },

  // Target language menu
  targetLanguageMenu: (languages) => `
    <div class="target-lang-menu">
      <div class="tlm-header">Change target language</div>
      ${languages
        .map(
          (lang) => `
        <button data-lang="${escapeHtml(
          lang
        )}">${ExerciseTemplates.languageName(lang)}</button>
      `
        )
        .join("")}
      <button class="tlm-cancel" data-cancel="1">Cancel</button>
    </div>
  `,

  // Navigation controls (if not present in HTML)
  navigationControls: () => `
    <div class="nav-controls">
      <button class="prev-question-btn" disabled title="Previous question">‹ Previous</button>
      <button class="next-question-btn" disabled title="Next question">Next ›</button>
    </div>
  `,

  // Error screen content
  errorContent: (message) => `
    <div class="error-content">
      <div class="error-icon">😔</div>
      <h2>Exercise Error</h2>
      <p>${escapeHtml(message)}</p>
      <button class="close-error-btn">Close</button>
    </div>
  `,

  // Helper method for language names
  languageName: (code) => {
    const languageNames = {
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
      tr: "Turkish",
      nl: "Dutch",
      sv: "Swedish",
      da: "Danish",
      no: "Norwegian",
      fi: "Finnish",
      pl: "Polish",
      cs: "Czech",
      hu: "Hungarian",
      ro: "Romanian",
    };
    return languageNames[code] || code.toUpperCase();
  },
};

// Helper function for HTML escaping
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Make escapeHtml available for templates
ExerciseTemplates.escapeHtml = escapeHtml;
