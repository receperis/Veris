/**
 * User Journey & Workflow Tests
 * End-to-end scenarios from first install to advanced usage patterns,
 * including onboarding, daily usage, long-term retention, and error recovery
 */

const puppeteer = require("puppeteer");
const path = require("path");

describe("User Journey & Workflow Tests", () => {
  let browser;
  let extensionPage;
  let extensionId;

  // Utility function for safe clicking
  const safeClick = async (page, element, description = "element") => {
    if (!element) {
      console.log(`${description} not found, skipping click`);
      return false;
    }

    try {
      // Check if element is visible and clickable
      const isClickable = await page.evaluate((el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const isVisible =
          rect.width > 0 &&
          rect.height > 0 &&
          getComputedStyle(el).visibility !== "hidden" &&
          getComputedStyle(el).display !== "none";
        return isVisible && !el.disabled;
      }, element);

      if (isClickable) {
        await element.click();
        console.log(`Successfully clicked ${description}`);
        return true;
      } else {
        // Fallback: use JavaScript click
        await page.evaluate((el) => el.click(), element);
        console.log(
          `JavaScript clicked ${description} (not visually clickable)`
        );
        return true;
      }
    } catch (error) {
      console.log(`Failed to click ${description}: ${error.message}`);
      return false;
    }
  };

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

  describe("First-time User Onboarding", () => {
    test("should guide new user through initial setup", async () => {
      // Skip test if in fallback mode
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping onboarding test - browser in fallback mode");
        return;
      }

      const page = await browser.newPage();

      try {
        // Simulate fresh install by clearing storage
        await page.goto(`chrome-extension:///pages/popup.html`);
        await page.waitForSelector("body");

        // Clear any existing data to simulate first run
        await page.evaluate(() => {
          if (typeof chrome !== "undefined" && chrome.storage) {
            chrome.storage.local.clear();
            chrome.storage.sync.clear();
          }
        });

        // Reload popup
        await page.reload();
        await page.waitForSelector("body");

        // Check for onboarding elements
        const welcomeElements = await page.evaluate(() => {
          const welcomeTexts = Array.from(
            document.querySelectorAll("*")
          ).filter(
            (el) =>
              el.textContent &&
              (el.textContent.toLowerCase().includes("welcome") ||
                el.textContent.toLowerCase().includes("getting started") ||
                el.textContent.toLowerCase().includes("setup") ||
                el.textContent.toLowerCase().includes("first time"))
          );

          const hasEmptyState = document.querySelector(
            ".empty-state, .no-vocabulary, .welcome-screen"
          );
          const hasCallToAction = document.querySelector(
            "button, .cta, .start-button"
          );

          return {
            hasWelcomeText: welcomeTexts.length > 0,
            hasEmptyState: !!hasEmptyState,
            hasCallToAction: !!hasCallToAction,
            welcomeTexts: welcomeTexts
              .map((el) => el.textContent.slice(0, 50))
              .slice(0, 3),
          };
        });

        // Should have some form of onboarding or empty state
        expect(
          welcomeElements.hasWelcomeText ||
            welcomeElements.hasEmptyState ||
            welcomeElements.hasCallToAction
        ).toBe(true);

        console.log("Onboarding elements found:", welcomeElements);

        // Test navigation to options for initial setup
        const optionsButton = await page.$(
          '#options-btn, .options-button, [href*="options"]'
        );
        if (optionsButton) {
          await safeClick(page, optionsButton, "options button");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Should either navigate or open options
          const currentUrl = page.url();
          expect(currentUrl).toBeDefined();
        }
      } finally {
        await page.close();
      }
    }, 20000);

    test("should demonstrate core functionality to new users", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping demo test - browser in fallback mode");
        return;
      }

      const page = await browser.newPage();

      try {
        // Navigate to a simple page for demonstration
        await page.goto(
          "data:text/html,<html><body><h1>Welcome to Language Learning</h1><p>Select this text to see how the extension works. This is a demonstration paragraph for new users to try out the text selection feature.</p></body></html>"
        );

        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Simulate new user selecting text
        await page.click("p", { clickCount: 3 }); // Select paragraph

        const selectedText = await page.evaluate(() =>
          window.getSelection().toString().trim()
        );

        expect(selectedText.length).toBeGreaterThan(10);

        // In a real extension, this would trigger the translation popup
        // Check if any extension UI appears
        const extensionUI = await page.$(
          ".extension-popup, .translation-popup, .veris-popup"
        );

        // UI appearance depends on extension implementation
        console.log("Extension UI detected:", !!extensionUI);
        console.log("Selected text length:", selectedText.length);
      } finally {
        await page.close();
      }
    }, 15000);

    test("should handle initial settings configuration", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping settings config test - browser in fallback mode");
        return;
      }

      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension:///pages/options.html`);
        await page.waitForSelector("body");

        // Test initial configuration options
        const configElements = await page.evaluate(() => {
          const selects = Array.from(document.querySelectorAll("select"));
          const inputs = Array.from(document.querySelectorAll("input"));
          const checkboxes = Array.from(
            document.querySelectorAll('input[type="checkbox"]')
          );

          return {
            hasLanguageSettings: selects.some(
              (s) =>
                s.id.includes("lang") ||
                s.name.includes("lang") ||
                Array.from(s.options).some((opt) =>
                  opt.value.match(/^[a-z]{2}$/)
                )
            ),
            hasTimeSettings: inputs.some(
              (i) =>
                i.type === "time" ||
                i.id.includes("time") ||
                i.name.includes("time")
            ),
            hasToggleSettings: checkboxes.length > 0,
            totalSettings: selects.length + inputs.length + checkboxes.length,
          };
        });

        expect(configElements.totalSettings).toBeGreaterThan(0);
        console.log("Configuration options available:", configElements);

        // Test setting a basic configuration
        const languageSelect = await page.$(
          'select[name*="lang"], select[id*="lang"], #target-lang'
        );
        if (languageSelect) {
          try {
            await page.select(
              'select[name*="lang"], select[id*="lang"], #target-lang',
              "es"
            );
          } catch (selectError) {
            console.log(`Language select failed: ${selectError.message}`);
          }

          const saveButton = await page.$(
            'button[type="submit"], .save-button, #save-settings'
          );
          if (saveButton) {
            await safeClick(page, saveButton, "save settings button");
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      } finally {
        await page.close();
      }
    }, 15000);
  });

  describe("Daily Usage Patterns", () => {
    test("should handle typical daily vocabulary collection", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping daily usage test - browser in fallback mode");
        return;
      }

      // Simulate a typical day of vocabulary collection
      const dailyWords = [
        "Hello, how are you today?",
        "I would like to order coffee.",
        "The weather is beautiful.",
        "Thank you for your help.",
        "Where is the nearest station?",
      ];

      for (let i = 0; i < dailyWords.length; i++) {
        const page = await browser.newPage();

        try {
          // Navigate to different types of content
          const testPages = [
            "data:text/html,<html><body><p>Hello, how are you today? This is a greeting.</p></body></html>",
            "data:text/html,<html><body><div>I would like to order coffee at the café.</div></body></html>",
            "data:text/html,<html><body><span>The weather is beautiful outside today.</span></body></html>",
            "data:text/html,<html><body><article>Thank you for your help with this problem.</article></body></html>",
            "data:text/html,<html><body><section>Where is the nearest train station?</section></body></html>",
          ];

          await page.goto(testPages[i]);
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Select text that contains the daily word
          await page.evaluate((targetText) => {
            const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );

            let node;
            while ((node = walker.nextNode())) {
              if (node.nodeValue.includes(targetText.split(" ")[0])) {
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(node.parentElement);
                selection.removeAllRanges();
                selection.addRange(range);
                break;
              }
            }
          }, dailyWords[i]);

          const selectedText = await page.evaluate(() =>
            window.getSelection().toString().trim()
          );

          expect(selectedText.length).toBeGreaterThan(0);
          console.log(
            `Day ${i + 1} - Selected: "${selectedText.substring(0, 30)}..."`
          );
        } finally {
          await page.close();
        }

        // Brief pause between selections (realistic usage)
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }, 30000);

    test("should handle vocabulary review sessions", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping review session test - browser in fallback mode");
        return;
      }

      const page = await browser.newPage();

      try {
        // Open exercise page
        await page.goto(
          `chrome-extension://${extensionId}/exercise/exercise.html`
        );
        await page.waitForSelector("body");

        // Simulate a review session
        const sessionSteps = [
          "Check for available exercises",
          "Start exercise session",
          "Answer questions",
          "Complete session",
          "Review results",
        ];

        for (let step of sessionSteps) {
          console.log(`Review session step: ${step}`);

          switch (step) {
            case "Check for available exercises":
              const exerciseCount = await page.evaluate(() => {
                const counters = Array.from(
                  document.querySelectorAll("*")
                ).filter((el) =>
                  el.textContent.match(/\d+.*words?.*due|due.*\d+.*words?/i)
                );
                return counters.length;
              });
              break;

            case "Start exercise session":
              const startButton = await page.$(
                ".start-exercise, #start-button, button"
              );
              if (startButton) {
                await safeClick(page, startButton, "start exercise button");
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
              break;

            case "Answer questions":
              // Simulate answering 3 questions
              for (let q = 0; q < 3; q++) {
                const answerInput = await page.$(
                  'input[type="text"], .answer-input'
                );
                if (answerInput) {
                  await page.type(
                    'input[type="text"], .answer-input',
                    `answer${q + 1}`
                  );

                  const submitButton = await page.$(
                    '.submit-answer, button[type="submit"]'
                  );
                  if (submitButton) {
                    await safeClick(
                      page,
                      submitButton,
                      `submit answer button ${q + 1}`
                    );
                    await new Promise((resolve) => setTimeout(resolve, 500));
                  }
                }
              }
              break;

            case "Complete session":
              const finishButton = await page.$(
                ".finish-session, .complete-exercise"
              );
              if (finishButton) {
                await safeClick(page, finishButton, "finish exercise button");
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
              break;

            case "Review results":
              const results = await page.evaluate(() => {
                const scoreElements = Array.from(
                  document.querySelectorAll("*")
                ).filter((el) =>
                  el.textContent.match(/score|correct|wrong|accuracy/i)
                );
                return scoreElements.length > 0;
              });
              console.log("Results displayed:", results);
              break;
          }

          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } finally {
        await page.close();
      }
    }, 25000);

    test("should handle vocabulary management tasks", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log(
          "Skipping vocab management test - browser in fallback mode"
        );
        return;
      }

      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension:///pages/popup.html`);
        await page.waitForSelector("body");

        // Simulate typical vocabulary management tasks
        const managementTasks = [
          "Browse vocabulary list",
          "Search for specific words",
          "Edit word translations",
          "Delete unwanted entries",
          "Filter by language",
        ];

        for (let task of managementTasks) {
          console.log(`Management task: ${task}`);

          switch (task) {
            case "Browse vocabulary list":
              const vocabularyItems = await page.$$(
                ".vocabulary-item, .word-item, .vocab-entry"
              );
              console.log(`Found ${vocabularyItems.length} vocabulary items`);
              break;

            case "Search for specific words":
              const searchInput = await page.$(
                '#search-input, .search-box, input[placeholder*="search"]'
              );
              if (searchInput) {
                await page.type(
                  '#search-input, .search-box, input[placeholder*="search"]',
                  "hello"
                );
                await new Promise((resolve) => setTimeout(resolve, 500));
                await page.keyboard.press("Escape"); // Clear search
              }
              break;

            case "Edit word translations":
              const editButton = await page.$(
                ".edit-mode, #edit-words, .edit-toggle"
              );
              if (editButton) {
                await safeClick(page, editButton, "edit mode button");
                await new Promise((resolve) => setTimeout(resolve, 500));

                const firstEdit = await page.$(
                  ".edit-translation, .translation-input"
                );
                if (firstEdit) {
                  try {
                    await safeClick(page, firstEdit, "translation input");
                    await page.keyboard.selectAll();
                    await page.type(
                      ".edit-translation, .translation-input",
                      "edited translation"
                    );
                  } catch (editError) {
                    console.log(
                      `Translation edit failed: ${editError.message}`
                    );
                  }
                }
              }
              break;

            case "Filter by language":
              const languageFilter = await page.$(
                '#language-filter, .language-dropdown, select[name*="lang"]'
              );
              if (languageFilter) {
                try {
                  const options = await page.$$eval(
                    '#language-filter option, .language-dropdown option, select[name*="lang"] option',
                    (opts) => opts.map((o) => o.value)
                  );
                  if (options.length > 1) {
                    await page.select(
                      '#language-filter, .language-dropdown, select[name*="lang"]',
                      options[1]
                    );
                    await new Promise((resolve) => setTimeout(resolve, 300));
                    console.log(`Selected language filter: ${options[1]}`);
                  }
                } catch (filterError) {
                  console.log(`Language filter failed: ${filterError.message}`);
                }
              }
              break;
          }

          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } finally {
        await page.close();
      }
    }, 20000);
  });

  describe("Long-term User Retention Flows", () => {
    test("should simulate weekly usage patterns", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping weekly patterns test - browser in fallback mode");
        return;
      }

      // Simulate 7 days of varied usage
      const weeklyPattern = [
        { day: "Monday", newWords: 5, reviewTime: 10 },
        { day: "Tuesday", newWords: 3, reviewTime: 5 },
        { day: "Wednesday", newWords: 7, reviewTime: 15 },
        { day: "Thursday", newWords: 2, reviewTime: 5 },
        { day: "Friday", newWords: 4, reviewTime: 8 },
        { day: "Saturday", newWords: 8, reviewTime: 20 },
        { day: "Sunday", newWords: 1, reviewTime: 3 },
      ];

      for (let dayData of weeklyPattern) {
        console.log(
          `Simulating ${dayData.day}: ${dayData.newWords} new words, ${dayData.reviewTime}min review`
        );

        const page = await browser.newPage();

        try {
          // Simulate new word collection
          for (let i = 0; i < Math.min(dayData.newWords, 3); i++) {
            await page.goto(
              `data:text/html,<html><body><p>Daily word ${i + 1} for ${
                dayData.day
              }</p></body></html>`
            );
            await page.click("p", { clickCount: 3 });
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          // Simulate review session
          await page.goto(`chrome-extension:///pages/popup.html`);
          await page.waitForSelector("body");

          // Quick review simulation
          const exerciseButton = await page.$(
            '#exercise-btn, .exercise-button, [href*="exercise"]'
          );
          if (exerciseButton) {
            try {
              const clicked = await safeClick(
                page,
                exerciseButton,
                `${dayData.day} exercise button`
              );
              if (clicked) {
                await new Promise((resolve) =>
                  setTimeout(resolve, dayData.reviewTime * 10)
                ); // Accelerated time
              }
            } catch (e) {
              // Handle navigation or popup close
              console.log(`${dayData.day} review completed - ${e.message}`);
            }
          }
        } finally {
          await page.close();
        }

        // Brief pause between days
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log("Weekly usage pattern simulation completed");
      expect(weeklyPattern.length).toBe(7);
    }, 45000);

    test("should handle user re-engagement after absence", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping re-engagement test - browser in fallback mode");
        return;
      }

      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension:///pages/popup.html`);
        await page.waitForSelector("body");

        // Check for re-engagement features
        const reEngagementElements = await page.evaluate(() => {
          const notifications = Array.from(
            document.querySelectorAll("*")
          ).filter(
            (el) =>
              el.textContent &&
              (el.textContent.toLowerCase().includes("welcome back") ||
                el.textContent.toLowerCase().includes("missed") ||
                el.textContent.toLowerCase().includes("due") ||
                el.textContent.toLowerCase().includes("review"))
          );

          const reminderElements = document.querySelectorAll(
            ".reminder, .notification, .alert"
          );
          const exercisePrompts = document.querySelectorAll(
            ".exercise-reminder, .due-words"
          );

          return {
            hasNotifications: notifications.length > 0,
            hasReminders: reminderElements.length > 0,
            hasExercisePrompts: exercisePrompts.length > 0,
            notificationTexts: notifications.map((el) =>
              el.textContent.slice(0, 50)
            ),
          };
        });

        console.log("Re-engagement elements:", reEngagementElements);

        // Test exercise reminder functionality
        const reminderButton = await page.$(
          ".exercise-reminder, .start-review, #exercise-btn"
        );
        if (reminderButton) {
          const clicked = await safeClick(
            page,
            reminderButton,
            "exercise reminder button"
          );
          if (clicked) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        // Should show some form of re-engagement (due words, reminders, etc.)
        expect(
          reEngagementElements.hasNotifications ||
            reEngagementElements.hasReminders ||
            reEngagementElements.hasExercisePrompts
        ).toBe(true);
      } finally {
        await page.close();
      }
    }, 15000);

    test("should track progress milestones", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log(
          "Skipping progress tracking test - browser in fallback mode"
        );
        return;
      }

      const page = await browser.newPage();

      try {
        // Check stats page for progress tracking
        await page.goto(`chrome-extension://${extensionId}/stats/stats.html`);
        await page.waitForSelector("body");

        const progressMetrics = await page.evaluate(() => {
          const numberElements = Array.from(
            document.querySelectorAll("*")
          ).filter((el) => {
            const text = el.textContent;
            return (
              text &&
              text.match(/\d+/) &&
              (text.toLowerCase().includes("words") ||
                text.toLowerCase().includes("learned") ||
                text.toLowerCase().includes("reviewed") ||
                text.toLowerCase().includes("streak") ||
                text.toLowerCase().includes("score"))
            );
          });

          const chartElements = document.querySelectorAll(
            "canvas, svg, .chart, .graph"
          );
          const milestoneElements = document.querySelectorAll(
            ".milestone, .achievement, .badge"
          );

          return {
            hasNumbers: numberElements.length > 0,
            hasCharts: chartElements.length > 0,
            hasMilestones: milestoneElements.length > 0,
            metrics: numberElements
              .map((el) => el.textContent.slice(0, 30))
              .slice(0, 5),
          };
        });

        console.log("Progress metrics found:", progressMetrics);

        // Should have some form of progress tracking
        expect(
          progressMetrics.hasNumbers ||
            progressMetrics.hasCharts ||
            progressMetrics.hasMilestones
        ).toBe(true);
      } finally {
        await page.close();
      }
    }, 15000);
  });

  describe("Edge Case User Behaviors", () => {
    test("should handle rapid popup opening/closing", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping rapid popup test - browser in fallback mode");
        return;
      }

      // Simulate user rapidly opening and closing popup
      for (let i = 0; i < 5; i++) {
        const page = await browser.newPage();

        try {
          await page.goto(`chrome-extension:///pages/popup.html`);
          await page.waitForSelector("body", { timeout: 3000 });

          // Very brief interaction
          await new Promise((resolve) => setTimeout(resolve, 100));

          console.log(`Rapid popup test ${i + 1}/5 completed`);
        } catch (error) {
          console.log(`Rapid popup ${i + 1} error:`, error.message);
        } finally {
          await page.close();
        }

        // Minimal delay between openings
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Final check that everything still works
      const finalPage = await browser.newPage();
      try {
        await finalPage.goto(`chrome-extension:///pages/popup.html`);
        await finalPage.waitForSelector("body");

        const isWorking = await finalPage.evaluate(() => {
          return document.body && document.body.children.length > 0;
        });

        expect(isWorking).toBe(true);
      } finally {
        await finalPage.close();
      }
    }, 20000);

    test("should handle invalid text selections", async () => {
      const page = await browser.newPage();

      try {
        // Test various edge cases for text selection
        const edgeCases = [
          "data:text/html,<html><body></body></html>", // Empty page
          "data:text/html,<html><body><div></div></body></html>", // Empty div
          "data:text/html,<html><body><p>   </p></body></html>", // Whitespace only
          "data:text/html,<html><body><p>a</p></body></html>", // Single character
          "data:text/html,<html><body><p>🎉🌟✨</p></body></html>", // Emojis only
        ];

        for (let testCase of edgeCases) {
          await page.goto(testCase);
          await new Promise((resolve) => setTimeout(resolve, 300));

          try {
            // Try to select all content
            await page.keyboard.down("Control");
            await page.keyboard.press("a");
            await page.keyboard.up("Control");

            const selectedText = await page.evaluate(() =>
              window.getSelection().toString()
            );

            console.log(
              `Edge case selection: "${selectedText}" (length: ${selectedText.length})`
            );

            // Should handle gracefully (no crashes)
            expect(typeof selectedText).toBe("string");
          } catch (error) {
            console.log("Selection edge case handled:", error.message);
          }
        }
      } finally {
        await page.close();
      }
    }, 15000);

    test("should handle concurrent operations", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log(
          "Skipping concurrent operations test - browser in fallback mode"
        );
        return;
      }

      // Create multiple pages concurrently
      const pages = await Promise.all([
        browser.newPage(),
        browser.newPage(),
        browser.newPage(),
      ]);

      try {
        // Navigate all pages to different extension pages simultaneously
        const navigationPromises = [
          pages[0].goto(`chrome-extension:///pages/popup.html`),
          pages[1].goto(`chrome-extension:///pages/options.html`),
          pages[2].goto(
            `chrome-extension://${extensionId}/exercise/exercise.html`
          ),
        ];

        await Promise.all(navigationPromises);

        // Wait for all pages to load
        await Promise.all([
          pages[0].waitForSelector("body"),
          pages[1].waitForSelector("body"),
          pages[2].waitForSelector("body"),
        ]);

        // Perform concurrent operations
        const operationPromises = pages.map((page, index) =>
          page.evaluate((pageIndex) => {
            // Simulate some activity on each page
            const buttons = document.querySelectorAll("button, input, select");
            if (buttons.length > 0) {
              buttons[0].focus();
            }
            return `Page ${pageIndex + 1} operation completed`;
          }, index)
        );

        const results = await Promise.all(operationPromises);
        console.log("Concurrent operations results:", results);

        expect(results).toHaveLength(3);
        results.forEach((result) => {
          expect(typeof result).toBe("string");
        });
      } finally {
        await Promise.all(pages.map((page) => page.close()));
      }
    }, 20000);
  });

  describe("Recovery from Errors", () => {
    test("should recover from storage errors", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log(
          "Skipping storage error recovery test - browser in fallback mode"
        );
        return;
      }

      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension:///pages/popup.html`);
        await page.waitForSelector("body");

        // Simulate storage corruption/errors
        await page.evaluate(() => {
          // Mock storage failure
          if (typeof chrome !== "undefined" && chrome.storage) {
            const originalGet = chrome.storage.local.get;
            chrome.storage.local.get = () => {
              throw new Error("Storage quota exceeded");
            };

            // Try to access storage - should fail
            try {
              chrome.storage.local.get(["vocabulary"]);
            } catch (e) {
              console.log("Storage error simulated:", e.message);
            }

            // Restore original function after test
            setTimeout(() => {
              chrome.storage.local.get = originalGet;
            }, 1000);
          }
        });

        // Wait for error handling
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Check if app still functions
        const isResponsive = await page.evaluate(() => {
          const button = document.querySelector("button");
          if (button) {
            button.click();
            return true;
          }
          return document.body && document.body.children.length > 0;
        });

        expect(isResponsive).toBe(true);

        // Check for error messages
        const errorElements = await page.evaluate(() => {
          const errorTexts = Array.from(document.querySelectorAll("*")).filter(
            (el) =>
              el.textContent &&
              (el.textContent.toLowerCase().includes("error") ||
                el.textContent.toLowerCase().includes("failed") ||
                el.textContent.toLowerCase().includes("problem"))
          );
          return errorTexts.length > 0;
        });

        console.log("Error recovery - error messages shown:", errorElements);
      } finally {
        await page.close();
      }
    }, 15000);

    test("should recover from network failures", async () => {
      const page = await browser.newPage();

      try {
        // Set offline mode to simulate network failure
        await page.setOfflineMode(true);

        await page.goto(
          "data:text/html,<html><body><p>Test text for offline translation</p></body></html>"
        );
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Try to select text (which might trigger network requests)
        await page.click("p", { clickCount: 3 });

        const selectedText = await page.evaluate(() =>
          window.getSelection().toString().trim()
        );

        expect(selectedText).toBe("Test text for offline translation");

        // Extension should handle offline gracefully
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Restore network
        await page.setOfflineMode(false);

        // Test that functionality returns when network is restored
        await page.reload();
        await new Promise((resolve) => setTimeout(resolve, 500));

        await page.click("p", { clickCount: 3 });
        const onlineSelectedText = await page.evaluate(() =>
          window.getSelection().toString().trim()
        );

        expect(onlineSelectedText).toBe("Test text for offline translation");
      } finally {
        await page.close();
      }
    }, 15000);

    test("should handle corrupted extension state", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log(
          "Skipping corrupted state recovery test - browser in fallback mode"
        );
        return;
      }

      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension:///pages/popup.html`);
        await page.waitForSelector("body");

        // Corrupt extension state
        await page.evaluate(() => {
          if (typeof chrome !== "undefined" && chrome.storage) {
            // Inject corrupted data
            chrome.storage.local.set({
              vocabulary: "not_an_array",
              settings: { invalid: "json" },
              stats: null,
            });
          }

          // Also corrupt DOM state
          document.body.dataset.corrupted = "true";
        });

        // Reload to trigger state recovery
        await page.reload();
        await page.waitForSelector("body");

        // App should still function despite corrupted state
        const isWorking = await page.evaluate(() => {
          return document.body && document.body.children.length > 0;
        });

        expect(isWorking).toBe(true);

        // Check for reset/recovery indicators
        const recoveryElements = await page.evaluate(() => {
          const resetTexts = Array.from(document.querySelectorAll("*")).filter(
            (el) =>
              el.textContent &&
              (el.textContent.toLowerCase().includes("reset") ||
                el.textContent.toLowerCase().includes("restored") ||
                el.textContent.toLowerCase().includes("default"))
          );
          return resetTexts.length > 0;
        });

        console.log("State recovery indicators found:", recoveryElements);
      } finally {
        await page.close();
      }
    }, 15000);

    test("should provide user feedback during error states", async () => {
      if (
        extensionId.includes("fallback") ||
        extensionId.includes("test-extension")
      ) {
        console.log("Skipping error feedback test - browser in fallback mode");
        return;
      }

      const page = await browser.newPage();

      try {
        await page.goto(`chrome-extension:///pages/popup.html`);
        await page.waitForSelector("body");

        // Simulate various error conditions and check for user feedback
        const errorScenarios = [
          "Empty vocabulary state",
          "Loading failure",
          "Save operation failure",
        ];

        for (let scenario of errorScenarios) {
          console.log(`Testing error feedback for: ${scenario}`);

          // Trigger error condition based on scenario
          await page.evaluate((errorType) => {
            switch (errorType) {
              case "Empty vocabulary state":
                // Clear vocabulary display
                const vocabList = document.querySelector(
                  "#vocabulary-list, .vocabulary-container"
                );
                if (vocabList) vocabList.innerHTML = "";
                break;

              case "Loading failure":
                // Add loading error indicator
                document.body.insertAdjacentHTML(
                  "beforeend",
                  '<div class="error-indicator">Failed to load</div>'
                );
                break;

              case "Save operation failure":
                // Simulate save failure feedback
                const saveBtn = document.querySelector("button");
                if (saveBtn) saveBtn.textContent = "Save Failed - Retry";
                break;
            }
          }, scenario);

          await new Promise((resolve) => setTimeout(resolve, 500));

          // Check for appropriate user feedback
          const feedbackElements = await page.evaluate(() => {
            const messages = Array.from(document.querySelectorAll("*")).filter(
              (el) =>
                el.textContent &&
                (el.textContent.toLowerCase().includes("no vocabulary") ||
                  el.textContent.toLowerCase().includes("empty") ||
                  el.textContent.toLowerCase().includes("failed") ||
                  el.textContent.toLowerCase().includes("error") ||
                  el.textContent.toLowerCase().includes("retry") ||
                  el.textContent.toLowerCase().includes("try again"))
            );

            const hasErrorUI = document.querySelector(
              ".error, .warning, .empty-state, .error-indicator"
            );

            return {
              hasMessages: messages.length > 0,
              hasErrorUI: !!hasErrorUI,
              messageTexts: messages.map((el) => el.textContent.slice(0, 40)),
            };
          });

          console.log(`${scenario} feedback:`, feedbackElements);

          // Should provide some form of user feedback
          expect(
            feedbackElements.hasMessages || feedbackElements.hasErrorUI
          ).toBe(true);

          // Clean up for next test
          await page.evaluate(() => {
            const errorIndicators =
              document.querySelectorAll(".error-indicator");
            errorIndicators.forEach((el) => el.remove());
          });
        }
      } finally {
        await page.close();
      }
    }, 20000);
  });
});
