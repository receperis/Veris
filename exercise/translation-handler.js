/**
 * Translation Handler
 * Handles translation functionality and target language switching
 */

import {
  ExerciseTemplates,
  TemplateUtils,
} from "../templates/template-utils.js";

export class TranslationHandler {
  constructor(state, ui) {
    this.state = state;
    this.ui = ui;
  }

  /**
   * Get language display name
   */
  getLanguageName(code) {
    const MAP = {
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
    return MAP[code] || code.toUpperCase();
  }

  /**
   * Show target language selection menu
   */
  showTargetLanguageMenu(anchorEl) {
    if (this.state.isTranslatingBulk) return;

    // Remove existing menu
    document.querySelector(".target-lang-menu")?.remove();

    const LANGS = [
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
      "tr",
      "nl",
      "sv",
      "da",
      "no",
      "fi",
      "pl",
      "cs",
      "hu",
      "ro",
    ];

    const menu = TemplateUtils.createElement(
      ExerciseTemplates.targetLanguageMenu(LANGS)
    );
    document.body.appendChild(menu);

    // Position near anchor
    const rect = anchorEl.getBoundingClientRect();
    menu.style.top = window.scrollY + rect.bottom + 6 + "px";
    menu.style.left = window.scrollX + rect.left + "px";

    // Setup event handlers
    const clickHandler = (ev) => {
      if (ev.target.closest(".target-lang-menu")) {
        const btn = ev.target.closest("button[data-lang]");
        if (btn) {
          const lang = btn.dataset.lang;
          document.removeEventListener("click", outsideHandler, true);
          return lang;
        } else if (ev.target.closest("[data-cancel]")) {
          menu.remove();
          document.removeEventListener("click", outsideHandler, true);
        }
      }
      return null;
    };

    const outsideHandler = (ev) => {
      if (
        !ev.target.closest(".target-lang-menu") &&
        !ev.target.closest(".target-language")
      ) {
        menu.remove();
        document.removeEventListener("click", outsideHandler, true);
      }
    };

    // Return promise that resolves with selected language
    return new Promise((resolve) => {
      menu.addEventListener("click", (ev) => {
        const lang = clickHandler(ev);
        if (lang) {
          menu.remove();
          resolve(lang);
        }
      });

      setTimeout(
        () => document.addEventListener("click", outsideHandler, true),
        0
      );
    });
  }

  /**
   * Apply new target language to all words
   */
  async applyNewTargetLanguage(lang, onReset) {
    if (this.state.isTranslatingBulk) return;

    this.state.setTranslatingBulk(true);
    document.querySelector(".target-lang-menu")?.remove();
    this.state.clearPendingAdvance();

    this.ui.showAnswerNotification(
      `Translating to ${this.getLanguageName(lang)}...`,
      "skipped"
    );

    try {
      await this.bulkTranslateWords(lang);
      this.state.setTargetLanguage(lang);

      // Reset exercise state for fairness
      this.state.resetExerciseState();

      onReset();
    } catch (e) {
      console.error("Bulk translate failed", e);
      this.ui.showAnswerNotification("Translation failed", "incorrect");
    } finally {
      this.state.setTranslatingBulk(false);

      setTimeout(() => {
        const toast = document.querySelector(".answer-toast");
        if (toast && /Translating/.test(toast.textContent)) toast.remove();
      }, 1200);
    }
  }

  /**
   * Bulk translate all words to target language
   */
  async bulkTranslateWords(targetLang) {
    if (!("Translator" in window)) {
      throw new Error("Translation API not available in this context");
    }

    const translatorCache = new Map(); // sourceLang -> translator

    for (const w of this.state.words) {
      const src = w.sourceLanguage || "auto";
      let translator = translatorCache.get(src);

      if (!translator) {
        translator = await Translator.create({
          sourceLanguage: src,
          targetLanguage: targetLang,
        });
        translatorCache.set(src, translator);
      }

      try {
        const result = await translator.translate(w.original);
        w.translation = result;
        w.targetLanguage = targetLang;
      } catch (e) {
        console.warn("Translation failed for", w.original, e);
      }
    }
  }
}
