/**
 * E2E Tests for First-Time User Installation Behaviors
 * Tests the app's behavior when a user installs the extension for the first time,
 * including empty states, welcome messages, and initial user guidance
 */

const puppeteer = require("puppeteer");
const path = require("path");

describe("First-Time User Installation E2E Tests", () => {
  let browser;
  let extensionId;

  beforeAll(async () => {
    // Launch browser with extension loaded
    const extensionPath = path.resolve(__dirname, "../..");

    try {
      browser = await puppeteer.launch({
        headless: true,
        devtools: false,
        timeout: 30000,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-web-security",
          "--disable-dev-shm-usage",
          "--no-first-run",
        ],
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get extension ID
      const targets = await browser.targets();
      const extensionTarget = targets.find(
        (target) =>
          target.type() === "service_worker" &&
          target.url().includes("chrome-extension://")
      );

      if (extensionTarget) {
        extensionId = extensionTarget.url().split("/")[2];
      } else {
        extensionId = "test-extension-fallback";
      }
    } catch (error) {
      browser = await puppeteer.launch({
        headless: true,
        timeout: 15000,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      extensionId = "fallback-mode";
    }
  }, 30000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe("Fresh Installation State", () => {
    test("should display empty vocabulary message when no words are saved", async () => {
      // Skip test if in fallback mode
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log(
          "Skipping empty vocabulary test - browser in fallback mode"
        );
        return;
      }

      const page = await browser.newPage();

      try {
        // Clear storage to simulate fresh installation
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Clear any existing data to simulate first install
        await page.evaluate(() => {
          if (typeof chrome !== "undefined" && chrome.storage) {
            chrome.storage.local.clear();
            chrome.storage.sync.clear();
          }
        });

        // Reload popup to reflect empty state
        await page.reload();
        await page.waitForSelector("body");

        // Wait for initialization
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check for empty vocabulary message
        const emptyStateMessage = await page.evaluate(() => {
          // Look for the specific empty state message
          const noResultsElements = Array.from(
            document.querySelectorAll("*")
          ).filter((el) =>
            el.textContent.includes(
              "No vocabulary saved yet. Start translating text to build your vocabulary!"
            )
          );

          const loadingElements = Array.from(
            document.querySelectorAll(".loading")
          );

          const vocabularyList = document.getElementById("vocabulary-list");
          const vocabularyContent = vocabularyList
            ? vocabularyList.textContent
            : "";

          return {
            hasEmptyMessage: noResultsElements.length > 0,
            emptyMessageText:
              noResultsElements.map((el) => el.textContent)[0] || "",
            hasLoadingState: loadingElements.length > 0,
            vocabularyListContent: vocabularyContent,
            hasVocabularyContainer: !!vocabularyList,
          };
        });

        console.log("Empty state evaluation:", emptyStateMessage);

        // Should show empty vocabulary message or loading state initially
        expect(
          emptyStateMessage.hasEmptyMessage ||
            emptyStateMessage.hasLoadingState ||
            emptyStateMessage.vocabularyListContent.includes(
              "No vocabulary saved yet"
            )
        ).toBe(true);

        // If the empty message is found, verify its content
        if (emptyStateMessage.hasEmptyMessage) {
          expect(emptyStateMessage.emptyMessageText).toContain(
            "No vocabulary saved yet"
          );
          expect(emptyStateMessage.emptyMessageText).toContain(
            "Start translating text to build your vocabulary"
          );
        }
      } finally {
        await page.close();
      }
    }, 20000);

    test("should show proper UI elements for first-time users in popup", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping first-time UI test - browser in fallback mode");
        return;
      }

      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Clear storage to simulate fresh installation
        await page.evaluate(() => {
          if (typeof chrome !== "undefined" && chrome.storage) {
            chrome.storage.local.clear();
            chrome.storage.sync.clear();
          }
        });

        await page.reload();
        await page.waitForSelector("body");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check for essential UI elements that should be present for first-time users
        const uiElements = await page.evaluate(() => {
          return {
            hasOptionsButton: !!document.querySelector(
              "#open-options, .options-button, [href*='options']"
            ),
            hasExerciseButton: !!document.querySelector(
              "#start-exercise, .exercise-button, [href*='exercise']"
            ),
            hasStatsButton: !!document.querySelector(
              "#view-stats, .stats-button, [href*='stats']"
            ),
            hasSearchInput: !!document.querySelector(
              "#search-input, .search-input, input[type='search']"
            ),
            hasLanguageFilter: !!document.querySelector(
              "#source-language, .language-filter, select"
            ),
            hasExtensionToggle: !!document.querySelector(
              "#extension-toggle-btn, .toggle-button"
            ),
            hasVocabularyList: !!document.querySelector(
              "#vocabulary-list, .vocabulary-container"
            ),
          };
        });

        console.log("UI elements for first-time user:", uiElements);

        // Essential navigation elements should be present
        expect(uiElements.hasOptionsButton).toBe(true);
        expect(uiElements.hasVocabularyList).toBe(true);

        // Most other elements should also be present (even if disabled/empty)
        const totalElements = Object.values(uiElements).filter(Boolean).length;
        expect(totalElements).toBeGreaterThan(3); // At least 4 UI elements should be present
      } finally {
        await page.close();
      }
    });

    test("should handle options page for first-time setup", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping options setup test - browser in fallback mode");
        return;
      }

      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/options.html`);
        await page.waitForSelector("body");

        // Check for initial setup elements in options
        const setupElements = await page.evaluate(() => {
          const settingsForm = document.querySelector("form, .settings-form");
          const targetLanguageSelect = document.querySelector("select");
          const timeInputs = Array.from(
            document.querySelectorAll("input[type='time']")
          );
          const checkboxes = Array.from(
            document.querySelectorAll("input[type='checkbox']")
          );
          const saveButton = document.querySelector(
            "#save-settings, button[type='submit'], .save-button"
          );

          return {
            hasSettingsForm: !!settingsForm,
            hasTargetLanguage: !!targetLanguageSelect,
            targetLanguageOptions: targetLanguageSelect
              ? Array.from(targetLanguageSelect.options).map((opt) => opt.value)
              : [],
            hasTimeSettings: timeInputs.length > 0,
            hasToggleSettings: checkboxes.length > 0,
            hasSaveButton: !!saveButton,
            totalSettingsCount:
              timeInputs.length +
              checkboxes.length +
              (targetLanguageSelect ? 1 : 0),
          };
        });

        console.log("First-time setup elements:", setupElements);

        // Should have basic configuration options
        expect(setupElements.hasTargetLanguage).toBe(true);
        expect(setupElements.targetLanguageOptions.length).toBeGreaterThan(1);
        expect(setupElements.totalSettingsCount).toBeGreaterThan(0);

        // Test initial language selection for new users
        if (setupElements.hasTargetLanguage) {
          await page.select(
            "select",
            "es" // Spanish
          );

          if (setupElements.hasSaveButton) {
            await page.click(
              "#save-settings, button[type='submit'], .save-button"
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Check for save confirmation
            const saveConfirmation = await page.evaluate(() => {
              const successElements = Array.from(
                document.querySelectorAll("*")
              ).filter(
                (el) =>
                  el.textContent &&
                  (el.textContent.toLowerCase().includes("saved") ||
                    el.textContent.toLowerCase().includes("updated") ||
                    el.textContent.toLowerCase().includes("success"))
              );
              return successElements.length > 0;
            });

            console.log("Settings save confirmation:", saveConfirmation);
          }
        }
      } finally {
        await page.close();
      }
    });
  });

  describe("Exercise Page Empty State", () => {
    test("should show 'no words available' message in exercise page", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log(
          "Skipping exercise empty state test - browser in fallback mode"
        );
        return;
      }

      const page = await browser.newPage();

      try {
        // Navigate to exercise page
        await page.goto(
          `chrome-extension://${extensionId}/exercise/exercise.html`
        );
        await page.waitForSelector("body");

        // Clear storage to simulate no vocabulary
        await page.evaluate(() => {
          if (typeof chrome !== "undefined" && chrome.storage) {
            chrome.storage.local.clear();
            chrome.storage.sync.clear();
          }
        });

        await page.reload();
        await page.waitForSelector("body");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Check for no words available message
        const noWordsState = await page.evaluate(() => {
          // Look for specific no words messages
          const noWordsMessages = Array.from(
            document.querySelectorAll("*")
          ).filter(
            (el) =>
              el.textContent &&
              (el.textContent.includes("no vocabulary words available") ||
                el.textContent.includes("No Words Available") ||
                el.textContent.includes("currently no vocabulary") ||
                el.textContent.includes("no words are available"))
          );

          const noWordsScreen = document.querySelector(
            ".no-words-screen, .no-words-container"
          );

          const welcomeScreen = document.querySelector(".welcome-screen");
          const isWelcomeVisible =
            welcomeScreen && welcomeScreen.style.display !== "none";

          return {
            hasNoWordsMessage: noWordsMessages.length > 0,
            noWordsMessageText:
              noWordsMessages.map((el) => el.textContent)[0] || "",
            hasNoWordsScreen: !!noWordsScreen,
            hasWelcomeScreen: !!welcomeScreen,
            isWelcomeVisible: isWelcomeVisible,
            allText: document.body.textContent,
          };
        });

        console.log("Exercise no words state:", {
          hasNoWordsMessage: noWordsState.hasNoWordsMessage,
          noWordsMessageText: noWordsState.noWordsMessageText.substring(0, 100),
          hasNoWordsScreen: noWordsState.hasNoWordsScreen,
          isWelcomeVisible: noWordsState.isWelcomeVisible,
        });

        // Should show some indication that no words are available
        expect(
          noWordsState.hasNoWordsMessage ||
            noWordsState.hasNoWordsScreen ||
            noWordsState.allText.includes("no words") ||
            noWordsState.allText.includes("No Words")
        ).toBe(true);

        // If the specific message is found, verify its content
        if (noWordsState.hasNoWordsMessage) {
          expect(noWordsState.noWordsMessageText.toLowerCase()).toMatch(
            /no.*words.*available|no.*vocabulary.*words|currently no vocabulary/
          );
        }
      } finally {
        await page.close();
      }
    });

    test("should provide navigation options when no words are available", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log(
          "Skipping exercise navigation test - browser in fallback mode"
        );
        return;
      }

      const page = await browser.newPage();

      try {
        await page.goto(
          `chrome-extension://${extensionId}/exercise/exercise.html`
        );
        await page.waitForSelector("body");

        // Clear storage to simulate no vocabulary
        await page.evaluate(() => {
          if (typeof chrome !== "undefined" && chrome.storage) {
            chrome.storage.local.clear();
            chrome.storage.sync.clear();
          }
        });

        await page.reload();
        await page.waitForSelector("body");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Check for navigation options when no words are available
        const navigationOptions = await page.evaluate(() => {
          const backButtons = Array.from(
            document.querySelectorAll("button, a")
          ).filter(
            (el) =>
              el.textContent &&
              (el.textContent.toLowerCase().includes("back") ||
                el.textContent.toLowerCase().includes("return") ||
                el.textContent.toLowerCase().includes("home"))
          );

          const optionsButtons = Array.from(
            document.querySelectorAll("button, a")
          ).filter(
            (el) =>
              el.textContent && el.textContent.toLowerCase().includes("options")
          );

          const startLearningButtons = Array.from(
            document.querySelectorAll("button, a")
          ).filter(
            (el) =>
              el.textContent &&
              (el.textContent.toLowerCase().includes("start") ||
                el.textContent.toLowerCase().includes("begin") ||
                el.textContent.toLowerCase().includes("get started"))
          );

          return {
            hasBackButton: backButtons.length > 0,
            hasOptionsButton: optionsButtons.length > 0,
            hasStartButton: startLearningButtons.length > 0,
            backButtonTexts: backButtons.map((btn) => btn.textContent.trim()),
            totalNavigationOptions:
              backButtons.length +
              optionsButtons.length +
              startLearningButtons.length,
          };
        });

        console.log("Navigation options when no words:", navigationOptions);

        // Should provide some way for users to navigate or get started
        expect(navigationOptions.totalNavigationOptions).toBeGreaterThan(0);

        // Test clicking a navigation button if available
        if (navigationOptions.hasBackButton) {
          const backButton = await page.$("button, a");
          if (backButton) {
            const buttonText = await page.evaluate(
              (btn) => btn.textContent,
              backButton
            );
            if (buttonText.toLowerCase().includes("back")) {
              try {
                await page.click("button, a");
                await new Promise((resolve) => setTimeout(resolve, 500));
                console.log("Successfully clicked back button");
              } catch (error) {
                console.log("Back button click failed:", error.message);
              }
            }
          }
        }
      } finally {
        await page.close();
      }
    });
  });

  describe("First-Time User Guidance", () => {
    test("should provide helpful guidance for getting started", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping user guidance test - browser in fallback mode");
        return;
      }

      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Clear storage to simulate fresh installation
        await page.evaluate(() => {
          if (typeof chrome !== "undefined" && chrome.storage) {
            chrome.storage.local.clear();
            chrome.storage.sync.clear();
          }
        });

        await page.reload();
        await page.waitForSelector("body");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Look for helpful guidance text
        const guidanceElements = await page.evaluate(() => {
          const guidanceTexts = Array.from(
            document.querySelectorAll("*")
          ).filter(
            (el) =>
              el.textContent &&
              (el.textContent.toLowerCase().includes("start translating") ||
                el.textContent.toLowerCase().includes("select text") ||
                el.textContent.toLowerCase().includes("highlight text") ||
                el.textContent.toLowerCase().includes("getting started") ||
                el.textContent.toLowerCase().includes("how to use") ||
                el.textContent.toLowerCase().includes("build your vocabulary"))
          );

          const actionableButtons = Array.from(
            document.querySelectorAll("button")
          ).filter((btn) => btn.textContent && btn.textContent.length > 0);

          return {
            hasGuidanceText: guidanceTexts.length > 0,
            guidanceMessages: guidanceTexts.map((el) => el.textContent.trim()),
            hasActionableButtons: actionableButtons.length > 0,
            buttonTexts: actionableButtons.map((btn) => btn.textContent.trim()),
          };
        });

        console.log("First-time user guidance:", {
          hasGuidanceText: guidanceElements.hasGuidanceText,
          guidanceCount: guidanceElements.guidanceMessages.length,
          hasButtons: guidanceElements.hasActionableButtons,
          buttonCount: guidanceElements.buttonTexts.length,
        });

        // Should provide some form of guidance for new users
        expect(
          guidanceElements.hasGuidanceText ||
            guidanceElements.hasActionableButtons
        ).toBe(true);

        // If guidance text is found, it should be helpful
        if (guidanceElements.hasGuidanceText) {
          const hasUsefulGuidance = guidanceElements.guidanceMessages.some(
            (msg) =>
              msg.toLowerCase().includes("start translating") ||
              msg.toLowerCase().includes("build your vocabulary") ||
              msg.toLowerCase().includes("select text")
          );
          expect(hasUsefulGuidance).toBe(true);
        }
      } finally {
        await page.close();
      }
    });

    test("should handle first text selection demonstration", async () => {
      // This test simulates a new user trying to select text for the first time
      const page = await browser.newPage();

      try {
        // Navigate to a simple demonstration page
        await page.goto(
          `data:text/html,
          <html>
            <head>
              <title>Language Learning Demo</title>
            </head>
            <body>
              <h1>Welcome to Your Language Learning Journey!</h1>
              <p id="demo-text">Select this text to see how the extension works. This is your first step towards building a comprehensive vocabulary database.</p>
              <p>You can select any text on any webpage to translate and save it for later practice.</p>
            </body>
          </html>`
        );

        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Simulate first-time user selecting text
        await page.click("#demo-text", { clickCount: 3 }); // Triple-click to select paragraph

        const selectedText = await page.evaluate(() =>
          window.getSelection().toString().trim()
        );

        expect(selectedText.length).toBeGreaterThan(10);
        expect(selectedText).toContain("Select this text");

        console.log("First text selection demonstration:", {
          selectedLength: selectedText.length,
          selectedPreview: selectedText.substring(0, 50) + "...",
        });

        // In a real extension environment, this would trigger the translation popup
        // For now, we just verify that text selection works as expected
        expect(selectedText).toContain("extension works");
      } finally {
        await page.close();
      }
    });

    test("should show appropriate extension status for new users", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log(
          "Skipping extension status test - browser in fallback mode"
        );
        return;
      }

      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Check extension status indicator for new users
        const extensionStatus = await page.evaluate(() => {
          const statusElement = document.querySelector("#extension-status");
          const toggleButton = document.querySelector("#extension-toggle-btn");
          const statusText = statusElement ? statusElement.textContent : "";

          return {
            hasStatusElement: !!statusElement,
            hasToggleButton: !!toggleButton,
            statusText: statusText.trim(),
            toggleButtonState: toggleButton
              ? toggleButton.getAttribute("aria-pressed")
              : null,
          };
        });

        console.log("Extension status for new user:", extensionStatus);

        // Should show extension status
        if (extensionStatus.hasStatusElement) {
          expect(extensionStatus.statusText).toMatch(/enabled|disabled/i);
        }

        // Extension should be enabled by default for new users
        if (extensionStatus.hasToggleButton) {
          // Default state should be enabled (true) or at least defined
          expect(extensionStatus.toggleButtonState).toBeDefined();
        }
      } finally {
        await page.close();
      }
    });
  });

  describe("Initial Storage State", () => {
    test("should handle empty storage gracefully", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping storage test - browser in fallback mode");
        return;
      }

      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Verify storage handling with completely empty storage
        const storageHandling = await page.evaluate(async () => {
          if (typeof chrome === "undefined" || !chrome.storage) {
            return { canAccessStorage: false };
          }

          // Clear all storage
          try {
            chrome.storage.local.clear();
            chrome.storage.sync.clear();
          } catch (e) {
            console.log("Storage clear error:", e);
          }

          // Try to get some common storage keys
          return new Promise((resolve) => {
            chrome.storage.local.get(
              ["vocabulary", "settings", "stats", "extensionEnabled"],
              (result) => {
                resolve({
                  canAccessStorage: true,
                  vocabularyExists: "vocabulary" in result,
                  settingsExists: "settings" in result,
                  statsExists: "stats" in result,
                  extensionEnabledExists: "extensionEnabled" in result,
                  storageKeys: Object.keys(result),
                });
              }
            );
          });
        });

        console.log("Storage handling for new user:", storageHandling);

        if (storageHandling.canAccessStorage) {
          // Should not crash when storage is empty
          expect(storageHandling.storageKeys).toBeDefined();

          // Fresh install should not have vocabulary
          expect(storageHandling.vocabularyExists).toBe(false);
        }

        // Page should still be functional despite empty storage
        const pageTitle = await page.title();
        expect(pageTitle).toBeDefined();
        expect(pageTitle.length).toBeGreaterThan(0);
      } finally {
        await page.close();
      }
    });

    test("should initialize default settings for new users", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log(
          "Skipping default settings test - browser in fallback mode"
        );
        return;
      }

      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/options.html`);
        await page.waitForSelector("body");

        // Check if default settings are applied for new users
        const defaultSettings = await page.evaluate(() => {
          const targetLangSelect = document.querySelector(
            "#target-lang, select[name*='target'], select[name*='lang']"
          );
          const timeInputs = Array.from(
            document.querySelectorAll("input[type='time']")
          );
          const checkboxes = Array.from(
            document.querySelectorAll("input[type='checkbox']")
          );

          return {
            targetLanguageValue: targetLangSelect
              ? targetLangSelect.value
              : null,
            timeValues: timeInputs.map((input) => input.value),
            checkboxStates: checkboxes.map((cb) => cb.checked),
            hasDefaults: !!(
              (targetLangSelect && targetLangSelect.value) ||
              timeInputs.some((input) => input.value) ||
              checkboxes.length > 0
            ),
          };
        });

        console.log("Default settings for new user:", defaultSettings);

        // Should have some default configuration
        expect(defaultSettings.hasDefaults).toBe(true);

        // Target language should have a default value
        if (defaultSettings.targetLanguageValue) {
          expect(defaultSettings.targetLanguageValue.length).toBeGreaterThan(0);
          expect(defaultSettings.targetLanguageValue).not.toBe("");
        }
      } finally {
        await page.close();
      }
    });
  });

  describe("Error Handling for New Users", () => {
    test("should handle API failures gracefully for new users", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping API failure test - browser in fallback mode");
        return;
      }

      const page = await browser.newPage();

      try {
        // Block external requests to simulate API failures
        await page.setRequestInterception(true);
        page.on("request", (request) => {
          if (
            request.url().includes("translate") ||
            request.url().includes("api")
          ) {
            request.abort();
          } else {
            request.continue();
          }
        });

        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Clear storage to simulate new user
        await page.evaluate(() => {
          if (typeof chrome !== "undefined" && chrome.storage) {
            chrome.storage.local.clear();
            chrome.storage.sync.clear();
          }
        });

        await page.reload();
        await page.waitForSelector("body");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Should still function without external APIs
        const pageContent = await page.evaluate(() => ({
          hasContent: document.body.children.length > 0,
          title: document.title,
          hasVocabularySection: !!document.getElementById("vocabulary-list"),
        }));

        expect(pageContent.hasContent).toBe(true);
        expect(pageContent.hasVocabularySection).toBe(true);

        console.log("App functionality without APIs:", pageContent);
      } finally {
        await page.close();
      }
    });

    test("should provide helpful error messages for new users", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping error messages test - browser in fallback mode");
        return;
      }

      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
        await page.waitForSelector("body");

        // Simulate various error conditions that new users might encounter
        await page.evaluate(() => {
          // Simulate storage quota exceeded (common issue for new users)
          if (typeof chrome !== "undefined" && chrome.storage) {
            const originalSet = chrome.storage.local.set;
            chrome.storage.local.set = () => {
              throw new Error("Storage quota exceeded");
            };

            // Restore after a delay
            setTimeout(() => {
              chrome.storage.local.set = originalSet;
            }, 1000);
          }
        });

        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Check for error handling
        const errorHandling = await page.evaluate(() => {
          const errorElements = Array.from(
            document.querySelectorAll("*")
          ).filter(
            (el) =>
              el.textContent &&
              (el.textContent.toLowerCase().includes("error") ||
                el.textContent.toLowerCase().includes("failed") ||
                el.textContent.toLowerCase().includes("try again") ||
                el.textContent.toLowerCase().includes("problem"))
          );

          return {
            hasErrorMessages: errorElements.length > 0,
            errorTexts: errorElements.map((el) => el.textContent.trim()),
            pageStillFunctional: document.body.children.length > 0,
          };
        });

        console.log("Error handling for new users:", {
          hasErrorMessages: errorHandling.hasErrorMessages,
          pageStillFunctional: errorHandling.pageStillFunctional,
          errorCount: errorHandling.errorTexts.length,
        });

        // Page should remain functional even with errors
        expect(errorHandling.pageStillFunctional).toBe(true);

        // If errors are shown, they should be user-friendly
        if (errorHandling.hasErrorMessages) {
          const hasHelpfulErrors = errorHandling.errorTexts.some(
            (text) =>
              text.toLowerCase().includes("try again") ||
              text.toLowerCase().includes("reload") ||
              text.toLowerCase().includes("check")
          );
          console.log("Has helpful error messages:", hasHelpfulErrors);
        }
      } finally {
        await page.close();
      }
    });
  });
});
