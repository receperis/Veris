// Shared mutable state for content script
export const state = {
  bubbleEl: null,
  lastSelection: "",
  settings: null,
  extensionEnabled: true,
  selectedWords: new Map(),
  selectionContextElement: null,
  tempTargetLang: null,
  tempSourceLang: null,
  bubbleLangMenuEl: null,
  combinationMode: false,
  selectedWordsForCombination: [],
  triggerIconEl: null,
  triggerIconTimer: null,
  pendingSelection: null,
  lastCopyKeyTime: 0,
  hotkeySpec: null,
  sequenceProgress: 0,
  lastSequenceTime: 0,
  skipNextSelection: false,
};

// Import shared default settings
import { DEFAULT_SETTINGS } from "../shared/storage.js";

// Use shared default settings
export const defaultSettings = DEFAULT_SETTINGS;
