/* Popup JavaScript - Vocabulary Browser */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup loaded');
    
    // Initialize the vocabulary browser
    await initializeVocabularyBrowser();
    
    // Check if it's exercise time
    await checkExerciseTime();
    
    // Setup event listeners
    setupEventListeners();
});

let allVocabulary = [];
let filteredVocabulary = [];
let sourceLanguages = [];

async function initializeVocabularyBrowser() {
    try {
        console.log('Loading vocabulary...');
        
        // Get all vocabulary from background service worker
        const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_VOCABULARY' });
        console.log('Vocabulary response:', response);
        
        if (response && response.success && response.vocabulary) {
            allVocabulary = response.vocabulary;
            console.log('Loaded vocabulary entries:', allVocabulary.length);
            
            // Extract unique source languages
            sourceLanguages = [...new Set(allVocabulary.map(item => item.sourceLanguage))].sort();
            console.log('Available source languages:', sourceLanguages);
            
            // Populate language dropdown
            populateLanguageDropdown();
            
            // Initial display of all vocabulary
            filteredVocabulary = [...allVocabulary];
            renderVocabularyList();
        } else {
            console.error('Failed to load vocabulary:', response);
            showNoResults('Failed to load vocabulary. Please try again.');
        }
        
    } catch (error) {
        console.error('Error loading vocabulary:', error);
        showNoResults('Error loading vocabulary.');
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
    const listContainer = document.getElementById('vocabulary-list');
    
    if (filteredVocabulary.length === 0) {
        showNoResults('No vocabulary found.');
        return;
    }
    
    // Sort by most recent first
    const sortedVocabulary = filteredVocabulary.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    listContainer.innerHTML = '';
    
    sortedVocabulary.forEach(item => {
        const vocabularyItem = document.createElement('div');
        vocabularyItem.className = 'vocabulary-item';
        vocabularyItem.innerHTML = `
            <div class="word-original">
                ${escapeHtml(item.originalWord)}
                <span class="word-source">${getLanguageDisplayName(item.sourceLanguage)}</span>
            </div>
            <div class="word-translation">${escapeHtml(item.translatedWord)}</div>
        `;
        
        // Add click handler to copy or show more details
        vocabularyItem.addEventListener('click', () => {
            copyToClipboard(item.originalWord);
            showToast(`Copied "${item.originalWord}" to clipboard`);
        });
        
        listContainer.appendChild(vocabularyItem);
    });
}

function showNoResults(message) {
    const listContainer = document.getElementById('vocabulary-list');
    listContainer.innerHTML = `<div class="no-results">${message}</div>`;
}

function filterVocabulary() {
    const selectedLanguage = document.getElementById('source-language').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    
    filteredVocabulary = allVocabulary.filter(item => {
        // Filter by language
        const languageMatch = selectedLanguage === 'all' || item.sourceLanguage === selectedLanguage;
        
        // Filter by search term (search in both original and translated words)
        const searchMatch = !searchTerm || 
            item.originalWord.toLowerCase().includes(searchTerm) ||
            item.translatedWord.toLowerCase().includes(searchTerm);
        
        return languageMatch && searchMatch;
    });
    
    console.log(`Filtered vocabulary: ${filteredVocabulary.length} items`);
    renderVocabularyList();
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
        console.error('Failed to copy to clipboard:', err);
    });
}

function showToast(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #10b981;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 11px;
        z-index: 1000;
        animation: fadeIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 2000);
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
        chrome.tabs.create({ url: chrome.runtime.getURL('exercise/flashcard.html') });
        window.close();
    });
    
    // Options button
    document.getElementById('open-options').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
        window.close();
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
                document.getElementById('last-exercise').textContent = 'Yesterday';
            } else {
                document.getElementById('last-exercise').textContent = `${diffDays} days ago`;
            }
        }
        
        // Update stats in background
        updateStatsInBackground();
        
    } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('total-words').textContent = 'Error';
        document.getElementById('unique-words').textContent = 'Error';
    }
}

async function updateStatsInBackground() {
    try {
        // Send message to background script to update stats
        const response = await chrome.runtime.sendMessage({ type: 'UPDATE_VOCABULARY_STATS' });
        
        if (response && response.stats) {
            document.getElementById('total-words').textContent = response.stats.totalWords;
            document.getElementById('unique-words').textContent = response.stats.uniqueWords;
        }
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

async function checkExerciseTime() {
    try {
        const result = await chrome.storage.sync.get(['exerciseSettings']);
        const settings = result.exerciseSettings || { 
            enabled: true, 
            time: '09:00', 
            days: [1, 2, 3, 4, 5] // Monday to Friday
        };
        
        if (!settings.enabled) return;
        
        const now = new Date();
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                           now.getMinutes().toString().padStart(2, '0');
        
        // Check if today is an exercise day
        if (settings.days.includes(currentDay)) {
            // Check if we're within the exercise time window (30 minutes)
            const [targetHour, targetMinute] = settings.time.split(':').map(Number);
            const targetTime = targetHour * 60 + targetMinute;
            const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
            
            // Show reminder if within 30 minutes of target time
            if (Math.abs(currentTimeMinutes - targetTime) <= 30) {
                document.getElementById('exercise-reminder').style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error checking exercise time:', error);
    }
}

function setupEventListeners() {
    // Start exercise button
    document.getElementById('start-exercise').addEventListener('click', () => {
        // Open exercise page
        chrome.tabs.create({
            url: chrome.runtime.getURL('exercise/exercise.html')
        });
        window.close();
    });
    
    // Options button
    document.getElementById('open-options').addEventListener('click', () => {
        // Open options page
        chrome.runtime.openOptionsPage();
        window.close();
    });
}