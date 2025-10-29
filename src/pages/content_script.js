// Content script (ES module) - clean entrypoint that wires modularized implementation
import { state, defaultSettings } from "../content/state.js";
import {
  parseHotkeyString,
  findBlockAncestor,
  escapeHtml,
  getLanguageName,
} from "../content/utils.js";
import * as ui from "../content/ui.js";
import * as words from "../content/words.js";
import { translateTextWithAPI } from "../content/api.js";
import { showLoadingToast, showInfoToast } from "../content/toast.js";
import { languageDetector } from "../shared/language-detection.js";
import { getSetting, getSettings } from "../shared/storage.js";

import "./content_script.css";

/**
 * Initialize extension state from storage
 * @private
 */
async function initializeExtensionState() {
  state.extensionEnabled = await getSetting("extensionEnabled", true);
}

/**
 * Robust language detection with caching and fallback
 * @param {boolean} fallbackToAuto - Whether to fallback to 'auto' if detection fails
 * @returns {Promise<string|null>} Detected language code
 */
async function getSourceLanguage(fallbackToAuto = true) {
  const currentUrl = window.location.href;
  return await languageDetector.detect(currentUrl, fallbackToAuto);
}

/**
 * Create language indicator UI for translation bubble
 * @private
 * @param {string} sourceLang - Source language code
 * @param {string} targetLang - Target language code
 */
function renderLanguageIndicator(sourceLang, targetLang) {
  if (state.bubbleEl.querySelector(".language-indicator:not(.fallback)")) {
    return; // Already exists
  }

  const languageInfo = {
    sourceLang: getLanguageName(sourceLang),
    targetLang: getLanguageName(targetLang),
  };

  const languageIndicator = document.createElement("div");
  languageIndicator.className = "language-indicator";
  languageIndicator.innerHTML = `<div class="language-badge source-lang"><span class="lang-label">${escapeHtml(
    languageInfo.sourceLang
  )}</span></div><div class="language-arrow">→</div><div class="language-badge target-lang"><span class="lang-label">${escapeHtml(
    languageInfo.targetLang
  )}</span></div>`;

  const closeBtn = state.bubbleEl.querySelector(".close-btn");
  if (closeBtn && closeBtn.nextSibling) {
    state.bubbleEl.insertBefore(languageIndicator, closeBtn.nextSibling);
  }

  // Add click handlers for language badges
  const targetBadge = languageIndicator.querySelector(
    ".language-badge.target-lang"
  );
  targetBadge?.addEventListener("click", (e) => {
    e.stopPropagation();
    ui.openLanguageMenu(targetBadge, retranslateBubble);
  });

  const sourceBadge = languageIndicator.querySelector(
    ".language-badge.source-lang"
  );
  sourceBadge?.addEventListener("click", (e) => {
    e.stopPropagation();
    ui.openLanguageMenu(sourceBadge, retranslateWithNewSourceLang);
  });
}

/**
 * Set up bubble UI elements and event handlers
 * @private
 * @param {string} text - Original text that was translated
 */
function setupBubbleInteractions(text) {
  if (!state.bubbleEl) return;

  words.renderWordPills(text);

  const saveBtn = state.bubbleEl.querySelector(".save-button-translate");
  saveBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    words.handleSaveWords();
  });

  const combinationBtn = state.bubbleEl.querySelector(".combination-btn");
  combinationBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    words.toggleCombinationMode();
  });
}

/**
 * Perform translation and update bubble UI
 * @param {string} text - Text to translate
 * @param {DOMRect} rect - Position for the translation bubble
 */
async function performTranslation(text, rect) {
  ui.createBubbleAtRect(rect, text, "Translating...", true);
  state.settings = await getSettings(defaultSettings);
  state.hotkeySpec = parseHotkeyString(state.settings.bubbleHotkey);

  // Use the improved language detection
  let sourceLanguage = state.tempSourceLang || (await getSourceLanguage());
  let translated;

  try {
    translated = await translateTextWithAPI(
      text,
      state.settings.target_lang,
      sourceLanguage
    );
  } catch (err) {
    console.error("Translation failed:", err);
    translated = "Translation not available: " + err.message;
  }

  if (state.bubbleEl) {
    state.bubbleEl.classList.remove("__translator_loading");
    state.bubbleEl.setAttribute("data-selection", text);

    const transNode = state.bubbleEl.querySelector(".translated-text");
    if (transNode) transNode.textContent = translated;

    renderLanguageIndicator(
      sourceLanguage,
      state.tempTargetLang || state.settings.target_lang
    );

    setupBubbleInteractions(text);
  }
}

/**
 * Trigger translation from pending selection
 */
function triggerTranslationFromPending() {
  if (!state.pendingSelection) return;
  if (!state.extensionEnabled) {
    state.pendingSelection = null;
    ui.clearTriggerIcon();
    return;
  }
  const { text, rect } = state.pendingSelection;
  ui.clearTriggerIcon();
  performTranslation(text, rect);
  state.pendingSelection = null;
}

/**
 * Clear word translation state for retranslation
 * @private
 */
function clearWordTranslationState() {
  const wordTransDiv = state.bubbleEl.querySelector(".word-translation");
  if (wordTransDiv) {
    wordTransDiv.innerHTML = "";
    wordTransDiv.classList.remove("show");
  }

  const pills = state.bubbleEl.querySelectorAll(".word-pill");
  pills.forEach((p) => p.classList.remove("active", "selected"));

  state.selectedWords.clear();
  words.updateSaveButton();
}

/**
 * Retranslate bubble with new target language
 * @param {string} newTarget - New target language code
 */
async function retranslateBubble(newTarget) {
  if (!state.bubbleEl || !state.lastSelection) return;

  const transNode = state.bubbleEl.querySelector(".translated-text");
  if (transNode) transNode.textContent = "Translating...";

  state.tempTargetLang = newTarget;

  let sourceLanguage = state.tempSourceLang || (await getSourceLanguage());

  try {
    const result = await translateTextWithAPI(
      state.lastSelection,
      newTarget,
      sourceLanguage
    );
    if (transNode) transNode.textContent = result;
  } catch (err) {
    if (transNode) transNode.textContent = "Translation failed: " + err.message;
  }

  const targetBadgeLabel = state.bubbleEl.querySelector(
    ".language-badge.target-lang .lang-label"
  );
  if (targetBadgeLabel) {
    targetBadgeLabel.textContent = getLanguageName(newTarget);
  }

  // Retranslate existing individual word translations and combinations
  // instead of clearing them completely
  await words.retranslateExistingWords();
}

/**
 * Retranslate bubble with new source language
 * @param {string} newSource - New source language code
 */
async function retranslateWithNewSourceLang(newSource) {
  if (!state.bubbleEl || !state.lastSelection) return;

  const transNode = state.bubbleEl.querySelector(".translated-text");
  if (transNode) transNode.textContent = "Translating...";

  state.tempSourceLang = newSource;

  const targetLang = state.tempTargetLang || state.settings.target_lang;

  try {
    const result = await translateTextWithAPI(
      state.lastSelection,
      targetLang,
      newSource
    );
    if (transNode) transNode.textContent = result;
  } catch (err) {
    if (transNode) transNode.textContent = "Translation failed: " + err.message;
  }

  const sourceBadgeLabel = state.bubbleEl.querySelector(
    ".language-badge.source-lang .lang-label"
  );
  if (sourceBadgeLabel) {
    sourceBadgeLabel.textContent = getLanguageName(newSource);
  }

  // Retranslate existing individual word translations and combinations
  // instead of clearing them completely
  await words.retranslateExistingWords();
}

/**
 * Check if selection is in an input field that should be ignored
 * @private
 * @param {Selection} selection - Browser selection object
 * @returns {boolean} True if selection should be ignored
 */
function shouldIgnoreSelection(selection) {
  if (selection.rangeCount > 0) {
    try {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      let inputElement = container.querySelector?.("input, textarea");

      if (inputElement) {
        return true;
      }
    } catch (error) {
      showInfoToast("Input element check issue");
    }
  }
  return false;
}

/**
 * Get selection text and range information
 * @private
 * @param {Selection} selection - Browser selection object
 * @returns {Object|null} Object with text and rect, or null if invalid
 */
function getSelectionInfo(selection) {
  const text = selection.toString().trim();
  if (!text) return null;

  let range;
  try {
    range = selection.getRangeAt(0);
  } catch {
    return null;
  }

  const rects = range.getClientRects();
  let rect = range.getBoundingClientRect();
  if (rect && rect.width === 0 && rects.length) {
    rect = rects[0];
  }

  try {
    state.selectionContextElement = findBlockAncestor(
      range.commonAncestorContainer
    );
  } catch {
    state.selectionContextElement = null;
  }

  return { text, rect };
}

/**
 * Handle text selection based on current bubble mode
 * @private
 * @param {string} text - Selected text
 * @param {DOMRect} rect - Selection rectangle
 */
async function handleSelectionByMode(text, rect) {
  state.settings = await getSettings(defaultSettings);
  state.hotkeySpec = parseHotkeyString(state.settings.bubbleHotkey);

  if (state.settings.bubbleMode === "auto") {
    if (state.bubbleEl) return;
    performTranslation(text, rect);
  } else if (state.settings.bubbleMode === "icon") {
    ui.clearTriggerIcon();
    state.pendingSelection = { text, rect };
    ui.ensureTriggerStyles();
    state.triggerIconTimer = setTimeout(() => {
      if (state.pendingSelection && state.pendingSelection.text === text) {
        ui.showTriggerIcon(rect, triggerTranslationFromPending);
      }
    }, Math.max(0, state.settings.bubbleIconDelay || 0));
  } else if (state.settings.bubbleMode === "hotkey") {
    ui.clearTriggerIcon();
    state.pendingSelection = { text, rect };
  }
}

/**
 * Handle text selection events
 * @param {Event} event - Selection event
 */
async function onSelection(event) {
  try {
    if (!state.extensionEnabled) return;
    if (!!state.bubbleEl) return;

    if (state.skipNextSelection) {
      state.skipNextSelection = false;
      return;
    }

    const sel = window.getSelection();
    if (!sel) return;

    // Check if the selection is happening in search, email, or password input fields
    if (shouldIgnoreSelection(sel)) {
      return;
    }

    if (
      state.bubbleEl &&
      event &&
      event.target &&
      state.bubbleEl.contains(event.target)
    ) {
      return;
    }

    const selectionInfo = getSelectionInfo(sel);
    if (!selectionInfo) {
      const active = document.activeElement;
      if (
        state.bubbleEl &&
        active &&
        state.bubbleEl.contains(active) &&
        (active.classList.contains("translation-edit-input") ||
          active.tagName === "INPUT")
      ) {
        return;
      }

      ui.clearTriggerIcon();
      state.pendingSelection = null;
      return;
    }

    const { text, rect } = selectionInfo;
    state.lastSelection = text;

    await handleSelectionByMode(text, rect);
  } catch (err) {
    showLoadingToast("Extension loading. Try refreshing the page");
  }
}

/**
 * Check if hotkey modifiers match the event
 * @private
 * @param {Object} spec - Hotkey specification
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {boolean} True if modifiers match
 */
function hotkeyModifiersMatch(spec, event) {
  return (
    spec.ctrl === event.ctrlKey &&
    spec.shift === event.shiftKey &&
    spec.alt === event.altKey &&
    spec.meta === event.metaKey
  );
}

/**
 * Check if single key hotkey matches the event
 * @private
 * @param {Object} spec - Hotkey specification
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {boolean} True if hotkey matches
 */
function singleKeyHotkeyMatch(spec, event) {
  if (!spec || spec.keys.length !== 1) return false;
  return (
    hotkeyModifiersMatch(spec, event) &&
    spec.keys[0] === event.key.toLowerCase()
  );
}

/**
 * Handle sequence key combinations
 * @private
 * @param {Object} spec - Hotkey specification
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {boolean} True if sequence is complete
 */
function handleSequenceKey(spec, event) {
  if (!spec || spec.keys.length <= 1) return false;

  const now = Date.now();

  if (
    !hotkeyModifiersMatch(spec, event) ||
    (state.sequenceProgress > 0 && now - state.lastSequenceTime > 700)
  ) {
    state.sequenceProgress = 0;
  }

  const key = event.key.toLowerCase();

  if (spec.keys[state.sequenceProgress] === key) {
    state.sequenceProgress++;
    state.lastSequenceTime = now;

    if (state.sequenceProgress === spec.keys.length) {
      state.sequenceProgress = 0;
      return true;
    }
    return false;
  } else {
    if (spec.keys[0] === key && hotkeyModifiersMatch(spec, event)) {
      state.sequenceProgress = 1;
      state.lastSequenceTime = now;
    } else {
      state.sequenceProgress = 0;
    }
    return false;
  }
}

/**
 * Handle double Ctrl+C hotkey for translation
 * @private
 * @param {KeyboardEvent} event - Keyboard event
 * @returns {boolean} True if double Ctrl+C was triggered
 */
function handleDoubleCopyHotkey(event) {
  if (
    event.key.toLowerCase() === "c" &&
    event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  ) {
    const now = Date.now();
    if (now - state.lastCopyKeyTime < 500) {
      state.lastCopyKeyTime = now;
      return true;
    }
    state.lastCopyKeyTime = now;
  }
  return false;
}

/**
 * Handle keyboard events for hotkey triggers
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeydown(event) {
  if (!state.settings || state.settings.bubbleMode !== "hotkey") return;

  if (state.hotkeySpec) {
    if (state.hotkeySpec.keys.length > 1) {
      if (handleSequenceKey(state.hotkeySpec, event)) {
        if (state.pendingSelection && !state.bubbleEl) {
          triggerTranslationFromPending();
        }
      }
      return;
    } else if (singleKeyHotkeyMatch(state.hotkeySpec, event)) {
      if (state.pendingSelection && !state.bubbleEl) {
        triggerTranslationFromPending();
      }
      return;
    }
  }

  // Fallback to double Ctrl+C if no custom hotkey is set
  if (!state.hotkeySpec && handleDoubleCopyHotkey(event)) {
    if (state.pendingSelection && !state.bubbleEl) {
      triggerTranslationFromPending();
    }
  }
}

/**
 * Handle URL changes to clear language cache
 * @private
 */
let lastUrl = window.location.href;
function checkForUrlChange() {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    // URL changed, clear the language cache
    languageDetector.clearCache();
    lastUrl = currentUrl;
  }
}

/**
 * Handle document click events to close bubbles when clicking outside
 * @private
 * @param {Event} event - Click event
 */
function handleDocumentClick(event) {
  if (state.bubbleEl) {
    const isInsideBubble = state.bubbleEl.contains(event.target);
    const inLangMenu = event.target.closest?.(".__translator_lang_menu");
    if (!isInsideBubble && !inLangMenu) {
      ui.removeBubble();
      ui.clearTriggerIcon();
      state.pendingSelection = null;
    }
  }
}

/**
 * Handle window scroll events
 * @private
 */
function handleWindowScroll() {
  // if (state.bubbleEl) ui.removeBubble(); //TODO: maybe put a setting for this in future
  if (state.pendingSelection) ui.clearTriggerIcon();
}

/**
 * Handle chrome storage changes
 * @private
 * @param {Object} changes - Storage changes
 * @param {string} area - Storage area
 */
function handleStorageChange(changes, area) {
  if (area !== "sync") return;

  if (changes.extensionEnabled) {
    state.extensionEnabled = !!changes.extensionEnabled.newValue;
    if (!state.extensionEnabled) {
      if (state.bubbleEl) ui.removeBubble();
      ui.clearTriggerIcon();
      state.pendingSelection = null;
    }
  }

  if (
    changes.bubbleMode ||
    changes.bubbleIconDelay ||
    changes.bubbleHotkey ||
    changes.target_lang
  ) {
    getSettings(defaultSettings).then((s) => {
      state.settings = s;
      state.hotkeySpec = parseHotkeyString(state.settings.bubbleHotkey);
    });
  }
}

/**
 * Set up all event listeners
 * @private
 */
function setupEventListeners() {
  // Selection events
  ["pointerup", "mouseup", "touchend"].forEach((evt) =>
    document.addEventListener(evt, (e) => {
      setTimeout(() => onSelection(e), 10);
    })
  );

  // Keyboard events
  document.addEventListener("keydown", handleKeydown);

  // Window events
  window.addEventListener("scroll", handleWindowScroll, { passive: true });
  window.addEventListener("popstate", checkForUrlChange);
  window.addEventListener("pushstate", checkForUrlChange);
  window.addEventListener("replacestate", checkForUrlChange);

  // Document events
  document.addEventListener("click", handleDocumentClick, true);

  // Chrome extension events
  chrome.storage.onChanged.addListener(handleStorageChange);
}

// Respond to popup/runtime pings so popup can detect whether the content
// script is present on the page (used to detect whether file:// access is
// enabled for this extension). If the content script is not injected on
// a file:// page, popup's sendMessage will fail and the popup will show
// instructions to the user on how to enable file URL access.
try {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === "PING_FOR_FILE_ACCESS") {
      // Signal that the content script is active on this page
      sendResponse({ ok: true });
    }
    // Indicate async response is not expected for other messages
    return false;
  });
} catch (e) {
  console.warn("Failed to register runtime message listener:", e);
}

/**
 * Set up periodic URL checking for SPAs
 * @private
 */
function setupUrlChangeDetection() {
  // Check for URL changes periodically (for SPAs that don't trigger full page loads)
  setInterval(checkForUrlChange, 1000);
}

/**
 * Initialize the content script
 * Sets up all event listeners and initializes extension state
 */
async function initializeContentScript() {
  try {
    // Initialize extension state
    initializeExtensionState();

    // Set up event listeners
    setupEventListeners();

    // Set up URL change detection for SPAs
    setupUrlChangeDetection();

    console.debug("Content script initialized successfully");
  } catch (error) {
    console.error("Failed to initialize content script:", error);
  }
}

// Initialize the content script
initializeContentScript();
