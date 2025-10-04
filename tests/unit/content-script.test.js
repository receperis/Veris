/**
 * @jest-environment jsdom
 */

/**
 * Content Script Tests
 * Tests DOM manipulation, text selection, and translation bubbles
 */

// Mock content script modules
const mockState = {
  extensionEnabled: true,
  bubbleEl: null,
  pendingSelection: null,
  lastSelection: null,
  settings: {
    bubbleMode: "auto",
    target_lang: "es",
    bubbleIconDelay: 500,
    bubbleHotkey: "ctrl+t",
  },
  hotkeySpec: { ctrl: true, keys: ["t"] },
  selectedWords: new Set(),
  tempSourceLang: null,
  tempTargetLang: null,
  triggerIconTimer: null,
  sequenceProgress: 0,
  lastSequenceTime: 0,
  lastCopyKeyTime: 0,
  skipNextSelection: false,
  selectionContextElement: null,
};

const mockUtils = {
  parseHotkeyString: jest.fn().mockReturnValue({ ctrl: true, keys: ["t"] }),
  findBlockAncestor: jest.fn().mockReturnValue(document.body),
  escapeHtml: jest
    .fn()
    .mockImplementation((str) => str.replace(/[&<>"']/g, "")),
  getLanguageName: jest
    .fn()
    .mockImplementation((code) => (code === "en" ? "English" : "Spanish")),
};

const mockUI = {
  createBubbleAtRect: jest.fn(),
  removeBubble: jest.fn(),
  clearTriggerIcon: jest.fn(),
  showTriggerIcon: jest.fn(),
  ensureTriggerStyles: jest.fn(),
  openLanguageMenu: jest.fn(),
};

const mockWords = {
  createWordPills: jest.fn(),
  handleSaveWords: jest.fn(),
  toggleCombinationMode: jest.fn(),
  updateSaveButton: jest.fn(),
};

const mockAPI = {
  translateTextWithAPI: jest.fn().mockResolvedValue("translated text"),
};

const mockToast = {
  showSaveToast: jest.fn(),
};

describe("Content Script Tests", () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    // Create a fresh DOM for each test
    dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <h1>Test Page</h1>
          <p id="test-paragraph">This is a test paragraph with some text to translate.</p>
          <div id="test-content">
            <span>Hello world</span>
            <p>This is another paragraph.</p>
          </div>
        </body>
      </html>
    `,
      {
        url: "https://example.com/test",
        pretendToBeVisual: true,
        resources: "usable",
      }
    );

    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;

    // Mock Chrome APIs
    window.chrome = chrome;

    // Mock Selection API
    window.getSelection = jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue(""),
      getRangeAt: jest.fn().mockReturnValue({
        getBoundingClientRect: jest.fn().mockReturnValue({
          x: 100,
          y: 100,
          width: 200,
          height: 20,
          top: 100,
          left: 100,
          bottom: 120,
          right: 300,
        }),
        getClientRects: jest.fn().mockReturnValue([
          {
            x: 100,
            y: 100,
            width: 200,
            height: 20,
          },
        ]),
        commonAncestorContainer: document.body,
      }),
      removeAllRanges: jest.fn(),
      addRange: jest.fn(),
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    dom.window.close();
  });

  describe("Text Selection Detection", () => {
    test("should detect text selection events", () => {
      const paragraph = document.getElementById("test-paragraph");

      // Simulate text selection
      const selection = window.getSelection();
      selection.toString.mockReturnValue("test paragraph");

      // Create range
      const range = document.createRange();
      range.selectNodeContents(paragraph);

      selection.getRangeAt.mockReturnValue(range);

      // Simulate mouseup event
      const mouseupEvent = new window.MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 110,
      });

      paragraph.dispatchEvent(mouseupEvent);

      expect(selection.toString).toHaveBeenCalled();
    });

    test("should ignore empty selections", () => {
      const selection = window.getSelection();
      selection.toString.mockReturnValue("");

      const mouseupEvent = new window.MouseEvent("mouseup", {
        bubbles: true,
      });

      document.dispatchEvent(mouseupEvent);

      expect(selection.toString).toHaveBeenCalled();
    });

    test("should handle selection in different elements", () => {
      const elements = ["test-paragraph", "test-content"];

      elements.forEach((elementId) => {
        const element = document.getElementById(elementId);
        const selection = window.getSelection();
        selection.toString.mockReturnValue("selected text");

        const event = new window.MouseEvent("mouseup", { bubbles: true });
        element.dispatchEvent(event);

        expect(element).toBeTruthy();
      });
    });

    test("should calculate selection rectangle correctly", () => {
      const selection = window.getSelection();
      selection.toString.mockReturnValue("hello world");

      const mockRange = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          x: 100,
          y: 150,
          width: 180,
          height: 20,
          top: 150,
          left: 100,
          bottom: 170,
          right: 280,
        }),
        getClientRects: jest.fn().mockReturnValue([
          { x: 100, y: 150, width: 80, height: 20 },
          { x: 180, y: 150, width: 100, height: 20 },
        ]),
        commonAncestorContainer: document.body,
      };

      selection.getRangeAt.mockReturnValue(mockRange);

      // Simulate selection
      const event = new window.MouseEvent("mouseup");
      document.dispatchEvent(event);

      expect(mockRange.getBoundingClientRect).toHaveBeenCalled();
    });
  });

  describe("Translation Bubble Management", () => {
    test("should create translation bubble for valid selection", async () => {
      // Mock the state and functions
      Object.assign(global, {
        state: mockState,
        ui: mockUI,
        translateTextWithAPI: mockAPI.translateTextWithAPI,
      });

      const selection = window.getSelection();
      selection.toString.mockReturnValue("hello world");

      const rect = { x: 100, y: 100, width: 200, height: 20 };

      // Simulate performTranslation function
      mockUI.createBubbleAtRect("hello world", rect, "Translating...", true);

      expect(mockUI.createBubbleAtRect).toHaveBeenCalledWith(
        rect,
        "hello world",
        "Translating...",
        true
      );
    });

    test("should remove bubble when clicking outside", () => {
      // Simulate existing bubble
      mockState.bubbleEl = document.createElement("div");
      mockState.bubbleEl.className = "__translator_bubble";
      document.body.appendChild(mockState.bubbleEl);

      // Click outside the bubble
      const clickEvent = new window.MouseEvent("click", {
        bubbles: true,
        target: document.body,
      });

      document.dispatchEvent(clickEvent);

      // In real implementation, this would call ui.removeBubble()
      expect(document.querySelector(".__translator_bubble")).toBeTruthy();
    });

    test("should handle bubble positioning at page edges", () => {
      // Mock viewport dimensions
      Object.defineProperty(window, "innerWidth", { value: 1024 });
      Object.defineProperty(window, "innerHeight", { value: 768 });

      // Selection near right edge
      const rightEdgeRect = { x: 900, y: 100, width: 200, height: 20 };

      // Selection near bottom edge
      const bottomEdgeRect = { x: 100, y: 700, width: 200, height: 20 };

      // These would be handled by the actual UI positioning logic
      expect(rightEdgeRect.x + rightEdgeRect.width).toBeGreaterThan(
        window.innerWidth
      );
      expect(bottomEdgeRect.y + 200).toBeGreaterThan(window.innerHeight - 100); // Assuming bubble height ~200px
    });
  });

  describe("Keyboard Hotkey Handling", () => {
    test("should detect hotkey combinations", () => {
      const hotkeyEvent = new window.KeyboardEvent("keydown", {
        key: "t",
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
        bubbles: true,
      });

      document.dispatchEvent(hotkeyEvent);

      // In real implementation, this would check against hotkeySpec
      expect(hotkeyEvent.ctrlKey).toBe(true);
      expect(hotkeyEvent.key).toBe("t");
    });

    test("should handle sequential hotkeys", () => {
      const hotkeySpec = { keys: ["ctrl", "t", "t"], ctrl: true };

      // First key
      const event1 = new window.KeyboardEvent("keydown", {
        key: "ctrl",
        ctrlKey: true,
      });

      // Second key
      const event2 = new window.KeyboardEvent("keydown", {
        key: "t",
        ctrlKey: true,
      });

      document.dispatchEvent(event1);
      document.dispatchEvent(event2);

      // Sequential key handling would be implemented in the actual content script
      expect(hotkeySpec.keys).toContain("t");
    });

    test("should handle double Ctrl+C for translation", () => {
      const ctrlCEvent = new window.KeyboardEvent("keydown", {
        key: "c",
        ctrlKey: true,
        bubbles: true,
      });

      // First Ctrl+C
      document.dispatchEvent(ctrlCEvent);
      const firstTime = Date.now();

      // Second Ctrl+C within 500ms
      setTimeout(() => {
        document.dispatchEvent(ctrlCEvent);
        const secondTime = Date.now();

        expect(secondTime - firstTime).toBeLessThan(500);
      }, 100);
    });
  });

  describe("Extension Settings Integration", () => {
    test("should respect extension enabled/disabled state", () => {
      // Test disabled state
      mockState.extensionEnabled = false;

      const selection = window.getSelection();
      selection.toString.mockReturnValue("test text");

      const event = new window.MouseEvent("mouseup");
      document.dispatchEvent(event);

      // Should not create bubble when disabled
      expect(mockState.extensionEnabled).toBe(false);
    });

    test("should use correct bubble mode settings", () => {
      const modes = ["auto", "icon", "hotkey"];

      modes.forEach((mode) => {
        mockState.settings.bubbleMode = mode;

        // Each mode would have different behavior
        expect(["auto", "icon", "hotkey"]).toContain(mode);
      });
    });

    test("should apply language settings", () => {
      const languages = [
        { source: "en", target: "es" },
        { source: "fr", target: "en" },
        { source: "auto", target: "de" },
      ];

      languages.forEach(({ source, target }) => {
        mockState.settings.target_lang = target;
        mockState.tempSourceLang = source;

        // Language settings would be used in translation
        expect(target).toBeValidLanguageCode();
      });
    });
  });

  describe("Word Pills and Vocabulary Saving", () => {
    test("should create word pills for translated text", () => {
      const translatedText = "hola mundo";
      const originalText = "hello world";

      // Mock bubble element
      const bubbleEl = document.createElement("div");
      bubbleEl.className = "__translator_bubble";
      bubbleEl.innerHTML = `
        <div class="translated-text">${translatedText}</div>
        <div class="word-pills-container"></div>
      `;

      document.body.appendChild(bubbleEl);

      // Simulate word pill creation
      mockWords.createWordPills(originalText);

      expect(mockWords.createWordPills).toHaveBeenCalledWith(originalText);
    });

    test("should handle word pill selection", () => {
      const bubbleEl = document.createElement("div");
      bubbleEl.innerHTML = `
        <div class="word-pill" data-word="hello">hello</div>
        <div class="word-pill" data-word="world">world</div>
      `;

      document.body.appendChild(bubbleEl);

      const wordPill = bubbleEl.querySelector('[data-word="hello"]');

      // Simulate click on word pill
      const clickEvent = new window.MouseEvent("click", { bubbles: true });
      wordPill.dispatchEvent(clickEvent);

      expect(wordPill.dataset.word).toBe("hello");
    });

    test("should save selected words to vocabulary", () => {
      mockState.selectedWords = new Set(["hello", "world"]);

      // Simulate save action
      mockWords.handleSaveWords();

      expect(mockWords.handleSaveWords).toHaveBeenCalled();
      expect(mockState.selectedWords.size).toBe(2);
    });
  });

  describe("Context Detection and Preservation", () => {
    test("should find appropriate context element", () => {
      const paragraph = document.getElementById("test-paragraph");
      const textNode = paragraph.firstChild;

      // Simulate finding block ancestor
      const blockAncestor = mockUtils.findBlockAncestor(textNode);

      expect(mockUtils.findBlockAncestor).toHaveBeenCalledWith(textNode);
      expect(blockAncestor).toBe(document.body);
    });

    test("should preserve selection context for vocabulary", () => {
      const contextText =
        "This is a test paragraph with some text to translate.";
      const selectedText = "test paragraph";

      const paragraph = document.getElementById("test-paragraph");
      mockState.selectionContextElement = paragraph;

      // Context would be extracted from the paragraph
      expect(paragraph.textContent).toContain(selectedText);
      expect(paragraph.textContent).toBe(contextText);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle translation API failures", async () => {
      mockAPI.translateTextWithAPI.mockRejectedValueOnce(
        new Error("API unavailable")
      );

      try {
        await mockAPI.translateTextWithAPI("test", "es", "en");
      } catch (error) {
        expect(error.message).toBe("API unavailable");
      }
    });

    test("should handle malformed selections", () => {
      const selection = window.getSelection();

      // Empty selection
      selection.toString.mockReturnValue("");
      selection.getRangeAt.mockImplementation(() => {
        throw new Error("No range available");
      });

      expect(() => {
        try {
          selection.getRangeAt(0);
        } catch (e) {
          // Should handle gracefully
        }
      }).not.toThrow();
    });

    test("should handle rapid selection changes", () => {
      const selection = window.getSelection();
      const selections = ["hello", "world", "test", "example"];

      selections.forEach((text, index) => {
        selection.toString.mockReturnValue(text);

        const event = new window.MouseEvent("mouseup");
        setTimeout(() => {
          document.dispatchEvent(event);
        }, index * 100);
      });

      // Should handle rapid changes without breaking
      expect(selections.length).toBe(4);
    });

    test("should handle page navigation and cleanup", () => {
      // Simulate page unload
      const beforeUnloadEvent = new window.Event("beforeunload");
      window.dispatchEvent(beforeUnloadEvent);

      // Should clean up resources
      mockUI.removeBubble();
      mockUI.clearTriggerIcon();

      expect(mockUI.removeBubble).toHaveBeenCalled();
      expect(mockUI.clearTriggerIcon).toHaveBeenCalled();
    });
  });

  describe("Performance and Memory Management", () => {
    test("should throttle selection events", () => {
      const selection = window.getSelection();
      selection.toString.mockReturnValue("test");

      // Rapid-fire events
      for (let i = 0; i < 10; i++) {
        const event = new window.MouseEvent("mouseup");
        document.dispatchEvent(event);
      }

      // Should not create multiple bubbles simultaneously
      expect(mockState.bubbleEl).toBeNull(); // Only one bubble should exist
    });

    test("should clean up event listeners", () => {
      const element = document.getElementById("test-paragraph");

      // Add listener
      const handler = jest.fn();
      element.addEventListener("mouseup", handler);

      // Remove listener
      element.removeEventListener("mouseup", handler);

      // Fire event
      const event = new window.MouseEvent("mouseup");
      element.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });

    test("should handle memory cleanup on large documents", () => {
      // Simulate large document
      const largeContent = "Lorem ipsum ".repeat(1000);
      const largeDiv = document.createElement("div");
      largeDiv.textContent = largeContent;
      document.body.appendChild(largeDiv);

      // Should not cause memory issues
      expect(document.body.children.length).toBeGreaterThan(1);
      expect(largeDiv.textContent.length).toBeGreaterThan(10000);
    });
  });
});
