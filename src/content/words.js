import { state } from "./state.js";
import {
  escapeHtml,
  computeContextSentence,
  getLanguageName,
} from "./utils.js";
import { showSaveToast } from "./toast.js";
import { translateTextWithAPI } from "./api.js";
import { clearTriggerIcon, openLanguageMenu } from "./ui.js";

// Helper function to get source language reliably
async function getSourceLanguageForSaving() {
  try {
    // First try to get from storage (set by background script)
    const storageResult = await chrome.storage.sync.get(["sourceLanguage"]);
    if (
      storageResult.sourceLanguage &&
      storageResult.sourceLanguage !== "und"
    ) {
      return storageResult.sourceLanguage;
    }

    // If not in storage, try direct detection
    const response = await chrome.runtime.sendMessage({
      type: "DETECT_PAGE_LANGUAGE",
    });

    if (
      response &&
      response.ok &&
      response.language &&
      response.language !== "und"
    ) {
      return response.language;
    }
  } catch (err) {
    console.warn("Could not get source language for saving:", err);
  }

  // Fallback to 'auto' or empty string
  return "";
}

export function renderWordPills(text) {
  if (!state.bubbleEl) return;
  const pillsContainer = state.bubbleEl.querySelector(".word-pills");
  if (!pillsContainer) return;
  const words = text.match(/[\p{L}\p{N}]+/gu) || [];
  words.forEach((word, index) => {
    const pill = document.createElement("span");
    pill.className = "word-pill";
    pill.textContent = word;
    pill.dataset.word = word;
    pill.dataset.index = index;
    pill.addEventListener("click", (e) => {
      e.stopPropagation();
      handlePillClick(word, pill);
    });
    pillsContainer.appendChild(pill);
  });
}

export async function handlePillClick(word, pillElement) {
  if (!state.bubbleEl) return;
  if (state.combinationMode) {
    toggleWordForCombination(word, pillElement);
    return;
  }
  const isCurrentlyActive = pillElement.classList.contains("active");
  if (isCurrentlyActive) {
    pillElement.classList.remove("active");
    pillElement.classList.remove("selected");
    removeWordTranslationFromDisplay(word);
    state.selectedWords.delete(word);
    updateSaveButton();
    return;
  }
  pillElement.classList.add("active");
  const wordTranslationDiv = state.bubbleEl.querySelector(".word-translation");
  if (!wordTranslationDiv) return;
  addWordTranslationToDisplay(word, "Translating word...", true);
  try {
    const cleanWord = word.replace(/[.,;:!?"""''()[\]{}]/g, "").trim();
    if (!cleanWord) {
      addWordTranslationToDisplay(word, "Punctuation", false);
      return;
    }
    const currentSettings = await chrome.storage.sync.get({
      target_lang: "en",
    });
    // Use temporary target language if set, otherwise use stored settings
    const targetLang = state.tempTargetLang || currentSettings.target_lang;
    let sourceLanguage = "auto";
    try {
      const storageResult = await chrome.storage.sync.get(["sourceLanguage"]);
      if (storageResult.sourceLanguage)
        sourceLanguage = storageResult.sourceLanguage;
    } catch (err) {
      console.warn("Could not get source language for word translation:", err);
    }
    let wordTranslation;
    try {
      wordTranslation = await translateTextWithAPI(
        cleanWord,
        targetLang,
        sourceLanguage
      );
    } catch (err) {
      console.error("Word translation failed:", err);
      wordTranslation = "Translation unavailable";
    }
    addWordTranslationToDisplay(word, wordTranslation, false);
  } catch (err) {
    console.error("Error in word translation:", err);
    addWordTranslationToDisplay(word, "Error", false);
  }
}

export function addWordTranslationToDisplay(
  word,
  translation,
  isLoading = false
) {
  const wordTranslationDiv = state.bubbleEl.querySelector(".word-translation");
  if (!wordTranslationDiv) return;
  wordTranslationDiv.classList.add("show");
  let wordElement = wordTranslationDiv.querySelector(
    `[data-word="${escapeHtml(word)}"]`
  );
  if (!wordElement) {
    wordElement = document.createElement("div");
    wordElement.className = "word-translation-item";
    wordElement.dataset.word = word;
    wordTranslationDiv.appendChild(wordElement);
  }
  if (isLoading) {
    wordElement.innerHTML = `\n      <div class="word-translation-content loading">\n        <span class="word-original">${escapeHtml(
      word
    )}</span>\n        <span class="word-translated">Translating...</span>\n      </div>\n    `;
  } else {
    wordElement.innerHTML = `\n      <div class="word-translation-content">\n        <span class="word-original">${escapeHtml(
      word
    )}</span>\n        <span class="word-translated">${escapeHtml(
      translation
    )}</span>\n        <button class="add-word-btn" data-word="${escapeHtml(
      word
    )}" data-translation="${escapeHtml(
      translation
    )}">\n          + Add\n        </button>\n      </div>\n    `;
    const addButton = wordElement.querySelector(".add-word-btn");
    addButton.addEventListener("click", (e) => {
      e.stopPropagation();
      const pill = state.bubbleEl.querySelector(
        `.word-pill[data-word="${word}"]`
      );
      toggleWordSelection(word, pill);
      const currentSpan = wordElement.querySelector(".word-translated");
      const currentVal = currentSpan
        ? currentSpan.textContent
        : addButton.getAttribute("data-translation") || translation;
      state.selectedWords.set(word, currentVal);
    });
    const editableSpan = wordElement.querySelector(".word-translated");
    if (editableSpan) {
      enableEditableTranslation(editableSpan, addButton, word);
    }
  }
}

export function removeWordTranslationFromDisplay(word) {
  const wordTranslationDiv = state.bubbleEl.querySelector(".word-translation");
  if (!wordTranslationDiv) return;
  const wordElement = wordTranslationDiv.querySelector(
    `[data-word="${escapeHtml(word)}"]`
  );
  if (wordElement) wordElement.remove();
  const remainingWords = wordTranslationDiv.querySelectorAll(
    ".word-translation-item"
  );
  if (remainingWords.length === 0) wordTranslationDiv.classList.remove("show");
}

export function toggleWordSelection(word, pillElement) {
  if (!pillElement) return;
  event?.stopPropagation();
  const isSelected = pillElement.classList.contains("selected");
  if (isSelected) {
    pillElement.classList.remove("selected");
    state.selectedWords.delete(word);
  } else {
    let translation = "Translation needed";
    const wordTranslationDiv =
      state.bubbleEl?.querySelector(".word-translation");
    if (wordTranslationDiv) {
      const wordItem = wordTranslationDiv.querySelector(
        `[data-word="${word}"]`
      );
      if (wordItem) {
        const translationSpan = wordItem.querySelector(".word-translated");
        if (translationSpan) translation = translationSpan.textContent;
      }
    }
    if (
      translation === "Translation needed" &&
      pillElement.classList.contains("active")
    )
      translation = "Please click the word first to translate";
    pillElement.classList.add("selected");
    state.selectedWords.set(word, translation);
  }
  updateSaveButton();
}

export function updateSaveButton() {
  if (!state.bubbleEl) return;
  const saveSection = state.bubbleEl.querySelector(".save-section");
  const saveCount = state.bubbleEl.querySelector(".save-count");
  const selectedCount = state.selectedWords.size;
  if (selectedCount > 0) {
    saveSection.classList.add("show");
    saveCount.textContent = selectedCount;
  } else {
    saveSection.classList.remove("show");
  }
}

export async function handleSaveWords() {
  if (state.selectedWords.size === 0) return;
  const saveStatus = state.bubbleEl?.querySelector(".save-status");
  if (saveStatus) {
    saveStatus.textContent = `💾 Saving ${state.selectedWords.size} words...`;
    saveStatus.classList.add("show");
  }
  try {
    // Use the improved language detection
    const detectedSourceLanguage = await getSourceLanguageForSaving();
    const saveData = {
      timestamp: new Date().toISOString(),
      originalText: state.lastSelection,
      targetLanguage: state.settings?.target_lang || "en",
      sourceLanguage: detectedSourceLanguage,
      words: Array.from(state.selectedWords.entries()).map(
        ([word, translation]) => ({
          original: word,
          translation,
          context: computeContextSentence(word, translation),
        })
      ),
      totalWords: state.selectedWords.size,
      url: window.location.href,
      domain: window.location.hostname,
    };
    const savedIds = [];
    for (const [word, translation] of state.selectedWords.entries()) {
      const context = computeContextSentence(word, translation);
      let contextTranslation = "";

      // Translate the context to target language if it exists and is different from the word

      if (context && context.trim() !== word.trim()) {
        try {
          contextTranslation = await translateTextWithAPI(
            context,
            state.settings?.target_lang || "en",
            detectedSourceLanguage
          );
          console.log("Context translation:", contextTranslation);
        } catch (error) {
          console.warn("Failed to translate context for word:", word, error);
        }
      }

      const wordEntry = {
        timestamp: new Date().toISOString(),
        originalWord: word,
        translatedWord: translation,
        context: context,
        contextTranslation: contextTranslation,
        targetLanguage: state.settings?.target_lang || "en",
        sourceLanguage: detectedSourceLanguage,
        url: window.location.href,
        domain: window.location.hostname,
        sessionId: saveData.timestamp,
      };
      try {
        const response = await chrome.runtime.sendMessage({
          type: "SAVE_VOCABULARY",
          data: wordEntry,
        });
        if (response && response.success) savedIds.push(response.id);
        else
          console.error(
            "Failed to save word via service worker:",
            response ? response.error : "No response"
          );
      } catch (error) {
        console.error("Failed to save individual word:", word, error);
      }
    }
    if (saveStatus) {
      saveStatus.textContent = `✅ ${savedIds.length} words saved individually!`;
      setTimeout(() => {
        saveStatus.classList.remove("show");
      }, 3000);
    }
    showSaveToast(
      `${savedIds.length} word${savedIds.length !== 1 ? "s" : ""} saved`
    );
    if (state.bubbleEl) {
      const savedWordSet = new Set(
        Array.from(state.selectedWords.entries()).map(([w]) => w)
      );
      state.bubbleEl
        .querySelectorAll(".word-translation-item")
        .forEach((item) => {
          const w = item.getAttribute("data-word");
          if (savedWordSet.has(w)) {
            const addBtn = item.querySelector(".add-word-btn");
            if (addBtn) addBtn.remove();
          }
        });
      state.bubbleEl
        .querySelectorAll(".word-pill.selected")
        .forEach((p) => p.classList.remove("selected"));
    }
    state.selectedWords.clear();
    updateSaveButton();
  } catch (error) {
    console.error("Failed to save vocabulary to IndexedDB:", error);
    if (saveStatus) {
      saveStatus.textContent = `❌ Failed to save words. Please try again.`;
      saveStatus.style.color = "#dc2626";
      setTimeout(() => {
        saveStatus.classList.remove("show");
        saveStatus.style.color = "";
      }, 5000);
    }
  }
}

// Editable translation helper (re-implemented locally to avoid circular import)
export function enableEditableTranslation(spanEl, addButton, word) {
  spanEl.style.cursor = "text";
  spanEl.title = "Click to edit translation";
  spanEl.addEventListener(
    "click",
    (e) => {
      e.stopPropagation();
      if (spanEl.dataset.editing === "1") return;
      spanEl.dataset.editing = "1";
      const original = spanEl.textContent || "";
      const input = document.createElement("input");
      input.type = "text";
      input.className = "translation-edit-input";
      input.value = original;
      input.style.fontSize = "12px";
      input.style.padding = "2px 4px";
      input.style.marginLeft = "4px";
      input.style.minWidth = "110px";
      input.style.border = "1px solid #9ca3af";
      input.style.borderRadius = "4px";
      input.style.outline = "none";
      input.style.background = "#fff";
      input.style.color = "#111";
      spanEl.replaceWith(input);
      input.focus();
      input.select();
      let committed = false;
      const commit = () => {
        if (committed) return;
        committed = true;
        const newVal = (input.value || "").trim() || original;
        const newSpan = document.createElement("span");
        newSpan.className = "word-translated";
        newSpan.textContent = newVal;
        input.replaceWith(newSpan);
        addButton.setAttribute("data-translation", newVal);
        if (state.selectedWords.has(word)) {
          state.selectedWords.set(word, newVal);
          updateSaveButton();
        }
        enableEditableTranslation(newSpan, addButton, word);
      };
      const cancel = () => {
        if (committed) return;
        committed = true;
        const restore = document.createElement("span");
        restore.className = "word-translated";
        restore.textContent = original;
        input.replaceWith(restore);
        enableEditableTranslation(restore, addButton, word);
      };
      input.addEventListener("keydown", (ke) => {
        if (ke.key === "Enter") {
          ke.preventDefault();
          commit();
        } else if (ke.key === "Escape") {
          ke.preventDefault();
          cancel();
        }
      });
      input.addEventListener("blur", commit, { once: true });
    },
    { once: true }
  );
}

// Combination mode functions
export function toggleCombinationMode() {
  state.combinationMode = !state.combinationMode;
  state.selectedWordsForCombination.length = 0;
  const combinationBtn = state.bubbleEl?.querySelector(".combination-btn");
  const combinationStatus = state.bubbleEl?.querySelector(
    ".combination-status"
  );
  const wordPills = state.bubbleEl?.querySelectorAll(".word-pill");
  if (!combinationBtn || !combinationStatus) return;
  if (state.combinationMode) {
    combinationBtn.classList.add("active");
    combinationBtn.innerHTML = `🔓`;
    combinationBtn.title = "Exit combination mode";
    combinationStatus.innerHTML = `\n      <div class="combination-info">\n        <span>Select words for combined translation</span>\n      </div>\n    `;
    combinationStatus.classList.add("show");
    wordPills.forEach((pill) => {
      pill.classList.remove("active", "selected");
    });
    state.selectedWords.clear();
    updateSaveButton();
  } else {
    combinationBtn.classList.remove("active");
    combinationBtn.innerHTML = `🔗`;
    combinationBtn.title = "Enter combination mode for multiple words";
    combinationStatus.innerHTML = `\n      <div class="combination-info">\n        <span>Click words for individual translations</span>\n      </div>\n    `;
    wordPills.forEach((pill) => {
      pill.classList.remove("combination-selected");
    });
    removeInstantCombinedTranslation();
    state.selectedWordsForCombination.length = 0;

    // Restore active state for words that have individual translations displayed
    restoreActiveWordPills();
  }
}

// Helper function to restore active state for words with visible translations
function restoreActiveWordPills() {
  if (!state.bubbleEl) return;

  const wordTranslationDiv = state.bubbleEl.querySelector(".word-translation");
  if (!wordTranslationDiv) return;

  // Find all individual word translation items (excluding combination translations)
  const wordTranslationItems = wordTranslationDiv.querySelectorAll(
    ".word-translation-item:not(.instant-combination-translation)"
  );

  wordTranslationItems.forEach((item) => {
    const word = item.dataset.word;
    if (word) {
      // Find the corresponding pill and restore its active state
      const pill = state.bubbleEl.querySelector(
        `.word-pill[data-word="${word}"]`
      );
      if (pill) {
        pill.classList.add("active");
      }
    }
  });
}

export function toggleWordForCombination(word, pillElement) {
  if (!state.combinationMode || !state.bubbleEl) return;
  const isSelected = state.selectedWordsForCombination.includes(word);
  const combinationStatus = state.bubbleEl.querySelector(".combination-status");
  if (isSelected) {
    // Remove word from array while maintaining order of other words
    const index = state.selectedWordsForCombination.indexOf(word);
    if (index > -1) {
      state.selectedWordsForCombination.splice(index, 1);
    }
    pillElement.classList.remove("combination-selected");
  } else {
    // Add word to end of array (selection order)
    state.selectedWordsForCombination.push(word);
    pillElement.classList.add("combination-selected");
  }
  const infoSpan = combinationStatus?.querySelector(".combination-info span");
  if (infoSpan) {
    if (state.selectedWordsForCombination.length >= 2) {
      infoSpan.textContent = `${state.selectedWordsForCombination.length} words selected for combination`;
      showInstantCombinedTranslation();
    } else {
      infoSpan.textContent = "Select words to combine for multiple words";
      removeInstantCombinedTranslation();
    }
  }
}

export async function handleSaveCombination(combinedPhrase, translation) {
  if (!state.bubbleEl) {
    console.warn("Cannot save combination: bubble element is null");
    return;
  }
  const saveCombinationBtn = state.bubbleEl.querySelector(
    ".save-combination-btn"
  );
  if (saveCombinationBtn) {
    saveCombinationBtn.innerHTML = "💾 Saving...";
    saveCombinationBtn.disabled = true;
  }
  try {
    let detectedSourceLanguage = "";
    try {
      const storageResult = await chrome.storage.sync.get(["sourceLanguage"]);
      if (storageResult.sourceLanguage)
        detectedSourceLanguage = storageResult.sourceLanguage;
    } catch (err) {
      console.warn("Could not get detected source language:", err);
    }

    const context = computeContextSentence(combinedPhrase, translation);
    let contextTranslation = "";

    // Translate the context to target language if it exists and is different from the combined phrase
    if (context && context.trim() !== combinedPhrase.trim()) {
      try {
        contextTranslation = await translateTextWithAPI(
          context,
          state.settings?.target_lang || "en",
          detectedSourceLanguage
        );
      } catch (error) {
        console.warn(
          "Failed to translate context for combination:",
          combinedPhrase,
          error
        );
      }
    }

    const combinationEntry = {
      timestamp: new Date().toISOString(),
      originalWord: combinedPhrase,
      translatedWord: translation,
      context: context,
      contextTranslation: contextTranslation,
      targetLanguage: state.settings?.target_lang || "en",
      sourceLanguage: detectedSourceLanguage,
      url: window.location.href,
      domain: window.location.hostname,
      isCombination: true,
      combinedWords: [...state.selectedWordsForCombination],
    };
    const response = await chrome.runtime.sendMessage({
      type: "SAVE_VOCABULARY",
      data: combinationEntry,
    });
    if (response && response.success) {
      if (saveCombinationBtn) {
        saveCombinationBtn.innerHTML = "✅ Saved!";
        setTimeout(() => {
          if (saveCombinationBtn) {
            saveCombinationBtn.innerHTML = "💾 Save Combination";
            saveCombinationBtn.disabled = false;
          }
        }, 2000);
      }
      showSaveToast(`Combination "${combinedPhrase}" saved!`);
    } else {
      throw new Error(
        response ? response.error : "No response from save service"
      );
    }
  } catch (error) {
    console.error("Failed to save combination:", error);
    if (saveCombinationBtn) {
      saveCombinationBtn.innerHTML = "❌ Save Failed";
      setTimeout(() => {
        if (saveCombinationBtn) {
          saveCombinationBtn.innerHTML = "💾 Save Combination";
          saveCombinationBtn.disabled = false;
        }
      }, 2000);
    }
  }
}

export async function showInstantCombinedTranslation() {
  if (!state.bubbleEl || state.selectedWordsForCombination.length < 2) return;
  // Use the selection order directly from the array
  const combinedPhrase = state.selectedWordsForCombination.join(" ");
  const wordTranslationDiv = state.bubbleEl.querySelector(".word-translation");
  if (!wordTranslationDiv) return;
  wordTranslationDiv.classList.add("show");
  let combinationElement = wordTranslationDiv.querySelector(
    ".instant-combination-translation"
  );
  if (!combinationElement) {
    combinationElement = document.createElement("div");
    combinationElement.className =
      "word-translation-item instant-combination-translation";
    combinationElement.dataset.combinationPhrase = combinedPhrase;
    wordTranslationDiv.insertBefore(
      combinationElement,
      wordTranslationDiv.firstChild
    );
  }
  combinationElement.innerHTML = `\n    <div class="word-translation-content combination-instant loading">\n      <span class="combination-label">🔗 Combined:</span>\n      <span class="word-original">"${escapeHtml(
    combinedPhrase
  )}"</span>\n      <span class="word-translated">Translating...</span>\n    </div>\n  `;
  try {
    const currentSettings = await chrome.storage.sync.get({
      target_lang: "en",
    });
    // Use temporary target language if set, otherwise use stored settings
    const targetLang = state.tempTargetLang || currentSettings.target_lang;
    let sourceLanguage = "auto";
    try {
      const storageResult = await chrome.storage.sync.get(["sourceLanguage"]);
      if (storageResult.sourceLanguage)
        sourceLanguage = storageResult.sourceLanguage;
    } catch (err) {
      console.warn(
        "Could not get source language for instant combination translation:",
        err
      );
    }
    const combinationTranslation = await translateTextWithAPI(
      combinedPhrase,
      targetLang,
      sourceLanguage
    );
    combinationElement.innerHTML = `\n      <div class="word-translation-content combination-instant">\n        <span class="combination-label">🔗 Combined:</span>\n        <span class="word-original">"${escapeHtml(
      combinedPhrase
    )}"</span>\n        <span class="word-translated">${escapeHtml(
      combinationTranslation
    )}</span>\n        <button class="add-word-btn combination-add" data-phrase="${escapeHtml(
      combinedPhrase
    )}" data-translation="${escapeHtml(
      combinationTranslation
    )}">\n          Save Combination\n        </button>\n      </div>\n    `;
    combinationElement.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Make the translation editable just like in single mode
    const editableTranslationSpan =
      combinationElement.querySelector(".word-translated");
    const addCombinationButton =
      combinationElement.querySelector(".combination-add");
    if (editableTranslationSpan && addCombinationButton) {
      enableEditableTranslation(
        editableTranslationSpan,
        addCombinationButton,
        combinedPhrase
      );
    }

    addCombinationButton?.addEventListener("click", (e) => {
      e.stopPropagation();
      // Get the current translation value from the button's data attribute (updated by enableEditableTranslation)
      // or fall back to querying the current span's text content
      let currentTranslation =
        addCombinationButton.getAttribute("data-translation");
      if (!currentTranslation) {
        const currentSpan =
          combinationElement.querySelector(".word-translated");
        currentTranslation = currentSpan
          ? currentSpan.textContent
          : combinationTranslation;
      }
      handleSaveCombination(combinedPhrase, currentTranslation);
    });
  } catch (err) {
    console.error("Instant combination translation failed:", err);
    combinationElement.innerHTML = `\n      <div class="word-translation-content combination-instant error">\n        <span class="combination-label">🔗 Combined:</span>\n        <span class="word-original">"${escapeHtml(
      combinedPhrase
    )}"</span>\n        <span class="word-translated error">Translation failed</span>\n      </div>\n    `;
  }
}

export function removeInstantCombinedTranslation() {
  if (!state.bubbleEl) return;
  const wordTranslationDiv = state.bubbleEl.querySelector(".word-translation");
  if (!wordTranslationDiv) return;
  const combinationElement = wordTranslationDiv.querySelector(
    ".instant-combination-translation"
  );
  if (combinationElement) combinationElement.remove();
  const remainingWords = wordTranslationDiv.querySelectorAll(
    ".word-translation-item"
  );
  if (remainingWords.length === 0) wordTranslationDiv.classList.remove("show");
}

/**
 * Retranslate existing word pills and combinations with new target language
 * This function is called when the target language changes temporarily
 */
export async function retranslateExistingWords() {
  if (!state.bubbleEl) return;

  const wordTranslationDiv = state.bubbleEl.querySelector(".word-translation");
  if (!wordTranslationDiv) return;

  // Get current target language (temporary or stored)
  const currentSettings = await chrome.storage.sync.get({
    target_lang: "en",
  });
  const targetLang = state.tempTargetLang || currentSettings.target_lang;

  // Get source language
  let sourceLanguage = state.tempSourceLang || "auto";
  if (sourceLanguage === "auto") {
    try {
      const storageResult = await chrome.storage.sync.get(["sourceLanguage"]);
      if (storageResult.sourceLanguage)
        sourceLanguage = storageResult.sourceLanguage;
    } catch (err) {
      console.warn("Could not get source language for retranslation:", err);
    }
  }

  // Retranslate individual word translations
  const wordItems = wordTranslationDiv.querySelectorAll(
    ".word-translation-item:not(.instant-combination-translation)"
  );

  for (const wordItem of wordItems) {
    const word = wordItem.dataset.word;
    if (!word) continue;

    // Show loading state
    const translatedSpan = wordItem.querySelector(".word-translated");
    if (translatedSpan) {
      translatedSpan.textContent = "Translating...";
      wordItem
        .querySelector(".word-translation-content")
        ?.classList.add("loading");
    }

    try {
      const cleanWord = word.replace(/[.,;:!?"""''()[\]{}]/g, "").trim();
      let wordTranslation;

      if (!cleanWord) {
        wordTranslation = "N/A";
      } else {
        wordTranslation = await translateTextWithAPI(
          cleanWord,
          targetLang,
          sourceLanguage
        );
      }

      // Update the translation in the display
      if (translatedSpan) {
        translatedSpan.textContent = wordTranslation;
        wordItem
          .querySelector(".word-translation-content")
          ?.classList.remove("loading");
      }

      // Update the add button's data attribute
      const addButton = wordItem.querySelector(".add-word-btn");
      if (addButton) {
        addButton.setAttribute("data-translation", wordTranslation);
      }

      // Update selected words map if this word is selected
      if (state.selectedWords.has(word)) {
        state.selectedWords.set(word, wordTranslation);
      }
    } catch (err) {
      console.error("Failed to retranslate word:", word, err);
      if (translatedSpan) {
        translatedSpan.textContent = "Translation failed";
        wordItem
          .querySelector(".word-translation-content")
          ?.classList.remove("loading");
      }
    }
  }

  // Retranslate combination if it exists and we're in combination mode
  if (state.combinationMode && state.selectedWordsForCombination.length >= 2) {
    await showInstantCombinedTranslation();
  }
}
