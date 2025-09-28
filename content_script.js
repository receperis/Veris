// Content script (ES module) - clean entrypoint that wires modularized implementation
import { state, defaultSettings } from './src/content/state.js';
import { parseHotkeyString, findBlockAncestor, escapeHtml, getLanguageName } from './src/content/utils.js';
import * as ui from './src/content/ui.js';
import * as words from './src/content/words.js';
import { translateTextWithAPI } from './src/content/api.js';
import { showSaveToast } from './src/content/toast.js';

import './content_script.css';

// Initialize extensionEnabled flag at startup
chrome.storage.sync.get({ extensionEnabled: true }, (res) => {
  state.extensionEnabled = res.extensionEnabled === undefined ? true : !!res.extensionEnabled;
});

async function performTranslation(text, rect) {
  ui.createBubbleAtRect(rect, text, 'Translating...', true);
  state.settings = await chrome.storage.sync.get(defaultSettings);
  state.hotkeySpec = parseHotkeyString(state.settings.bubbleHotkey);
  let sourceLanguage = 'auto';
  try { const storageResult = await chrome.storage.sync.get(['sourceLanguage']); if (storageResult.sourceLanguage) sourceLanguage = storageResult.sourceLanguage; } catch (err) { console.warn('Could not get source language:', err); }
  let translated;
  try {
    translated = await translateTextWithAPI(text, state.settings.target_lang, sourceLanguage);
  } catch (err) {
    console.error('Translation failed, attempting detection fallback:', err);
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'DETECT_PAGE_LANGUAGE' });
      if (resp && resp.ok) {
        translated = `Source language: ${resp.language}. Translation API not available.`;
        if (state.bubbleEl) {
          const languageInfo = { sourceLang: getLanguageName(resp.language || 'auto'), targetLang: getLanguageName(state.settings.target_lang) };
          const languageIndicator = document.createElement('div');
          languageIndicator.className = 'language-indicator fallback';
          languageIndicator.innerHTML = `<div class="language-badge source-lang"><span class="lang-label">${languageInfo.sourceLang}</span></div><div class="language-arrow">⚠</div><div class="language-badge target-lang"><span class="lang-label">${languageInfo.targetLang}</span></div>`;
          const closeBtn = state.bubbleEl.querySelector('.close-btn');
          if (closeBtn && closeBtn.nextSibling) state.bubbleEl.insertBefore(languageIndicator, closeBtn.nextSibling);
        }
      } else {
        translated = 'Translation and language detection failed: ' + (resp && resp.error ? resp.error : 'Unknown error');
      }
    } catch (detErr) {
      translated = 'Translation not available: ' + err.message;
    }
  }
  if (state.bubbleEl) {
    state.bubbleEl.classList.remove('__translator_loading');
    state.bubbleEl.setAttribute('data-selection', text);
    const transNode = state.bubbleEl.querySelector('.translated-text'); if (transNode) transNode.textContent = translated;
    if (!state.bubbleEl.querySelector('.language-indicator:not(.fallback)')) {
      const languageInfo = { sourceLang: getLanguageName(sourceLanguage), targetLang: getLanguageName(state.settings.target_lang) };
      const languageIndicator = document.createElement('div'); languageIndicator.className = 'language-indicator'; languageIndicator.innerHTML = `<div class="language-badge source-lang"><span class="lang-label">${escapeHtml(languageInfo.sourceLang)}</span></div><div class="language-arrow">→</div><div class="language-badge target-lang"><span class="lang-label">${escapeHtml(languageInfo.targetLang)}</span></div>`;
      const closeBtn = state.bubbleEl.querySelector('.close-btn'); if (closeBtn && closeBtn.nextSibling) state.bubbleEl.insertBefore(languageIndicator, closeBtn.nextSibling);
      const targetBadge = languageIndicator.querySelector('.language-badge.target-lang'); targetBadge?.addEventListener('click', (e) => { e.stopPropagation(); ui.openLanguageMenu(targetBadge, retranslateBubble); });
    }
    words.createWordPills(text);
    const saveBtn = state.bubbleEl.querySelector('.save-button-translate'); saveBtn?.addEventListener('click', (e) => { e.stopPropagation(); words.handleSaveWords(); });
    const combinationBtn = state.bubbleEl.querySelector('.combination-btn'); combinationBtn?.addEventListener('click', (e) => { e.stopPropagation(); words.toggleCombinationMode(); });
  }
}

function triggerTranslationFromPending() {
  if (!state.pendingSelection) return; if (!state.extensionEnabled) { state.pendingSelection = null; ui.clearTriggerIcon(); return; }
  const { text, rect } = state.pendingSelection; ui.clearTriggerIcon(); performTranslation(text, rect); state.pendingSelection = null;
}

async function retranslateBubble(newTarget) {
  if (!state.bubbleEl || !state.lastSelection) return;
  const transNode = state.bubbleEl.querySelector('.translated-text');
  if (transNode) transNode.textContent = 'Translating...';
  state.tempTargetLang = newTarget;
  const wordTransDiv = state.bubbleEl.querySelector('.word-translation');
  if (wordTransDiv) { wordTransDiv.innerHTML = ''; wordTransDiv.classList.remove('show'); }
  const pills = state.bubbleEl.querySelectorAll('.word-pill');
  pills.forEach(p => p.classList.remove('active', 'selected'));
  state.selectedWords.clear();
  words.updateSaveButton();
  let sourceLanguage = 'auto';
  try { const storageResult = await chrome.storage.sync.get(['sourceLanguage']); if (storageResult.sourceLanguage) sourceLanguage = storageResult.sourceLanguage; } catch { }
  try { const result = await translateTextWithAPI(state.lastSelection, newTarget, sourceLanguage); if (transNode) transNode.textContent = result; } catch (err) { if (transNode) transNode.textContent = 'Translation failed: ' + err.message; }
  const targetBadgeLabel = state.bubbleEl.querySelector('.language-badge.target-lang .lang-label'); if (targetBadgeLabel) targetBadgeLabel.textContent = getLanguageName(newTarget);
}

async function onSelection(event) {
  try {
    if (!state.extensionEnabled) return;
    if (state.skipNextSelection) { state.skipNextSelection = false; return; }
    const sel = window.getSelection(); if (!sel) return; if (state.bubbleEl && event && event.target && state.bubbleEl.contains(event.target)) return;
    const text = sel.toString().trim();
    if (!text) {
      const active = document.activeElement;
      if (state.bubbleEl && active && state.bubbleEl.contains(active) && (active.classList.contains('translation-edit-input') || active.tagName === 'INPUT')) {
        return;
      }
      ui.clearTriggerIcon(); state.pendingSelection = null; return;
    }
    state.lastSelection = text;
    let range;
    try { range = sel.getRangeAt(0); } catch { return; }
    const rects = range.getClientRects(); let rect = range.getBoundingClientRect(); if (rect && rect.width === 0 && rects.length) rect = rects[0];
    try { state.selectionContextElement = findBlockAncestor(range.commonAncestorContainer); } catch { state.selectionContextElement = null; }
    state.settings = await chrome.storage.sync.get(defaultSettings);
    state.hotkeySpec = parseHotkeyString(state.settings.bubbleHotkey);
    if (state.settings.bubbleMode === 'auto') {
      if (state.bubbleEl) return;
      performTranslation(text, rect);
    } else if (state.settings.bubbleMode === 'icon') {
      ui.clearTriggerIcon(); state.pendingSelection = { text, rect }; ui.ensureTriggerStyles();
      state.triggerIconTimer = setTimeout(() => { if (state.pendingSelection && state.pendingSelection.text === text) ui.showTriggerIcon(rect, triggerTranslationFromPending); }, Math.max(0, state.settings.bubbleIconDelay || 0));
    } else if (state.settings.bubbleMode === 'hotkey') {
      ui.clearTriggerIcon(); state.pendingSelection = { text, rect };
    }
  } catch (err) { console.error('Translator content script selection handling error:', err); }
}

document.addEventListener('keydown', (e) => {
  if (!state.settings || state.settings.bubbleMode !== 'hotkey') return;
  if (state.hotkeySpec) {
    if (state.hotkeySpec.keys.length > 1) {
      if (handleSequenceKey(state.hotkeySpec, e)) { if (state.pendingSelection && !state.bubbleEl) triggerTranslationFromPending(); }
      return;
    } else if (singleKeyHotkeyMatch(state.hotkeySpec, e)) {
      if (state.pendingSelection && !state.bubbleEl) triggerTranslationFromPending();
      return;
    }
  }
  if (!state.hotkeySpec && e.key.toLowerCase() === 'c' && e.ctrlKey && !e.shiftKey && !e.altKey) {
    const now = Date.now();
    if (now - state.lastCopyKeyTime < 500) { if (state.pendingSelection && !state.bubbleEl) triggerTranslationFromPending(); }
    state.lastCopyKeyTime = now;
  }
});

function hotkeyModifiersMatch(spec, e) { return spec.ctrl === e.ctrlKey && spec.shift === e.shiftKey && spec.alt === e.altKey && spec.meta === e.metaKey; }
function singleKeyHotkeyMatch(spec, e) { if (!spec || spec.keys.length !== 1) return false; return hotkeyModifiersMatch(spec, e) && spec.keys[0] === e.key.toLowerCase(); }
function handleSequenceKey(spec, e) {
  if (!spec || spec.keys.length <= 1) return false;
  const now = Date.now();
  if (!hotkeyModifiersMatch(spec, e) || (state.sequenceProgress > 0 && now - state.lastSequenceTime > 700)) { state.sequenceProgress = 0; }
  const key = e.key.toLowerCase();
  if (spec.keys[state.sequenceProgress] === key) {
    state.sequenceProgress++; state.lastSequenceTime = now;
    if (state.sequenceProgress === spec.keys.length) { state.sequenceProgress = 0; return true; }
    return false;
  } else {
    if (spec.keys[0] === key && hotkeyModifiersMatch(spec, e)) { state.sequenceProgress = 1; state.lastSequenceTime = now; } else { state.sequenceProgress = 0; }
    return false;
  }
}

document.addEventListener('mouseup', (e) => { setTimeout(() => onSelection(e), 10); });
document.addEventListener('keyup', (e) => { setTimeout(() => onSelection(e), 10); });

window.addEventListener('scroll', () => { 
  // if (state.bubbleEl) ui.removeBubble(); //TODO: maybe put a setting for this in future
  if (state.pendingSelection) ui.clearTriggerIcon();
}, { passive: true });

document.addEventListener('click', (e) => {
  if (state.bubbleEl) {
    const isInsideBubble = state.bubbleEl.contains(e.target);
    const inLangMenu = e.target.closest?.('.__translator_lang_menu');
    if (!isInsideBubble && !inLangMenu) { ui.removeBubble(); ui.clearTriggerIcon(); state.pendingSelection = null; }
  }
}, true);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.extensionEnabled) {
    state.extensionEnabled = !!changes.extensionEnabled.newValue;
    if (!state.extensionEnabled) { if (state.bubbleEl) ui.removeBubble(); ui.clearTriggerIcon(); state.pendingSelection = null; }
  }
  if (changes.bubbleMode || changes.bubbleIconDelay || changes.bubbleHotkey || changes.target_lang) {
    chrome.storage.sync.get(defaultSettings, (s) => { state.settings = s; state.hotkeySpec = parseHotkeyString(state.settings.bubbleHotkey); });
  }
});

// Minimal initialization
(async () => { try { /* no-op init for module wiring */ } catch (error) { console.error('Failed to initialize content script:', error); } })();