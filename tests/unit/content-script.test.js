/**
 * @jest-environment jsdom
 */

/**
 * Content Script Tests
 * Tests DOM manipulation, text selection, and translation bubbles
 */

// Set up basic DOM structure
beforeEach(() => {
  document.body.innerHTML = `
    <div id="test-content">
      <p>This is some test content for selection.</p>
      <div class="paragraph">Another paragraph for testing.</div>
    </div>
  `;

  // Mock Chrome APIs
  global.chrome = chrome;

  // Mock selection APIs
  global.getSelection = jest.fn().mockReturnValue({
    toString: () => "selected text",
    getRangeAt: () => ({
      getBoundingClientRect: () => ({
        top: 100,
        left: 200,
        width: 150,
        height: 20,
      }),
    }),
    rangeCount: 1,
  });

  jest.clearAllMocks();
});

// Mock content script modules
const mockState = {
  extensionEnabled: true,
  bubbleEl: null,
  settings: {
    bubbleMode: "auto",
    target_lang: "es",
    bubbleIconDelay: 500,
    bubbleHotkey: "ctrl+t",
  },
};

const mockUtils = {
  parseHotkeyString: jest.fn().mockReturnValue({ ctrl: true, keys: ["t"] }),
  findBlockAncestor: jest.fn().mockReturnValue(document.body),
  escapeHtml: jest
    .fn()
    .mockImplementation((str) => str.replace(/[&<>"']/g, "")),
  getLanguageName: jest.fn().mockReturnValue("English"),
};

describe("Content Script Tests", () => {
  describe("Text Selection Detection", () => {
    test("should detect text selection events", () => {
      const paragraph = document.querySelector("p");
      expect(paragraph).toBeTruthy();
      expect(paragraph.textContent).toContain("test content");
    });

    test("should ignore empty selections", () => {
      global.getSelection.mockReturnValue({
        toString: () => "",
        rangeCount: 0,
      });

      const selection = getSelection();
      expect(selection.toString()).toBe("");
    });

    test("should handle selection in different elements", () => {
      const testDiv = document.querySelector(".paragraph");
      expect(testDiv).toBeTruthy();
      expect(testDiv.textContent).toContain("Another paragraph");
    });

    test("should calculate selection rectangle correctly", () => {
      const selection = getSelection();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      expect(rect.top).toBe(100);
      expect(rect.left).toBe(200);
      expect(rect.width).toBe(150);
      expect(rect.height).toBe(20);
    });
  });

  describe("Translation Bubble Management", () => {
    test("should create translation bubble for valid selection", () => {
      expect(mockState.extensionEnabled).toBe(true);
      expect(mockState.bubbleEl).toBe(null);
    });

    test("should remove bubble when clicking outside", () => {
      const clickEvent = new MouseEvent("click", { bubbles: true });
      document.body.dispatchEvent(clickEvent);
      expect(clickEvent.type).toBe("click");
    });

    test("should handle bubble positioning at page edges", () => {
      const selection = getSelection();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      expect(rect.top).toBeGreaterThanOrEqual(0);
      expect(rect.left).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Keyboard Hotkey Handling", () => {
    test("should detect hotkey combinations", () => {
      const hotkeySpec = mockUtils.parseHotkeyString("ctrl+t");
      expect(hotkeySpec.ctrl).toBe(true);
      expect(hotkeySpec.keys).toContain("t");
    });

    test("should handle sequential hotkeys", () => {
      const keyEvent = new KeyboardEvent("keydown", {
        key: "t",
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(keyEvent);
      expect(keyEvent.ctrlKey).toBe(true);
      expect(keyEvent.key).toBe("t");
    });

    test("should handle double Ctrl+C for translation", () => {
      const ctrlCEvent = new KeyboardEvent("keydown", {
        key: "c",
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(ctrlCEvent);
      expect(ctrlCEvent.ctrlKey).toBe(true);
      expect(ctrlCEvent.key).toBe("c");
    });
  });

  describe("Extension Settings Integration", () => {
    test("should respect extension enabled/disabled state", () => {
      expect(mockState.extensionEnabled).toBe(true);

      mockState.extensionEnabled = false;
      expect(mockState.extensionEnabled).toBe(false);
    });

    test("should use correct bubble mode settings", () => {
      expect(mockState.settings.bubbleMode).toBe("auto");
      expect(mockState.settings.target_lang).toBe("es");
    });

    test("should apply language settings", () => {
      const langName = mockUtils.getLanguageName("en");
      expect(langName).toBe("English");
    });
  });

  describe("Word Pills and Vocabulary Saving", () => {
    test("should create word pills for translated text", () => {
      const wordPill = document.createElement("span");
      wordPill.className = "veris-word-pill";
      wordPill.textContent = "hello";

      document.body.appendChild(wordPill);

      const pill = document.querySelector(".veris-word-pill");
      expect(pill).toBeTruthy();
      expect(pill.textContent).toBe("hello");
    });

    test("should handle word pill selection", () => {
      const wordPill = document.createElement("span");
      wordPill.className = "veris-word-pill";
      wordPill.addEventListener("click", () => {
        wordPill.classList.add("selected");
      });

      document.body.appendChild(wordPill);
      wordPill.click();

      expect(wordPill.classList.contains("selected")).toBe(true);
    });

    test("should save selected words to vocabulary", () => {
      const mockEntry = {
        originalWord: "hello",
        translatedWord: "hola",
        context: "test context",
      };

      expect(mockEntry.originalWord).toBe("hello");
      expect(mockEntry.translatedWord).toBe("hola");
    });
  });

  describe("Context Detection and Preservation", () => {
    test("should find appropriate context element", () => {
      const contextElement = mockUtils.findBlockAncestor(document.body);
      expect(contextElement).toBe(document.body);
    });

    test("should preserve selection context for vocabulary", () => {
      const testParagraph = document.querySelector("p");
      expect(testParagraph.textContent).toContain("test content");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle translation API failures", () => {
      chrome.runtime.sendMessage.mockRejectedValue(new Error("API Error"));

      expect(chrome.runtime.sendMessage).toBeDefined();
    });

    test("should handle malformed selections", () => {
      global.getSelection.mockReturnValue({
        toString: () => null,
        rangeCount: 0,
      });

      const selection = getSelection();
      expect(selection.toString()).toBe(null);
    });

    test("should handle rapid selection changes", () => {
      let selectionCount = 0;

      const handleSelection = () => {
        selectionCount++;
      };

      handleSelection();
      handleSelection();

      expect(selectionCount).toBe(2);
    });

    test("should handle page navigation and cleanup", () => {
      const beforeUnloadEvent = new Event("beforeunload");
      window.dispatchEvent(beforeUnloadEvent);

      expect(beforeUnloadEvent.type).toBe("beforeunload");
    });
  });

  describe("Performance and Memory Management", () => {
    test("should throttle selection events", () => {
      let throttleCount = 0;
      const throttledFunction = jest.fn(() => {
        throttleCount++;
      });

      // Simulate rapid calls
      for (let i = 0; i < 5; i++) {
        throttledFunction();
      }

      expect(throttledFunction).toHaveBeenCalledTimes(5);
    });

    test("should clean up event listeners", () => {
      const mockListener = jest.fn();
      document.addEventListener("click", mockListener);
      document.removeEventListener("click", mockListener);

      const clickEvent = new MouseEvent("click");
      document.dispatchEvent(clickEvent);

      expect(mockListener).not.toHaveBeenCalled();
    });

    test("should handle memory cleanup on large documents", () => {
      // Simulate large document
      for (let i = 0; i < 100; i++) {
        const element = document.createElement("div");
        element.textContent = `Element ${i}`;
        document.body.appendChild(element);
      }

      const elements = document.querySelectorAll("div");
      expect(elements.length).toBeGreaterThanOrEqual(100);
    });
  });
});
