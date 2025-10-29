/**
 * Navigation Manager
 * Handles question navigation and state transitions
 */

export class NavigationManager {
  constructor(state, ui) {
    this.state = state;
    this.ui = ui;
  }

  /**
   * Navigate to a specific question by index
   */
  goToQuestion(index, onQuestionLoad) {
    if (index < 0 || index >= this.state.getTotalQuestions()) return;

    this.state.clearPendingAdvance();
    this.state.setCurrentQuestion(index);
    onQuestionLoad();
  }

  /**
   * Advance to the next question
   */
  nextQuestion(onQuestionLoad, onShowResults) {
    const nextIndex = this.state.currentQuestionIndex + 1;

    if (nextIndex >= this.state.getTotalQuestions()) {
      onShowResults();
    } else {
      this.state.setCurrentQuestion(nextIndex);
      onQuestionLoad();
    }
  }

  /**
   * Apply answered state to UI (when revisiting answered questions)
   */
  applyAnsweredState() {
    const answerState = this.state.getQuestionAnswer(
      this.state.currentQuestionIndex
    );
    const currentWord = this.state.getCurrentWord();
    const correctAnswer = currentWord.translation;

    this.ui.applyAnsweredStateToChoices(
      answerState.selected,
      correctAnswer,
      answerState.correct,
      answerState.skipped
    );

    this.state.clearPendingAdvance();
    this.updateNavButtons();
  }

  /**
   * Update navigation button states
   */
  updateNavButtons() {
    const isAnswered = this.state.isQuestionAnswered(
      this.state.currentQuestionIndex
    );

    this.ui.updateNavButtons(
      this.state.currentQuestionIndex,
      this.state.getTotalQuestions(),
      isAnswered
    );
  }

  /**
   * Schedule auto-advance to next question
   */
  scheduleAutoAdvance(delayMs, onNextQuestion) {
    this.state.clearPendingAdvance();

    const timeoutId = setTimeout(() => {
      onNextQuestion();
    }, delayMs);

    this.state.setPendingAdvance(timeoutId);
  }
}
