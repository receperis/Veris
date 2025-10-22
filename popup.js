/* Popup JavaScript - Vocabulary Browser */

// Import templates and utilities
import { PopupTemplates, TemplateUtils } from "./templates/template-utils.js";
// Import shared utilities and constants
import { escapeHtml, normalizeId } from "./src/shared/utils.js";
import { getLanguageDisplayName } from "./src/shared/languages.js";
import { saveSetting, getSetting } from "./src/shared/storage.js";

// Performance optimization classes
class SearchIndex {
  constructor() {
    this.sourceIndex = new Map();
    this.translationIndex = new Map();
    this.allWords = [];
  }

  buildIndex(vocabulary) {
    this.allWords = vocabulary;

    // Properly clear existing Sets in the Maps to prevent memory leaks
    this.clearIndex();

    vocabulary.forEach((word, index) => {
      // Index source text
      this.indexText(
        (word.originalWord || "").toLowerCase(),
        index,
        this.sourceIndex
      );
      // Index translation
      this.indexText(
        (word.translatedWord || "").toLowerCase(),
        index,
        this.translationIndex
      );
    });
  }

  clearIndex() {
    // Clear Sets stored as values in the Maps
    for (const wordSet of this.sourceIndex.values()) {
      if (wordSet instanceof Set) {
        wordSet.clear();
      }
    }
    for (const wordSet of this.translationIndex.values()) {
      if (wordSet instanceof Set) {
        wordSet.clear();
      }
    }

    this.sourceIndex.clear();
    this.translationIndex.clear();
  }

  indexText(text, wordIndex, index) {
    const words = text.split(/\s+/);
    words.forEach((word) => {
      const cleaned = word.replace(/[^\w]/g, "");
      if (cleaned.length > 0) {
        if (!index.has(cleaned)) {
          index.set(cleaned, new Set());
        }
        index.get(cleaned).add(wordIndex);

        // Add prefixes for partial matching
        for (let i = 1; i <= cleaned.length; i++) {
          const prefix = cleaned.substring(0, i);
          if (!index.has(prefix)) {
            index.set(prefix, new Set());
          }
          index.get(prefix).add(wordIndex);
        }
      }
    });
  }

  search(query, maxResults = 100) {
    if (!query || query.length < 1) {
      return this.allWords.slice(0, maxResults);
    }

    const queryLower = query.toLowerCase().replace(/[^\w\s]/g, "");
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 0);

    if (queryWords.length === 0) {
      return this.allWords.slice(0, maxResults);
    }

    // For very short queries, use simple string matching to avoid huge result sets
    if (queryWords.some((word) => word.length < 3) && queryWords.length === 1) {
      const shortQuery = queryWords[0];
      const results = [];
      for (
        let i = 0;
        i < this.allWords.length && results.length < maxResults;
        i++
      ) {
        const word = this.allWords[i];
        const originalLower = (word.originalWord || "").toLowerCase();
        const translatedLower = (word.translatedWord || "").toLowerCase();
        if (
          originalLower.includes(shortQuery) ||
          translatedLower.includes(shortQuery)
        ) {
          results.push(word);
        }
      }
      return results;
    }

    // Find matches for each query word, but limit result set size early
    let resultSets = queryWords.map((word) => {
      const sourceMatches = this.sourceIndex.get(word) || new Set();
      const translationMatches = this.translationIndex.get(word) || new Set();
      const combined = new Set([...sourceMatches, ...translationMatches]);

      // If any single word produces too many results, limit it early
      if (combined.size > maxResults * 3) {
        // Convert to array, sort by relevance, and limit
        const limitedArray = Array.from(combined).slice(0, maxResults * 3);
        return new Set(limitedArray);
      }
      return combined;
    });

    // Start with smallest result set for more efficient intersection
    resultSets.sort((a, b) => a.size - b.size);
    let intersection = resultSets[0];

    // Efficient intersection with early termination
    for (let i = 1; i < resultSets.length; i++) {
      const newIntersection = new Set();
      let count = 0;
      for (const item of intersection) {
        if (resultSets[i].has(item)) {
          newIntersection.add(item);
          count++;
          // Early termination if we have enough results
          if (count >= maxResults * 2) break;
        }
      }
      intersection = newIntersection;

      // If intersection becomes empty, no point in continuing
      if (intersection.size === 0) break;
    }

    // Convert to vocabulary items efficiently
    const results = [];
    let count = 0;
    for (const index of intersection) {
      if (count >= maxResults) break;
      results.push(this.allWords[index]);
      count++;
    }

    return results;
  }
}

// Global cleanup function to prevent memory leaks
function cleanupResources() {
  // Clear search index
  if (window.searchIndex) {
    window.searchIndex.clearIndex();
  }

  // Remove storage listeners
  if (window.popupStorageListener) {
    chrome.storage.onChanged.removeListener(window.popupStorageListener);
    window.popupStorageListener = null;
  }

  // Clear vocabulary data
  allVocabulary = [];
  filteredVocabulary = [];
}

// Clean up when popup is about to close
window.addEventListener("beforeunload", cleanupResources);
window.addEventListener("unload", cleanupResources);

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize the vocabulary browser
  await initializeVocabularyBrowser();

  // Set up event listeners
  setupEventListeners();
  // Initialize extension toggle UI and behavior
  await initExtensionToggle();

  // Check if it's exercise time
  await checkExerciseTime();

  // Focus the search input so user can immediately type
  const searchEl = document.getElementById("search-input");
  if (searchEl) {
    // slight delay allows rendering & potential async population
    setTimeout(() => searchEl.focus(), 0);
  }
});

let allVocabulary = [];
let filteredVocabulary = [];
let sourceLanguages = [];
let editMode = false;

// Search optimization
let searchIndex = new SearchIndex();

async function initializeVocabularyBrowser() {
  try {
    // Show loading state
    document.getElementById("vocabulary-list").innerHTML =
      PopupTemplates.loadingState("Loading vocabulary...");

    // Get all vocabulary from background service worker
    const response = await chrome.runtime.sendMessage({
      type: "GET_ALL_VOCABULARY",
    });

    if (response && response.success && response.data) {
      allVocabulary = response.data;

      if (allVocabulary.length === 0) {
        showNoResults(
          "No vocabulary saved yet. Start translating text to build your vocabulary!"
        );
        return;
      }

      // Extract unique source languages
      sourceLanguages = [
        ...new Set(allVocabulary.map((item) => item.sourceLanguage)),
      ].filter((lang) => lang);

      // Clear existing search index to prevent memory accumulation
      searchIndex.clearIndex();

      // Build search index for fast filtering
      searchIndex.buildIndex(allVocabulary);

      // Populate language dropdown and restore selection
      await populateLanguageDropdown();

      // Initial display of all vocabulary (filterVocabulary might have been called in populateLanguageDropdown)
      if (filteredVocabulary.length === 0) {
        // Limit initial render to prevent excessive DOM nodes (show first 200 items)
        filteredVocabulary = allVocabulary.slice(0, 200);
      }
      renderVocabularyList();
    } else {
      console.error("Failed to load vocabulary:", response);
      showNoResults(
        "Failed to load vocabulary. Please check browser console for details."
      );
    }
  } catch (error) {
    console.error("Error loading vocabulary:", error);
    showNoResults(`Error loading vocabulary: ${error.message}`);
  }
}

async function populateLanguageDropdown() {
  const dropdown = document.getElementById("source-language");
  dropdown.innerHTML = '<option value="all">All Languages</option>';

  sourceLanguages.forEach((lang) => {
    dropdown.innerHTML += PopupTemplates.languageOption(
      lang,
      getLanguageDisplayName(lang)
    );
  });

  // Restore previously selected language from storage
  try {
    const selectedLang = await getSetting("selectedVocabularyLanguage", "all");
    if (selectedLang && selectedLang !== "all") {
      // Check if the stored language still exists in the options
      const optionExists = Array.from(dropdown.options).some(
        (option) => option.value === selectedLang
      );
      if (optionExists) {
        dropdown.value = selectedLang;
        // Trigger filtering to show words for the selected language
        filterVocabulary();
      }
    }
  } catch (error) {
    console.error("Failed to restore selected language:", error);
  }
}

// getLanguageDisplayName is now imported from shared/languages.js

function renderVocabularyList() {
  const vocabularyList = document.getElementById("vocabulary-list");

  if (filteredVocabulary.length === 0) {
    showNoResults("No vocabulary found matching your filters.");
    return;
  }

  // Clear existing content more efficiently to prevent DOM node accumulation
  while (vocabularyList.firstChild) {
    vocabularyList.removeChild(vocabularyList.firstChild);
  }

  // Use DocumentFragment for better performance and reduced reflows
  const fragment = document.createDocumentFragment();

  filteredVocabulary.forEach((item) => {
    const id = item.id || "";
    const hasContext =
      (item.context && item.context.trim()) ||
      (item.contextTranslation && item.contextTranslation.trim());

    const itemDiv = document.createElement("div");
    // Use template based on edit mode
    if (editMode) {
      itemDiv.innerHTML = PopupTemplates.vocabularyItemEdit(
        item,
        id,
        hasContext
      );
    } else {
      itemDiv.innerHTML = PopupTemplates.vocabularyItem(item, id, hasContext);
    }

    // Move the actual vocabulary item from wrapper to fragment
    while (itemDiv.firstChild) {
      fragment.appendChild(itemDiv.firstChild);
    }
  });

  vocabularyList.appendChild(fragment);
}

// Toggle a single item into edit mode (inline) when user clicks pen icon
function beginInlineEdit(id) {
  const container = document.querySelector(`.vocabulary-item[data-id="${id}"]`);
  if (!container) return;
  const item = allVocabulary.find((w) => String(w.id) === String(id));
  if (!item) return;

  // Replace content with edit form template
  container.innerHTML = PopupTemplates.inlineEditForm(item, id);
}

// Handle delete icon click with confirmation and deletion
async function handleInlineDelete(id) {
  try {
    const ok = await showConfirm(
      "Delete this word?",
      "This action cannot be undone."
    );
    if (!ok) return;
    const normalizedId = normalizeId(id);
    const response = await chrome.runtime.sendMessage({
      type: "DELETE_VOCABULARY",
      data: { id: normalizedId },
    });
    if (response && response.success) {
      allVocabulary = allVocabulary.filter((w) => String(w.id) !== String(id));
      filterVocabulary();
      showNotice("Word deleted", "success");
    } else {
      console.error("Failed to delete word", response);
      showNotice("Failed to delete word", "error");
    }
  } catch (err) {
    console.error("Error deleting word:", err);
    showNotice("Error deleting word", "error");
  }
}

// Toggle edit mode UI
function toggleEditMode(enable) {
  editMode = !!enable;
  const editBtn = document.getElementById("edit-words");
  if (editBtn) {
    editBtn.textContent = editMode ? "✅ Done" : "✏️ Edit words";
    editBtn.setAttribute("aria-pressed", editMode ? "true" : "false");
  }
  renderVocabularyList();

  // Toggle an editing class on the vocabulary list for CSS hooks and clarity
  const listEl = document.getElementById("vocabulary-list");
  if (listEl) {
    if (editMode) listEl.classList.add("editing");
    else listEl.classList.remove("editing");
  }

  // Attach listeners for save/delete when in edit mode
  if (editMode) {
    attachEditModeListeners();
    // focus the first edit icon for keyboard users
    setTimeout(() => {
      const first = document.querySelector(".icon-edit");
      if (first && typeof first.focus === "function") first.focus();
    }, 50);
  }
}

function attachEditModeListeners() {
  // Use event delegation on the vocabulary list
  const list = document.getElementById("vocabulary-list");
  if (!list) return;

  // Don't replace the entire element - just remove existing event listener if it exists
  const existingHandler = list._vocabularyClickHandler;
  if (existingHandler) {
    list.removeEventListener("click", existingHandler);
  }

  const clickHandler = async (e) => {
    const saveBtn = e.target.closest(".save-word");
    const deleteBtn = e.target.closest(".delete-word");
    const editIcon = e.target.closest(".icon-edit");
    const cancelBtn = e.target.closest(".cancel-edit");
    const contextToggle = e.target.closest(".context-toggle");

    if (contextToggle) {
      e.stopPropagation();
      toggleContextPanel(contextToggle.getAttribute("data-id"));
      return;
    }

    if (saveBtn) {
      const id = saveBtn.getAttribute("data-id");
      await handleSaveWord(id);
      return;
    }

    if (cancelBtn) {
      // Re-render the list to restore display (cancels inline edit)
      filterVocabulary();
      return;
    }

    if (deleteBtn) {
      const id = deleteBtn.getAttribute("data-id");
      await handleDeleteWord(id);
      return;
    }

    if (editIcon) {
      const id = editIcon.getAttribute("data-id");
      beginInlineEdit(id);
      return;
    }
  };

  // Store reference for future cleanup and add the listener
  list._vocabularyClickHandler = clickHandler;
  list.addEventListener("click", clickHandler);
}

async function handleSaveWord(id) {
  try {
    const container = document.querySelector(
      `.vocabulary-item[data-id="${id}"]`
    );
    if (!container) return;
    const originalInput = container.querySelector(".edit-original");
    const translationInput = container.querySelector(".edit-translation");
    const updates = {
      originalWord: originalInput ? originalInput.value.trim() : undefined,
      translatedWord: translationInput
        ? translationInput.value.trim()
        : undefined,
    };
    // Confirm save with the same styled confirm dialog used for deletes
    const ok = await showConfirm(
      "Save changes?",
      "Apply edits to this word?",
      "Save",
      "Cancel"
    );
    if (!ok) {
      showNotice("Save canceled", "info");
      return;
    }

    // Send update to service worker
    const normalizedId = normalizeId(id);
    const response = await chrome.runtime.sendMessage({
      type: "UPDATE_VOCABULARY",
      data: { id: normalizedId, updates },
    });
    if (response && response.success) {
      // Update local arrays and re-render
      const idx = allVocabulary.findIndex((w) => String(w.id) === String(id));
      if (idx !== -1) {
        if (updates.originalWord !== undefined)
          allVocabulary[idx].originalWord = updates.originalWord;
        if (updates.translatedWord !== undefined)
          allVocabulary[idx].translatedWord = updates.translatedWord;
      }
      // Rebuild search index with updated data
      searchIndex.buildIndex(allVocabulary);
      filterVocabulary();
      showNotice("Changes saved", "success");
    } else {
      console.error("Failed to update word", response);
      showNotice("Failed to save changes", "error");
    }
  } catch (err) {
    console.error("Error saving word:", err);
    showNotice("Error saving changes", "error");
  }
}

async function handleDeleteWord(id) {
  try {
    const ok = await showConfirm(
      "Delete this word?",
      "This action cannot be undone."
    );
    if (!ok) return;
    const normalizedId = normalizeId(id);
    const response = await chrome.runtime.sendMessage({
      type: "DELETE_VOCABULARY",
      data: { id: normalizedId },
    });
    if (response && response.success) {
      // Remove from local lists and re-render
      allVocabulary = allVocabulary.filter((w) => String(w.id) !== String(id));
      // Rebuild search index with updated data
      searchIndex.buildIndex(allVocabulary);
      filterVocabulary();
      showNotice("Word deleted", "success");
    } else {
      console.error("Failed to delete word", response);
      showNotice("Failed to delete word", "error");
    }
  } catch (err) {
    console.error("Error deleting word:", err);
    showNotice("Error deleting word", "error");
  }
}

// Minimal confirm dialog that returns a Promise<boolean>
function showConfirm(
  title,
  details,
  confirmLabel = "Delete",
  cancelLabel = "Cancel"
) {
  return new Promise((resolve) => {
    // Remove any existing
    document
      .querySelectorAll(".mini-confirm-overlay")
      .forEach((n) => n.remove());
    const overlay = document.createElement("div");
    overlay.className = "mini-confirm-overlay";
    overlay.innerHTML = PopupTemplates.confirmDialog(
      title,
      details,
      confirmLabel,
      cancelLabel
    );
    document.body.appendChild(overlay);
    const btnCancel = overlay.querySelector(".btn.cancel");
    const btnConfirm = overlay.querySelector(".btn.confirm");
    const onCancel = () => {
      overlay.remove();
      resolve(false);
    };
    const onConfirm = () => {
      overlay.remove();
      resolve(true);
    };
    btnCancel.addEventListener("click", onCancel, { once: true });
    btnConfirm.addEventListener("click", onConfirm, { once: true });
    // Focus the cancel button by default so accidental confirms are less likely
    setTimeout(() => {
      if (btnCancel && typeof btnCancel.focus === "function") btnCancel.focus();
    }, 10);
  });
}

// Minimal toast notice
function showNotice(message, kind = "info", duration = 2000) {
  // Remove existing identical to prevent spam
  TemplateUtils.removeElements("mini-toast");

  const notice = TemplateUtils.createElement(
    PopupTemplates.toastNotification(message, kind)
  );
  document.body.appendChild(notice);
  requestAnimationFrame(() => notice.classList.add("show"));
  setTimeout(() => {
    notice.classList.remove("show");
    setTimeout(() => notice.remove(), 220);
  }, duration);
}

// (Context hover feature removed at user request)

function showNoResults(message) {
  const listContainer = document.getElementById("vocabulary-list");
  listContainer.innerHTML = PopupTemplates.noResultsState(message);
}

async function filterVocabulary() {
  const selectedLanguage = document.getElementById("source-language").value;
  const searchTerm = document.getElementById("search-input").value.trim();

  // Save the selected language to storage for persistence
  try {
    await saveSetting("selectedVocabularyLanguage", selectedLanguage);
  } catch (error) {
    console.error("Failed to save selected language:", error);
  }

  // Use optimized search index if we have a search term
  if (searchTerm && searchTerm.length > 0) {
    const searchResults = searchIndex.search(searchTerm, 1000);
    filteredVocabulary = searchResults.filter((item) => {
      const languageMatch =
        selectedLanguage === "all" || item.sourceLanguage === selectedLanguage;
      return languageMatch;
    });
  } else {
    // No search term, use original filtering
    filteredVocabulary = allVocabulary.filter((item) => {
      const languageMatch =
        selectedLanguage === "all" || item.sourceLanguage === selectedLanguage;
      return languageMatch;
    });
  }

  renderVocabularyList();
}

// Toggle context panel visibility
function toggleContextPanel(id) {
  const contextPanel = document.querySelector(
    `.context-panel[data-id="${id}"]`
  );
  const contextToggle = document.querySelector(
    `.context-toggle[data-id="${id}"]`
  );

  if (!contextPanel || !contextToggle) return;

  const isVisible = contextPanel.style.display !== "none";

  if (isVisible) {
    // Hide panel
    contextPanel.classList.remove("expanding");
    contextPanel.style.display = "none";
    contextToggle.classList.remove("active");
    contextToggle.setAttribute("title", "Show context");
  } else {
    // Show panel with animation
    contextPanel.style.display = "block";
    contextToggle.classList.add("active");
    contextToggle.setAttribute("title", "Hide context");

    // Trigger animation after a brief delay to ensure display: block is applied
    requestAnimationFrame(() => {
      contextPanel.classList.add("expanding");
    });

    // Remove expanding class after animation completes
    setTimeout(() => {
      contextPanel.classList.remove("expanding");
    }, 300);
  }
}

async function checkExerciseTime() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "CHECK_EXERCISE_TIME",
    });
    if (response && response.isExerciseTime) {
      document.getElementById("exercise-reminder").style.display = "block";
    }
  } catch (error) {
    console.error("Error checking exercise time:", error);
  }
}

function setupEventListeners() {
  // Language filter dropdown
  const sourceLangEl = document.getElementById("source-language");
  if (sourceLangEl) sourceLangEl.addEventListener("change", filterVocabulary);

  // Search input with debouncing to prevent excessive filtering
  const searchEl = document.getElementById("search-input");
  if (searchEl) {
    let searchTimeout;
    searchEl.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(filterVocabulary, 300); // 300ms debounce
    });
  }

  // Exercise button
  const exerciseBtn = document.getElementById("start-exercise");
  if (exerciseBtn) {
    exerciseBtn.addEventListener("click", () => {
      try {
        chrome.tabs.create({
          url: chrome.runtime.getURL("exercise/exercise.html"),
        });
      } catch (e) {
        console.warn("Could not open exercise tab", e);
      }
      try {
        window.close();
      } catch (e) {
        /* ignore */
      }
    });
  }

  // Options button
  const optionsBtn = document.getElementById("open-options");
  if (optionsBtn) {
    optionsBtn.addEventListener("click", () => {
      try {
        chrome.runtime.openOptionsPage();
      } catch (e) {
        console.warn("Could not open options page", e);
      }
      try {
        window.close();
      } catch (e) {
        /* ignore */
      }
    });
  }

  // Edit words button
  const editBtn = document.getElementById("edit-words");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      toggleEditMode(!editMode);
    });
  }

  // Stats button
  const statsBtn = document.getElementById("view-stats");
  if (statsBtn) {
    statsBtn.addEventListener("click", () => {
      try {
        chrome.tabs.create({ url: chrome.runtime.getURL("stats/stats.html") });
      } catch (e) {
        console.warn("Could not open stats page", e);
      }
      try {
        window.close();
      } catch (e) {
        /* ignore */
      }
    });
  }

  // Context toggle event delegation
  const vocabularyList = document.getElementById("vocabulary-list");
  if (vocabularyList) {
    vocabularyList.addEventListener("click", (e) => {
      const contextToggle = e.target.closest(".context-toggle");
      if (contextToggle) {
        e.stopPropagation();
        toggleContextPanel(contextToggle.getAttribute("data-id"));
      }
    });
  }
}

// Extension enable/disable toggle
async function initExtensionToggle() {
  const btn = document.getElementById("extension-toggle-btn");
  const status = document.getElementById("extension-status");
  const icon = document.getElementById("extension-toggle-icon");
  if (!btn || !status) return;

  // Read stored value (default true)
  const extensionEnabled = await getSetting("extensionEnabled", true);
  updateToggleUI(extensionEnabled);

  // Listen to changes in storage to reflect external updates
  const storageChangeHandler = (changes, area) => {
    if (area === "sync" && changes.extensionEnabled) {
      updateToggleUI(changes.extensionEnabled.newValue);
    }
  };

  // Remove any existing listener to prevent duplicates
  if (window.popupStorageListener) {
    chrome.storage.onChanged.removeListener(window.popupStorageListener);
  }

  // Store reference for cleanup and add listener
  window.popupStorageListener = storageChangeHandler;
  chrome.storage.onChanged.addListener(storageChangeHandler);

  btn.addEventListener("click", async () => {
    // Toggle value
    const current = await getSetting("extensionEnabled", true);
    const next = !current;
    await saveSetting("extensionEnabled", next);
    updateToggleUI(next);
  });

  function updateToggleUI(enabled) {
    if (enabled) {
      status.textContent = "Enabled";
      if (icon) icon.textContent = "●";
      btn.classList.remove("options-btn");
      btn.classList.remove("off");
      btn.classList.add("on");
      btn.setAttribute("aria-pressed", "true");
      // apply minimal visual variant
      btn.classList.add("minimal-toggle");
    } else {
      status.textContent = "Disabled";
      if (icon) icon.textContent = "○";
      btn.classList.remove("on");
      btn.classList.add("off");
      btn.setAttribute("aria-pressed", "false");
      btn.classList.add("minimal-toggle");
    }
  }
}
