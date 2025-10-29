/**
 * UI Controller
 * Handles all UI updates and screen transitions
 */

import {
  ExerciseTemplates,
  TemplateUtils,
} from "../templates/template-utils.js";

export class UIController {
  constructor() {
    this.NAME_MAP = {
      en: "English",
      es: "Spanish",
      de: "German",
      fr: "French",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      sv: "Swedish",
      tr: "Turkish",
      ar: "Arabic",
      nl: "Dutch",
      pl: "Polish",
      cs: "Czech",
      da: "Danish",
      fi: "Finnish",
      el: "Greek",
      he: "Hebrew",
      hi: "Hindi",
      no: "Norwegian",
      ro: "Romanian",
      uk: "Ukrainian",
      hu: "Hungarian",
    };
  }

  // Screen transition methods
  showWelcomeScreen(difficulty = null) {
    this.hideAllScreens();
    document.querySelector(".welcome-screen").style.display = "block";

    if (difficulty) {
      this.updateDifficultySelection(difficulty);
    }
  }

  showLoadingScreen(
    message = "Preparing your vocabulary exercise...",
    description = "Fetching your saved words and creating flashcards"
  ) {
    this.hideAllScreens();

    const title = document.querySelector(".loading-title");
    const desc = document.querySelector(".loading-description");
    if (title) title.textContent = message;
    if (desc) desc.textContent = description;

    document.querySelector(".loading-screen").style.display = "block";
  }

  showExerciseScreen() {
    this.hideAllScreens();
    document.querySelector(".exercise-screen").style.display = "block";

    const midActions = document.querySelector(".mid-exercise-actions");
    if (midActions) midActions.style.display = "block";
  }

  showResultsScreen() {
    this.hideAllScreens();
    document.querySelector(".results-screen").style.display = "block";

    const midActions = document.querySelector(".mid-exercise-actions");
    if (midActions) midActions.style.display = "none";
  }

  showError(message, onClose) {
    this.hideAllScreens();
    document.querySelector(".error-screen").style.display = "block";

    const errorScreen = document.querySelector(".error-screen");
    if (errorScreen) {
      errorScreen.innerHTML = ExerciseTemplates.errorContent(message);
      const closeBtn = errorScreen.querySelector(".close-error-btn");
      if (closeBtn && onClose) {
        closeBtn.addEventListener("click", onClose);
      }
    }
  }

  showNoWords(message, showLanguageFilter = false, onClose, onBackToFilter) {
    this.hideAllScreens();

    const noWordsScreen = document.querySelector(".no-words-screen");
    noWordsScreen.style.display = "block";
    noWordsScreen.innerHTML = ExerciseTemplates.noWordsContent(
      message,
      showLanguageFilter
    );

    // Re-attach event listeners
    const closeBtn = noWordsScreen.querySelector(".close-no-words-btn");
    if (closeBtn && onClose) {
      closeBtn.addEventListener("click", onClose);
    }

    const backToFilterBtn = noWordsScreen.querySelector(".back-to-filter-btn");
    if (backToFilterBtn && onBackToFilter) {
      backToFilterBtn.addEventListener("click", onBackToFilter);
    }
  }

  hideAllScreens() {
    document.querySelector(".loading-screen").style.display = "none";
    document.querySelector(".no-words-screen").style.display = "none";
    document.querySelector(".error-screen").style.display = "none";
    document.querySelector(".exercise-screen").style.display = "none";
    document.querySelector(".results-screen").style.display = "none";
    document.querySelector(".welcome-screen").style.display = "none";
  }

  // Progress update methods
  updateProgress(currentIndex, totalQuestions) {
    document.querySelector(".current-question").textContent = currentIndex + 1;
    const progressPercent = (currentIndex / totalQuestions) * 100;
    document.querySelector(
      ".progress-fill"
    ).style.width = `${progressPercent}%`;
  }

  updateScore(score) {
    document.querySelector(".current-score").textContent = score;
  }

  updateTotalQuestions(total) {
    document.querySelector(".total-questions").textContent = total;
  }

  // Word display methods
  updateWordDisplay(word, targetLanguage) {
    document.querySelector(".word-display").textContent = word.original;
    document.querySelector(".context-text").textContent =
      word.context || "No context available";
    document.querySelector(".source-language").textContent =
      word.sourceLanguage.toUpperCase();
    document.querySelector(".target-language").textContent = (
      targetLanguage ||
      word.targetLanguage ||
      "EN"
    ).toUpperCase();
  }

  // Choice rendering methods
  renderChoices(choices, correctAnswer, onClickHandler) {
    const choicesContainer = document.querySelector(".answer-choices");
    choicesContainer.innerHTML = "";

    choices.forEach((choice) => {
      const buttonHTML = ExerciseTemplates.answerChoice(choice, correctAnswer);
      const button = TemplateUtils.createElement(buttonHTML);
      button.addEventListener("click", () =>
        onClickHandler(choice, correctAnswer)
      );
      choicesContainer.appendChild(button);
    });
  }

  applyAnsweredStateToChoices(
    selectedAnswer,
    correctAnswer,
    isCorrect,
    skipped
  ) {
    document.querySelectorAll(".answer-btn").forEach((btn) => {
      btn.classList.add("disabled");

      // Always highlight the correct answer in green
      if (
        btn.textContent.toLowerCase().trim() ===
        correctAnswer.toLowerCase().trim()
      ) {
        btn.classList.add("correct");
      }

      // If user selected a wrong answer, highlight it in red
      if (
        !skipped &&
        !isCorrect &&
        selectedAnswer &&
        btn.textContent.trim() === selectedAnswer.trim()
      ) {
        btn.classList.add("incorrect");
      }
    });
  }

  // Language info methods
  updateLanguageInfo(selectedLanguage, wordCount) {
    const info = document.querySelector(".language-available-count");
    if (info) {
      if (selectedLanguage) {
        const pretty = this.getLanguageDisplayName(selectedLanguage);
        info.textContent = `Filtered: ${wordCount} words in ${pretty}`;
      } else {
        info.textContent = "Showing all languages";
      }
    }
  }

  updateExerciseCount(count) {
    document.getElementById("exercise-count").textContent = count;
  }

  updateTotalWords(count) {
    const totalEl = document.getElementById("total-words");
    if (totalEl) totalEl.textContent = count;
  }

  // Difficulty methods
  updateDifficultySelection(difficulty) {
    document.querySelectorAll(".difficulty-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    const targetBtn = document.querySelector(
      `[data-difficulty="${difficulty}"]`
    );
    if (targetBtn) {
      targetBtn.classList.add("active");
    } else {
      const mediumBtn = document.querySelector('[data-difficulty="medium"]');
      if (mediumBtn) {
        mediumBtn.classList.add("active");
      }
    }
  }

  // Results methods
  updateResults(state) {
    const percentage = state.getPercentage();

    document.querySelector(".score-percentage").textContent = `${percentage}%`;
    document.querySelector(
      ".score-fraction"
    ).textContent = `${state.correctAnswers}/${state.words.length}`;
    document.querySelector(".correct-count").textContent = state.correctAnswers;
    document.querySelector(".incorrect-count").textContent =
      state.incorrectAnswers;
    document.querySelector(".skipped-count").textContent = state.skippedAnswers;

    // Update score circle color based on performance
    const scoreCircle = document.querySelector(".score-circle");
    if (percentage >= 80) {
      scoreCircle.style.background =
        "linear-gradient(135deg, #10b981 0%, #34d399 100%)";
    } else if (percentage >= 60) {
      scoreCircle.style.background =
        "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)";
    } else {
      scoreCircle.style.background =
        "linear-gradient(135deg, #ef4444 0%, #f87171 100%)";
    }

    // Show words to review if there are any incorrect
    if (state.incorrectWords.length > 0) {
      const reviewSection = document.querySelector(".words-to-review");
      const reviewList = document.querySelector(".review-words-list");

      reviewList.innerHTML = "";
      state.incorrectWords.forEach((word) => {
        reviewList.innerHTML += ExerciseTemplates.reviewWordItem(word);
      });

      reviewSection.style.display = "block";
    }

    // Update progress to 100%
    document.querySelector(".progress-fill").style.width = "100%";
  }

  // Toast notification methods
  showAnswerNotification(message, type) {
    TemplateUtils.removeElements("answer-toast");

    const toast = TemplateUtils.createElement(
      ExerciseTemplates.answerToast(message, type)
    );
    document.body.prepend(toast);

    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    const timeout = type === "incorrect" ? 2600 : 2000;
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 240);
    }, timeout);
  }

  removeExistingToast() {
    const existingToast = document.querySelector(".answer-toast");
    if (existingToast) existingToast.remove();
  }

  // Hint modal methods
  showHintModal(hint) {
    const modal = document.querySelector(".feedback-modal");
    const icon = document.querySelector(".feedback-icon");
    const message = document.querySelector(".feedback-message");
    const details = document.querySelector(".feedback-details");

    icon.textContent = "💡";
    message.textContent = "Hint";
    details.textContent = hint;
    message.style.color = "#4f46e5";

    modal.style.display = "flex";
  }

  closeHintModal() {
    const modal = document.querySelector(".feedback-modal");
    if (modal) modal.style.display = "none";
  }

  // Navigation button methods
  updateNavButtons(currentIndex, totalQuestions, isAnswered) {
    const prevBtn = document.querySelector(".prev-question-btn");
    const nextBtn = document.querySelector(".next-question-btn");

    if (!prevBtn || !nextBtn) return;

    prevBtn.disabled = currentIndex === 0;
    const atLast = currentIndex === totalQuestions - 1;
    nextBtn.disabled = !isAnswered || atLast;
  }

  // Language display helper
  getLanguageDisplayName(code) {
    return this.NAME_MAP[code] || code.toUpperCase();
  }
}
