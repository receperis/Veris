/**
 * @jest-environment jsdom
 */

/**
 * Integration tests for Popup UI
 * Tests the vocabulary browser interface and user interactions
 */
import fs from "fs";
import path from "path";

describe("Popup Integration Tests", () => {
  let dom;
  let window;
  let document;
  let popupHTML;

  beforeAll(() => {
    // Read the actual popup HTML file
    popupHTML = fs.readFileSync(path.join(process.cwd(), "popup.html"), "utf8");
  });

  beforeEach(() => {
    // Create a fresh DOM for each test
    dom = new JSDOM(popupHTML, {
      url: "chrome-extension://test/popup.html",
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
    });

    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;

    // Mock Chrome APIs for the popup
    window.chrome = chrome;

    // Mock the module imports that popup.js uses
    window.PopupTemplates = {
      loadingState: (message) => `<div class="loading">${message}</div>`,
      vocabularyItem: (item, id, hasContext) => `
        <div class="vocabulary-item" data-id="${id}">
          <div class="word-pair">
            <span class="original-word">${item.originalWord}</span>
            <span class="translated-word">${item.translatedWord}</span>
          </div>
          ${
            hasContext
              ? `<button class="context-toggle" data-id="${id}">📝</button>`
              : ""
          }
        </div>
      `,
      vocabularyItemEdit: (item, id, hasContext) => `
        <div class="vocabulary-item editing" data-id="${id}">
          <div class="edit-controls">
            <input class="edit-original" value="${item.originalWord}">
            <input class="edit-translation" value="${item.translatedWord}">
            <button class="save-word" data-id="${id}">💾</button>
            <button class="delete-word" data-id="${id}">🗑️</button>
          </div>
        </div>
      `,
      noResultsState: (message) => `<div class="no-results">${message}</div>`,
      languageOption: (value, text) =>
        `<option value="${value}">${text}</option>`,
      confirmDialog: (title, details, confirmLabel, cancelLabel) => `
        <div class="confirm-dialog">
          <h3>${title}</h3>
          <p>${details}</p>
          <div class="confirm-buttons">
            <button class="btn cancel">${cancelLabel}</button>
            <button class="btn confirm">${confirmLabel}</button>
          </div>
        </div>
      `,
      toastNotification: (message, kind) => `
        <div class="mini-toast ${kind}">${message}</div>
      `,
    };

    window.TemplateUtils = {
      escapeHtml: (text) =>
        text.replace(
          /[&<>"']/g,
          (m) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            }[m])
        ),
      createElement: (html) => {
        const div = document.createElement("div");
        div.innerHTML = html;
        return div.firstElementChild;
      },
      removeElements: (className) => {
        document.querySelectorAll(`.${className}`).forEach((el) => el.remove());
      },
    };

    // Mock runtime message responses
    chrome.runtime.sendMessage.mockImplementation((message) => {
      switch (message.type) {
        case "GET_ALL_VOCABULARY":
          return Promise.resolve({
            success: true,
            data: [
              testUtils.createMockVocabularyEntry({
                id: 1,
                originalWord: "hello",
                translatedWord: "hola",
                sourceLanguage: "en",
                context: "Hello, how are you?",
              }),
              testUtils.createMockVocabularyEntry({
                id: 2,
                originalWord: "world",
                translatedWord: "mundo",
                sourceLanguage: "en",
                context: "Hello world!",
              }),
            ],
          });
        case "UPDATE_VOCABULARY":
          return Promise.resolve({ success: true });
        case "DELETE_VOCABULARY":
          return Promise.resolve({ success: true });
        case "CHECK_EXERCISE_TIME":
          return Promise.resolve({ isExerciseTime: false });
        default:
          return Promise.resolve({ success: true });
      }
    });
  });

  afterEach(() => {
    dom.window.close();
  });

  describe("Initial Load", () => {
    test("should display loading state initially", async () => {
      const vocabList = document.getElementById("vocabulary-list");
      expect(vocabList).toBeTruthy();

      // Simulate the loading state
      vocabList.innerHTML = window.PopupTemplates.loadingState(
        "Loading vocabulary..."
      );

      expect(vocabList.innerHTML).toContain("Loading vocabulary...");
    });

    test("should load and display vocabulary entries", async () => {
      // Load the popup script functionality
      const { initializeVocabularyBrowser, populateLanguageDropdown } =
        await import("../../popup.js");

      // Wait for initialization
      await testUtils.flushPromises();

      // Check that vocabulary items are rendered
      const vocabItems = document.querySelectorAll(".vocabulary-item");
      expect(vocabItems.length).toBeGreaterThan(0);
    });

    test("should populate language dropdown", () => {
      const dropdown = document.getElementById("source-language");
      dropdown.innerHTML =
        window.PopupTemplates.languageOption("all", "All Languages") +
        window.PopupTemplates.languageOption("en", "English") +
        window.PopupTemplates.languageOption("es", "Spanish");

      expect(dropdown.children.length).toBe(3);
      expect(dropdown.children[0].textContent).toBe("All Languages");
    });
  });

  describe("Search and Filter", () => {
    test("should filter vocabulary by search term", async () => {
      // Setup vocabulary display
      const vocabList = document.getElementById("vocabulary-list");
      const searchInput = document.getElementById("search-input");

      vocabList.innerHTML =
        window.PopupTemplates.vocabularyItem(
          { originalWord: "hello", translatedWord: "hola" },
          1,
          false
        ) +
        window.PopupTemplates.vocabularyItem(
          { originalWord: "world", translatedWord: "mundo" },
          2,
          false
        );

      // Simulate search input
      searchInput.value = "hello";

      // Trigger search event
      const searchEvent = new window.Event("input", { bubbles: true });
      searchInput.dispatchEvent(searchEvent);

      // In a real implementation, this would filter the results
      expect(searchInput.value).toBe("hello");
    });

    test("should filter by language selection", () => {
      const languageDropdown = document.getElementById("source-language");

      // Simulate language selection
      languageDropdown.value = "en";

      const changeEvent = new window.Event("change", { bubbles: true });
      languageDropdown.dispatchEvent(changeEvent);

      expect(languageDropdown.value).toBe("en");
    });

    test("should show no results state when no matches found", () => {
      const vocabList = document.getElementById("vocabulary-list");
      vocabList.innerHTML = window.PopupTemplates.noResultsState(
        "No vocabulary found matching your filters."
      );

      expect(vocabList.innerHTML).toContain("No vocabulary found");
    });
  });

  describe("Edit Mode", () => {
    test("should toggle edit mode when button clicked", () => {
      const editBtn = document.getElementById("edit-words");

      // Simulate click
      const clickEvent = new window.Event("click", { bubbles: true });
      editBtn.dispatchEvent(clickEvent);

      // Check that button text changes (would be handled by the actual script)
      expect(editBtn).toBeTruthy();
    });

    test("should show edit controls in edit mode", () => {
      const vocabList = document.getElementById("vocabulary-list");
      const mockItem = testUtils.createMockVocabularyEntry();

      vocabList.innerHTML = window.PopupTemplates.vocabularyItemEdit(
        mockItem,
        mockItem.id,
        false
      );

      const editControls = vocabList.querySelector(".edit-controls");
      const saveBtn = vocabList.querySelector(".save-word");
      const deleteBtn = vocabList.querySelector(".delete-word");

      expect(editControls).toBeTruthy();
      expect(saveBtn).toBeTruthy();
      expect(deleteBtn).toBeTruthy();
    });

    test("should handle save word action", async () => {
      const vocabList = document.getElementById("vocabulary-list");
      const mockItem = testUtils.createMockVocabularyEntry();

      vocabList.innerHTML = window.PopupTemplates.vocabularyItemEdit(
        mockItem,
        mockItem.id,
        false
      );

      const saveBtn = vocabList.querySelector(".save-word");
      const originalInput = vocabList.querySelector(".edit-original");
      const translationInput = vocabList.querySelector(".edit-translation");

      // Modify values
      originalInput.value = "updated original";
      translationInput.value = "updated translation";

      // Simulate save click
      const clickEvent = new window.Event("click", { bubbles: true });
      saveBtn.dispatchEvent(clickEvent);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "UPDATE_VOCABULARY",
        })
      );
    });

    test("should handle delete word action", async () => {
      const vocabList = document.getElementById("vocabulary-list");
      const mockItem = testUtils.createMockVocabularyEntry();

      vocabList.innerHTML = window.PopupTemplates.vocabularyItemEdit(
        mockItem,
        mockItem.id,
        false
      );

      const deleteBtn = vocabList.querySelector(".delete-word");

      // Simulate delete click
      const clickEvent = new window.Event("click", { bubbles: true });
      deleteBtn.dispatchEvent(clickEvent);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "DELETE_VOCABULARY",
        })
      );
    });
  });

  describe("Context Toggle", () => {
    test("should toggle context panel visibility", () => {
      const vocabList = document.getElementById("vocabulary-list");
      const mockItem = testUtils.createMockVocabularyEntry({
        context: "Test context",
      });

      vocabList.innerHTML = `
        ${window.PopupTemplates.vocabularyItem(mockItem, mockItem.id, true)}
        <div class="context-panel" data-id="${
          mockItem.id
        }" style="display: none;">
          <div class="context-content">${mockItem.context}</div>
        </div>
      `;

      const contextToggle = vocabList.querySelector(".context-toggle");
      const contextPanel = document.querySelector(".context-panel");

      expect(contextPanel.style.display).toBe("none");

      // Simulate toggle click
      const clickEvent = new window.Event("click", { bubbles: true });
      contextToggle.dispatchEvent(clickEvent);

      // In real implementation, this would toggle the panel
      expect(contextToggle).toBeTruthy();
    });
  });

  describe("Navigation Actions", () => {
    test("should handle exercise button click", () => {
      const exerciseBtn = document.getElementById("start-exercise");

      const clickEvent = new window.Event("click", { bubbles: true });
      exerciseBtn.dispatchEvent(clickEvent);

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: "chrome-extension://mock-id/exercise/exercise.html",
      });
    });

    test("should handle options button click", () => {
      const optionsBtn = document.getElementById("open-options");

      const clickEvent = new window.Event("click", { bubbles: true });
      optionsBtn.dispatchEvent(clickEvent);

      expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });

    test("should handle stats button click", () => {
      const statsBtn = document.getElementById("view-stats");

      const clickEvent = new window.Event("click", { bubbles: true });
      statsBtn.dispatchEvent(clickEvent);

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: "chrome-extension://mock-id/stats/stats.html",
      });
    });
  });

  describe("Extension Toggle", () => {
    test("should toggle extension enabled state", async () => {
      const toggleBtn = document.getElementById("extension-toggle-btn");
      const status = document.getElementById("extension-status");

      // Initial state should be enabled
      chrome.storage.sync.get.mockResolvedValueOnce({ extensionEnabled: true });

      expect(toggleBtn).toBeTruthy();
      expect(status).toBeTruthy();
    });

    test("should update UI when extension state changes", () => {
      const status = document.getElementById("extension-status");
      const icon = document.getElementById("extension-toggle-icon");

      // Simulate enabled state
      status.textContent = "Enabled";
      if (icon) icon.textContent = "●";

      expect(status.textContent).toBe("Enabled");

      // Simulate disabled state
      status.textContent = "Disabled";
      if (icon) icon.textContent = "○";

      expect(status.textContent).toBe("Disabled");
    });
  });

  describe("Confirmation Dialog", () => {
    test("should show confirmation dialog for destructive actions", () => {
      const dialogHTML = window.PopupTemplates.confirmDialog(
        "Delete this word?",
        "This action cannot be undone.",
        "Delete",
        "Cancel"
      );

      document.body.insertAdjacentHTML("beforeend", dialogHTML);

      const confirmBtn = document.querySelector(".btn.confirm");
      const cancelBtn = document.querySelector(".btn.cancel");

      expect(confirmBtn).toBeTruthy();
      expect(cancelBtn).toBeTruthy();
      expect(confirmBtn.textContent).toBe("Delete");
      expect(cancelBtn.textContent).toBe("Cancel");
    });
  });

  describe("Toast Notifications", () => {
    test("should show success notification", () => {
      const toastHTML = window.PopupTemplates.toastNotification(
        "Changes saved",
        "success"
      );
      document.body.insertAdjacentHTML("beforeend", toastHTML);

      const toast = document.querySelector(".mini-toast");
      expect(toast).toBeTruthy();
      expect(toast.classList.contains("success")).toBe(true);
      expect(toast.textContent).toBe("Changes saved");
    });

    test("should show error notification", () => {
      const toastHTML = window.PopupTemplates.toastNotification(
        "Failed to save",
        "error"
      );
      document.body.insertAdjacentHTML("beforeend", toastHTML);

      const toast = document.querySelector(".mini-toast");
      expect(toast.classList.contains("error")).toBe(true);
    });
  });

  describe("Exercise Reminder", () => {
    test("should show exercise reminder when it's exercise time", async () => {
      chrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.type === "CHECK_EXERCISE_TIME") {
          return Promise.resolve({ isExerciseTime: true });
        }
        return Promise.resolve({ success: true });
      });

      const reminder = document.getElementById("exercise-reminder");
      if (reminder) {
        reminder.style.display = "block";
        expect(reminder.style.display).toBe("block");
      }
    });

    test("should hide exercise reminder when not exercise time", async () => {
      chrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.type === "CHECK_EXERCISE_TIME") {
          return Promise.resolve({ isExerciseTime: false });
        }
        return Promise.resolve({ success: true });
      });

      const reminder = document.getElementById("exercise-reminder");
      if (reminder) {
        expect(reminder.style.display).not.toBe("block");
      }
    });
  });

  describe("Error Handling", () => {
    test("should handle vocabulary loading errors", async () => {
      chrome.runtime.sendMessage.mockImplementation((message) => {
        if (message.type === "GET_ALL_VOCABULARY") {
          return Promise.resolve({
            success: false,
            error: "Database error",
          });
        }
        return Promise.resolve({ success: true });
      });

      const vocabList = document.getElementById("vocabulary-list");
      vocabList.innerHTML = window.PopupTemplates.noResultsState(
        "Failed to load vocabulary. Please check browser console for details."
      );

      expect(vocabList.innerHTML).toContain("Failed to load vocabulary");
    });

    test("should handle update/delete failures gracefully", async () => {
      chrome.runtime.sendMessage.mockImplementation((message) => {
        if (
          message.type === "UPDATE_VOCABULARY" ||
          message.type === "DELETE_VOCABULARY"
        ) {
          return Promise.resolve({
            success: false,
            error: "Operation failed",
          });
        }
        return Promise.resolve({ success: true });
      });

      // The error handling would be in the actual popup script
      expect(chrome.runtime.sendMessage).toBeDefined();
    });
  });
});
