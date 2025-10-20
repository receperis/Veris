/**
 * Chrome Translator API Language Availability Tester
 *
 * This script tests the availability of language pairs using Chrome's built-in Translator API.
 * It extracts the language definitions from your repository and tests each pair.
 *
 * Usage:
 * 1. Open this file in Chrome 138+ with Translator API enabled
 * 2. Run in browser console or use the HTML test interface
 *
 * Note: This API is Chrome-specific and requires Chrome 138+ with the feature enabled.
 */

// Import language data from the repository
import { LANGUAGE_NAMES, COMMON_LANGUAGES } from "./src/shared/languages.js";

class LanguageAvailabilityTester {
  constructor() {
    this.results = new Map();
    this.testProgress = { completed: 0, total: 0 };
    this.onProgress = null;
    this.onComplete = null;
  }

  /**
   * Test availability of a specific language pair
   * @param {string} sourceCode - Source language code
   * @param {string} targetCode - Target language code
   * @returns {Promise<object>} Test result object
   */
  async testLanguagePair(sourceCode, targetCode) {
    if (!("Translator" in globalThis)) {
      return {
        sourceCode,
        targetCode,
        sourceName: LANGUAGE_NAMES[sourceCode] || sourceCode,
        targetName: LANGUAGE_NAMES[targetCode] || targetCode,
        status: "unavailable",
        error: "Translator API not available in this environment",
        timestamp: new Date().toISOString(),
      };
    }

    try {
      console.log(`Testing ${sourceCode} → ${targetCode}...`);

      // Test availability
      const availability = await Translator.availability({
        sourceLanguage: sourceCode,
        targetLanguage: targetCode,
      });

      const result = {
        sourceCode,
        targetCode,
        sourceName: LANGUAGE_NAMES[sourceCode] || sourceCode,
        targetName: LANGUAGE_NAMES[targetCode] || targetCode,
        status: availability,
        timestamp: new Date().toISOString(),
      };

      // If available, test actual translation
      if (availability === "available") {
        try {
          const translator = await Translator.create({
            sourceLanguage: sourceCode,
            targetLanguage: targetCode,
          });

          // Test with a simple phrase
          const testText = this.getTestText(sourceCode);
          const translation = await translator.translate(testText);

          result.translationTest = {
            input: testText,
            output: translation,
            success: true,
          };

          // Clean up translator instance
          if (translator.destroy) {
            translator.destroy();
          }
        } catch (translationError) {
          result.translationTest = {
            input: this.getTestText(sourceCode),
            success: false,
            error: translationError.message,
          };
        }
      }

      return result;
    } catch (error) {
      return {
        sourceCode,
        targetCode,
        sourceName: LANGUAGE_NAMES[sourceCode] || sourceCode,
        targetName: LANGUAGE_NAMES[targetCode] || targetCode,
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get appropriate test text for a language
   * @param {string} langCode - Language code
   * @returns {string} Test text
   */
  getTestText(langCode) {
    const testTexts = {
      en: "Hello world",
      es: "Hola mundo",
      fr: "Bonjour le monde",
      de: "Hallo Welt",
      it: "Ciao mondo",
      pt: "Olá mundo",
      ru: "Привет мир",
      ja: "こんにちは世界",
      ko: "안녕하세요 세계",
      zh: "你好世界",
      ar: "مرحبا بالعالم",
      hi: "नमस्ते दुनिया",
    };

    return testTexts[langCode] || "Hello world";
  }

  /**
   * Test all common language pairs
   * @param {Array<string>} sourceLanguages - Source languages to test
   * @param {Array<string>} targetLanguages - Target languages to test
   * @returns {Promise<Map>} Results map
   */
  async testLanguagePairs(
    sourceLanguages = COMMON_LANGUAGES,
    targetLanguages = COMMON_LANGUAGES
  ) {
    this.results.clear();

    // Calculate total number of tests (excluding same-language pairs)
    this.testProgress.total = sourceLanguages.length * targetLanguages.length;
    this.testProgress.completed = 0;

    console.log(
      `Starting language availability test for ${this.testProgress.total} pairs...`
    );
    console.log(
      `Source languages (${sourceLanguages.length}):`,
      sourceLanguages
    );
    console.log(
      `Target languages (${targetLanguages.length}):`,
      targetLanguages
    );

    for (const sourceCode of sourceLanguages) {
      for (const targetCode of targetLanguages) {
        // Skip same language pairs (except auto-detect)
        if (sourceCode === targetCode && sourceCode !== "auto") {
          this.testProgress.completed++;
          if (this.onProgress) {
            this.onProgress(this.testProgress);
          }
          continue;
        }

        const result = await this.testLanguagePair(sourceCode, targetCode);
        const pairKey = `${sourceCode}-${targetCode}`;
        this.results.set(pairKey, result);

        this.testProgress.completed++;

        if (this.onProgress) {
          this.onProgress(this.testProgress);
        }

        // Small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    console.log("Language availability testing completed!");

    if (this.onComplete) {
      this.onComplete(this.results);
    }

    return this.results;
  }

  /**
   * Test a sample of popular language pairs
   * @returns {Promise<Map>} Results map
   */
  async testSamplePairs() {
    const popularLanguages = [
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
    ];
    return this.testLanguagePairs(popularLanguages, popularLanguages);
  }

  /**
   * Get test statistics
   * @returns {object} Statistics object
   */
  getStatistics() {
    const stats = {
      total: this.results.size,
      available: 0,
      downloadable: 0,
      unavailable: 0,
      error: 0,
      translationTestsPassed: 0,
      translationTestsFailed: 0,
    };

    for (const result of this.results.values()) {
      stats[result.status] = (stats[result.status] || 0) + 1;

      if (result.translationTest) {
        if (result.translationTest.success) {
          stats.translationTestsPassed++;
        } else {
          stats.translationTestsFailed++;
        }
      }
    }

    stats.successRate =
      stats.total > 0 ? ((stats.available / stats.total) * 100).toFixed(1) : 0;

    return stats;
  }

  /**
   * Export results in various formats
   * @param {string} format - Export format ('json', 'csv', 'markdown')
   * @returns {string} Formatted results
   */
  exportResults(format = "json") {
    const resultsArray = Array.from(this.results.values());

    switch (format) {
      case "json":
        return JSON.stringify(resultsArray, null, 2);

      case "csv":
        const headers = [
          "Source Code",
          "Target Code",
          "Source Name",
          "Target Name",
          "Status",
          "Error",
          "Test Input",
          "Test Output",
          "Test Success",
          "Timestamp",
        ];
        const rows = resultsArray.map((result) => [
          result.sourceCode,
          result.targetCode,
          result.sourceName,
          result.targetName,
          result.status,
          result.error || "",
          result.translationTest?.input || "",
          result.translationTest?.output || "",
          result.translationTest?.success || "",
          result.timestamp,
        ]);

        return [headers, ...rows]
          .map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
          )
          .join("\n");

      case "markdown":
        const stats = this.getStatistics();
        let markdown = `# Chrome Translator API Language Availability Test Results\n\n`;
        markdown += `**Test Date:** ${new Date().toISOString()}\n\n`;
        markdown += `## Summary Statistics\n\n`;
        markdown += `- **Total Pairs Tested:** ${stats.total}\n`;
        markdown += `- **Available:** ${stats.available}\n`;
        markdown += `- **Downloadable:** ${stats.downloadable}\n`;
        markdown += `- **Unavailable:** ${stats.unavailable}\n`;
        markdown += `- **Errors:** ${stats.error}\n`;
        markdown += `- **Success Rate:** ${stats.successRate}%\n\n`;

        markdown += `## Detailed Results\n\n`;
        markdown += `| Source | Target | Status | Translation Test | Error |\n`;
        markdown += `|--------|--------|--------|------------------|-------|\n`;

        for (const result of resultsArray) {
          const testResult = result.translationTest
            ? result.translationTest.success
              ? "✅ Passed"
              : "❌ Failed"
            : "—";

          markdown += `| ${result.sourceName} (${result.sourceCode}) | ${
            result.targetName
          } (${result.targetCode}) | ${result.status} | ${testResult} | ${
            result.error || ""
          } |\n`;
        }

        return markdown;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Print a summary report to console
   */
  printSummary() {
    const stats = this.getStatistics();

    console.log(
      "\n=== Chrome Translator API Language Availability Test Results ==="
    );
    console.log(`Test Date: ${new Date().toISOString()}`);
    console.log(`\nSummary Statistics:`);
    console.log(`- Total Pairs Tested: ${stats.total}`);
    console.log(`- Available: ${stats.available}`);
    console.log(`- Downloadable: ${stats.downloadable}`);
    console.log(`- Unavailable: ${stats.unavailable}`);
    console.log(`- Errors: ${stats.error}`);
    console.log(`- Success Rate: ${stats.successRate}%`);

    if (stats.translationTestsPassed > 0 || stats.translationTestsFailed > 0) {
      console.log(`\nTranslation Tests:`);
      console.log(`- Passed: ${stats.translationTestsPassed}`);
      console.log(`- Failed: ${stats.translationTestsFailed}`);
    }

    // Show some example successful pairs
    const successfulPairs = Array.from(this.results.values())
      .filter((r) => r.status === "available")
      .slice(0, 10);

    if (successfulPairs.length > 0) {
      console.log(`\nExample Successful Pairs:`);
      successfulPairs.forEach((result) => {
        const testInfo = result.translationTest
          ? ` (Test: "${result.translationTest.input}" → "${result.translationTest.output}")`
          : "";
        console.log(`- ${result.sourceName} → ${result.targetName}${testInfo}`);
      });
    }

    // Show errors if any
    const errorResults = Array.from(this.results.values())
      .filter((r) => r.status === "error")
      .slice(0, 5);

    if (errorResults.length > 0) {
      console.log(`\nExample Errors:`);
      errorResults.forEach((result) => {
        console.log(
          `- ${result.sourceName} → ${result.targetName}: ${result.error}`
        );
      });
    }
  }
}

// Usage examples for browser console:
/*

// Create tester instance
const tester = new LanguageAvailabilityTester();

// Test sample language pairs
await tester.testSamplePairs();
tester.printSummary();

// Test all common language pairs (this will take longer)
await tester.testLanguagePairs();

// Export results
console.log(tester.exportResults('json'));

// Test a specific pair
const result = await tester.testLanguagePair('en', 'es');
console.log(result);

*/

// Export for use in browser
if (typeof window !== "undefined") {
  window.LanguageAvailabilityTester = LanguageAvailabilityTester;
}

export default LanguageAvailabilityTester;
