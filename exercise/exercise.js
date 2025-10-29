/* Vocabulary Exercise Logic */

import "./exercise.css";
import {
  ExerciseTemplates,
  TemplateUtils,
} from "../templates/template-utils.js";
import { getSettings, DEFAULT_SETTINGS } from "../src/shared/storage.js";
import { ExerciseStateManager } from "./state-manager.js";
import { QuestionGenerator } from "./question-generator.js";
import { UIController } from "./ui-controller.js";
import { NavigationManager } from "./navigation.js";
import { TranslationHandler } from "./translation-handler.js";

class VocabularyExercise {
  constructor() {
    // Initialize modules
    this.state = new ExerciseStateManager();
    this.ui = new UIController();
    this.navigation = new NavigationManager(this.state, this.ui);
    this.translation = new TranslationHandler(this.state, this.ui);

    this.init();
  }

  async init() {
    // Setup event listeners
    this.setupEventListeners();

    // Load exercise settings from storage
    await this.loadExerciseSettings();

    // Load vocabulary language preference
    await this.loadLanguagePreference();

    // Load words from database via background service worker
    await this.loadWords();
  }

  async loadExerciseSettings() {
    try {
      const settings = await getSettings(DEFAULT_SETTINGS);
      const exerciseSettings =
        settings.exerciseSettings || DEFAULT_SETTINGS.exerciseSettings;

      this.state.setQuestionsPerExercise(
        exerciseSettings.questionsPerSession || 10
      );

      if (
        exerciseSettings.difficulty &&
        exerciseSettings.difficulty !== "mixed"
      ) {
        this.state.setDifficulty(exerciseSettings.difficulty);
      }
    } catch (error) {
      console.error("Failed to load exercise settings:", error);
    }
  }

  async loadLanguagePreference() {
    try {
      const stored = await chrome.storage.sync.get([
        "selectedVocabularyLanguage",
      ]);
      if (
        stored.selectedVocabularyLanguage &&
        stored.selectedVocabularyLanguage !== "all"
      ) {
        this.state.setSelectedLanguage(stored.selectedVocabularyLanguage);
      }
    } catch (error) {
      console.error("Failed to load language preference:", error);
    }
  }

  setupEventListeners() {
    // Close button
    document.querySelector(".close-exercise")?.addEventListener("click", () => {
      this.closeExercise();
    });

    // Difficulty selection
    document.querySelectorAll(".difficulty-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".difficulty-btn")
          .forEach((b) => b.classList.remove("active"));
        e.target.closest(".difficulty-btn").classList.add("active");
        this.state.setDifficulty(
          e.target.closest(".difficulty-btn").dataset.difficulty
        );
      });
    });

    // Start exercise
    document
      .querySelector(".start-exercise-btn")
      ?.addEventListener("click", () => {
        this.startExercise();
      });

    // Control buttons
    document.querySelector(".hint-btn")?.addEventListener("click", () => {
      this.showHint();
    });

    document.querySelector(".skip-btn")?.addEventListener("click", () => {
      this.skipQuestion();
    });

    // Continue button in feedback modal
    // Continue button (now only closes hint modal)
    document.querySelector(".continue-btn")?.addEventListener("click", () => {
      this.ui.closeHintModal();
    });

    // Navigation controls (created dynamically if absent)
    let nav = document.querySelector(".nav-controls");
    if (!nav) {
      nav = document.createElement("div");
      nav.className = "nav-controls";
      nav.innerHTML = `
              <button class="prev-question-btn" disabled title="Previous question">‹ Previous</button>
              <button class="next-question-btn" disabled title="Next question">Next ›</button>
            `;
      document.querySelector(".exercise-screen")?.appendChild(nav);
    }
    nav
      .querySelector(".prev-question-btn")
      ?.addEventListener("click", () =>
        this.navigation.goToQuestion(this.state.currentQuestionIndex - 1, () =>
          this.loadQuestion()
        )
      );
    nav
      .querySelector(".next-question-btn")
      ?.addEventListener("click", () =>
        this.navigation.goToQuestion(this.state.currentQuestionIndex + 1, () =>
          this.loadQuestion()
        )
      );

    // Back to difficulty (welcome) mid-session
    document
      .querySelector(".back-to-welcome-btn")
      ?.addEventListener("click", () => {
        this.returnToWelcome();
      });

    // Results actions
    document.querySelector(".retry-btn")?.addEventListener("click", () => {
      // this.resetExercise();
      this.returnToWelcome();
    });

    document
      .querySelector(".close-results-btn")
      ?.addEventListener("click", () => {
        this.closeExercise();
      });

    document
      .querySelector(".close-error-btn")
      ?.addEventListener("click", () => {
        this.closeExercise();
      });

    // No words screen actions
    document
      .querySelector(".close-no-words-btn")
      ?.addEventListener("click", () => {
        this.closeExercise();
      });

    document
      .querySelector(".back-to-filter-btn")
      ?.addEventListener("click", () => {
        this.returnToWelcomeFromNoWords();
      });

    // Target language switch (exercise screen span)
    document
      .querySelector(".target-language")
      ?.addEventListener("click", async (e) => {
        const lang = await this.translation.showTargetLanguageMenu(
          e.currentTarget
        );
        if (lang) {
          await this.translation.applyNewTargetLanguage(lang, () =>
            this.loadQuestion()
          );
        }
      });
  }

  async loadWords() {
    try {
      await this.populateLanguageDropdown();
      await this.loadWordsForLanguage();
    } catch (error) {
      console.error("Error loading Leitner session:", error);
      this.ui.showError("Failed to load words", () => this.closeExercise());
    }
  }

  async loadWordsForLanguage() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "PREPARE_LEITNER_SESSION",
        data: {
          limit: this.state.questionsPerExercise,
          selectedLanguage: this.state.selectedLanguage || null,
        },
      });

      if (!response.success) {
        if (response.error === "no_words_for_language") {
          this.ui.showNoWords(
            `No words are available for the selected language. Try selecting a different language or start saving words in this language.`,
            true,
            () => this.closeExercise(),
            () => this.returnToWelcomeFromNoWords()
          );
        } else if (response.error === "no_words_available") {
          this.ui.showNoWords(
            "You don't have any vocabulary words available for practice yet.",
            false,
            () => this.closeExercise()
          );
        } else {
          console.error("Failed to prepare Leitner session:", response.error);
          this.ui.showError("Failed to prepare session", () =>
            this.closeExercise()
          );
        }
        return;
      }

      const sessionWords = response.words || [];
      if (sessionWords.length === 0) {
        this.ui.showNoWords(
          "You don't have any vocabulary words available for practice yet.",
          false,
          () => this.closeExercise()
        );
        return;
      }

      this.state.setAllWords(
        sessionWords.map((w) => ({
          id: w.id,
          original: w.originalWord,
          translation: w.translatedWord,
          context: w.context || "",
          sourceLanguage: w.sourceLanguage || "auto",
          targetLanguage: w.targetLanguage || "en",
          srs: w.srs,
        }))
      );

      this.state.setWords([...this.state.allWords]);
      
      // Restore the desired count before limiting by available words
      this.state.questionsPerExercise = Math.min(
        this.state.desiredQuestionsPerExercise,
        this.state.words.length
      );

      this.ui.updateExerciseCount(this.state.questionsPerExercise);
      this.ui.updateTotalWords(this.state.words.length);
      this.ui.updateLanguageInfo(
        this.state.selectedLanguage,
        this.state.words.length
      );

      this.ui.showWelcomeScreen(this.state.difficulty);
    } catch (error) {
      console.error("Error loading words for language:", error);
      this.ui.showError("Failed to load words. Please try again.", () =>
        this.closeExercise()
      );
    }
  }

  async populateLanguageDropdown() {
    const select = document.querySelector(".language-filter");
    if (!select) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_AVAILABLE_LANGUAGES",
      });

      if (!response.success) {
        console.error("Failed to get available languages:", response.error);
        return;
      }

      const langs = response.languages || [];

      // Clear existing except first option ("All Languages")
      while (select.options.length > 1) select.remove(1);

      langs.forEach((l) => {
        select.innerHTML += ExerciseTemplates.languageOption(
          l,
          this.ui.getLanguageDisplayName(l)
        );
      });

      // Set the dropdown to the loaded language preference
      if (
        this.state.selectedLanguage &&
        this.state.selectedLanguage !== "all"
      ) {
        const optionExists = Array.from(select.options).some(
          (option) => option.value === this.state.selectedLanguage
        );
        if (optionExists) {
          select.value = this.state.selectedLanguage;
        }
      }

      // Add change listener if not already added
      if (!select.hasAttribute("data-listener-added")) {
        select.addEventListener("change", async () => {
          this.state.setSelectedLanguage(select.value);

          try {
            chrome.storage.sync.set({
              selectedVocabularyLanguage: select.value,
            });
          } catch (error) {
            console.error("Failed to save language preference:", error);
          }

          const languageName = this.state.selectedLanguage
            ? this.ui.getLanguageDisplayName(this.state.selectedLanguage)
            : "all languages";

          this.ui.showLoadingScreen(
            `Loading words for ${languageName}...`,
            "Checking available vocabulary words"
          );

          await this.loadWordsForLanguage();
        });
        select.setAttribute("data-listener-added", "true");
      }
    } catch (error) {
      console.error("Error populating language dropdown:", error);
    }
  }

  startExercise() {
    // Shuffle words and select subset for exercise
    QuestionGenerator.shuffleArray(this.state.words);
    this.state.setWords(
      this.state.words.slice(0, this.state.questionsPerExercise)
    );

    this.state.resetExerciseState();

    this.ui.updateTotalQuestions(this.state.getTotalQuestions());
    this.ui.showExerciseScreen();
    this.loadQuestion();
  }

  loadQuestion() {
    if (this.state.currentQuestionIndex >= this.state.getTotalQuestions()) {
      this.showResults();
      return;
    }

    this.ui.removeExistingToast();
    this.state.hintUsedCurrent = false;

    const currentWord = this.state.getCurrentWord();

    this.ui.updateProgress(
      this.state.currentQuestionIndex,
      this.state.getTotalQuestions()
    );
    this.ui.updateScore(this.state.score);
    this.ui.updateWordDisplay(currentWord, this.state.targetLanguage);

    this.generateAnswerChoices(currentWord);

    if (this.state.isQuestionAnswered(this.state.currentQuestionIndex)) {
      this.navigation.applyAnsweredState();
    } else {
      this.navigation.updateNavButtons();
    }
  }

  generateAnswerChoices(currentWord) {
    const choicesCount = QuestionGenerator.getChoicesCount(
      this.state.difficulty
    );

    // If choices already generated for this question, reuse
    if (this.state.getQuestionChoices(this.state.currentQuestionIndex)) {
      const existing = this.state.getQuestionChoices(
        this.state.currentQuestionIndex
      );
      this.ui.renderChoices(
        existing,
        currentWord.translation,
        (choice, correct) => this.selectAnswer(choice, correct)
      );
      return;
    }

    const choices = QuestionGenerator.generateChoices(
      currentWord,
      this.state.words,
      choicesCount
    );

    this.state.setQuestionChoices(this.state.currentQuestionIndex, [
      ...choices,
    ]);
    this.ui.renderChoices(choices, currentWord.translation, (choice, correct) =>
      this.selectAnswer(choice, correct)
    );
  }

  async selectAnswer(selectedAnswer, correctAnswer) {
    // Guard: if already answered, ignore
    if (this.state.isQuestionAnswered(this.state.currentQuestionIndex)) return;

    const isCorrect =
      selectedAnswer.toLowerCase() === correctAnswer.toLowerCase();

    // Disable all buttons and apply styling
    document.querySelectorAll(".answer-btn").forEach((btn) => {
      btn.classList.add("disabled");

      if (btn.textContent.toLowerCase() === correctAnswer.toLowerCase()) {
        btn.classList.add("correct");
      } else if (btn.textContent === selectedAnswer && !isCorrect) {
        btn.classList.add("incorrect");
      }
    });

    // Update counters
    if (isCorrect) {
      this.state.incrementCorrect();
    } else {
      this.state.incrementIncorrect({
        original: this.state.getCurrentWord().original,
        translation: correctAnswer,
        userAnswer: selectedAnswer,
      });
    }

    // Persist answered state
    this.state.markQuestionAnswered(
      this.state.currentQuestionIndex,
      selectedAnswer,
      isCorrect,
      false
    );

    // Show notification
    if (isCorrect) {
      this.ui.showAnswerNotification("Correct ", "correct");
    } else {
      this.ui.showAnswerNotification(
        `Incorrect. Answer: ${correctAnswer}`,
        "incorrect"
      );
    }

    // Report result to background
    const current = this.state.getCurrentWord();
    try {
      chrome.runtime.sendMessage({
        type: "WORD_RESULT",
        data: {
          id: current.id,
          correct: isCorrect,
          usedHint: this.state.hintUsedCurrent,
          skipped: false,
        },
      });
    } catch (e) {
      console.warn("Failed to send WORD_RESULT", e);
    }

    // Auto advance
    this.navigation.scheduleAutoAdvance(isCorrect ? 900 : 1400, () =>
      this.nextQuestion()
    );
    this.navigation.updateNavButtons();
  }

  showHint() {
    // If already answered, ignore
    if (this.state.isQuestionAnswered(this.state.currentQuestionIndex)) return;

    const currentWord = this.state.getCurrentWord();
    const firstLetter = currentWord.translation.charAt(0);
    const hint = `The translation starts with "${firstLetter}" and has ${currentWord.translation.length} letters.`;

    this.ui.showHintModal(hint);
    this.state.setHintUsed();
  }

  skipQuestion() {
    if (this.state.isQuestionAnswered(this.state.currentQuestionIndex)) return;

    const currentWord = this.state.getCurrentWord();

    this.state.incrementSkipped({
      original: currentWord.original,
      translation: currentWord.translation,
      userAnswer: "Skipped",
    });

    // Report skip to SRS
    try {
      chrome.runtime.sendMessage({
        type: "WORD_RESULT",
        data: {
          id: currentWord.id,
          correct: false,
          usedHint: false,
          skipped: true,
        },
      });
    } catch (e) {
      console.warn("Failed to send skip WORD_RESULT", e);
    }

    this.state.markQuestionAnswered(
      this.state.currentQuestionIndex,
      null,
      false,
      true
    );

    this.ui.showAnswerNotification(
      `Skipped. Correct: ${currentWord.translation}`,
      "skipped"
    );

    this.navigation.scheduleAutoAdvance(1000, () => this.nextQuestion());
    this.navigation.updateNavButtons();
  }

  nextQuestion() {
    this.navigation.nextQuestion(
      () => this.loadQuestion(),
      () => this.showResults()
    );
  }

  showResults() {
    this.ui.updateResults(this.state);
    this.ui.showResultsScreen();
    this.saveExerciseStats();
  }

  async saveExerciseStats() {
    try {
      const exerciseData = this.state.getExerciseData();

      try {
        const response = await chrome.runtime.sendMessage({
          type: "EXERCISE_COMPLETED",
          data: {
            score: this.state.score,
            percentage: this.state.getPercentage(),
            timestamp: Date.now(),
          },
        });
      } catch (error) {
        console.error("Failed to report exercise completion:", error);
      }
    } catch (error) {
      console.error("Failed to save exercise statistics:", error);
    }
  }

  closeExercise() {
    if (window.opener) {
      window.close();
    } else {
      try {
        chrome.tabs.getCurrent((tab) => {
          chrome.tabs.remove(tab.id);
        });
      } catch (error) {
        document.querySelector(".exercise-container").style.display = "none";
        document.body.innerHTML =
          '<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;"><h2>Exercise Completed</h2><p>You can close this tab now.</p></div>';
      }
    }
  }

  returnToWelcome() {
    this.state.clearPendingAdvance();
    this.state.resetExerciseState();

    this.ui.updateProgress(0, 0);
    this.ui.updateScore(0);
    this.ui.showWelcomeScreen();
  }

  returnToWelcomeFromNoWords() {
    const languageSelect = document.querySelector(".language-filter");
    if (languageSelect) {
      languageSelect.value = "";
      this.state.setSelectedLanguage("");

      try {
        chrome.storage.sync.set({ selectedVocabularyLanguage: "all" });
      } catch (error) {
        console.error("Failed to save language reset preference:", error);
      }
    }

    this.ui.showLoadingScreen(
      "Loading words for all languages...",
      "Checking available vocabulary words"
    );

    this.loadWordsForLanguage();
  }
}

// Initialize exercise when page loads
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    window.exercise = new VocabularyExercise();
  }, 100);
});

// Make exercise globally available for debugging
window.VocabularyExercise = VocabularyExercise;
