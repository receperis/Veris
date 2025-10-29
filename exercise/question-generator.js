/**
 * Question Generator
 * Handles question generation and answer choice creation
 */

export class QuestionGenerator {
  /**
   * Generate answer choices for a given word
   * @param {Object} currentWord - The word object with translation
   * @param {Array} allWords - All available words for wrong choices
   * @param {number} choicesCount - Number of choices to generate
   * @returns {Array} Array of answer choices
   */
  static generateChoices(currentWord, allWords, choicesCount) {
    const choices = [currentWord.translation]; // Correct answer

    // Get other words for wrong choices
    const otherWords = allWords
      .filter(
        (w) =>
          w.translation.toLowerCase() !== currentWord.translation.toLowerCase()
      )
      .map((w) => w.translation);

    // Add random wrong choices
    while (choices.length < choicesCount && otherWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * otherWords.length);
      const wrongChoice = otherWords.splice(randomIndex, 1)[0];

      if (!choices.includes(wrongChoice)) {
        choices.push(wrongChoice);
      }
    }

    // If we don't have enough choices from our vocabulary, add some generic ones
    if (choices.length < choicesCount) {
      const genericChoices = [
        "example",
        "sample",
        "test",
        "word",
        "translation",
      ];
      for (const generic of genericChoices) {
        if (choices.length >= choicesCount) break;
        if (
          !choices.includes(generic) &&
          generic !== currentWord.translation.toLowerCase()
        ) {
          choices.push(generic);
        }
      }
    }

    // Shuffle choices
    this.shuffleArray(choices);
    return choices;
  }

  /**
   * Get number of choices based on difficulty
   * @param {string} difficulty - easy, medium, or hard
   * @returns {number} Number of choices
   */
  static getChoicesCount(difficulty) {
    switch (difficulty) {
      case "easy":
        return 3;
      case "medium":
        return 4;
      case "hard":
        return 5;
      default:
        return 4;
    }
  }

  /**
   * Shuffle array in place (Fisher-Yates algorithm)
   * @param {Array} array - Array to shuffle
   * @returns {Array} The shuffled array (same reference)
   */
  static shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
