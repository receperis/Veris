/* Popup JavaScript - Vocabulary Browser */

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize the vocabulary browser
    ensurePopupStyles();
    await initializeVocabularyBrowser();

    // Set up event listeners
    setupEventListeners();
    // Initialize extension toggle UI and behavior
    await initExtensionToggle();

    // Check if it's exercise time
    await checkExerciseTime();

    // Focus the search input so user can immediately type
    const searchEl = document.getElementById('search-input');
    if (searchEl) {
        // slight delay allows rendering & potential async population
        setTimeout(() => searchEl.focus(), 0);
    }
});

let allVocabulary = [];
let filteredVocabulary = [];
let sourceLanguages = [];
let editMode = false;

async function initializeVocabularyBrowser() {
    try {
        // Show loading state
        document.getElementById('vocabulary-list').innerHTML = '<div class="loading">Loading vocabulary...</div>';

        // Get all vocabulary from background service worker
        const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_VOCABULARY' });

        if (response && response.success && response.data) {
            allVocabulary = response.data;

            if (allVocabulary.length === 0) {
                showNoResults('No vocabulary saved yet. Start translating text to build your vocabulary!');
                return;
            }

            // Extract unique source languages
            sourceLanguages = [...new Set(allVocabulary.map(item => item.sourceLanguage))].filter(lang => lang);

            // Populate language dropdown
            populateLanguageDropdown();

            // Initial display of all vocabulary
            filteredVocabulary = [...allVocabulary];
            renderVocabularyList();
        } else {
            console.error('Failed to load vocabulary:', response);
            showNoResults('Failed to load vocabulary. Please check browser console for details.');
        }

    } catch (error) {
        console.error('Error loading vocabulary:', error);
        showNoResults(`Error loading vocabulary: ${error.message}`);
    }
}

function populateLanguageDropdown() {
    const dropdown = document.getElementById('source-language');
    dropdown.innerHTML = '<option value="all">All Languages</option>';

    sourceLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = getLanguageDisplayName(lang);
        dropdown.appendChild(option);
    });
}

function getLanguageDisplayName(langCode) {
    const languageNames = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh': 'Chinese',
        'ar': 'Arabic',
        'hi': 'Hindi',
        'tr': 'Turkish',
        'nl': 'Dutch',
        'pl': 'Polish',
        'sv': 'Swedish',
        'da': 'Danish',
        'no': 'Norwegian',
        'fi': 'Finnish',
        'cs': 'Czech',
        'sk': 'Slovak',
        'hu': 'Hungarian',
        'ro': 'Romanian',
        'bg': 'Bulgarian',
        'hr': 'Croatian',
        'uk': 'Ukrainian',
        'el': 'Greek',
        'he': 'Hebrew',
        'fa': 'Persian',
        'th': 'Thai',
        'vi': 'Vietnamese',
        'id': 'Indonesian',
        'ms': 'Malay',
        'auto': 'Auto-detected'
    };

    return languageNames[langCode] || langCode.toUpperCase();
}


function renderVocabularyList() {
    const vocabularyList = document.getElementById('vocabulary-list');

    if (filteredVocabulary.length === 0) {
        showNoResults('No vocabulary found matching your filters.');
        return;
    }

    // Render different markup depending on edit mode
    vocabularyList.innerHTML = filteredVocabulary.map(item => {
        const id = item.id || '';
        // Normal view: plain display without icons
        if (!editMode) {
            return `
        <div class="vocabulary-item" data-id="${id}">
            <div class="vocabulary-content">
                <div class="source-text">${escapeHtml(item.originalWord || '')}</div>
                <div class="translation">${escapeHtml(item.translatedWord || '')}</div>
            </div>
        </div>`;
        }

        // Edit mode: show pen and delete icons next to each item; clicking pen triggers inline edit
        return `
        <div class="vocabulary-item" data-id="${id}">
            <div class="vocabulary-content">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <div style="flex:1;">
                        <div class="source-text">${escapeHtml(item.originalWord || '')}</div>
                        <div class="translation">${escapeHtml(item.translatedWord || '')}</div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <button class="icon-btn icon-edit" title="Edit" data-id="${id}" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:#6b7280;padding:6px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"></path>
                                <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Toggle a single item into edit mode (inline) when user clicks pen icon
function beginInlineEdit(id) {
    const container = document.querySelector(`.vocabulary-item[data-id="${id}"]`);
    if (!container) return;
    const item = allVocabulary.find(w => String(w.id) === String(id));
    if (!item) return;
    // Replace innerHTML with edit inputs (re-use same markup as editMode)
    container.innerHTML = `
        <div class="vocabulary-content">
            <input class="edit-original" data-id="${id}" value="${escapeHtml(item.originalWord || '')}" style="width:100%;padding:6px;margin-bottom:6px;box-sizing:border-box;" />
            <input class="edit-translation" data-id="${id}" value="${escapeHtml(item.translatedWord || '')}" style="width:100%;padding:6px;margin-bottom:6px;box-sizing:border-box;" />
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button class="quick-action-btn save-word" data-id="${id}">Save</button>
                <button class="quick-action-btn cancel-edit" data-id="${id}">Cancel</button>
                <button class="quick-action-btn delete-word" data-id="${id}" style="background:#fee2e2;border-color:#fecaca;color:#991b1b;">Delete</button>
            </div>
        </div>`;
}

// Handle delete icon click with confirmation and deletion
async function handleInlineDelete(id) {
    try {
        const ok = await showConfirm('Delete this word?', 'This action cannot be undone.');
        if (!ok) return;
        const normalizedId = normalizeId(id);
        const response = await chrome.runtime.sendMessage({ type: 'DELETE_VOCABULARY', data: { id: normalizedId } });
        if (response && response.success) {
            allVocabulary = allVocabulary.filter(w => String(w.id) !== String(id));
            filterVocabulary();
            showNotice('Word deleted', 'success');
        } else {
            console.error('Failed to delete word', response);
            showNotice('Failed to delete word', 'error');
        }
    } catch (err) {
        console.error('Error deleting word:', err);
        showNotice('Error deleting word', 'error');
    }
}

// Toggle edit mode UI
function toggleEditMode(enable) {
    editMode = !!enable;
    const editBtn = document.getElementById('edit-words');
    if (editBtn) {
        editBtn.textContent = editMode ? '✅ Done' : '✏️ Edit words';
        editBtn.setAttribute('aria-pressed', editMode ? 'true' : 'false');
    }
    renderVocabularyList();

    // Toggle an editing class on the vocabulary list for CSS hooks and clarity
    const listEl = document.getElementById('vocabulary-list');
    if (listEl) {
        if (editMode) listEl.classList.add('editing'); else listEl.classList.remove('editing');
    }

    // Attach listeners for save/delete when in edit mode
    if (editMode) {
        attachEditModeListeners();
        // focus the first edit icon for keyboard users
        setTimeout(() => {
            const first = document.querySelector('.icon-edit');
            if (first && typeof first.focus === 'function') first.focus();
        }, 50);
    }
}

function attachEditModeListeners() {
    // Use event delegation on the vocabulary list
    const list = document.getElementById('vocabulary-list');
    if (!list) return;

    // Remove any previous delegated listeners to avoid duplicates
    list.replaceWith(list.cloneNode(true));
    const newList = document.getElementById('vocabulary-list');

    newList.addEventListener('click', async (e) => {
        const saveBtn = e.target.closest('.save-word');
        const deleteBtn = e.target.closest('.delete-word');
        const editIcon = e.target.closest('.icon-edit');
        const cancelBtn = e.target.closest('.cancel-edit');

        if (saveBtn) {
            const id = saveBtn.getAttribute('data-id');
            await handleSaveWord(id);
            return;
        }

        if (cancelBtn) {
            // Re-render the list to restore display (cancels inline edit)
            filterVocabulary();
            return;
        }

        if (deleteBtn) {
            const id = deleteBtn.getAttribute('data-id');
            await handleDeleteWord(id);
            return;
        }

        if (editIcon) {
            const id = editIcon.getAttribute('data-id');
            beginInlineEdit(id);
            return;
        }
    });
}

async function handleSaveWord(id) {
    try {
        const container = document.querySelector(`.vocabulary-item[data-id="${id}"]`);
        if (!container) return;
        const originalInput = container.querySelector('.edit-original');
        const translationInput = container.querySelector('.edit-translation');
        const updates = {
            originalWord: originalInput ? originalInput.value.trim() : undefined,
            translatedWord: translationInput ? translationInput.value.trim() : undefined,
        };
        // Confirm save with the same styled confirm dialog used for deletes
        const ok = await showConfirm('Save changes?', 'Apply edits to this word?', 'Save', 'Cancel');
        if (!ok) {
            showNotice('Save canceled', 'info');
            return;
        }

        // Send update to service worker
        const normalizedId = normalizeId(id);
        const response = await chrome.runtime.sendMessage({ type: 'UPDATE_VOCABULARY', data: { id: normalizedId, updates } });
        if (response && response.success) {
            // Update local arrays and re-render
            const idx = allVocabulary.findIndex(w => String(w.id) === String(id));
            if (idx !== -1) {
                if (updates.originalWord !== undefined) allVocabulary[idx].originalWord = updates.originalWord;
                if (updates.translatedWord !== undefined) allVocabulary[idx].translatedWord = updates.translatedWord;
            }
            filterVocabulary();
            showNotice('Changes saved', 'success');
        } else {
            console.error('Failed to update word', response);
            showNotice('Failed to save changes', 'error');
        }
    } catch (err) {
        console.error('Error saving word:', err);
        showNotice('Error saving changes', 'error');
    }
}

async function handleDeleteWord(id) {
    try {
        const ok = await showConfirm('Delete this word?', 'This action cannot be undone.');
        if (!ok) return;
        const normalizedId = normalizeId(id);
        const response = await chrome.runtime.sendMessage({ type: 'DELETE_VOCABULARY', data: { id: normalizedId } });
        if (response && response.success) {
            // Remove from local lists and re-render
            allVocabulary = allVocabulary.filter(w => String(w.id) !== String(id));
            filterVocabulary();
            showNotice('Word deleted', 'success');
        } else {
            console.error('Failed to delete word', response);
            showNotice('Failed to delete word', 'error');
        }
    } catch (err) {
        console.error('Error deleting word:', err);
        showNotice('Error deleting word', 'error');
    }
}

// Minimal confirm dialog that returns a Promise<boolean>
function showConfirm(title, details, confirmLabel = 'Delete', cancelLabel = 'Cancel') {
    return new Promise(resolve => {
        // Remove any existing
        document.querySelectorAll('.mini-confirm-overlay').forEach(n => n.remove());
        const overlay = document.createElement('div');
        overlay.className = 'mini-confirm-overlay';
        overlay.innerHTML = `<div class="mini-confirm" role="dialog" aria-modal="true">
            <p><strong>${escapeHtml(title)}</strong><br/><small style="color:#6b7280">${escapeHtml(details || '')}</small></p>
            <div class="actions">
                <button class="btn cancel">${escapeHtml(cancelLabel)}</button>
                <button class="btn confirm">${escapeHtml(confirmLabel)}</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        const btnCancel = overlay.querySelector('.btn.cancel');
        const btnConfirm = overlay.querySelector('.btn.confirm');
        const onCancel = () => { overlay.remove(); resolve(false); };
        const onConfirm = () => { overlay.remove(); resolve(true); };
        btnCancel.addEventListener('click', onCancel, { once: true });
        btnConfirm.addEventListener('click', onConfirm, { once: true });
        // Focus the cancel button by default so accidental confirms are less likely
        setTimeout(() => { if (btnCancel && typeof btnCancel.focus === 'function') btnCancel.focus(); }, 10);
    });
}

// Minimal toast notice
function showNotice(message, kind = 'info', duration = 2000) {
    // Remove existing identical to prevent spam
    const notice = document.createElement('div');
    notice.className = `mini-toast ${kind}`;
    notice.textContent = message;
    document.body.appendChild(notice);
    requestAnimationFrame(() => notice.classList.add('show'));
    setTimeout(() => {
        notice.classList.remove('show');
        setTimeout(() => notice.remove(), 220);
    }, duration);
}

// (Context hover feature removed at user request)

function showNoResults(message) {
    const listContainer = document.getElementById('vocabulary-list');
    listContainer.innerHTML = `<div class="no-results">${message}</div>`;
}

function filterVocabulary() {
    const selectedLanguage = document.getElementById('source-language').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();

    filteredVocabulary = allVocabulary.filter(item => {
        const languageMatch = selectedLanguage === 'all' || item.sourceLanguage === selectedLanguage;
        // Restrict search to originalWord & translatedWord only (exclude context)
        const searchMatch = !searchTerm ||
            (item.originalWord && item.originalWord.toLowerCase().includes(searchTerm)) ||
            (item.translatedWord && item.translatedWord.toLowerCase().includes(searchTerm));
        return languageMatch && searchMatch;
    });

    renderVocabularyList();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Normalize id to the type likely used by IndexedDB (coerce numeric-looking strings to Number)
function normalizeId(id) {
    if (id === null || id === undefined) return id;
    // If already a number, return as-is
    if (typeof id === 'number') return id;
    // If it's a numeric string, convert to number
    if (typeof id === 'string' && id.trim() !== '' && !isNaN(Number(id))) {
        return Number(id);
    }
    // otherwise return original (likely a string key)
    return id;
}

async function checkExerciseTime() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'CHECK_EXERCISE_TIME' });
        if (response && response.isExerciseTime) {
            document.getElementById('exercise-reminder').style.display = 'block';
        }
    } catch (error) {
        console.error('Error checking exercise time:', error);
    }
}

function setupEventListeners() {
    // Language filter dropdown
    const sourceLangEl = document.getElementById('source-language');
    if (sourceLangEl) sourceLangEl.addEventListener('change', filterVocabulary);

    // Search input
    const searchEl = document.getElementById('search-input');
    if (searchEl) searchEl.addEventListener('input', filterVocabulary);

    // Exercise button
    const exerciseBtn = document.getElementById('start-exercise');
    if (exerciseBtn) {
        exerciseBtn.addEventListener('click', () => {
            try { chrome.tabs.create({ url: chrome.runtime.getURL('exercise/exercise.html') }); } catch (e) { console.warn('Could not open exercise tab', e); }
            try { window.close(); } catch (e) { /* ignore */ }
        });
    }

    // Options button
    const optionsBtn = document.getElementById('open-options');
    if (optionsBtn) {
        optionsBtn.addEventListener('click', () => {
            try { chrome.runtime.openOptionsPage(); } catch (e) { console.warn('Could not open options page', e); }
            try { window.close(); } catch (e) { /* ignore */ }
        });
    }

    // Edit words button
    const editBtn = document.getElementById('edit-words');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            toggleEditMode(!editMode);
        });
    }
}

// Extension enable/disable toggle
async function initExtensionToggle() {
    const btn = document.getElementById('extension-toggle-btn');
    const status = document.getElementById('extension-status');
    const icon = document.getElementById('extension-toggle-icon');
    if (!btn || !status) return;

    // Read stored value (default true)
    const stored = await chrome.storage.sync.get({ extensionEnabled: true });
    updateToggleUI(stored.extensionEnabled);

    // Listen to changes in storage to reflect external updates
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.extensionEnabled) {
            updateToggleUI(changes.extensionEnabled.newValue);
        }
    });

    btn.addEventListener('click', async () => {
        // Toggle value
        const current = (await chrome.storage.sync.get({ extensionEnabled: true })).extensionEnabled;
        const next = !current;
        await chrome.storage.sync.set({ extensionEnabled: next });
        updateToggleUI(next);
    });

    function updateToggleUI(enabled) {
        if (enabled) {
            status.textContent = 'Enabled';
            if (icon) icon.textContent = '●';
            btn.classList.remove('options-btn');
            btn.classList.remove('off');
            btn.classList.add('on');
            btn.setAttribute('aria-pressed', 'true');
            // apply minimal visual variant
            btn.classList.add('minimal-toggle');
        } else {
            status.textContent = 'Disabled';
            if (icon) icon.textContent = '○';
            btn.classList.remove('on');
            btn.classList.add('off');
            btn.setAttribute('aria-pressed', 'false');
            btn.classList.add('minimal-toggle');
        }
    }
}

// Inject small CSS snippet for popup inline edit visuals
function ensurePopupStyles() {
    if (document.getElementById('__popup_edit_styles')) return;
    const css = `
    .vocabulary-item { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
    .vocabulary-content { display:block; }
    .vocabulary-item.editing { background: #fff; }
    .vocabulary-item .source-text { font-weight:600; color:#111827; margin-bottom:4px; }
    .vocabulary-item .translation { color:#6b7280; font-size:13px; }
    /* Inline edit inputs: minimal underline style */
    .vocabulary-item input.edit-original,
    .vocabulary-item input.edit-translation {
        width:100%;
        border: none;
        border-bottom: 1px solid #e6e9ee;
        padding: 6px 4px;
        outline: none;
        font-size: 14px;
        background: transparent;
        color: #111827;
    }
    .vocabulary-item input.edit-original:focus,
    .vocabulary-item input.edit-translation:focus {
        border-bottom-color: #4f46e5;
        box-shadow: 0 2px 0 rgba(79,70,229,0.06);
    }
    /* Compact action buttons */
    .vocabulary-item .quick-action-btn { padding:6px 10px; border-radius:8px; font-size:13px; }
    .vocabulary-item .cancel-edit { background:transparent;border:1px solid #e5e7eb;color:#374151; }
    .vocabulary-item .save-word { background:#4f46e5;color:#fff;border:none; }
    .vocabulary-item .delete-word { background:transparent;border:1px solid #fee2e2;color:#991b1b; }
    /* Icon buttons subtle hover */
    .icon-btn { transition: color .15s ease, transform .08s ease; }
    .icon-btn:hover { color: #374151; transform: translateY(-1px); }
    .icon-btn:focus { outline: 2px solid rgba(79,70,229,0.18); outline-offset: 2px; }
    /* Mini confirm modal */
    .mini-confirm-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.35); display:flex;align-items:center;justify-content:center; z-index:2147483646;
    }
    .mini-confirm {
        background: #fff; border-radius:12px; padding:18px; max-width:360px; width:92%; box-shadow:0 12px 40px rgba(2,6,23,0.2); font-family:inherit;
    }
    .mini-confirm p { color:#111827; margin-bottom:14px; }
    .mini-confirm .actions { display:flex; gap:8px; justify-content:flex-end; }
    .mini-confirm .btn { padding:8px 12px; border-radius:8px; font-weight:600; cursor:pointer; border:1px solid #e5e7eb; }
    .mini-confirm .btn.confirm { background:#ef4444;color:#fff;border:none; }
    .mini-confirm .btn.cancel { background:transparent;color:#374151; }

    /* Mini toast notice */
    .mini-toast { position: fixed; right: 16px; bottom: 16px; background: #111827; color: #fff; padding:10px 14px; border-radius:10px; box-shadow:0 8px 24px rgba(2,6,23,0.2); z-index:2147483647; opacity:0; transform: translateY(8px); transition: opacity .18s ease, transform .18s ease; }
    .mini-toast.show { opacity:1; transform: translateY(0); }
    .mini-toast.info { background: #111827; }
    .mini-toast.success { background: linear-gradient(90deg,#10b981,#34d399); }
    .mini-toast.error { background: linear-gradient(90deg,#ef4444,#f87171); }
    `;
    const style = document.createElement('style');
    style.id = '__popup_edit_styles';
    style.textContent = css;
    document.head.appendChild(style);
}