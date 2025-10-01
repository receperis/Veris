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
  selectedWordsForCombination: new Set(),
  triggerIconEl: null,
  triggerIconTimer: null,
  pendingSelection: null,
  lastCopyKeyTime: 0,
  hotkeySpec: null,
  sequenceProgress: 0,
  lastSequenceTime: 0,
  skipNextSelection: false,
};

export const defaultSettings = {
  target_lang: "en",
  bubbleMode: "auto",
  bubbleIconDelay: 450,
  bubbleHotkey: "",
};
