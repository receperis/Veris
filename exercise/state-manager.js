/**
 * Exercise State Manager
 * Centralized state management for vocabulary exercises
 */

export class ExerciseStateManager {
  constructor() {
    this.reset();
  }

  reset() {
    // Question tracking
    this.currentQuestionIndex = 0;
    this.answeredMap = new Map(); // questionIndex -> { selected, correct, skipped }
    this.choiceMap = new Map(); // questionIndex -> array of choices in order

    // Score management
    this.score = 0;
    this.correctAnswers = 0;
    this.incorrectAnswers = 0;
    this.skippedAnswers = 0;
    this.incorrectWords = [];

    // Navigation state
    this.pendingAdvance = null;
    this.hintUsedCurrent = false;

    // Data state
    this.words = [];
    this.allWords = [];

    // Settings state
    this.difficulty = "medium";
    this.questionsPerExercise = 10;
    this.userPreferredQuestions = 10; // User's original preference, never reduced
    this.selectedLanguage = "";
    this.targetLanguage = null;
    this.isTranslatingBulk = false;

    // Timing
    this.startTime = Date.now();
  }

  // Question tracking methods
  setCurrentQuestion(index) {
    this.currentQuestionIndex = index;
    this.hintUsedCurrent = false;
  }

  markQuestionAnswered(index, selected, correct, skipped = false) {
    this.answeredMap.set(index, { selected, correct, skipped });
  }

  isQuestionAnswered(index) {
    return this.answeredMap.has(index);
  }

  getQuestionAnswer(index) {
    return this.answeredMap.get(index);
  }

  setQuestionChoices(index, choices) {
    this.choiceMap.set(index, choices);
  }

  getQuestionChoices(index) {
    return this.choiceMap.get(index);
  }

  // Score methods
  incrementCorrect(points = 10) {
    this.correctAnswers++;
    this.score += points;
  }

  incrementIncorrect(word) {
    this.incorrectAnswers++;
    if (word) {
      this.incorrectWords.push(word);
    }
  }

  incrementSkipped(word) {
    this.skippedAnswers++;
    if (word) {
      this.incorrectWords.push(word);
    }
  }

  // Navigation methods
  setPendingAdvance(timeoutId) {
    this.pendingAdvance = timeoutId;
  }

  clearPendingAdvance() {
    if (this.pendingAdvance) {
      clearTimeout(this.pendingAdvance);
      this.pendingAdvance = null;
    }
  }

  setHintUsed() {
    this.hintUsedCurrent = true;
  }

  // Words methods
  setWords(words) {
    this.words = words;
  }

  setAllWords(words) {
    this.allWords = words;
  }

  getCurrentWord() {
    return this.words[this.currentQuestionIndex];
  }

  getTotalQuestions() {
    return this.words.length;
  }

  // Settings methods
  setDifficulty(difficulty) {
    this.difficulty = difficulty;
  }

  setQuestionsPerExercise(count) {
    this.questionsPerExercise = count;
  }

  getQuestionsPerExercise() {
    return this.questionsPerExercise;
  }

  setUserPreferredQuestions(count) {
    this.userPreferredQuestions = count;
  }

  getUserPreferredQuestions() {
    return this.userPreferredQuestions;
  }

  setSelectedLanguage(language) {
    this.selectedLanguage = language;
  }

  setTargetLanguage(language) {
    this.targetLanguage = language;
  }

  setTranslatingBulk(isTranslating) {
    this.isTranslatingBulk = isTranslating;
  }

  // Statistics methods
  getPercentage() {
    return this.words.length > 0
      ? Math.round((this.correctAnswers / this.words.length) * 100)
      : 0;
  }

  getDuration() {
    return Date.now() - this.startTime;
  }

  getExerciseData() {
    return {
      timestamp: new Date().toISOString(),
      type: "vocabulary_exercise",
      difficulty: this.difficulty,
      totalQuestions: this.words.length,
      correctAnswers: this.correctAnswers,
      incorrectAnswers: this.incorrectAnswers,
      skippedAnswers: this.skippedAnswers,
      score: this.score,
      percentage: this.getPercentage(),
      duration: this.getDuration(),
      incorrectWords: this.incorrectWords,
    };
  }

  // Utility methods
  resetExerciseState() {
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.correctAnswers = 0;
    this.incorrectAnswers = 0;
    this.skippedAnswers = 0;
    this.incorrectWords = [];
    this.answeredMap.clear();
    this.choiceMap.clear();
    this.clearPendingAdvance();
    this.startTime = Date.now();
  }
}
