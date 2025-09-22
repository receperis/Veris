/* Content script: detects selection and shows inline translation bubble. */

(function () {
  'use strict';

  let bubbleEl = null;
  let lastSelection = '';
  let settings = null; // populated lazily
  let extensionEnabled = true; // default; will be loaded from storage
  let selectedWords = new Map(); // Track selected words and their translations
  let selectionContextElement = null; // Block-level ancestor for sentence context
  let tempTargetLang = null; // ephemeral target language for current bubble
  let bubbleLangMenuEl = null; // reference to open language menu

  // Combination mode state
  let combinationMode = false; // Whether we're in combination mode
  let selectedWordsForCombination = new Set(); // Words selected for combination

  // Trigger mode related state
  let triggerIconEl = null; // small icon shown in icon mode
  let triggerIconTimer = null; // timer id
  let pendingSelection = null; // { text, rect }
  let lastCopyKeyTime = 0; // for double Ctrl+C detection
  let hotkeySpec = null; // parsed custom hotkey (can include sequence)
  let sequenceProgress = 0; // index in multi-key sequence
  let lastSequenceTime = 0; // timestamp of last matched key in sequence
  let skipNextSelection = false; // used to suppress selection handler after icon click

  // Default settings (extended to include trigger configuration)
  const defaultSettings = {
    target_lang: 'en',
    bubbleMode: 'auto', // 'auto' | 'icon' | 'hotkey'
    bubbleIconDelay: 450,
    bubbleHotkey: '' // empty -> use double-copy gesture
  };

  // Parse hotkey string like "Ctrl+Shift+T"
  function parseHotkeyString(str) {
    if (!str) return null;
    const tokens = str.split('+').map(t => t.trim()).filter(Boolean);
    const spec = { ctrl: false, shift: false, alt: false, meta: false, keys: [] };
    tokens.forEach(tok => {
      const low = tok.toLowerCase();
      if (['ctrl', 'control'].includes(low)) spec.ctrl = true; else if (low === 'shift') spec.shift = true; else if (['alt', 'option'].includes(low)) spec.alt = true; else if (['meta', 'cmd', 'command'].includes(low)) spec.meta = true; else spec.keys.push(tok.toLowerCase());
    });
    if (spec.keys.length === 0) return null; // need at least one key
    return spec;
  }
  function hotkeyModifiersMatch(spec, e) {
    return spec.ctrl === e.ctrlKey && spec.shift === e.shiftKey && spec.alt === e.altKey && spec.meta === e.metaKey;
  }
  function singleKeyHotkeyMatch(spec, e) {
    if (!spec || spec.keys.length !== 1) return false;
    return hotkeyModifiersMatch(spec, e) && spec.keys[0] === e.key.toLowerCase();
  }
  function handleSequenceKey(spec, e) {
    if (!spec || spec.keys.length <= 1) return false;
    const now = Date.now();
    // Reset if modifiers differ or timeout (700ms) exceeded
    if (!hotkeyModifiersMatch(spec, e) || (sequenceProgress > 0 && now - lastSequenceTime > 700)) {
      sequenceProgress = 0;
    }
    const key = e.key.toLowerCase();
    if (spec.keys[sequenceProgress] === key) {
      sequenceProgress++;
      lastSequenceTime = now;
      if (sequenceProgress === spec.keys.length) {
        sequenceProgress = 0; // reset for next time
        return true; // full sequence matched
      }
      return false; // partial match continues
    } else {
      // If mismatch but key matches first key, restart sequence at 1
      if (spec.keys[0] === key && hotkeyModifiersMatch(spec, e)) {
        sequenceProgress = 1;
        lastSequenceTime = now;
      } else {
        sequenceProgress = 0;
      }
      return false;
    }
  }
  function clearTriggerIcon() {
    if (triggerIconTimer) { clearTimeout(triggerIconTimer); triggerIconTimer = null; }
    if (triggerIconEl) { triggerIconEl.remove(); triggerIconEl = null; }
  }
  function clearPendingState() { pendingSelection = null; clearTriggerIcon(); }
  function ensureTriggerStyles() {
    if (document.getElementById('__translator_trigger_icon_style')) return;
    const style = document.createElement('style');
    style.id = '__translator_trigger_icon_style';
    /* Success color variant for trigger icon */
    style.textContent = `.__translator_trigger_icon{background:#16a34a;color:#fff;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2);transition:transform .15s ease,background .2s;}.__translator_trigger_icon:hover{background:#15803d;transform:scale(1.05);}.__translator_trigger_icon:active{background:#166534;transform:scale(.95);} `;
    document.head.appendChild(style);
  }
  function showTriggerIcon(rect) {
    if (!extensionEnabled) return; // don't show when extension is disabled
    clearTriggerIcon();
    const icon = document.createElement('div');
    icon.className = '__translator_trigger_icon';
    icon.title = 'Translate selection';
    icon.textContent = '🌐';
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    icon.style.position = 'absolute';
    // Place near bottom-right (end) of selection rect
    const offsetX = 4; // small gap from selection edge
    const offsetY = 6; // below selection
    icon.style.left = (rect.right + scrollX - 14 + offsetX) + 'px'; // shift left by roughly half icon width then add offset
    icon.style.top = (rect.bottom + scrollY + offsetY) + 'px';
    icon.style.zIndex = 999999;
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      // prevent mouseup selection handler from re-triggering
      skipNextSelection = true;
      // Immediately remove icon so bubble appears without overlap
      clearTriggerIcon();
      if (pendingSelection) { triggerTranslationFromPending(); }
    });
    document.body.appendChild(icon); triggerIconEl = icon;
  }

  // Get settings from storage
  async function getSettings() {
    try {
      const result = await chrome.storage.sync.get(defaultSettings);
      return result;
    } catch (err) {
      console.warn('Failed to load settings, using defaults:', err);
      return defaultSettings;
    }
  }

  // Load extensionEnabled flag at startup
  chrome.storage.sync.get({ extensionEnabled: true }, (res) => {
    extensionEnabled = res.extensionEnabled === undefined ? true : !!res.extensionEnabled;
  });

  // Shared translation routine
  async function performTranslation(text, rect) {
    createBubbleAtRect(rect, text, 'Translating...', true);
    settings = await getSettings();
    hotkeySpec = parseHotkeyString(settings.bubbleHotkey);
    let sourceLanguage = 'auto';
    try {
      const storageResult = await chrome.storage.sync.get(['sourceLanguage']);
      if (storageResult.sourceLanguage) sourceLanguage = storageResult.sourceLanguage;
    } catch (err) { console.warn('Could not get source language:', err); }
    let translated;
    try {
      translated = await translateTextWithAPI(text, settings.target_lang, sourceLanguage);
    } catch (err) {
      console.error('Translation failed, attempting detection fallback:', err);
      try {
        const resp = await chrome.runtime.sendMessage({ type: 'DETECT_PAGE_LANGUAGE' });
        if (resp && resp.ok) {
          translated = `Source language: ${resp.language}. Translation API not available.`;
          if (bubbleEl) {
            const languageInfo = { sourceLang: getLanguageName(resp.language || 'auto'), targetLang: getLanguageName(settings.target_lang) };
            const languageIndicator = document.createElement('div');
            languageIndicator.className = 'language-indicator fallback';
            languageIndicator.innerHTML = `<div class="language-badge source-lang"><span class="lang-label">${languageInfo.sourceLang}</span></div><div class="language-arrow">⚠</div><div class="language-badge target-lang"><span class="lang-label">${languageInfo.targetLang}</span></div>`;
            const closeBtn = bubbleEl.querySelector('.close-btn');
            if (closeBtn && closeBtn.nextSibling) bubbleEl.insertBefore(languageIndicator, closeBtn.nextSibling);
          }
        } else {
          translated = 'Translation and language detection failed: ' + (resp && resp.error ? resp.error : 'Unknown error');
        }
      } catch (detErr) {
        translated = 'Translation not available: ' + err.message;
      }
    }
    if (bubbleEl) {
      bubbleEl.classList.remove('__translator_loading');
      bubbleEl.setAttribute('data-selection', text);
      const transNode = bubbleEl.querySelector('.translated-text');
      if (transNode) transNode.textContent = translated;
      if (!bubbleEl.querySelector('.language-indicator:not(.fallback)')) {
        const languageInfo = { sourceLang: getLanguageName(sourceLanguage), targetLang: getLanguageName(settings.target_lang) };
        const languageIndicator = document.createElement('div');
        languageIndicator.className = 'language-indicator';
        languageIndicator.innerHTML = `<div class="language-badge source-lang"><span class="lang-label">${languageInfo.sourceLang}</span></div><div class="language-arrow">→</div><div class="language-badge target-lang"><span class="lang-label">${languageInfo.targetLang}</span></div>`;
        const closeBtn = bubbleEl.querySelector('.close-btn');
        if (closeBtn && closeBtn.nextSibling) bubbleEl.insertBefore(languageIndicator, closeBtn.nextSibling);
        const targetBadge = languageIndicator.querySelector('.language-badge.target-lang');
        targetBadge?.addEventListener('click', (e) => { e.stopPropagation(); openLanguageMenu(targetBadge); });
      }
      createWordPills(text);
    }
  }

  function triggerTranslationFromPending() {
    if (!pendingSelection) return;
    if (!extensionEnabled) { pendingSelection = null; clearTriggerIcon(); return; }
    const { text, rect } = pendingSelection;
    clearTriggerIcon();
    performTranslation(text, rect);
    pendingSelection = null; // maintain lastSelection for context
  }

  // Create translation bubble at the given rectangle
  function createBubbleAtRect(rect, sourceText, translatedText, isLoading = false, languageInfo = null) {
    removeBubble('create bubble at'); // remove any existing bubble

    const bubble = document.createElement('div');
    bubble.className = '__translator_bubble' + (isLoading ? ' __translator_loading' : '');
    bubble.id = 'translate_bubble'

    // Create language indicator if language info is provided
    const languageIndicator = languageInfo && !isLoading ? `
    <div class="language-indicator">
      <div class="language-badge source-lang">
        <span class="lang-label">${escapeHtml(languageInfo.sourceLang)}</span>
      </div>
      <div class="language-arrow">→</div>
      <div class="language-badge target-lang">
        <span class="lang-label">${escapeHtml(languageInfo.targetLang)}</span>
      </div>
    </div>
  ` : '';

    bubble.innerHTML = `
    <div class="close-btn" title="Close">×</div>
    ${languageIndicator}
    <div class="source-text">${escapeHtml(sourceText)}</div>
    <div class="translated-text">${escapeHtml(translatedText)}</div>
    <div class="word-breakdown">
      <div class="word-breakdown-title">Click words for individual translations:</div>
      <div class="combination-controls">
        <div class="combination-status"></div>
        <button class="combination-btn" title="Enter combination mode for multiple words">🔗</button>
      </div>
      <div class="word-pills"></div>
      <div class="word-translation"></div>
    </div>
    <div class="save-section">
      <button class="save-button-translate">
        <span>💾</span>
        <span>Save</span>
        <span class="save-count">0</span>
      </button>
      <div class="save-status"></div>
    </div>
    <div class="meta">Built-in Translation</div>
  `;

    // Position the bubble
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    const left = rect.left + scrollX;
    const top = rect.bottom + scrollY + 5;

    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';

    document.body.appendChild(bubble);
    bubbleEl = bubble;

    // Add close button functionality
    const closeBtn = bubble.querySelector('.close-btn');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent any unwanted bubbling
      removeBubble('create buble at 2');
    });

    // Add save button functionality
    const saveBtn = bubble.querySelector('.save-button-translate');
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent bubble removal
      handleSaveWords();
    });

    // Add combination button functionality
    const combinationBtn = bubble.querySelector('.combination-btn');
    combinationBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent bubble removal
      toggleCombinationMode();
    });

    // Create word pills if not loading
    if (!isLoading) {
      createWordPills(sourceText);
    }


    return bubble;
  }

  // Remove the translation bubble
  function removeBubble(source = null) {
    console.log('here the ' + source)
    if (bubbleEl) {
      bubbleEl.remove();
      bubbleEl = null;
      // Clear selected words when bubble is removed
      selectedWords.clear();
      // Reset combination mode state
      combinationMode = false;
      selectedWordsForCombination.clear();
    }
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Get abbreviated language name
  function getLanguageName(langCode) {
    const languageNames = {
      'auto': 'Auto',
      'en': 'EN',
      'es': 'ES',
      'fr': 'FR',
      'de': 'DE',
      'it': 'IT',
      'pt': 'PT',
      'ru': 'RU',
      'ja': 'JA',
      'ko': 'KO',
      'zh': 'ZH',
      'zh-cn': 'CN',
      'zh-tw': 'TW',
      'ar': 'AR',
      'hi': 'HI',
      'tr': 'TR',
      'nl': 'NL',
      'sv': 'SV',
      'da': 'DA',
      'no': 'NO',
      'fi': 'FI',
      'pl': 'PL',
      'cs': 'CS',
      'sk': 'SK',
      'hu': 'HU',
      'ro': 'RO',
      'bg': 'BG',
      'hr': 'HR',
      'sr': 'SR',
      'sl': 'SL',
      'et': 'ET',
      'lv': 'LV',
      'lt': 'LT',
      'uk': 'UK',
      'be': 'BE',
      'mk': 'MK',
      'mt': 'MT',
      'ca': 'CA',
      'eu': 'EU',
      'gl': 'GL',
      'is': 'IS',
      'sq': 'SQ',
      'el': 'EL',
      'he': 'HE',
      'fa': 'FA',
      'th': 'TH',
      'vi': 'VI',
      'id': 'ID',
      'ms': 'MS',
      'ur': 'UR',
      'bn': 'BN',
      'ta': 'TA',
      'te': 'TE',
      'ml': 'ML',
      'kn': 'KN',
      'gu': 'GU',
      'pa': 'PA',
      'ne': 'NE',
      'si': 'SI',
      'my': 'MY',
      'km': 'KM',
      'lo': 'LO',
      'ka': 'KA',
      'am': 'AM',
      'sw': 'SW',
      'af': 'AF'
    };

    return languageNames[langCode] || langCode.toUpperCase().slice(0, 3);
  }

  // Return full language name for menu display
  function getFullLanguageName(code) {
    const map = {
      'auto': 'Auto Detected', 'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese', 'zh-cn': 'Chinese (Simplified)', 'zh-tw': 'Chinese (Traditional)', 'ar': 'Arabic', 'hi': 'Hindi', 'tr': 'Turkish', 'nl': 'Dutch', 'sv': 'Swedish', 'da': 'Danish', 'no': 'Norwegian', 'fi': 'Finnish', 'pl': 'Polish', 'cs': 'Czech', 'sk': 'Slovak', 'hu': 'Hungarian', 'ro': 'Romanian', 'bg': 'Bulgarian', 'hr': 'Croatian', 'uk': 'Ukrainian', 'el': 'Greek', 'he': 'Hebrew', 'fa': 'Persian', 'th': 'Thai', 'vi': 'Vietnamese', 'id': 'Indonesian', 'ms': 'Malay', 'ur': 'Urdu', 'bn': 'Bengali', 'ta': 'Tamil', 'te': 'Telugu', 'ml': 'Malayalam', 'kn': 'Kannada', 'gu': 'Gujarati', 'pa': 'Punjabi', 'ne': 'Nepali', 'si': 'Sinhala', 'my': 'Burmese', 'km': 'Khmer', 'lo': 'Lao', 'ka': 'Georgian', 'am': 'Amharic', 'sw': 'Swahili', 'af': 'Afrikaans'
    };
    return map[code] || code.toUpperCase();
  }

  function buildLanguageList() {
    // reuse codes from getLanguageName mapping (manually maintain same superset)
    return ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'tr', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'uk', 'el', 'he', 'fa', 'th', 'vi', 'id', 'ms', 'sw'];
  }

  function openLanguageMenu(targetBadge) {
    closeLanguageMenu();
    const menu = document.createElement('div');
    menu.className = '__translator_lang_menu';
    menu.id = 'lang_menu';
    const codes = buildLanguageList();
    const current = tempTargetLang || settings?.target_lang || 'en';
    menu.innerHTML = `
    <div class="__lang_menu_header">
      <input type="text" placeholder="Search language..." class="__lang_menu_search" />
    </div>
    <div class="__lang_menu_list">
      ${codes.map(c => `<div class="__lang_menu_item ${c === current ? 'active' : ''}" data-code="${c}">
         <span class="code">${getLanguageName(c)}</span>
         <span class="name">${getFullLanguageName(c)}</span>
      </div>`).join('')}
    </div>`;
    document.body.appendChild(menu);
    //  document.getElementById('translate_bubble').appendChild(menu)

    bubbleLangMenuEl = menu;
    // position below badge
    const rect = targetBadge.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.top = (window.scrollY + rect.bottom + 6) + 'px';
    menu.style.left = (window.scrollX + rect.left) + 'px';
    menu.style.zIndex = 9999;
    menu.addEventListener('click', async (e) => {
      const item = e.target.closest('.__lang_menu_item');
      if (!item) return;
      const code = item.dataset.code;
      await retranslateBubble(code);
      closeLanguageMenu();
    });
    const search = menu.querySelector('.__lang_menu_search');
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      menu.querySelectorAll('.__lang_menu_item').forEach(it => {
        const code = it.dataset.code;
        const name = getFullLanguageName(code).toLowerCase();
        const short = getLanguageName(code).toLowerCase();
        it.style.display = (!q || name.includes(q) || short.includes(q)) ? '' : 'none';
      });
    });
    // click outside to close
    setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideMenuClick, { capture: true, once: true });
    }, 0);
  }

  function handleOutsideMenuClick(e) {
    if (bubbleLangMenuEl && !bubbleLangMenuEl.contains(e.target)) {
      closeLanguageMenu();
    }
  }

  function closeLanguageMenu() {
    if (bubbleLangMenuEl) { bubbleLangMenuEl.remove(); bubbleLangMenuEl = null; }
  }

  async function retranslateBubble(newTarget) {
    if (!bubbleEl || !lastSelection) return;
    const transNode = bubbleEl.querySelector('.translated-text');
    if (transNode) transNode.textContent = 'Translating...';
    tempTargetLang = newTarget;
    // clear word translations & pills states as they are language-specific
    const wordTransDiv = bubbleEl.querySelector('.word-translation');
    if (wordTransDiv) { wordTransDiv.innerHTML = ''; wordTransDiv.classList.remove('show'); }
    const pills = bubbleEl.querySelectorAll('.word-pill');
    pills.forEach(p => p.classList.remove('active', 'selected'));
    selectedWords.clear();
    updateSaveButton();
    // Get latest source language from storage (like original path)
    let sourceLanguage = 'auto';
    try {
      const storageResult = await chrome.storage.sync.get(['sourceLanguage']);
      if (storageResult.sourceLanguage) sourceLanguage = storageResult.sourceLanguage;
    } catch { }
    try {
      const result = await translateTextWithAPI(lastSelection, newTarget, sourceLanguage);
      if (transNode) transNode.textContent = result;
    } catch (err) {
      if (transNode) transNode.textContent = 'Translation failed: ' + err.message;
    }
    // update target badge label
    const targetBadgeLabel = bubbleEl.querySelector('.language-badge.target-lang .lang-label');
    if (targetBadgeLabel) targetBadgeLabel.textContent = getLanguageName(newTarget);
  }

  // Create word pills for individual translation
  function createWordPills(text) {
    if (!bubbleEl) return;

    const pillsContainer = bubbleEl.querySelector('.word-pills');
    if (!pillsContainer) return;

    // Split text into words, removing punctuation and creating clean word tokens
    const words = text.match(/[\p{L}\p{N}]+/gu) || [];

    words.forEach((word, index) => {
      const pill = document.createElement('span');
      pill.className = 'word-pill';
      pill.textContent = word;
      pill.dataset.word = word;
      pill.dataset.index = index;

      pill.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent bubble removal
        handlePillClick(word, pill);
      });

      // Add double-click for selection toggle
      // pill.addEventListener('dblclick', (e) => {
      //   e.preventDefault();
      //   e.stopPropagation(); // Prevent bubble removal
      //   toggleWordSelection(word, pill);
      // });

      pillsContainer.appendChild(pill);
    });
  }

  // Handle individual word translation
  async function handlePillClick(word, pillElement) {
    if (!bubbleEl) return;

    // If in combination mode, handle word selection for combination
    if (combinationMode) {
      toggleWordForCombination(word, pillElement);
      return;
    }

    // Toggle active state for clicked pill (don't remove from others)
    const isCurrentlyActive = pillElement.classList.contains('active');

    if (isCurrentlyActive) {
      // Remove this word's translation from display
      pillElement.classList.remove('active');
      pillElement.classList.remove('selected');
      removeWordTranslationFromDisplay(word);
      selectedWords.delete(word);
      return;
    }

    // Add active state to clicked pill
    pillElement.classList.add('active');

    const wordTranslationDiv = bubbleEl.querySelector('.word-translation');
    if (!wordTranslationDiv) return;

    // Show loading state for this specific word
    addWordTranslationToDisplay(word, 'Translating word...', true);

    try {
      // Clean the word (remove only basic punctuation, preserve Unicode letters)
      const cleanWord = word.replace(/[.,;:!?"""''()[\]{}]/g, '').trim();
      if (!cleanWord) {
        addWordTranslationToDisplay(word, 'Punctuation', false);
        return;
      }

      // Get current settings
      const currentSettings = await getSettings();

      // Get source language from storage
      let sourceLanguage = 'auto';
      try {
        const storageResult = await chrome.storage.sync.get(['sourceLanguage']);
        if (storageResult.sourceLanguage) {
          sourceLanguage = storageResult.sourceLanguage;
        }
      } catch (err) {
        console.warn('Could not get source language for word translation:', err);
      }

      // Translate the individual word
      let wordTranslation;
      try {
        wordTranslation = await translateTextWithAPI(cleanWord, currentSettings.target_lang, sourceLanguage);
      } catch (err) {
        console.error('Word translation failed:', err);
        wordTranslation = 'Translation unavailable';
      }

      // Display the word translation
      addWordTranslationToDisplay(word, wordTranslation, false);

    } catch (err) {
      console.error('Error in word translation:', err);
      addWordTranslationToDisplay(word, 'Error', false);
    }
  }

  // Add or update a word translation in the display
  function addWordTranslationToDisplay(word, translation, isLoading = false) {
    const wordTranslationDiv = bubbleEl.querySelector('.word-translation');
    if (!wordTranslationDiv) return;

    // Ensure the translation area is visible
    wordTranslationDiv.classList.add('show');

    // Check if this word already has a display element
    let wordElement = wordTranslationDiv.querySelector(`[data-word="${escapeHtml(word)}"]`);

    if (!wordElement) {
      // Create new word translation element
      wordElement = document.createElement('div');
      wordElement.className = 'word-translation-item';
      wordElement.dataset.word = word;
      wordTranslationDiv.appendChild(wordElement);
    }

    if (isLoading) {
      wordElement.innerHTML = `
      <div class="word-translation-content loading">
        <span class="word-original">${escapeHtml(word)}</span>
        <span class="word-translated">Translating...</span>
      </div>
    `;
    } else {
      wordElement.innerHTML = `
      <div class="word-translation-content">
        <span class="word-original">${escapeHtml(word)}</span>
        <span class="word-translated">${escapeHtml(translation)}</span>
        <button class="add-word-btn" data-word="${escapeHtml(word)}" data-translation="${escapeHtml(translation)}">
          + Add
        </button>
      </div>
    `;

      // Add event listener to the add button
      const addButton = wordElement.querySelector('.add-word-btn');
      addButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const pill = bubbleEl.querySelector(`.word-pill[data-word="${word}"]`);
        toggleWordSelection(word, pill);
        // Capture the possibly edited translation from span or data attribute
        const currentSpan = wordElement.querySelector('.word-translated');
        const currentVal = currentSpan ? currentSpan.textContent : addButton.getAttribute('data-translation') || translation;
        selectedWords.set(word, currentVal);
      });

      // Hook up in-place editing (only while + Add button exists)
      const editableSpan = wordElement.querySelector('.word-translated');
      if (editableSpan) {
        enableEditableTranslation(editableSpan, addButton, word);
      }
    }
  }

  // Remove a word translation from the display
  function removeWordTranslationFromDisplay(word) {
    const wordTranslationDiv = bubbleEl.querySelector('.word-translation');
    if (!wordTranslationDiv) return;

    const wordElement = wordTranslationDiv.querySelector(`[data-word="${escapeHtml(word)}"]`);
    if (wordElement) {
      wordElement.remove();
    }

    // Hide the translation area if no words are being displayed
    const remainingWords = wordTranslationDiv.querySelectorAll('.word-translation-item');
    if (remainingWords.length === 0) {
      wordTranslationDiv.classList.remove('show');
    }
  }

  // Toggle word selection for saving
  function toggleWordSelection(word, pillElement) {
    if (!pillElement) {
      return;
    }

    // Prevent event bubbling
    event?.stopPropagation();

    const isSelected = pillElement.classList.contains('selected');

    if (isSelected) {
      // Remove from selection
      pillElement.classList.remove('selected');
      selectedWords.delete(word);
    } else {
      // Add to selection - try to get translation from displayed translations
      let translation = 'Translation needed';

      // Look for the translation in the current display
      const wordTranslationDiv = bubbleEl?.querySelector('.word-translation');
      if (wordTranslationDiv) {
        const wordItem = wordTranslationDiv.querySelector(`[data-word="${word}"]`);
        if (wordItem) {
          const translationSpan = wordItem.querySelector('.word-translated');
          if (translationSpan) {
            translation = translationSpan.textContent;
          }
        }
      }

      // If still no translation and the word is active, it should have been translated
      if (translation === 'Translation needed' && pillElement.classList.contains('active')) {
        translation = 'Please click the word first to translate';
      }

      pillElement.classList.add('selected');
      selectedWords.set(word, translation);
    }

    updateSaveButton();
  }

  // Update save button visibility and count
  function updateSaveButton() {
    if (!bubbleEl) return;

    const saveSection = bubbleEl.querySelector('.save-section');
    const saveCount = bubbleEl.querySelector('.save-count');

    const selectedCount = selectedWords.size;

    if (selectedCount > 0) {
      saveSection.classList.add('show');
      saveCount.textContent = selectedCount;
    } else {
      saveSection.classList.remove('show');
    }
  }

  // Handle save words functionality
  async function handleSaveWords() {
    if (selectedWords.size === 0) return;

    // Show saving state
    const saveStatus = bubbleEl?.querySelector('.save-status');
    if (saveStatus) {
      saveStatus.textContent = `💾 Saving ${selectedWords.size} words...`;
      saveStatus.classList.add('show');
    }

    try {
      // Create the data object to save
      // Get detected source language from settings or storage
      let detectedSourceLanguage = '';
      try {
        const storageResult = await chrome.storage.sync.get(['sourceLanguage']);
        if (storageResult.sourceLanguage) {
          detectedSourceLanguage = storageResult.sourceLanguage;
        }
      } catch (err) {
        console.warn('Could not get detected source language:', err);
      }

      const saveData = {
        timestamp: new Date().toISOString(),
        originalText: lastSelection,
        targetLanguage: settings?.target_lang || 'en',
        sourceLanguage: detectedSourceLanguage,
        words: Array.from(selectedWords.entries()).map(([word, translation]) => ({
          original: word,
          translation: translation,
          context: computeContextSentence(word, translation)
        })),
        totalWords: selectedWords.size,
        url: window.location.href,
        domain: window.location.hostname
      };

      // Save each word as a separate entry in IndexedDB
      const savedIds = [];
      for (const [word, translation] of selectedWords.entries()) {
        const wordEntry = {
          timestamp: new Date().toISOString(),
          originalWord: word,
          translatedWord: translation,
          context: computeContextSentence(word, translation),
          targetLanguage: settings?.target_lang || 'en',
          sourceLanguage: detectedSourceLanguage,
          url: window.location.href,
          domain: window.location.hostname,
          sessionId: saveData.timestamp // Link words from the same session
        };

        try {
          // Send to background service worker instead of directly to IndexedDB
          const response = await chrome.runtime.sendMessage({
            type: 'SAVE_VOCABULARY',
            data: wordEntry
          });

          if (response && response.success) {
            savedIds.push(response.id);
          } else {
            console.error('Failed to save word via service worker:', response ? response.error : 'No response');
          }
        } catch (error) {
          console.error('Failed to save individual word:', word, error);
        }
      }

      // Show success feedback
      if (saveStatus) {
        saveStatus.textContent = `✅ ${savedIds.length} words saved individually!`;

        // Hide status after 3 seconds
        setTimeout(() => {
          saveStatus.classList.remove('show');
        }, 3000);
      }

      // Global toast notification (non-intrusive)
      showSaveToast(`${savedIds.length} word${savedIds.length !== 1 ? 's' : ''} saved`);

      // Remove only the + Add buttons for words that were saved now.
      if (bubbleEl) {
        const savedWordSet = new Set(Array.from(selectedWords.entries()).map(([w]) => w));
        bubbleEl.querySelectorAll('.word-translation-item').forEach(item => {
          const w = item.getAttribute('data-word');
          if (savedWordSet.has(w)) {
            const addBtn = item.querySelector('.add-word-btn');
            if (addBtn) addBtn.remove();
          }
        });
        // Pills that were part of save lose their selected state but remain clickable for toggling visualization.
        bubbleEl.querySelectorAll('.word-pill.selected').forEach(p => p.classList.remove('selected'));
      }

      // Clear only collection map (UI already adjusted), allowing future selections.
      selectedWords.clear();
      updateSaveButton(); // will hide save button until new selections

    } catch (error) {
      console.error('Failed to save vocabulary to IndexedDB:', error);

      // Show error feedback
      if (saveStatus) {
        saveStatus.textContent = `❌ Failed to save words. Please try again.`;
        saveStatus.style.color = '#dc2626';

        // Hide error status after 5 seconds
        setTimeout(() => {
          saveStatus.classList.remove('show');
          saveStatus.style.color = ''; // Reset color
        }, 5000);
      }
    }
  }

  // Create (or reuse) a toast container and show a transient toast
  function showSaveToast(message) {
    try {
      let container = document.getElementById('__translator_toast_container');
      if (!container) {
        container = document.createElement('div');
        container.id = '__translator_toast_container';
        container.style.position = 'fixed';
        // Position near browser toolbar/extension area (top-right)
        container.style.top = '12px';
        container.style.right = '14px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        container.style.zIndex = 2147483647; // on top
        document.body.appendChild(container);
      }
      const toast = document.createElement('div');
      toast.className = '__translator_toast';
      toast.textContent = '💾 ' + message;
      toast.style.background = '#16a34a';
      toast.style.color = '#fff';
      toast.style.padding = '8px 14px';
      toast.style.fontSize = '13px';
      toast.style.lineHeight = '1.3';
      toast.style.borderRadius = '6px';
      toast.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
      toast.style.fontFamily = 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
      toast.style.transition = 'opacity .25s ease, transform .25s ease';
      container.appendChild(toast);
      requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-6px)';
        setTimeout(() => { toast.remove(); if (!container.childElementCount) container.remove(); }, 300);
      }, 2600);
    } catch (err) {
      console.warn('Failed to show save toast:', err);
    }
  }

  // Translate text using the configured API
  async function translateTextWithAPI(text, targetLang, sourceLanguage) {
    try {
      // Ensure text is properly encoded
      const cleanText = text.trim();
      if (!cleanText) {
        throw new Error('Empty text provided for translation');
      }

      if ('Translator' in self) {
        const translator = await Translator.create({
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLang
        });

        const result = await translator.translate(cleanText);
        return result;
      } else {
        throw new Error('Built-in Translation API not available');
      }
    } catch (err) {
      console.error('Translation error:', err);
      throw err;
    }
  }

  // New trigger-mode aware selection handler
  async function onSelection(event) {
    try {
      if (!extensionEnabled) return; // do nothing when extension disabled
      if (skipNextSelection) { // swallow one selection event following icon click
        skipNextSelection = false;
        return;
      }
      const sel = window.getSelection();
      if (!sel) return;
      if (bubbleEl && event && event.target && bubbleEl.contains(event.target)) return; // ignore clicks inside bubble
      const text = sel.toString().trim();
      if (!text) {
        // If we're actively editing inside the bubble (e.g., translation edit input), do not close it
        const active = document.activeElement;
        if (bubbleEl && active && bubbleEl.contains(active) && (active.classList.contains('translation-edit-input') || active.tagName === 'INPUT')) {
          return; // keep bubble open during inline editing
        }
        // removeBubble('on selection'); //TODO: not sure what to do here if remove this or not
        clearPendingState();
        return;
      }

      lastSelection = text;
      let range; try { range = sel.getRangeAt(0); } catch { return; }
      const rects = range.getClientRects();
      let rect = range.getBoundingClientRect();
      if (rect && rect.width === 0 && rects.length) rect = rects[0];
      // Capture nearest block ancestor for later sentence extraction
      try { selectionContextElement = findBlockAncestor(range.commonAncestorContainer); } catch { selectionContextElement = null; }
      settings = await getSettings();
      // Debug log (remove later if noisy)
      // console.debug('[Translator] bubbleMode on selection:', settings.bubbleMode);
      hotkeySpec = parseHotkeyString(settings.bubbleHotkey);
      if (settings.bubbleMode === 'auto') {
        if (bubbleEl) return; // already showing bubble
        performTranslation(text, rect);
      } else if (settings.bubbleMode === 'icon') {
        clearPendingState();
        pendingSelection = { text, rect };
        ensureTriggerStyles();
        triggerIconTimer = setTimeout(() => { if (pendingSelection && pendingSelection.text === text) showTriggerIcon(rect); }, Math.max(0, settings.bubbleIconDelay || 0));
      } else if (settings.bubbleMode === 'hotkey') {
        clearPendingState();
        pendingSelection = { text, rect }; // wait for hotkey or double copy
      }
    } catch (err) {
      console.error('Translator content script selection handling error:', err);
    }
  }

  // Key listener for hotkey & double Ctrl+C gesture
  document.addEventListener('keydown', (e) => {
    if (!settings || settings.bubbleMode !== 'hotkey') return;
    if (hotkeySpec) {
      // Sequence support
      if (hotkeySpec.keys.length > 1) {
        if (handleSequenceKey(hotkeySpec, e)) {
          if (pendingSelection && !bubbleEl) triggerTranslationFromPending();
        }
        return; // skip fallback when custom sequence defined
      } else if (singleKeyHotkeyMatch(hotkeySpec, e)) {
        if (pendingSelection && !bubbleEl) triggerTranslationFromPending();
        return;
      }
    }
    // Fallback: double Ctrl+C gesture (only if no custom hotkey sequence active)
    if (!hotkeySpec && e.key.toLowerCase() === 'c' && e.ctrlKey && !e.shiftKey && !e.altKey) {
      const now = Date.now();
      if (now - lastCopyKeyTime < 500) {
        if (pendingSelection && !bubbleEl) triggerTranslationFromPending();
      }
      lastCopyKeyTime = now;
    }
  });

  // Determine reasonable block-level ancestor for context sentences
  function findBlockAncestor(node) {
    if (!node) return null;
    if (node.nodeType === 3) node = node.parentElement;
    const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'ARTICLE', 'SECTION', 'MAIN', 'TD', 'TH']);
    let cur = node; let depth = 0;
    while (cur && cur !== document.body && depth < 10) {
      if (cur.tagName && BLOCK_TAGS.has(cur.tagName)) return cur;
      cur = cur.parentElement; depth++;
    }
    return cur || null;
  }

  // Extract one sentence containing the word (try original then translated) from ancestor
  function computeContextSentence(originalWord, translatedWord) {
    if (!selectionContextElement) return lastSelection;
    let raw = '';
    try { raw = selectionContextElement.innerText || selectionContextElement.textContent || ''; } catch { }
    if (!raw) return lastSelection;
    raw = raw.replace(/\s+/g, ' ').trim();
    if (!raw) return lastSelection;
    const sentences = raw.split(/(?<=[.!?])\s+/);
    const lw = (originalWord || '').toLowerCase();
    const lt = (translatedWord || '').toLowerCase();
    let found = sentences.find(s => s.toLowerCase().includes(lw));
    if (!found && lt) found = sentences.find(s => s.toLowerCase().includes(lt));
    return (found || lastSelection).trim();
  }

  // Listen for settings changes from options page to update mode without reload
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      if (changes.extensionEnabled) {
        extensionEnabled = !!changes.extensionEnabled.newValue;
        if (!extensionEnabled) {
          if (bubbleEl) removeBubble('disabled');
          clearPendingState();
        }
      }
      if (changes.bubbleMode || changes.bubbleIconDelay || changes.bubbleHotkey || changes.target_lang) {
        getSettings().then(s => { settings = s; hotkeySpec = parseHotkeyString(settings.bubbleHotkey); });
      }
    }
  });

  // Use mouseup and keyup (for keyboard selections)
  document.addEventListener('mouseup', (e) => {
    // tiny delay to allow selection to settle
    setTimeout(() => onSelection(e), 10);
  });


  // Helper to make a translation span editable
  function enableEditableTranslation(spanEl, addButton, word) {
    spanEl.style.cursor = 'text';
    spanEl.title = 'Click to edit translation';
    spanEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (spanEl.dataset.editing === '1') return; // already editing
      spanEl.dataset.editing = '1';
      const original = spanEl.textContent || '';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'translation-edit-input';
      input.value = original;
      // Basic inline styling (kept minimal to avoid layout jumps)
      input.style.fontSize = '12px';
      input.style.padding = '2px 4px';
      input.style.marginLeft = '4px';
      input.style.minWidth = '110px';
      input.style.border = '1px solid #9ca3af';
      input.style.borderRadius = '4px';
      input.style.outline = 'none';
      input.style.background = '#fff';
      input.style.color = '#111';
      spanEl.replaceWith(input);
      input.focus();
      input.select();

      let committed = false;
      const commit = () => {
        if (committed) return; committed = true;
        const newVal = (input.value || '').trim() || original;
        const newSpan = document.createElement('span');
        newSpan.className = 'word-translated';
        newSpan.textContent = newVal;
        input.replaceWith(newSpan);
        // Update data
        addButton.setAttribute('data-translation', newVal);
        if (selectedWords.has(word)) {
          selectedWords.set(word, newVal);
          updateSaveButton();
        }
        // Re-enable editing recursively
        enableEditableTranslation(newSpan, addButton, word);
      };
      const cancel = () => {
        if (committed) return; committed = true;
        // Restore original span
        const restore = document.createElement('span');
        restore.className = 'word-translated';
        restore.textContent = original;
        input.replaceWith(restore);
        enableEditableTranslation(restore, addButton, word);
      };

      input.addEventListener('keydown', (ke) => {
        if (ke.key === 'Enter') { ke.preventDefault(); commit(); }
        else if (ke.key === 'Escape') { ke.preventDefault(); cancel(); }
      });
      input.addEventListener('blur', commit, { once: true });
    }, { once: true }); // once so we replace with input; after commit we re-add listener
  }
  document.addEventListener('keyup', (e) => {
    // handle shift+arrow etc; pass event so we can detect editing target
    setTimeout(() => onSelection(e), 10);
  });

  // Clean up when navigating single-page apps: remove bubble
  window.addEventListener('scroll', () => {
    if (bubbleEl) removeBubble('scroll');
    if (pendingSelection) clearTriggerIcon();
  }, { passive: true });

  // Remove bubble when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (bubbleEl) {
      const isInsideBubble = bubbleEl.contains(e.target);
      const inLangMenu = e.target.closest?.('.__translator_lang_menu');
      // Close only if click is outside bubble AND not in language menu
      if (!isInsideBubble && !inLangMenu) {
        removeBubble('click');
        clearPendingState();
      }
    }
  }, true);

  // Basic styles for language menu injected once
  const existingStyle = document.getElementById('__translator_lang_menu_style');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = '__translator_lang_menu_style';
    style.textContent = `
  .__translator_lang_menu{background:#fff;border:1px solid #d1d5db;border-radius:8px;padding:8px 0;width:220px;box-shadow:0 8px 24px rgba(0,0,0,.15);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:12px;}
  .__translator_lang_menu .__lang_menu_header{padding:0 10px 6px;}
  .__translator_lang_menu .__lang_menu_search{width:100%;padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;}
  .__translator_lang_menu .__lang_menu_list{max-height:260px;overflow-y:auto;}
  .__translator_lang_menu .__lang_menu_item{padding:6px 10px;display:flex;gap:6px;cursor:pointer;align-items:center;}
  .__translator_lang_menu .__lang_menu_item .code{font-weight:600;color:#374151;min-width:32px;}
  .__translator_lang_menu .__lang_menu_item .name{color:#6b7280;flex:1;}
  .__translator_lang_menu .__lang_menu_item:hover{background:#f3f4f6;}
  .__translator_lang_menu .__lang_menu_item.active{background:#eef2ff;}
  `;
    document.head.appendChild(style);
  }

  // Combination mode functions
  function toggleCombinationMode() {
    combinationMode = !combinationMode;
    selectedWordsForCombination.clear();

    const combinationBtn = bubbleEl?.querySelector('.combination-btn');
    const combinationStatus = bubbleEl?.querySelector('.combination-status');
    const wordPills = bubbleEl?.querySelectorAll('.word-pill');

    if (!combinationBtn || !combinationStatus) return;

    if (combinationMode) {
      // Enable combination mode
      combinationBtn.classList.add('active');
      combinationBtn.innerHTML = `🔓`;
      combinationBtn.title = 'Exit combination mode';
      combinationStatus.innerHTML = `
      <div class="combination-info">
        <span>Select words for combined translation</span>
      </div>
    `;
      combinationStatus.classList.add('show');

      // Clear existing individual word selections but keep their translations
      wordPills.forEach(pill => {
        pill.classList.remove('active', 'selected');
      });
      selectedWords.clear();

    } else {
      // Disable combination mode
      combinationBtn.classList.remove('active');
      combinationBtn.innerHTML = `🔗`;
      combinationBtn.title = 'Enter combination mode for multiple words';
      combinationStatus.innerHTML = '';
      combinationStatus.classList.remove('show');

      // Clear combination selections but preserve word translation area
      wordPills.forEach(pill => {
        pill.classList.remove('combination-selected');
      });

      // Remove any instant combination translation
      removeInstantCombinedTranslation();

      // Clear combination selection set
      selectedWordsForCombination.clear();
    }
  }

  function toggleWordForCombination(word, pillElement) {
    if (!combinationMode || !bubbleEl) return;

    const isSelected = selectedWordsForCombination.has(word);
    const combinationStatus = bubbleEl.querySelector('.combination-status');

    if (isSelected) {
      // Remove from combination selection
      selectedWordsForCombination.delete(word);
      pillElement.classList.remove('combination-selected');
    } else {
      // Add to combination selection
      selectedWordsForCombination.add(word);
      pillElement.classList.add('combination-selected');
    }

    // Update status text and handle instant translation
    const infoSpan = combinationStatus?.querySelector('.combination-info span');
    if (infoSpan) {
      if (selectedWordsForCombination.size >= 2) {
        infoSpan.textContent = `${selectedWordsForCombination.size} words selected for combination`;
        // Instantly show combined translation when 2+ words are selected
        showInstantCombinedTranslation();
      } else {
        infoSpan.textContent = 'Select words to combine for multiple words';
        // Remove combined translation if less than 2 words selected
        removeInstantCombinedTranslation();
      }
    }
  }

  // Handle saving combination as a single entry
  async function handleSaveCombination(combinedPhrase, translation) {
    if (!bubbleEl) {
      console.warn('Cannot save combination: bubble element is null');
      return;
    }

    const saveCombinationBtn = bubbleEl.querySelector('.save-combination-btn');
    if (saveCombinationBtn) {
      saveCombinationBtn.innerHTML = '💾 Saving...';
      saveCombinationBtn.disabled = true;
    }

    try {
      // Get detected source language from settings or storage
      let detectedSourceLanguage = '';
      try {
        const storageResult = await chrome.storage.sync.get(['sourceLanguage']);
        if (storageResult.sourceLanguage) {
          detectedSourceLanguage = storageResult.sourceLanguage;
        }
      } catch (err) {
        console.warn('Could not get detected source language:', err);
      }

      // Create the combination entry
      const combinationEntry = {
        timestamp: new Date().toISOString(),
        originalWord: combinedPhrase,
        translatedWord: translation,
        context: lastSelection, // Use the full original selection as context
        targetLanguage: settings?.target_lang || 'en',
        sourceLanguage: detectedSourceLanguage,
        url: window.location.href,
        domain: window.location.hostname,
        isCombination: true, // Flag to identify this as a word combination
        combinedWords: Array.from(selectedWordsForCombination) // Store the individual words
      };

      // Save via background service worker
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_VOCABULARY',
        data: combinationEntry
      });

      if (response && response.success) {
        // Show success feedback
        if (saveCombinationBtn) {
          saveCombinationBtn.innerHTML = '✅ Saved!';

          setTimeout(() => {
            if (saveCombinationBtn) {
              saveCombinationBtn.innerHTML = '💾 Save Combination';
              saveCombinationBtn.disabled = false;
            }
          }, 2000);
        }

        // Show global toast notification
        showSaveToast(`Combination "${combinedPhrase}" saved!`);

      } else {
        throw new Error(response ? response.error : 'No response from save service');
      }

    } catch (error) {
      console.error('Failed to save combination:', error);

      if (saveCombinationBtn) {
        saveCombinationBtn.innerHTML = '❌ Save Failed';
        setTimeout(() => {
          if (saveCombinationBtn) {
            saveCombinationBtn.innerHTML = '💾 Save Combination';
            saveCombinationBtn.disabled = false;
          }
        }, 2000);
      }
    }
  }

  // Show instant combined translation in the word translation area
  async function showInstantCombinedTranslation() {
    if (!bubbleEl || selectedWordsForCombination.size < 2) return;

    // Get the original order of words from the text
    const allPills = Array.from(bubbleEl.querySelectorAll('.word-pill'));
    const selectedPillsInOrder = allPills.filter(pill =>
      selectedWordsForCombination.has(pill.dataset.word)
    );

    if (selectedPillsInOrder.length === 0) return;

    // Create the combined phrase in the original word order
    const combinedPhrase = selectedPillsInOrder.map(pill => pill.dataset.word).join(' ');

    const wordTranslationDiv = bubbleEl.querySelector('.word-translation');
    if (!wordTranslationDiv) return;

    // Ensure the translation area is visible
    wordTranslationDiv.classList.add('show');

    // Check if combination translation already exists
    let combinationElement = wordTranslationDiv.querySelector('.instant-combination-translation');

    if (!combinationElement) {
      // Create new combination translation element
      combinationElement = document.createElement('div');
      combinationElement.className = 'word-translation-item instant-combination-translation';
      combinationElement.dataset.combinationPhrase = combinedPhrase;

      // Insert at the top of the word translation area
      wordTranslationDiv.insertBefore(combinationElement, wordTranslationDiv.firstChild);
    }

    // Show loading state
    combinationElement.innerHTML = `
    <div class="word-translation-content combination-instant loading">
      <span class="combination-label">🔗 Combined:</span>
      <span class="word-original">"${escapeHtml(combinedPhrase)}"</span>
      <span class="word-translated">Translating...</span>
    </div>
  `;

    try {
      // Get current settings
      const currentSettings = await getSettings();

      // Get source language from storage
      let sourceLanguage = 'auto';
      try {
        const storageResult = await chrome.storage.sync.get(['sourceLanguage']);
        if (storageResult.sourceLanguage) {
          sourceLanguage = storageResult.sourceLanguage;
        }
      } catch (err) {
        console.warn('Could not get source language for instant combination translation:', err);
      }

      // Translate the combined phrase
      const combinationTranslation = await translateTextWithAPI(
        combinedPhrase,
        currentSettings.target_lang,
        sourceLanguage
      );

      // Update with actual translation
      combinationElement.innerHTML = `
      <div class="word-translation-content combination-instant">
        <span class="combination-label">🔗 Combined:</span>
        <span class="word-original">"${escapeHtml(combinedPhrase)}"</span>
        <span class="word-translated">${escapeHtml(combinationTranslation)}</span>
        <button class="add-word-btn combination-add" data-phrase="${escapeHtml(combinedPhrase)}" data-translation="${escapeHtml(combinationTranslation)}">
          Save Combination
        </button>
      </div>
    `;

      // Add event listener to prevent bubble closing when clicking on combination area
      combinationElement.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // Add event listener to the add combination button
      const addCombinationButton = combinationElement.querySelector('.combination-add');
      addCombinationButton?.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSaveCombination(combinedPhrase, combinationTranslation);
      });

    } catch (err) {
      console.error('Instant combination translation failed:', err);

      // Show error state
      combinationElement.innerHTML = `
      <div class="word-translation-content combination-instant error">
        <span class="combination-label">🔗 Combined:</span>
        <span class="word-original">"${escapeHtml(combinedPhrase)}"</span>
        <span class="word-translated error">Translation failed</span>
      </div>
    `;
    }
  }

  // Remove instant combined translation from display
  function removeInstantCombinedTranslation() {
    if (!bubbleEl) return;

    const wordTranslationDiv = bubbleEl.querySelector('.word-translation');
    if (!wordTranslationDiv) return;

    const combinationElement = wordTranslationDiv.querySelector('.instant-combination-translation');
    if (combinationElement) {
      combinationElement.remove();
    }

    // Hide the translation area if no other words are being displayed
    const remainingWords = wordTranslationDiv.querySelectorAll('.word-translation-item');
    if (remainingWords.length === 0) {
      wordTranslationDiv.classList.remove('show');
    }

  }

  // Initialize extension when content script loads
  (async () => {
    try {
      // Content script initialized successfully
    } catch (error) {
      console.error('Failed to initialize content script:', error);
    }
  })();

})(); // End IIFE wrapper