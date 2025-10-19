// Content script (ES module) - clean entrypoint that wires modularized implementation
import { state, defaultSettings } from "./src/content/state.js";
import {
  parseHotkeyString,
  findBlockAncestor,
  escapeHtml,
  getLanguageName,
} from "./src/content/utils.js";
import * as ui from "./src/content/ui.js";
import * as words from "./src/content/words.js";
import { translateTextWithAPI } from "./src/content/api.js";
import { showLoadingToast, showInfoToast } from "./src/content/toast.js";

import "./content_script.css";

// Language detection cache and timing
let languageCache = {
  language: null,
  timestamp: 0,
  url: null,
};
const LANGUAGE_CACHE_DURATION = 30000; // 30 seconds

// Initialize extensionEnabled flag at startup
chrome.storage.sync.get({ extensionEnabled: true }, (res) => {
  state.extensionEnabled =
    res.extensionEnabled === undefined ? true : !!res.extensionEnabled;
});

// Robust language detection with caching and fallback
async function getSourceLanguage(fallbackToAuto = true) {
  const currentUrl = window.location.href;
  const now = Date.now();

  // Check if we have a fresh cache for this URL
  if (
    languageCache.language &&
    languageCache.url === currentUrl &&
    now - languageCache.timestamp < LANGUAGE_CACHE_DURATION
  ) {
    return languageCache.language;
  }

  // First, try to get from storage (set by background script)
  try {
    const storageResult = await chrome.storage.sync.get(["sourceLanguage"]);
    if (
      storageResult.sourceLanguage &&
      storageResult.sourceLanguage !== "und"
    ) {
      // Update cache
      languageCache = {
        language: storageResult.sourceLanguage,
        timestamp: now,
        url: currentUrl,
      };
      return storageResult.sourceLanguage;
    }
  } catch (err) {
    console.warn("Could not get source language from storage:", err);
  }

  // If no language in storage, try direct detection via background script
  try {
    const response = await chrome.runtime.sendMessage({
      type: "DETECT_PAGE_LANGUAGE",
    });

    if (
      response &&
      response.ok &&
      response.language &&
      response.language !== "und"
    ) {
      // Update cache with the detected language
      languageCache = {
        language: response.language,
        timestamp: now,
        url: currentUrl,
      };
      return response.language;
    }
  } catch (err) {
    console.warn("Direct language detection failed:", err);
  }

  // Fallback to 'auto' if detection fails
  if (fallbackToAuto) {
    const fallbackLang = "auto";
    languageCache = {
      language: fallbackLang,
      timestamp: now,
      url: currentUrl,
    };
    return fallbackLang;
  }

  return null;
}

async function performTranslation(text, rect) {
  ui.createBubbleAtRect(rect, text, "Translating...", true);
  state.settings = await chrome.storage.sync.get(defaultSettings);
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
    if (!state.bubbleEl.querySelector(".language-indicator:not(.fallback)")) {
      const languageInfo = {
        sourceLang: getLanguageName(sourceLanguage),
        targetLang: getLanguageName(
          state.tempTargetLang || state.settings.target_lang
        ),
      };
      const languageIndicator = document.createElement("div");
      languageIndicator.className = "language-indicator";
      languageIndicator.innerHTML = `<div class="language-badge source-lang"><span class="lang-label">${escapeHtml(
        languageInfo.sourceLang
      )}</span></div><div class="language-arrow">→</div><div class="language-badge target-lang"><span class="lang-label">${escapeHtml(
        languageInfo.targetLang
      )}</span></div>`;
      const closeBtn = state.bubbleEl.querySelector(".close-btn");
      if (closeBtn && closeBtn.nextSibling)
        state.bubbleEl.insertBefore(languageIndicator, closeBtn.nextSibling);
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
    words.createWordPills(text);
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
}

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

async function retranslateBubble(newTarget) {
  if (!state.bubbleEl || !state.lastSelection) return;
  const transNode = state.bubbleEl.querySelector(".translated-text");
  if (transNode) transNode.textContent = "Translating...";
  state.tempTargetLang = newTarget;
  const wordTransDiv = state.bubbleEl.querySelector(".word-translation");
  if (wordTransDiv) {
    wordTransDiv.innerHTML = "";
    wordTransDiv.classList.remove("show");
  }
  const pills = state.bubbleEl.querySelectorAll(".word-pill");
  pills.forEach((p) => p.classList.remove("active", "selected"));
  state.selectedWords.clear();
  words.updateSaveButton();
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
  if (targetBadgeLabel)
    targetBadgeLabel.textContent = getLanguageName(newTarget);
}

async function retranslateWithNewSourceLang(newSource) {
  if (!state.bubbleEl || !state.lastSelection) return;
  const transNode = state.bubbleEl.querySelector(".translated-text");
  if (transNode) transNode.textContent = "Translating...";
  state.tempSourceLang = newSource;
  const wordTransDiv = state.bubbleEl.querySelector(".word-translation");
  if (wordTransDiv) {
    wordTransDiv.innerHTML = "";
    wordTransDiv.classList.remove("show");
  }
  const pills = state.bubbleEl.querySelectorAll(".word-pill");
  pills.forEach((p) => p.classList.remove("active", "selected"));
  state.selectedWords.clear();
  words.updateSaveButton();
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
  if (sourceBadgeLabel)
    sourceBadgeLabel.textContent = getLanguageName(newSource);
}

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
    if (sel.rangeCount > 0) {
      try {
        const range = sel.getRangeAt(0);
        const container = range.commonAncestorContainer;
        let inputElement = container.querySelector?.("input, textarea");

        if (inputElement) {
          return;
        }
      } catch (error) {
        showInfoToast("Input element check issue");
      }
    }

    if (
      state.bubbleEl &&
      event &&
      event.target &&
      state.bubbleEl.contains(event.target)
    )
      return;

    const text = sel.toString().trim();
    if (!text) {
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
    state.lastSelection = text;

    let range;

    try {
      range = sel.getRangeAt(0);
    } catch {
      return;
    }

    const rects = range.getClientRects();
    let rect = range.getBoundingClientRect();
    if (rect && rect.width === 0 && rects.length) rect = rects[0];
    try {
      state.selectionContextElement = findBlockAncestor(
        range.commonAncestorContainer
      );
    } catch {
      state.selectionContextElement = null;
    }
    state.settings = await chrome.storage.sync.get(defaultSettings);
    state.hotkeySpec = parseHotkeyString(state.settings.bubbleHotkey);
    if (state.settings.bubbleMode === "auto") {
      if (state.bubbleEl) return;
      performTranslation(text, rect);
    } else if (state.settings.bubbleMode === "icon") {
      ui.clearTriggerIcon();
      state.pendingSelection = { text, rect };
      ui.ensureTriggerStyles();
      state.triggerIconTimer = setTimeout(() => {
        if (state.pendingSelection && state.pendingSelection.text === text)
          ui.showTriggerIcon(rect, triggerTranslationFromPending);
      }, Math.max(0, state.settings.bubbleIconDelay || 0));
    } else if (state.settings.bubbleMode === "hotkey") {
      ui.clearTriggerIcon();
      state.pendingSelection = { text, rect };
    }
  } catch (err) {
    showLoadingToast("Extension loading. Try refreshing the page");
  }
}

document.addEventListener("keydown", (e) => {
  if (!state.settings || state.settings.bubbleMode !== "hotkey") return;
  if (state.hotkeySpec) {
    if (state.hotkeySpec.keys.length > 1) {
      if (handleSequenceKey(state.hotkeySpec, e)) {
        if (state.pendingSelection && !state.bubbleEl)
          triggerTranslationFromPending();
      }
      return;
    } else if (singleKeyHotkeyMatch(state.hotkeySpec, e)) {
      if (state.pendingSelection && !state.bubbleEl)
        triggerTranslationFromPending();
      return;
    }
  }
  if (
    !state.hotkeySpec &&
    e.key.toLowerCase() === "c" &&
    e.ctrlKey &&
    !e.shiftKey &&
    !e.altKey
  ) {
    const now = Date.now();
    if (now - state.lastCopyKeyTime < 500) {
      if (state.pendingSelection && !state.bubbleEl)
        triggerTranslationFromPending();
    }
    state.lastCopyKeyTime = now;
  }
});

function hotkeyModifiersMatch(spec, e) {
  return (
    spec.ctrl === e.ctrlKey &&
    spec.shift === e.shiftKey &&
    spec.alt === e.altKey &&
    spec.meta === e.metaKey
  );
}
function singleKeyHotkeyMatch(spec, e) {
  if (!spec || spec.keys.length !== 1) return false;
  return hotkeyModifiersMatch(spec, e) && spec.keys[0] === e.key.toLowerCase();
}
function handleSequenceKey(spec, e) {
  if (!spec || spec.keys.length <= 1) return false;
  const now = Date.now();
  if (
    !hotkeyModifiersMatch(spec, e) ||
    (state.sequenceProgress > 0 && now - state.lastSequenceTime > 700)
  ) {
    state.sequenceProgress = 0;
  }
  const key = e.key.toLowerCase();
  if (spec.keys[state.sequenceProgress] === key) {
    state.sequenceProgress++;
    state.lastSequenceTime = now;
    if (state.sequenceProgress === spec.keys.length) {
      state.sequenceProgress = 0;
      return true;
    }
    return false;
  } else {
    if (spec.keys[0] === key && hotkeyModifiersMatch(spec, e)) {
      state.sequenceProgress = 1;
      state.lastSequenceTime = now;
    } else {
      state.sequenceProgress = 0;
    }
    return false;
  }
}

["pointerup", "mouseup", "touchend"].forEach((evt) =>
  document.addEventListener(evt, (e) => {
    setTimeout(() => onSelection(e), 10);
  })
);

window.addEventListener(
  "scroll",
  () => {
    // if (state.bubbleEl) ui.removeBubble(); //TODO: maybe put a setting for this in future
    if (state.pendingSelection) ui.clearTriggerIcon();
  },
  { passive: true }
);

document.addEventListener(
  "click",
  (e) => {
    if (state.bubbleEl) {
      const isInsideBubble = state.bubbleEl.contains(e.target);
      const inLangMenu = e.target.closest?.(".__translator_lang_menu");
      if (!isInsideBubble && !inLangMenu) {
        ui.removeBubble();
        ui.clearTriggerIcon();
        state.pendingSelection = null;
      }
    }
  },
  true
);

chrome.storage.onChanged.addListener((changes, area) => {
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
    chrome.storage.sync.get(defaultSettings, (s) => {
      state.settings = s;
      state.hotkeySpec = parseHotkeyString(state.settings.bubbleHotkey);
    });
  }
});

// Clear language cache when page changes
let lastUrl = window.location.href;
function checkForUrlChange() {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    // URL changed, clear the language cache
    languageCache = { language: null, timestamp: 0, url: null };
    lastUrl = currentUrl;
  }
}

// Check for URL changes periodically (for SPAs that don't trigger full page loads)
setInterval(checkForUrlChange, 1000);

// Also listen for page navigation events
window.addEventListener("popstate", checkForUrlChange);
window.addEventListener("pushstate", checkForUrlChange);
window.addEventListener("replacestate", checkForUrlChange);

// Minimal initialization
(async () => {
  try {
    /* no-op init for module wiring */
  } catch (error) {
    console.error("Failed to initialize content script:", error);
  }
})();
