/* Stats Page JavaScript */

import './stats.css';

document.addEventListener('DOMContentLoaded', async () => {
    await initializeStatsPage();
    setupEventListeners();
});

let statsData = null;

async function initializeStatsPage() {
    try {
        // Show loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');

        // Fetch all statistics
        await Promise.all([
            loadVocabularyStats(),
            loadExerciseStats(),
            loadLanguageDistribution(),
            loadRecentActivity()
        ]);

        // Hide loading overlay with animation
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
        }, 500);

    } catch (error) {
        console.error('Error initializing stats page:', error);
        hideLoadingWithError('Failed to load statistics');
    }
}

async function loadVocabularyStats() {
    try {
        // Get stats from background service
        const response = await chrome.runtime.sendMessage({ type: 'GET_DETAILED_STATS' });

        if (response && response.success && response.data) {
            statsData = response.data;
            updateOverviewCards(statsData);
            updateProgressChart(statsData);
        } else {
            console.error('Failed to get stats:', response);
            // Show default values
            updateOverviewCards({
                combined: {
                    totalWords: 0,
                    uniqueWords: 0,
                    exercisesCompleted: 0,
                    averageScore: 0
                }
            });
        }
    } catch (error) {
        console.error('Error loading vocabulary stats:', error);
    }
}

async function loadExerciseStats() {
    try {
        // Get exercise history from storage
        const result = await chrome.storage.local.get(['exerciseHistory', 'vocabularyStats']);
        const exerciseHistory = result.exerciseHistory || [];
        const vocabularyStats = result.vocabularyStats || {};

        updateStudyStreak(exerciseHistory, vocabularyStats.lastExercise);
    } catch (error) {
        console.error('Error loading exercise stats:', error);
    }
}

async function loadLanguageDistribution() {
    try {
        // Get all vocabulary to analyze language distribution
        const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_VOCABULARY' });

        if (response && response.success && response.data) {
            const vocabulary = response.data;
            const languageDistribution = analyzeLanguageDistribution(vocabulary);
            updateLanguageChart(languageDistribution);
        }
    } catch (error) {
        console.error('Error loading language distribution:', error);
    }
}

async function loadRecentActivity() {
    try {
        // Get recent translations and exercises
        const [vocabResponse, exerciseResult] = await Promise.all([
            chrome.runtime.sendMessage({ type: 'GET_ALL_VOCABULARY' }),
            chrome.storage.local.get(['exerciseHistory'])
        ]);

        const vocabulary = vocabResponse?.data || [];
        const exerciseHistory = exerciseResult.exerciseHistory || [];

        const recentActivity = generateRecentActivity(vocabulary, exerciseHistory);
        updateActivityTimeline(recentActivity);
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

function updateOverviewCards(stats) {
    const combined = stats.combined || {};

    // Animate counting up
    animateValue('total-words', 0, combined.totalWords || 0, 1000);
    animateValue('unique-words', 0, combined.uniqueWords || 0, 1000);
    animateValue('exercises-completed', 0, combined.exercisesCompleted || 0, 1000);

    // Update average score
    const averageScore = Math.round(combined.averageScore || 0);
    animateValue('average-score', 0, averageScore, 1000, '%');
}

function updateProgressChart(stats) {
    const combined = stats.combined || {};

    // Calculate progress values (0-100 scale)
    const vocabularyProgress = Math.min((combined.totalWords || 0) / 10 * 100, 100); // Max at 100 words for scale
    const exerciseProgress = Math.min((combined.exercisesCompleted || 0) / 5 * 100, 100); // Max at 50 exercises for scale
    const accuracyProgress = combined.averageScore || 0;

    // Update bar heights with animation
    setTimeout(() => {
        updateBar('vocabulary-bar', vocabularyProgress);
        updateBar('exercises-bar', exerciseProgress);
        updateBar('accuracy-bar', accuracyProgress);
    }, 500);
}

function updateBar(barId, percentage) {
    const bar = document.querySelector(`.${barId}`);
    if (bar) {
        const height = Math.max(percentage * 1.5, 10); // Minimum 10px height
        bar.style.height = `${height}px`;
        bar.setAttribute('data-value', Math.round(percentage));
    }
}

function updateLanguageChart(languageDistribution) {
    const languageList = document.getElementById('language-list');

    if (languageDistribution.length === 0) {
        languageList.innerHTML = `
            <div class="language-item">
                <span class="language-name">No vocabulary data</span>
                <div class="language-progress">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
                <span class="language-count">0</span>
            </div>
        `;
        return;
    }

    const total = languageDistribution.reduce((sum, lang) => sum + lang.count, 0);

    languageList.innerHTML = languageDistribution.map(lang => {
        const percentage = (lang.count / total * 100).toFixed(1);
        return `
            <div class="language-item">
                <span class="language-name">${getLanguageDisplayName(lang.language)}</span>
                <div class="language-progress">
                    <div class="progress-bar" style="width: ${percentage}%"></div>
                </div>
                <span class="language-count">${lang.count}</span>
            </div>
        `;
    }).join('');
}

function updateStudyStreak(exerciseHistory, lastExerciseDate) {
    const streakElement = document.getElementById('study-streak');
    const lastExerciseElement = document.getElementById('last-exercise-date');

    // Calculate study streak
    const streak = calculateStudyStreak(exerciseHistory);
    animateValue('study-streak', 0, streak, 1000);

    // Update last exercise date
    if (lastExerciseDate) {
        const date = new Date(lastExerciseDate);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        let displayText;
        if (diffDays === 0) {
            displayText = 'Today';
        } else if (diffDays === 1) {
            displayText = 'Yesterday';
        } else if (diffDays < 7) {
            displayText = `${diffDays} days ago`;
        } else {
            displayText = date.toLocaleDateString();
        }

        lastExerciseElement.textContent = displayText;
    } else {
        lastExerciseElement.textContent = 'Never';
    }
}

function updateActivityTimeline(activities) {
    const timeline = document.getElementById('activity-timeline');

    if (activities.length === 0) {
        timeline.innerHTML = `
            <div class="timeline-item">
                <div class="timeline-icon">📝</div>
                <div class="timeline-content">
                    <p class="timeline-text">No recent activity</p>
                    <span class="timeline-date">Start translating to see activity here</span>
                </div>
            </div>
        `;
        return;
    }

    timeline.innerHTML = activities.slice(0, 10).map(activity => `
        <div class="timeline-item">
            <div class="timeline-icon">${activity.icon}</div>
            <div class="timeline-content">
                <p class="timeline-text">${activity.text}</p>
                <span class="timeline-date">${activity.date}</span>
            </div>
        </div>
    `).join('');
}

function analyzeLanguageDistribution(vocabulary) {
    const languageCounts = {};

    vocabulary.forEach(item => {
        const lang = item.sourceLanguage || 'unknown';
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });

    return Object.entries(languageCounts)
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count);
}

function generateRecentActivity(vocabulary, exerciseHistory) {
    const activities = [];

    // Add recent vocabulary additions (last 10)
    const recentVocab = vocabulary
        .filter(item => item.dateAdded)
        .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
        .slice(0, 5);

    recentVocab.forEach(item => {
        activities.push({
            icon: '📖',
            text: `Added "${item.originalWord}" to vocabulary`,
            date: formatRelativeDate(new Date(item.dateAdded)),
            timestamp: new Date(item.dateAdded)
        });
    });

    // Add recent exercises
    exerciseHistory.slice(-5).forEach(exercise => {
        activities.push({
            icon: '🧠',
            text: `Completed exercise with ${exercise.score}% accuracy`,
            date: formatRelativeDate(new Date(exercise.date)),
            timestamp: new Date(exercise.date)
        });
    });

    // Sort by timestamp (most recent first)
    return activities.sort((a, b) => b.timestamp - a.timestamp);
}

function calculateStudyStreak(exerciseHistory) {
    if (!exerciseHistory || exerciseHistory.length === 0) return 0;

    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);

    // Get unique exercise dates
    const exerciseDates = [...new Set(exerciseHistory.map(ex =>
        new Date(ex.date).toDateString()
    ))].sort((a, b) => new Date(b) - new Date(a));

    // Count consecutive days
    for (let i = 0; i < exerciseDates.length; i++) {
        const exerciseDate = new Date(exerciseDates[i]);
        const diffDays = Math.floor((currentDate - exerciseDate) / (1000 * 60 * 60 * 24));

        if (diffDays === streak) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

function getLanguageDisplayName(langCode) {
    const languageNames = {
        'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
        'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
        'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
        'tr': 'Turkish', 'nl': 'Dutch', 'pl': 'Polish', 'sv': 'Swedish',
        'da': 'Danish', 'no': 'Norwegian', 'fi': 'Finnish', 'cs': 'Czech',
        'sk': 'Slovak', 'hu': 'Hungarian', 'ro': 'Romanian', 'bg': 'Bulgarian',
        'hr': 'Croatian', 'uk': 'Ukrainian', 'el': 'Greek', 'he': 'Hebrew',
        'fa': 'Persian', 'th': 'Thai', 'vi': 'Vietnamese', 'id': 'Indonesian',
        'ms': 'Malay', 'auto': 'Auto-detected', 'unknown': 'Unknown'
    };

    return languageNames[langCode] || langCode.toUpperCase();
}

function formatRelativeDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
}

function animateValue(elementId, start, end, duration, suffix = '') {
    const element = document.getElementById(elementId);
    if (!element) return;

    const range = end - start;
    const minTimer = 50;
    const stepTime = Math.abs(Math.floor(duration / range)) || minTimer;

    const startTime = new Date().getTime();
    const endTime = startTime + duration;

    function run() {
        const now = new Date().getTime();
        const remaining = Math.max((endTime - now) / duration, 0);
        const value = Math.round(end - (remaining * range));

        element.textContent = value + suffix;

        if (value === end) {
            clearInterval(timer);
        }
    }

    const timer = setInterval(run, stepTime);
    run();
}

function hideLoadingWithError(message) {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.innerHTML = `
        <div style="text-align: center; color: #e53e3e;">
            <div style="font-size: 3rem; margin-bottom: 20px;">⚠️</div>
            <p>${message}</p>
            <button id="retry-btn" style="
                margin-top: 20px;
                padding: 10px 20px;
                background: #4f46e5;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
            ">Retry</button>
        </div>
    `;
    
    // Add event listener for retry button
    setTimeout(() => {
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                location.reload();
            });
        }
    }, 100);
}

function setupEventListeners() {
    // Back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.close();
        });
    }

    // Start exercise button
    const exerciseBtn = document.getElementById('start-exercise-btn');
    if (exerciseBtn) {
        exerciseBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('exercise/exercise.html') });
        });
    }

    // Browse vocabulary button
    const browseBtn = document.getElementById('browse-vocabulary-btn');
    if (browseBtn) {
        browseBtn.addEventListener('click', () => {
            chrome.action.openPopup();
        });
    }

    // Export data button
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }

    // Import data button
    const importBtn = document.getElementById('import-data-btn');
    const fileInput = document.getElementById('import-file-input');
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', handleFileImport);
    }

    // Modal event listeners
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeImportModal);
    }
    
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', closeImportModal);
    }
    
    if (modalConfirmBtn) {
        modalConfirmBtn.addEventListener('click', confirmImport);
    }

    // Click outside modal to close
    const modalOverlay = document.getElementById('import-modal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeImportModal();
            }
        });
    }

    // Handle notification close buttons using event delegation
    document.addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-action') && e.target.getAttribute('data-action') === 'close-notification') {
            const notification = e.target.closest('.import-notification');
            if (notification) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }
    });

    // Handle ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('import-modal');
            if (modal && modal.style.display === 'flex') {
                closeImportModal();
            }
        }
    });
}

async function exportData() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_VOCABULARY' });

        if (response && response.success && response.data) {
            const data = {
                vocabulary: response.data,
                stats: statsData,
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `veris-translator-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Failed to export data. Please try again.');
    }
}

let currentImportData = null;

async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Clear any previous import data
    currentImportData = null;

    // Reset file input for future use
    event.target.value = '';

    try {
        showImportProgress('Reading file...');
        
        const fileContent = await readFileAsText(file);
        let importData;

        try {
            importData = JSON.parse(fileContent);
        } catch (parseError) {
            hideImportProgress();
            showImportError('Invalid JSON file. Please select a valid vocabulary data file.');
            return;
        }

        // Validate imported data structure
        const validationResult = validateImportData(importData);
        if (!validationResult.isValid) {
            hideImportProgress();
            showImportError(`Invalid data format: ${validationResult.error}`);
            return;
        }

        hideImportProgress();
        
        // Store import data and show modal for mode selection
        currentImportData = importData;
        console.log('Import data stored:', currentImportData ? 'Success' : 'Failed', 'Vocabulary count:', importData.vocabulary?.length || 0);
        showImportModal(file.name, importData.vocabulary.length);

    } catch (error) {
        hideImportProgress();
        console.error('Error importing data:', error);
        showImportError('Failed to import data. Please try again.');
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

function validateImportData(data) {
    // Check basic structure
    if (!data || typeof data !== 'object') {
        return { isValid: false, error: 'Data is not a valid object' };
    }

    // Check if it has vocabulary array
    if (!data.vocabulary || !Array.isArray(data.vocabulary)) {
        return { isValid: false, error: 'Missing or invalid vocabulary array' };
    }

    // Validate vocabulary entries
    for (let i = 0; i < Math.min(data.vocabulary.length, 10); i++) {
        const entry = data.vocabulary[i];
        
        if (!entry.originalWord || !entry.translatedWord) {
            return { isValid: false, error: 'Vocabulary entries must have originalWord and translatedWord' };
        }
        
        if (!entry.sourceLanguage || !entry.targetLanguage) {
            return { isValid: false, error: 'Vocabulary entries must have source and target languages' };
        }
    }

    return { isValid: true };
}

async function importVocabularyData(importData, mode) {
    try {
        // Validate input data
        if (!importData) {
            throw new Error('No import data provided');
        }
        
        if (!importData.vocabulary || !Array.isArray(importData.vocabulary)) {
            throw new Error('Invalid import data: vocabulary array is missing or invalid');
        }
        
        if (importData.vocabulary.length === 0) {
            throw new Error('No vocabulary entries found in import data');
        }
        
        let importedCount = 0;
        let skippedCount = 0;
        let updatedCount = 0;
        let errors = [];

        // Handle replace-all mode
        if (mode === 'replace-all') {
            showImportProgress('Clearing existing vocabulary...');
            const deleteResponse = await chrome.runtime.sendMessage({
                type: 'DELETE_ALL_VOCABULARY'
            });
            
            if (!deleteResponse || !deleteResponse.success) {
                throw new Error('Failed to clear existing vocabulary');
            }
        }

        // Get existing vocabulary for duplicate checking (except for replace-all)
        let existingVocabulary = [];
        if (mode !== 'replace-all' && mode !== 'merge') {
            showImportProgress('Checking for duplicates...');
            const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_VOCABULARY' });
            if (response && response.success) {
                existingVocabulary = response.data;
            }
        }

        // Process each entry
        for (let i = 0; i < importData.vocabulary.length; i++) {
            const entry = importData.vocabulary[i];
            
            try {
                // Check for duplicates
                const isDuplicate = existingVocabulary.some(existing => 
                    existing.originalWord.toLowerCase() === entry.originalWord.toLowerCase() &&
                    existing.sourceLanguage === entry.sourceLanguage &&
                    existing.targetLanguage === entry.targetLanguage
                );

                // Handle based on mode
                if (isDuplicate && mode === 'skip') {
                    skippedCount++;
                    continue;
                }

                // Prepare vocabulary entry for import
                const vocabularyEntry = {
                    originalWord: entry.originalWord,
                    translatedWord: entry.translatedWord,
                    originalText: entry.originalText || entry.originalWord,
                    translatedText: entry.translatedText || entry.translatedWord,
                    sourceLanguage: entry.sourceLanguage,
                    targetLanguage: entry.targetLanguage,
                    timestamp: entry.timestamp || new Date().toISOString(),
                    dateAdded: entry.dateAdded || new Date().toISOString(),
                    sessionId: entry.sessionId || `import_${Date.now()}`,
                    domain: entry.domain || 'imported',
                    confidence: entry.confidence || 0.9
                };

                let response;
                
                if (isDuplicate && mode === 'replace') {
                    // Find and update the existing entry
                    const existingEntry = existingVocabulary.find(existing => 
                        existing.originalWord.toLowerCase() === entry.originalWord.toLowerCase() &&
                        existing.sourceLanguage === entry.sourceLanguage &&
                        existing.targetLanguage === entry.targetLanguage
                    );
                    
                    response = await chrome.runtime.sendMessage({
                        type: 'UPDATE_VOCABULARY',
                        data: {
                            id: existingEntry.id,
                            updates: vocabularyEntry
                        }
                    });
                    
                    if (response && response.success) {
                        updatedCount++;
                    }
                } else {
                    // Add new entry
                    response = await chrome.runtime.sendMessage({
                        type: 'SAVE_VOCABULARY',
                        data: vocabularyEntry
                    });
                    
                    if (response && response.success) {
                        importedCount++;
                    }
                }

                if (!response || !response.success) {
                    errors.push(`Failed to import: ${entry.originalWord}`);
                }

            } catch (entryError) {
                console.error('Error importing entry:', entryError);
                errors.push(`Error importing: ${entry.originalWord || 'unknown'}`);
            }

            // Show progress for large imports
            if ((importedCount + skippedCount + updatedCount) % 10 === 0) {
                const processed = importedCount + skippedCount + updatedCount;
                showImportProgress(`Processed ${processed}/${importData.vocabulary.length} entries...`);
                
                // Allow UI to update
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        // Update vocabulary statistics
        await chrome.runtime.sendMessage({ type: 'UPDATE_STATS' });

        return {
            success: true,
            importedCount,
            skippedCount,
            updatedCount,
            totalProcessed: importedCount + skippedCount + updatedCount,
            errors: errors.length > 0 ? errors : null
        };

    } catch (error) {
        console.error('Import process error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error during import'
        };
    }
}

function showImportProgress(message) {
    // Create or update progress overlay
    let progressOverlay = document.getElementById('import-progress-overlay');
    
    if (!progressOverlay) {
        progressOverlay = document.createElement('div');
        progressOverlay.id = 'import-progress-overlay';
        progressOverlay.className = 'loading-overlay';
        progressOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <p id="import-progress-message">${message}</p>
        `;
        document.body.appendChild(progressOverlay);
    } else {
        const messageElement = document.getElementById('import-progress-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
        progressOverlay.classList.remove('hidden');
    }
}

function hideImportProgress() {
    const progressOverlay = document.getElementById('import-progress-overlay');
    if (progressOverlay) {
        progressOverlay.classList.add('hidden');
        setTimeout(() => {
            if (progressOverlay.parentNode) {
                progressOverlay.parentNode.removeChild(progressOverlay);
            }
        }, 300);
    }
}

function showImportSuccess(message) {
    // Create success notification
    const notification = document.createElement('div');
    notification.className = 'import-notification success';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">✅</div>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

function showImportError(message) {
    // Create error notification
    const notification = document.createElement('div');
    notification.className = 'import-notification error';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">❌</div>
            <p>${message}</p>
            <button class="close-btn" data-action="close-notification">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 8000);
}

// Modal functions
function showImportModal(fileName, wordCount) {
    const fileNameElement = document.getElementById('import-file-name');
    const wordCountElement = document.getElementById('import-word-count');
    const modal = document.getElementById('import-modal');
    
    if (fileNameElement) fileNameElement.textContent = fileName;
    if (wordCountElement) wordCountElement.textContent = wordCount;
    if (modal) {
        modal.style.display = 'flex';
        console.log('Modal shown for file:', fileName, 'with', wordCount, 'words');
    }
}

function closeImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Don't clear currentImportData immediately in case user reopens modal
    // It will be cleared when a new file is selected or after import completes
    console.log('Modal closed, currentImportData preserved:', currentImportData ? 'Yes' : 'No');
}

async function confirmImport() {
    console.log('confirmImport called, currentImportData:', currentImportData);
    
    if (!currentImportData) {
        closeImportModal();
        showImportError('Import data is no longer available. Please select the file again.');
        return;
    }
    
    if (!currentImportData.vocabulary || !Array.isArray(currentImportData.vocabulary)) {
        closeImportModal();
        showImportError('Invalid import data format. Please check your file.');
        return;
    }

    const selectedModeElement = document.querySelector('input[name="importMode"]:checked');
    if (!selectedModeElement) {
        showImportError('Please select an import mode.');
        return;
    }
    
    const selectedMode = selectedModeElement.value;
    
    // Show confirmation for replace-all mode
    if (selectedMode === 'replace-all') {
        const confirm = window.confirm(
            '⚠️ WARNING: This will permanently delete ALL your existing vocabulary and replace it with the imported data. This action cannot be undone!\n\nAre you absolutely sure you want to continue?'
        );
        if (!confirm) {
            return;
        }
    }

    closeImportModal();
    
    try {
        // Import the data with selected mode
        showImportProgress('Importing vocabulary data...');
        const result = await importVocabularyData(currentImportData, selectedMode);

        if (result.success) {
            hideImportProgress();
            
            // Create detailed success message
            let message = '';
            if (selectedMode === 'replace-all') {
                message = `Successfully replaced all vocabulary with ${result.importedCount} imported entries!`;
            } else {
                const parts = [];
                if (result.importedCount > 0) parts.push(`${result.importedCount} new words added`);
                if (result.updatedCount > 0) parts.push(`${result.updatedCount} words updated`);
                if (result.skippedCount > 0) parts.push(`${result.skippedCount} duplicates skipped`);
                
                message = `Import completed: ${parts.join(', ')}!`;
            }
            
            showImportSuccess(message);
            
            // Refresh the stats page after a short delay
            setTimeout(() => {
                location.reload();
            }, 3000);
        } else {
            hideImportProgress();
            showImportError(`Import failed: ${result.error}`);
        }
    } catch (error) {
        hideImportProgress();
        console.error('Error during import:', error);
        showImportError('Failed to import data. Please try again.');
    } finally {
        // Clear import data after processing
        currentImportData = null;
    }
}