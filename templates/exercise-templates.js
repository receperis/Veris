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

  // No words screen content
  noWordsContent: (message, showLanguageFilter = true) => `
    <div class="no-words-content">
      <div class="no-words-icon">📚</div>
      <h2>No Words Available for Practice</h2>
      <p class="no-words-message">${escapeHtml(message)}</p>
      <div class="no-words-suggestions">
        <div class="suggestion-item">
          <span class="suggestion-icon">💡</span>
          <span class="suggestion-text">Start browsing websites and save new words you encounter</span>
        </div>
        <div class="suggestion-item">
          <span class="suggestion-icon">🔄</span>
          <span class="suggestion-text">Words you've learned will become available for review over time</span>
        </div>
        ${
          showLanguageFilter
            ? `
        <div class="suggestion-item">
          <span class="suggestion-icon">🌍</span>
          <span class="suggestion-text">Try changing the language filter to see if you have words in other languages</span>
        </div>
        `
            : ""
        }
      </div>
      <div class="no-words-actions">
        <button class="close-no-words-btn primary-btn">Close Exercise</button>
        ${
          showLanguageFilter
            ? '<button class="back-to-filter-btn secondary-btn">Change Language Filter</button>'
            : ""
        }
      </div>
    </div>
  `,

  // Error screen content
  errorContent: (message) => `
    <div class="error-content">
      <div class="error-icon">❌</div>
      <h2>Exercise Error</h2>
      <p class="error-message">${escapeHtml(message)}</p>
      <button class="close-error-btn">Close</button>
    </div>
  `,

  // Language name function will be set from imports
  languageName: null,
};

// Import shared utilities
import { escapeHtml } from "../src/shared/utils.js";
import { getLanguageDisplayName } from "../src/shared/languages.js";

// Set the imported functions
ExerciseTemplates.languageName = getLanguageDisplayName;

// Make escapeHtml available for templates
ExerciseTemplates.escapeHtml = escapeHtml;
