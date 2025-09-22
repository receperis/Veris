/* Popup JavaScript - Vocabulary Browser */

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize the vocabulary browser
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

function showNoResults(message) {
    const vocabularyList = document.getElementById('vocabulary-list');
    vocabularyList.innerHTML = `<div class="no-results">${message}</div>`;
}

function renderVocabularyList() {
    const vocabularyList = document.getElementById('vocabulary-list');

    if (filteredVocabulary.length === 0) {
        showNoResults('No vocabulary found matching your filters.');
        return;
    }

    vocabularyList.innerHTML = filteredVocabulary.map(item => `
        <div class="vocabulary-item" data-id="${item.id || ''}">
            <div class="vocabulary-content">
                <div class="source-text">${escapeHtml(item.originalWord || '')}</div>
                <div class="translation">${escapeHtml(item.translatedWord || '')}</div>
            </div>
        </div>`).join('');
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
    document.getElementById('source-language').addEventListener('change', filterVocabulary);

    // Search input
    document.getElementById('search-input').addEventListener('input', filterVocabulary);

    // Exercise button
    document.getElementById('start-exercise').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('exercise/exercise.html') });
        window.close();
    });

    // Options button
    document.getElementById('open-options').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
        window.close();
    });
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