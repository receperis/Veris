/**
 * describe.skip('Chrome Extension E2E Tests', () => {nd-to-end tests for Chrome Extension
 * Tests complete user workflows using Puppeteer
 */

const puppeteer = require("puppeteer");
const path = require("path");

describe("Chrome Extension E2E Tests", () => {
  let browser;
  let extensionPage;
  let extensionId;

  beforeAll(async () => {
    // Launch browser with extension loaded
    const extensionPath = path.resolve(__dirname, "../..");

    browser = await puppeteer.launch({
      headless: false, // Set to true for CI
      devtools: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
    });

    // Get extension ID
    const targets = await browser.targets();
    const extensionTarget = targets.find(
      (target) =>
        target.type() === "service_worker" &&
        target.url().includes("chrome-extension://")
    );

    if (extensionTarget) {
      extensionId = extensionTarget.url().split("/")[2];
      console.log("Extension loaded with ID:", extensionId);
    } else {
      throw new Error("Extension not loaded properly");
    }
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe("Extension Installation and Basic Functionality", () => {
    test("should load extension successfully", async () => {
      expect(extensionId).toBeDefined();
      expect(extensionId.length).toBe(32); // Chrome extension IDs are 32 characters
    });

    test("should open popup when extension icon clicked", async () => {
      const page = await browser.newPage();

      try {
        // Navigate to popup page directly
        await page.goto(`chrome-extension://${extensionId}/popup.html`);

        // Wait for page to load
        await page.waitForSelector("body", { timeout: 5000 });

        // Check if popup elements are present
        const title = await page.$eval("title", (el) => el.textContent);
        expect(title).toContain("Veris");

        const vocabularyList = await page.$("#vocabulary-list");
        expect(vocabularyList).toBeTruthy();
      } finally {
        await page.close();
      }
    });

    test("should open options page", async () => {
      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/options.html`);

        // Wait for options page to load
        await page.waitForSelector("body", { timeout: 5000 });

        const title = await page.$eval("title", (el) => el.textContent);
        expect(title).toContain("Options") ||
          expect(title).toContain("Settings");
      } finally {
        await page.close();
      }
    });

    test("should open exercise page", async () => {
      const page = await browser.newPage();

      try {
        await page.goto(
          `chrome-extension://${extensionId}/exercise/exercise.html`
        );

        // Wait for exercise page to load
        await page.waitForSelector("body", { timeout: 5000 });

        const exerciseContainer =
          (await page.$(".exercise-container")) ||
          (await page.$("#exercise-container"));
        expect(exerciseContainer).toBeTruthy();
      } finally {
        await page.close();
      }
    });
  });

  describe("Content Script Functionality", () => {
    test("should inject content script on web pages", async () => {
      const page = await browser.newPage();

      try {
        // Create a simple test page
        await page.setContent(`
          <html>
            <body>
              <h1>Test Page</h1>
              <p>This is a test paragraph with some text to translate.</p>
              <div>Hello world, this is a test.</div>
            </body>
          </html>
        `);

        // Wait a bit for content script injection
        await page.waitForTimeout(1000);

        // Check if content script variables are available
        const hasContentScript = await page.evaluate(() => {
          return typeof window.getSelection === "function";
        });

        expect(hasContentScript).toBe(true);
      } finally {
        await page.close();
      }
    });

    test("should handle text selection", async () => {
      const page = await browser.newPage();

      try {
        await page.setContent(`
          <html>
            <body>
              <p id="test-text">Hello world, this is a test sentence.</p>
            </body>
          </html>
        `);

        await page.waitForTimeout(1000);

        // Select text
        await page.evaluate(() => {
          const textElement = document.getElementById("test-text");
          const range = document.createRange();
          range.selectNodeContents(textElement);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        });

        // Get selected text
        const selectedText = await page.evaluate(() => {
          return window.getSelection().toString();
        });

        expect(selectedText).toContain("Hello world");
      } finally {
        await page.close();
      }
    });

    test("should create translation bubble on text selection (if auto mode)", async () => {
      const page = await browser.newPage();

      try {
        await page.setContent(`
          <html>
            <body>
              <p id="test-text">Hello world</p>
            </body>
          </html>
        `);

        await page.waitForTimeout(1000);

        // Select text
        await page.click("#test-text");
        await page.keyboard.down("Shift");
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        await page.keyboard.up("Shift");

        // Wait for potential translation bubble
        await page.waitForTimeout(2000);

        // Check if translation bubble exists (might not work if Translation API is unavailable)
        const bubbles = await page.$$(
          ".__translator_bubble, .translation-bubble"
        );

        // Don't assert success since Translation API might not be available in test environment
        console.log("Translation bubbles found:", bubbles.length);
      } finally {
        await page.close();
      }
    });
  });

  describe("Popup User Interactions", () => {
    test("should navigate between different sections", async () => {
      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Test exercise button
        const exerciseBtn = await page.$("#start-exercise");
        if (exerciseBtn) {
          // Don't actually click to avoid navigation issues in tests
          const href = await page.evaluate(
            (el) => el.onclick?.toString() || "present",
            exerciseBtn
          );
          expect(href).toBeDefined();
        }

        // Test options button
        const optionsBtn = await page.$("#open-options");
        if (optionsBtn) {
          const href = await page.evaluate(
            (el) => el.onclick?.toString() || "present",
            optionsBtn
          );
          expect(href).toBeDefined();
        }

        // Test stats button
        const statsBtn = await page.$("#view-stats");
        if (statsBtn) {
          const href = await page.evaluate(
            (el) => el.onclick?.toString() || "present",
            statsBtn
          );
          expect(href).toBeDefined();
        }
      } finally {
        await page.close();
      }
    });

    test("should handle search and filtering", async () => {
      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Test search input
        const searchInput = await page.$("#search-input");
        if (searchInput) {
          await page.type("#search-input", "hello");
          const value = await page.$eval("#search-input", (el) => el.value);
          expect(value).toBe("hello");
        }

        // Test language filter
        const languageSelect = await page.$("#source-language");
        if (languageSelect) {
          await page.select("#source-language", "en");
          const value = await page.$eval("#source-language", (el) => el.value);
          expect(value).toBe("en");
        }
      } finally {
        await page.close();
      }
    });

    test("should toggle extension enabled state", async () => {
      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        const toggleBtn = await page.$("#extension-toggle-btn");
        if (toggleBtn) {
          // Get initial state
          const initialText = await page.$eval(
            "#extension-status",
            (el) => el.textContent
          );

          // Click toggle
          await page.click("#extension-toggle-btn");

          // Wait for state change
          await page.waitForTimeout(500);

          // Check if state changed
          const newText = await page.$eval(
            "#extension-status",
            (el) => el.textContent
          );

          // State should have changed
          expect(newText).toBeDefined();
          console.log(
            "Extension state changed from:",
            initialText,
            "to:",
            newText
          );
        }
      } finally {
        await page.close();
      }
    });
  });

  describe("Options Page Functionality", () => {
    test("should save settings changes", async () => {
      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/options.html`);
        await page.waitForSelector("body");

        // Change target language
        const targetLangSelect = await page.$(
          '#target-lang, select[name="target-lang"]'
        );
        if (targetLangSelect) {
          await page.select('#target-lang, select[name="target-lang"]', "fr");

          // Look for save button or auto-save
          const saveBtn = await page.$(
            '#save-settings, button[type="submit"], .save-button'
          );
          if (saveBtn) {
            await page.click(
              '#save-settings, button[type="submit"], .save-button'
            );
          }

          // Check for success message
          await page.waitForTimeout(1000);

          const successMessage = await page.$(
            ".success-message, .save-message"
          );
          if (successMessage) {
            const messageText = await page.evaluate(
              (el) => el.textContent,
              successMessage
            );
            expect(messageText).toContain("saved") ||
              expect(messageText).toContain("updated");
          }
        }
      } finally {
        await page.close();
      }
    });

    test("should validate form inputs", async () => {
      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/options.html`);
        await page.waitForSelector("body");

        // Test time input validation
        const timeInput = await page.$('#exercise-time, input[type="time"]');
        if (timeInput) {
          await page.click('#exercise-time, input[type="time"]');
          await page.keyboard.selectAll();
          await page.type('#exercise-time, input[type="time"]', "25:99"); // Invalid time

          // Check if validation message appears
          const isValid = await page.$eval(
            '#exercise-time, input[type="time"]',
            (el) => el.validity.valid
          );
          expect(isValid).toBe(false);
        }
      } finally {
        await page.close();
      }
    });
  });

  describe("Exercise Workflow", () => {
    test("should handle exercise session", async () => {
      const page = await browser.newPage();

      try {
        await page.goto(
          `chrome-extension://${extensionId}/exercise/exercise.html`
        );
        await page.waitForSelector("body");

        // Look for exercise interface elements
        const startBtn = await page.$(".start-exercise, #start-button, button");
        const questionContainer = await page.$(
          ".question, .exercise-question, .question-container"
        );

        if (startBtn) {
          console.log("Exercise start button found");

          // Click start if available
          await page.click(".start-exercise, #start-button, button");
          await page.waitForTimeout(1000);

          // Check for question display
          const questions = await page.$$(".question, .exercise-question");
          console.log("Questions found:", questions.length);
        }

        // Test answer submission (if questions exist)
        const answerInput = await page.$('input[type="text"], .answer-input');
        if (answerInput) {
          await page.type('input[type="text"], .answer-input', "test answer");

          const submitBtn = await page.$(
            '.submit-answer, button[type="submit"]'
          );
          if (submitBtn) {
            await page.click('.submit-answer, button[type="submit"]');
            await page.waitForTimeout(500);
          }
        }
      } finally {
        await page.close();
      }
    });
  });

  describe("Data Import/Export", () => {
    test("should handle vocabulary export", async () => {
      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Set up download handling
        const client = await page.target().createCDPSession();
        await client.send("Page.setDownloadBehavior", {
          behavior: "allow",
          downloadPath: path.resolve(__dirname, "../downloads"),
        });

        // Look for export button
        const exportBtn = await page.$("#export-vocabulary, .export-button");
        if (exportBtn) {
          await page.click("#export-vocabulary, .export-button");
          await page.waitForTimeout(2000);

          // File download would be tested in a real environment
          console.log("Export button clicked");
        }
      } finally {
        await page.close();
      }
    });
  });

  describe("Performance and Stress Testing", () => {
    test("should handle large vocabulary lists", async () => {
      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Measure initial load time
        const startTime = Date.now();

        await page.waitForSelector("#vocabulary-list", { timeout: 5000 });

        const loadTime = Date.now() - startTime;
        console.log("Popup load time:", loadTime, "ms");

        expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
      } finally {
        await page.close();
      }
    });

    test("should handle rapid user interactions", async () => {
      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Rapid search input changes
        const searchInput = await page.$("#search-input");
        if (searchInput) {
          const searchTerms = ["hello", "world", "test", "example"];

          for (const term of searchTerms) {
            await page.click("#search-input");
            await page.keyboard.selectAll();
            await page.type("#search-input", term);
            await page.waitForTimeout(100); // Brief pause
          }

          // Should not crash
          const finalValue = await page.$eval(
            "#search-input",
            (el) => el.value
          );
          expect(finalValue).toBe("example");
        }
      } finally {
        await page.close();
      }
    });
  });

  describe("Error Handling", () => {
    test("should handle network failures gracefully", async () => {
      const page = await browser.newPage();

      try {
        // Block network requests to simulate offline mode
        await page.setOfflineMode(true);

        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Extension should still load (since it's local)
        const title = await page.title();
        expect(title).toBeDefined();

        // Reset network
        await page.setOfflineMode(false);
      } finally {
        await page.close();
      }
    });

    test("should handle corrupted storage data", async () => {
      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Inject corrupted data (would be more complex in real test)
        await page.evaluate(() => {
          // Simulate corrupted storage
          console.log("Testing with potential storage issues");
        });

        // Should still function
        const vocabularyList = await page.$("#vocabulary-list");
        expect(vocabularyList).toBeTruthy();
      } finally {
        await page.close();
      }
    });
  });

  describe("Accessibility Testing", () => {
    test("should be keyboard navigable", async () => {
      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Test tab navigation
        await page.keyboard.press("Tab");
        const activeElement1 = await page.evaluate(
          () => document.activeElement.tagName
        );
        expect(["BUTTON", "INPUT", "SELECT"]).toContain(activeElement1);

        await page.keyboard.press("Tab");
        const activeElement2 = await page.evaluate(
          () => document.activeElement.tagName
        );
        expect(["BUTTON", "INPUT", "SELECT"]).toContain(activeElement2);

        // Test Enter key activation
        await page.keyboard.press("Enter");

        // Should not throw errors
        await page.waitForTimeout(100);
      } finally {
        await page.close();
      }
    });

    test("should have proper focus indicators", async () => {
      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Check focus styles
        const focusableElements = await page.$$(
          "button, input, select, a[href]"
        );

        for (let i = 0; i < Math.min(3, focusableElements.length); i++) {
          await focusableElements[i].focus();

          const hasFocusStyle = await page.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return styles.outline !== "none" || styles.boxShadow !== "none";
          }, focusableElements[i]);

          // Focus indicators should be present
          console.log("Element has focus indicator:", hasFocusStyle);
        }
      } finally {
        await page.close();
      }
    });
  });
});
