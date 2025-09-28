/* Vocabulary Exercise Logic */

import './exercise.css';

class VocabularyExercise {
    constructor() {
        this.words = [];
        this.allWords = []; // master list before filtering
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;
        this.skippedAnswers = 0;
        this.difficulty = 'medium';
        this.questionsPerExercise = 10;
        this.incorrectWords = [];
        this.pendingAdvance = null;
        this.hintUsedCurrent = false;
        this.answeredMap = new Map(); // questionIndex -> { selected, correct, skipped }
        this.choiceMap = new Map();   // questionIndex -> array of choices in order
        this.selectedLanguage = '';
        this.targetLanguage = null; // current target language override
        this.isTranslatingBulk = false;

        this.init();
    }

    async init() {
        // Setup event listeners
        this.setupEventListeners();

        // Load words from database via background service worker
        await this.loadWords();
    }

    setupEventListeners() {
        // Close button
        document.querySelector('.close-exercise')?.addEventListener('click', () => {
            this.closeExercise();
        });

        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                e.target.closest('.difficulty-btn').classList.add('active');
                this.difficulty = e.target.closest('.difficulty-btn').dataset.difficulty;
            });
        });

        // Start exercise
        document.querySelector('.start-exercise-btn')?.addEventListener('click', () => {
            this.startExercise();
        });

        // Control buttons
        document.querySelector('.hint-btn')?.addEventListener('click', () => {
            this.showHint();
        });

        document.querySelector('.skip-btn')?.addEventListener('click', () => {
            this.skipQuestion();
        });

        // Continue button in feedback modal
        // Continue button (now only closes hint modal)
        document.querySelector('.continue-btn')?.addEventListener('click', () => {
            const modal = document.querySelector('.feedback-modal');
            if (modal) modal.style.display = 'none';
        });

        // Navigation controls (created dynamically if absent)
        let nav = document.querySelector('.nav-controls');
        if (!nav) {
            nav = document.createElement('div');
            nav.className = 'nav-controls';
            nav.innerHTML = `
              <button class="prev-question-btn" disabled title="Previous question">‹ Previous</button>
              <button class="next-question-btn" disabled title="Next question">Next ›</button>
            `;
            document.querySelector('.exercise-screen')?.appendChild(nav);
        }
        nav.querySelector('.prev-question-btn')?.addEventListener('click', () => this.goToQuestion(this.currentQuestionIndex - 1));
        nav.querySelector('.next-question-btn')?.addEventListener('click', () => this.goToQuestion(this.currentQuestionIndex + 1));

        // Back to difficulty (welcome) mid-session
        document.querySelector('.back-to-welcome-btn')?.addEventListener('click', () => {
            this.returnToWelcome();
        });

        // Results actions
        document.querySelector('.retry-btn')?.addEventListener('click', () => {
            // this.resetExercise();
            this.returnToWelcome();
        });

        document.querySelector('.close-results-btn')?.addEventListener('click', () => {
            this.closeExercise();
        });

        document.querySelector('.close-error-btn')?.addEventListener('click', () => {
            this.closeExercise();
        });

        // Target language switch (exercise screen span)
        document.querySelector('.target-language')?.addEventListener('click', (e) => {
            this.showTargetLanguageMenu(e.currentTarget);
        });
    }

    async loadWords() {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'PREPARE_LEITNER_SESSION',
                data: { limit: this.questionsPerExercise }
            });
            if (!response.success) {
                console.error('Failed to prepare Leitner session:', response.error);
                this.showError('Failed to prepare session');
                return;
            }
            const sessionWords = response.words || [];
            if (sessionWords.length === 0) {
                this.showError('No words available / due');
                return;
            }
            this.allWords = sessionWords.map(w => ({
                id: w.id,
                original: w.originalWord,
                translation: w.translatedWord,
                context: w.context || '',
                sourceLanguage: w.sourceLanguage || 'auto',
                targetLanguage: w.targetLanguage || 'en',
                srs: w.srs
            }));
            // Initialize filtered words
            this.applyLanguageFilter();
            document.getElementById('exercise-count').textContent = this.questionsPerExercise;
            this.showWelcomeScreen();
            this.populateLanguageDropdown();
        } catch (error) {
            console.error('Error loading Leitner session:', error);
            this.showError('Failed to load words');
        }
    }

    populateLanguageDropdown() {
        const select = document.querySelector('.language-filter');
        if (!select) return;
        const NAME_MAP = {
            'en': 'English', 'es': 'Spanish', 'de': 'German', 'fr': 'French', 'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean', 'sv': 'Swedish', 'tr': 'Turkish', 'ar': 'Arabic', 'nl': 'Dutch', 'pl': 'Polish', 'cs': 'Czech', 'da': 'Danish', 'fi': 'Finnish', 'el': 'Greek', 'he': 'Hebrew', 'hi': 'Hindi', 'no': 'Norwegian', 'ro': 'Romanian', 'uk': 'Ukrainian', 'hu': 'Hungarian'
        };
        const langs = [...new Set(this.allWords.map(w => (w.sourceLanguage || '').toLowerCase()))]
            .filter(l => !!l)
            .sort();
        // Clear existing except first option
        while (select.options.length > 1) select.remove(1);
        langs.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l;
            opt.textContent = NAME_MAP[l] || l.toUpperCase();
            select.appendChild(opt);
        });
        select.addEventListener('change', () => {
            this.selectedLanguage = select.value;
            this.applyLanguageFilter();
        });
    }

    applyLanguageFilter() {
        if (this.selectedLanguage) {
            this.words = this.allWords.filter(w => (w.sourceLanguage || '').toLowerCase() === this.selectedLanguage);
        } else {
            this.words = [...this.allWords];
        }
        // Update counts
        const totalEl = document.getElementById('total-words');
        if (totalEl) totalEl.textContent = this.words.length;
        // Adjust questions per exercise if fewer words
        this.questionsPerExercise = Math.min(this.questionsPerExercise, this.words.length);
        const countEl = document.getElementById('exercise-count');
        if (countEl) countEl.textContent = this.questionsPerExercise;
        const info = document.querySelector('.language-available-count');
        if (info) {
            if (this.selectedLanguage) {
                const NAME_MAP = {
                    'en': 'English', 'es': 'Spanish', 'de': 'German', 'fr': 'French', 'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean', 'sv': 'Swedish', 'tr': 'Turkish', 'ar': 'Arabic', 'nl': 'Dutch', 'pl': 'Polish', 'cs': 'Czech', 'da': 'Danish', 'fi': 'Finnish', 'el': 'Greek', 'he': 'Hebrew', 'hi': 'Hindi', 'no': 'Norwegian', 'ro': 'Romanian', 'uk': 'Ukrainian', 'hu': 'Hungarian'
                };
                const pretty = NAME_MAP[this.selectedLanguage] || this.selectedLanguage.toUpperCase();
                info.textContent = `Filtered: ${this.words.length} words in ${pretty}`;
            } else {
                info.textContent = 'Showing all languages';
            }
        }
    }

    showWelcomeScreen() {
        document.querySelector('.loading-screen').style.display = 'none';
        document.querySelector('.welcome-screen').style.display = 'block';
    }

    showError(message) {
        document.querySelector('.loading-screen').style.display = 'none';
        document.querySelector('.error-screen').style.display = 'block';

        const errorContent = document.querySelector('.error-content p');
        if (errorContent) {
            errorContent.textContent = message;
        }
    }

    startExercise() {
        // Refresh filtered view in case words changed via selection
        this.applyLanguageFilter();
        // Shuffle words and select subset for exercise
        this.shuffleArray(this.words);
        this.words = this.words.slice(0, this.questionsPerExercise);

        // Reset counters
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;
        this.skippedAnswers = 0;
        this.incorrectWords = [];
        this.answeredMap.clear();
        this.choiceMap.clear();

        // Update UI
        document.querySelector('.total-questions').textContent = this.words.length;

        // Show exercise screen
        document.querySelector('.welcome-screen').style.display = 'none';
        document.querySelector('.exercise-screen').style.display = 'block';
        // Show mid-session back button
        const midActions = document.querySelector('.mid-exercise-actions');
        if (midActions) midActions.style.display = 'block';

        // Load first question
        this.loadQuestion();
    }

    loadQuestion() {
        if (this.currentQuestionIndex >= this.words.length) {
            this.showResults();
            return;
        }

        // Remove any existing answer notification toast when moving to a question
        const existingToast = document.querySelector('.answer-toast');
        if (existingToast) existingToast.remove();

        // Reset hint flag for this question
        this.hintUsedCurrent = false;

        const currentWord = this.words[this.currentQuestionIndex];

        // Update progress
        document.querySelector('.current-question').textContent = this.currentQuestionIndex + 1;
        document.querySelector('.current-score').textContent = this.score;

        const progressPercent = ((this.currentQuestionIndex) / this.words.length) * 100;
        document.querySelector('.progress-fill').style.width = `${progressPercent}%`;

        // Update word display
        document.querySelector('.word-display').textContent = currentWord.original;
        document.querySelector('.context-text').textContent = currentWord.context || 'No context available';
        document.querySelector('.source-language').textContent = currentWord.sourceLanguage.toUpperCase();
        document.querySelector('.target-language').textContent = (this.targetLanguage || currentWord.targetLanguage || 'EN').toUpperCase();

        // Generate or restore answer choices
        this.generateAnswerChoices(currentWord);
        // If question previously answered, restore state
        if (this.answeredMap.has(this.currentQuestionIndex)) {
            this.applyAnsweredState();
        } else {
            this.updateNavButtons();
        }
    }

    generateAnswerChoices(currentWord) {
        const choicesCount = this.getChoicesCount();
        // If choices already generated for this question (due to navigation), reuse
        if (this.choiceMap.has(this.currentQuestionIndex)) {
            const existing = this.choiceMap.get(this.currentQuestionIndex);
            this.renderChoices(existing, currentWord.translation);
            return;
        }
        const choices = [currentWord.translation]; // Correct answer

        // Get other words for wrong choices
        const otherWords = this.words
            .filter(w => w.translation.toLowerCase() !== currentWord.translation.toLowerCase())
            .map(w => w.translation);

        // Add random wrong choices
        while (choices.length < choicesCount && otherWords.length > 0) {
            const randomIndex = Math.floor(Math.random() * otherWords.length);
            const wrongChoice = otherWords.splice(randomIndex, 1)[0];

            if (!choices.includes(wrongChoice)) {
                choices.push(wrongChoice);
            }
        }

        // If we don't have enough choices from our vocabulary, add some generic ones
        if (choices.length < choicesCount) {
            const genericChoices = ['example', 'sample', 'test', 'word', 'translation'];
            for (const generic of genericChoices) {
                if (choices.length >= choicesCount) break;
                if (!choices.includes(generic) && generic !== currentWord.translation.toLowerCase()) {
                    choices.push(generic);
                }
            }
        }

        // Shuffle choices and persist order
        this.shuffleArray(choices);
        this.choiceMap.set(this.currentQuestionIndex, [...choices]);
        this.renderChoices(choices, currentWord.translation);
    }

    renderChoices(choices, correctAnswer) {
        const choicesContainer = document.querySelector('.answer-choices');
        choicesContainer.innerHTML = '';
        choices.forEach(choice => {
            const button = document.createElement('button');
            button.className = 'answer-btn';
            button.textContent = choice;
            button.addEventListener('click', () => this.selectAnswer(choice, correctAnswer));
            choicesContainer.appendChild(button);
        });
    }

    getChoicesCount() {
        switch (this.difficulty) {
            case 'easy': return 3;
            case 'medium': return 4;
            case 'hard': return 5;
            default: return 4;
        }
    }

    async selectAnswer(selectedAnswer, correctAnswer) {
        // Guard: if already answered, ignore
        if (this.answeredMap.has(this.currentQuestionIndex)) return;
        const isCorrect = selectedAnswer.toLowerCase() === correctAnswer.toLowerCase();

        // Disable all buttons
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.add('disabled');

            if (btn.textContent.toLowerCase() === correctAnswer.toLowerCase()) {
                btn.classList.add('correct');
            } else if (btn.textContent === selectedAnswer && !isCorrect) {
                btn.classList.add('incorrect');
            }
        });

        // Update counters
        if (isCorrect) {
            this.correctAnswers++;
            this.score += 10;
        } else {
            this.incorrectAnswers++;
            this.incorrectWords.push({
                original: this.words[this.currentQuestionIndex].original,
                translation: correctAnswer,
                userAnswer: selectedAnswer
            });
        }

        // Persist answered state
        this.answeredMap.set(this.currentQuestionIndex, { selected: selectedAnswer, correct: isCorrect, skipped: false });

        // Show simple notification toast
        if (isCorrect) {
            this.showAnswerNotification('Correct ', 'correct');
        } else {
            this.showAnswerNotification(`Incorrect. Answer: ${correctAnswer}`, 'incorrect');
        }

        // Report result to background (Leitner)
        const current = this.words[this.currentQuestionIndex];
        try {
            chrome.runtime.sendMessage({
                type: 'WORD_RESULT',
                data: {
                    id: current.id,
                    correct: isCorrect,
                    usedHint: this.hintUsedCurrent,
                    skipped: false
                }
            });
        } catch (e) { console.warn('Failed to send WORD_RESULT', e); }

        // Auto advance after short delay (no inline feedback bar)
        clearTimeout(this.pendingAdvance);
        this.pendingAdvance = setTimeout(() => { this.nextQuestion(); }, isCorrect ? 900 : 1400);
        this.updateNavButtons();
    }

    // inline feedback removed

    showHint() {
        // If already answered, ignore
        if (this.answeredMap.has(this.currentQuestionIndex)) return;
        const currentWord = this.words[this.currentQuestionIndex];
        const firstLetter = currentWord.translation.charAt(0);
        const hint = `The translation starts with "${firstLetter}" and has ${currentWord.translation.length} letters.`;

        // Show hint in feedback modal
        const modal = document.querySelector('.feedback-modal');
        const icon = document.querySelector('.feedback-icon');
        const message = document.querySelector('.feedback-message');
        const details = document.querySelector('.feedback-details');

        icon.textContent = '💡';
        message.textContent = 'Hint';
        details.textContent = hint;
        message.style.color = '#4f46e5';

        modal.style.display = 'flex';
        this.hintUsedCurrent = true;
    }

    skipQuestion() {
        if (this.answeredMap.has(this.currentQuestionIndex)) return; // already answered
        this.skippedAnswers++;
        this.incorrectWords.push({
            original: this.words[this.currentQuestionIndex].original,
            translation: this.words[this.currentQuestionIndex].translation,
            userAnswer: 'Skipped'
        });
        // Report skip as wrong to SRS
        const current = this.words[this.currentQuestionIndex];
        try {
            chrome.runtime.sendMessage({
                type: 'WORD_RESULT',
                data: { id: current.id, correct: false, usedHint: false, skipped: true }
            });
        } catch (e) { console.warn('Failed to send skip WORD_RESULT', e); }
        this.answeredMap.set(this.currentQuestionIndex, { selected: null, correct: false, skipped: true });
        // Show skipped toast
        this.showAnswerNotification(`Skipped. Correct: ${this.words[this.currentQuestionIndex].translation}`, 'skipped');
        // Inline feedback removed; rely on button styling only
        clearTimeout(this.pendingAdvance);
        this.pendingAdvance = setTimeout(() => { this.nextQuestion(); }, 1000);
        this.updateNavButtons();
    }

    nextQuestion() {
        this.currentQuestionIndex++;

        if (this.currentQuestionIndex >= this.words.length) {
            this.showResults();
        } else {
            this.loadQuestion();
        }
    }

    goToQuestion(index) {
        if (index < 0 || index >= this.words.length) return;
        clearTimeout(this.pendingAdvance);
        this.currentQuestionIndex = index;
        this.loadQuestion();
    }

    applyAnsweredState() {
        const state = this.answeredMap.get(this.currentQuestionIndex);
        const currentWord = this.words[this.currentQuestionIndex];
        const correctAnswer = currentWord.translation;
        // Disable buttons & mark classes
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.add('disabled');
            if (btn.textContent.toLowerCase() === correctAnswer.toLowerCase()) {
                btn.classList.add('correct');
            }
            if (!state.correct && state.selected && btn.textContent === state.selected) {
                btn.classList.add('incorrect');
            }
        });
        // Inline feedback removed; existing button classes already applied above
        // Ensure no auto-advance triggers when revisiting
        clearTimeout(this.pendingAdvance);
        this.updateNavButtons();
    }

    showAnswerNotification(message, type) {
        // Remove existing if present
        const existing = document.querySelector('.answer-toast');
        if (existing) existing.remove();
        const container = document.body; // place toast in viewport so it cannot go off-screen
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `answer-toast ${type}`;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.setAttribute('aria-atomic', 'true');

        const icon = document.createElement('span');
        icon.className = 'icon';
        if (type === 'correct') icon.textContent = '✓';
        else if (type === 'incorrect') icon.textContent = '✕';
        else icon.textContent = 'ℹ';

        const msg = document.createElement('div');
        msg.className = 'message';
        msg.textContent = message;

        toast.appendChild(icon);
        toast.appendChild(msg);

        // Insert into body so fixed positioning keeps it inside viewport
        container.prepend(toast);

        // Force reflow then show
        requestAnimationFrame(() => { toast.classList.add('show'); });

        // Auto-remove after 2.2s, but keep a slightly longer for incorrect messages
        const timeout = type === 'incorrect' ? 2600 : 2000;
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { toast.remove(); }, 240);
        }, timeout);
    }

    updateNavButtons() {
        const prevBtn = document.querySelector('.prev-question-btn');
        const nextBtn = document.querySelector('.next-question-btn');
        if (!prevBtn || !nextBtn) return;
        prevBtn.disabled = this.currentQuestionIndex === 0;
        const isAnswered = this.answeredMap.has(this.currentQuestionIndex);
        const atLast = this.currentQuestionIndex === this.words.length - 1;
        // Enable next only if answered and not last
        nextBtn.disabled = !isAnswered || atLast;
    }

    showResults() {
        // Calculate percentage
        const percentage = Math.round((this.correctAnswers / this.words.length) * 100);

        // Update progress to 100%
        document.querySelector('.progress-fill').style.width = '100%';

        // Update results display
        document.querySelector('.score-percentage').textContent = `${percentage}%`;
        document.querySelector('.score-fraction').textContent = `${this.correctAnswers}/${this.words.length}`;
        document.querySelector('.correct-count').textContent = this.correctAnswers;
        document.querySelector('.incorrect-count').textContent = this.incorrectAnswers;
        document.querySelector('.skipped-count').textContent = this.skippedAnswers;

        // Update score circle color based on performance
        const scoreCircle = document.querySelector('.score-circle');
        if (percentage >= 80) {
            scoreCircle.style.background = 'linear-gradient(135deg, #10b981 0%, #34d399 100%)';
        } else if (percentage >= 60) {
            scoreCircle.style.background = 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)';
        } else {
            scoreCircle.style.background = 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)';
        }

        // Show words to review if there are any incorrect
        if (this.incorrectWords.length > 0) {
            const reviewSection = document.querySelector('.words-to-review');
            const reviewList = document.querySelector('.review-words-list');

            reviewList.innerHTML = '';
            this.incorrectWords.forEach(word => {
                const item = document.createElement('div');
                item.className = 'review-word-item';
                item.innerHTML = `
                    <span class="review-original">${word.original}</span>
                    <span class="review-translation">${word.translation}</span>
                `;
                reviewList.appendChild(item);
            });

            reviewSection.style.display = 'block';
        }

        // Show results screen
        document.querySelector('.exercise-screen').style.display = 'none';
        document.querySelector('.results-screen').style.display = 'block';
        // Hide mid-session back button while on results
        const midActions = document.querySelector('.mid-exercise-actions');
        if (midActions) midActions.style.display = 'none';

        // Save exercise statistics
        this.saveExerciseStats();
    }

    async saveExerciseStats() {
        try {
            // Create exercise session record
            const exerciseData = {
                timestamp: new Date().toISOString(),
                type: 'vocabulary_exercise',
                difficulty: this.difficulty,
                totalQuestions: this.words.length,
                correctAnswers: this.correctAnswers,
                incorrectAnswers: this.incorrectAnswers,
                skippedAnswers: this.skippedAnswers,
                score: this.score,
                percentage: Math.round((this.correctAnswers / this.words.length) * 100),
                duration: Date.now() - this.startTime,
                incorrectWords: this.incorrectWords
            };

            // Save exercise completion to background service worker
            try {
                const response = await chrome.runtime.sendMessage({
                    type: 'EXERCISE_COMPLETED',
                    data: {
                        score: this.score,
                        percentage: Math.round((this.correctAnswers / this.words.length) * 100),
                        timestamp: Date.now()
                    }
                });
                // Exercise completion reported to background service worker
            } catch (error) {
                console.error('Failed to report exercise completion:', error);
            }
        } catch (error) {
            console.error('Failed to save exercise statistics:', error);
        }
    }

    resetExercise() {
        // Shuffle words again for variety
        this.shuffleArray(this.words);

        // Reset all counters
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;
        this.skippedAnswers = 0;
        this.incorrectWords = [];

        // Hide results and show exercise
        document.querySelector('.results-screen').style.display = 'none';
        document.querySelector('.exercise-screen').style.display = 'block';
        const midActions = document.querySelector('.mid-exercise-actions');
        if (midActions) midActions.style.display = 'block';

        // Start fresh
        this.startTime = Date.now();
        this.loadQuestion();
    }

    closeExercise() {
        // Close the window/tab or send message to parent
        if (window.opener) {
            window.close();
        } else {
            // If opened as extension page, try to close or redirect
            try {
                chrome.tabs.getCurrent((tab) => {
                    chrome.tabs.remove(tab.id);
                });
            } catch (error) {
                // Fallback: hide the exercise container
                document.querySelector('.exercise-container').style.display = 'none';
                document.body.innerHTML = '<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;"><h2>Exercise Completed</h2><p>You can close this tab now.</p></div>';
            }
        }
    }

    returnToWelcome() {
        // Clear state but keep loaded words; allow changing difficulty & question count
        clearTimeout(this.pendingAdvance);
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctAnswers = 0;
        this.incorrectAnswers = 0;
        this.skippedAnswers = 0;
        this.incorrectWords = [];
        this.answeredMap.clear();
        this.choiceMap.clear();
        // Reset UI counters
        document.querySelector('.current-question').textContent = '0';
        document.querySelector('.current-score').textContent = '0';
        document.querySelector('.progress-fill').style.width = '0%';
        // Hide exercise & results, show welcome
        document.querySelector('.exercise-screen').style.display = 'none';
        document.querySelector('.results-screen').style.display = 'none';
        document.querySelector('.welcome-screen').style.display = 'block';
        // Hide mid-session actions until exercise starts again
        const midActions = document.querySelector('.mid-exercise-actions');
        if (midActions) midActions.style.display = 'none';
    }

    showTargetLanguageMenu(anchorEl) {
        if (this.isTranslatingBulk) return; // do not open while translating
        // Remove existing
        document.querySelector('.target-lang-menu')?.remove();
        const menu = document.createElement('div');
        menu.className = 'target-lang-menu';
        const LANGS = [
            'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'tr', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'cs', 'hu', 'ro'
        ];
        menu.innerHTML = '<div class="tlm-header">Change target language</div>' +
            LANGS.map(c => `<button data-lang="${c}">${this.languageName(c)}</button>`).join('') +
            '<button class="tlm-cancel" data-cancel="1">Cancel</button>';
        document.body.appendChild(menu);
        // position near anchor
        const rect = anchorEl.getBoundingClientRect();
        menu.style.top = (window.scrollY + rect.bottom + 6) + 'px';
        menu.style.left = (window.scrollX + rect.left) + 'px';
        const clickHandler = (ev) => {
            if (ev.target.closest('.target-lang-menu')) {
                const btn = ev.target.closest('button[data-lang]');
                if (btn) {
                    const lang = btn.dataset.lang;
                    document.removeEventListener('click', outsideHandler, true);
                    this.applyNewTargetLanguage(lang);
                } else if (ev.target.closest('[data-cancel]')) {
                    menu.remove();
                    document.removeEventListener('click', outsideHandler, true);
                }
            }
        };
        const outsideHandler = (ev) => {
            if (!ev.target.closest('.target-lang-menu') && !ev.target.closest('.target-language')) {
                menu.remove();
                document.removeEventListener('click', outsideHandler, true);
            }
        };
        menu.addEventListener('click', clickHandler);
        setTimeout(() => document.addEventListener('click', outsideHandler, true), 0);
    }

    languageName(code) {
        const MAP = {
            en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', tr: 'Turkish', nl: 'Dutch', sv: 'Swedish', da: 'Danish', no: 'Norwegian', fi: 'Finnish', pl: 'Polish', cs: 'Czech', hu: 'Hungarian', ro: 'Romanian'
        }; return MAP[code] || code.toUpperCase();
    }

    async applyNewTargetLanguage(lang) {
        if (this.isTranslatingBulk) return;
        this.isTranslatingBulk = true;
        document.querySelector('.target-lang-menu')?.remove();
        clearTimeout(this.pendingAdvance);
        this.showAnswerNotification(`Translating to ${this.languageName(lang)}...`, 'skipped');
        try {
            await this.bulkTranslateWords(lang);
            this.targetLanguage = lang;
            // Reset exercise state for fairness
            this.currentQuestionIndex = 0;
            this.score = 0; this.correctAnswers = 0; this.incorrectAnswers = 0; this.skippedAnswers = 0; this.incorrectWords = [];
            this.answeredMap.clear(); this.choiceMap.clear();
            this.loadQuestion();
        } catch (e) {
            console.error('Bulk translate failed', e);
            this.showAnswerNotification('Translation failed', 'incorrect');
        } finally {
            this.isTranslatingBulk = false;
            setTimeout(() => {
                const toast = document.querySelector('.answer-toast');
                if (toast && /Translating/.test(toast.textContent)) toast.remove();
            }, 1200);
        }
    }

    async bulkTranslateWords(targetLang) {
        // Attempt to reuse one translator instance if available
        if (!('Translator' in window)) throw new Error('Translation API not available in this context');
        const translatorCache = new Map(); // sourceLang -> translator
        for (const w of this.words) {
            const src = (w.sourceLanguage || 'auto');
            let translator = translatorCache.get(src);
            if (!translator) {
                translator = await Translator.create({ sourceLanguage: src, targetLanguage: targetLang });
                translatorCache.set(src, translator);
            }
            try {
                const result = await translator.translate(w.original);
                w.translation = result;
                w.targetLanguage = targetLang;
            } catch (e) {
                console.warn('Translation failed for', w.original, e);
            }
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

// Initialize exercise when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add a small delay to ensure vocabulary-db.js is loaded
    setTimeout(() => {
        window.exercise = new VocabularyExercise();
    }, 100);
});

// Make exercise globally available for debugging
window.VocabularyExercise = VocabularyExercise;