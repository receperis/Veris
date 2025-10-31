# Veris - Advanced Vocabulary Learning Chrome Extension

**Veris** is a comprehensive Chrome extension that combines instant text translation with an advanced Spaced Repetition System (SRS) for vocabulary learning. Select text on any webpage to see inline translations, save vocabulary, and learn through scientifically-proven spaced repetition exercises.

## ✨ Core Features

### 🌍 Translation System

- **Chrome Translation API Integration**: Leverages Chrome's built-in Translation API for offline translation
- **Inline Translation Bubble**: Translations appear directly next to selected text
- **Word-Level Breakdown**: Click individual words to see their translations
- **Multi-Language Support**: Supports a wide range of language pairs with automatic detection
- **Context Preservation**: Maintains the original sentence context for better learning
- **Hotkey & Trigger Modes**: Flexible activation options for different workflows

### 📚 Vocabulary Management

- **Persistent Storage**: Saves vocabulary to IndexedDB with full context
- **Smart Organization**: Filter and search by language, date, and more
- **Rich Metadata**: Stores source text, translations, URL, domain, and timestamps
- **Edit & Manage**: Full CRUD operations for your vocabulary entries
- **Import/Export**: Backup and restore your vocabulary data
- **Duplicate Detection**: Prevents saving the same word multiple times

### 🧠 Spaced Repetition System (SRS)

- **Leitner Box Algorithm**: Scientifically-proven spaced repetition method
- **6-Box System**: Progressive difficulty levels with increasing intervals (1, 3, 7, 14, 30 days)
- **Smart Scheduling**: Automatic calculation of due dates based on performance
- **Exercise Sessions**: Customizable question counts and difficulty levels
- **Multiple Question Types**: Recognition, recall, and context-based questions
- **Progress Tracking**: Detailed statistics on learning progress and word mastery

### 📊 Statistics & Analytics

- **Performance Metrics**: Track correct/incorrect answers, streaks, and progress
- **Visual Dashboard**: Charts and graphs showing learning trends
- **Per-Language Stats**: Monitor progress for each language you're learning
- **SRS Box Distribution**: See how your vocabulary is distributed across difficulty levels

### 🎨 Modern UI/UX

- **Clean, Intuitive Design**: Elegant interface that doesn't get in the way
- **Dark Mode Support**: Comfortable viewing in any lighting condition
- **Responsive Layout**: Works seamlessly on all screen sizes
- **Smooth Animations**: Polished user experience with CSS transitions
- **Accessibility**: Keyboard navigation and screen reader support

## 🏗️ Project Structure

```
📁 SRS-Training/
├── 📁 src/
│   ├── 📁 content/           # Content script modules
│   │   ├── api.js            # Translation API integration
│   │   ├── state.js          # Global state management
│   │   ├── toast.js          # Toast notification system
│   │   ├── ui.js             # UI components & interactions
│   │   ├── utils.js          # Helper utilities
│   │   └── words.js          # Word selection & saving logic
│   ├── 📁 exercise/          # SRS exercise interface
│   │   ├── exercise.js       # Main exercise controller
│   │   ├── exercise.html     # Exercise page UI
│   │   ├── exercise.css      # Exercise styling
│   │   ├── state-manager.js  # Exercise state management
│   │   ├── question-generator.js  # Question creation logic
│   │   ├── ui-controller.js  # Exercise UI updates
│   │   ├── navigation.js     # Exercise navigation
│   │   └── translation-handler.js  # Exercise translations
│   ├── 📁 pages/             # Extension pages
│   │   ├── background.js     # Service worker
│   │   ├── content_script.js # Main content script
│   │   ├── popup.js          # Popup vocabulary browser
│   │   ├── popup.html        # Popup UI
│   │   ├── options.js        # Settings page logic
│   │   └── options.html      # Settings page UI
│   ├── 📁 service/           # Core services
│   │   ├── database.service.js      # IndexedDB operations
│   │   ├── exercise.service.js      # Exercise preparation
│   │   ├── leitner.service.js       # SRS algorithm
│   │   ├── language-detection.service.js  # Language detection
│   │   ├── logger.service.js        # Logging utilities
│   │   ├── message.service.js       # Message passing
│   │   ├── notification.service.js  # User notifications
│   │   └── stats.service.js         # Statistics calculation
│   ├── 📁 shared/            # Shared utilities
│   │   ├── constants.js      # App-wide constants
│   │   ├── dom-utils.js      # DOM manipulation helpers
│   │   ├── language-detection.js  # Language detection logic
│   │   ├── languages.js      # Language definitions
│   │   ├── storage.js        # Storage abstraction
│   │   └── utils.js          # General utilities
│   ├── � stats/             # Statistics page
│   │   ├── stats.js          # Statistics logic
│   │   ├── stats.html        # Statistics UI
│   │   └── stats.css         # Statistics styling
│   ├── 📁 styles/            # Global styles
│   │   ├── dynamic-ui.css    # Dynamic UI elements
│   │   ├── popup.css         # Popup styles
│   │   └── unified-theme.css # Consistent theming
│   └── 📁 templates/         # HTML templates
│       ├── content-templates.js    # Content script templates
│       ├── exercise-templates.js   # Exercise templates
│       ├── popup-templates.js      # Popup templates
│       ├── stats-templates.js      # Statistics templates
│       └── template-utils.js       # Template utilities
├── � tests/                 # Comprehensive test suite
│   ├── 📁 unit/              # Unit tests (81 tests)
│   ├── 📁 integration/       # Integration tests (50 tests)
│   └── 📁 e2e/               # End-to-end tests (7 tests)
├── 📁 branding/              # Logo and brand assets
├── 📁 icons/                 # Extension icons
├── manifest.json             # Extension manifest (v3)
├── webpack.config.js         # Build configuration
├── package.json              # Dependencies
└── README.md                 # This file
```

## 🚀 Installation

### Development Installation

1. **Clone the repository**

   ```cmd
   git clone https://github.com/receperis/Veris.git
   cd Veris
   ```

2. **Install dependencies**

   ```cmd
   npm install
   ```

3. **Build the extension**

   ```cmd
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder
   - The Veris extension should now appear in your extensions list

### Development Mode with Auto-Rebuild

For active development with automatic rebuilding:

```cmd
npm run dev
```

This watches for file changes and rebuilds automatically. You'll need to reload the extension in Chrome after each build.

## 📖 Usage Guide

<iframe width="560" height="315"
  src="https://www.youtube.com/embed/pT1VbMUTuhs"
  title="YouTube video player"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen>
</iframe>

[![Watch the video](https://img.youtube.com/vi/pT1VbMUTuhs/maxresdefault.jpg)](https://www.youtube.com/watch?v=pT1VbMUTuhs)

### 1. Translating Text

1. Select text on any webpage
2. A translation bubble appears automatically with the full translation
3. View language indicators showing source → target language
4. Click individual word pills to see word-level translations
5. Click the close button or press `Esc` to dismiss

### 2. Saving Vocabulary

1. After translating, word pills appear below the translation
2. Click on words to mark them for saving (they turn green with a checkmark)
3. Click the "Save Selected" button to store them to your vocabulary
4. Access saved vocabulary via the extension popup (click the extension icon)

### 3. Managing Vocabulary (Popup)

- **Browse**: Click the extension icon to view all saved vocabulary
- **Search**: Use the search bar to filter by word or translation
- **Filter by Language**: Select a specific language from the dropdown
- **Edit**: Click any vocabulary entry to edit translations or context
- **Delete**: Remove unwanted entries
- **Statistics**: View your learning progress and SRS box distribution

### 4. Spaced Repetition Exercises

1. Click "Start Exercise" in the popup to begin an SRS session
2. Choose difficulty level (Easy, Medium, Hard, or Mixed)
3. Set the number of questions per session (5-50)
4. Answer questions by selecting the correct translation
5. System automatically schedules reviews based on your performance

### 5. Tracking Progress (Statistics Page)

- View total vocabulary count and words due for review
- See performance metrics (correct/incorrect, streaks)
- Monitor language-specific statistics
- Track SRS box distribution showing mastery levels

### 6. Configuration (Options Page)

- Set your target translation language
- Configure exercise preferences (questions per session, difficulty)
- Adjust hotkey and trigger settings
- Enable/disable the extension globally
- Customize notification preferences

## ⚙️ Technical Architecture

### Built With

- **Manifest V3**: Modern Chrome Extension API
- **Vanilla JavaScript**: No framework dependencies for optimal performance
- **ES6 Modules**: Clean, modular code organization
- **IndexedDB**: Persistent local storage for vocabulary data
- **Chrome Translation API**: Native browser translation capabilities
- **Webpack**: Build tooling and module bundling
- **Jest**: Comprehensive testing framework (145+ tests)

### Key Technologies

#### Frontend

- **Modular Architecture**: Separated concerns across content, service, and UI layers
- **Template System**: Reusable HTML templates for consistent UI
- **CSS Variables**: Dynamic theming with unified design system
- **Shadow DOM**: Isolated styling for content script UI elements

#### Backend Services

- **Service Worker**: Background processing and message handling
- **DatabaseService**: Abstracted IndexedDB operations with transaction management
- **LeitnerService**: Pure SRS algorithm implementation with configurable intervals
- **LanguageDetection**: Cached detection with fallback mechanisms

#### Data Flow

```
Content Script → Message Passing → Background Service Worker
                                          ↓
                                   Database Service
                                          ↓
                                      IndexedDB
```

### Performance Optimizations

- Lazy loading of modules
- Efficient DOM manipulation with minimal reflows
- Debounced search and filtering
- Memory leak prevention with cleanup handlers
- Optimized IndexedDB queries with indexes

## 💾 Data Storage

### Vocabulary Entry Structure

The extension stores vocabulary data locally in IndexedDB with this comprehensive structure:

```javascript
{
  id: "unique-id-timestamp",
  timestamp: "2025-10-29T12:34:56.789Z",
  originalWord: "word",
  translatedWord: "translation",
  sourceLanguage: "es",
  targetLanguage: "en",
  context: "full sentence containing the word",
  translatedContext: "translated sentence",
  url: "https://example.com/page",
  domain: "example.com",

  // SRS (Spaced Repetition) metadata
  srs: {
    boxIndex: 0,              // Leitner box (0-5)
    dueAt: null,              // Next review date
    interval: 1,              // Days until next review
    totalCorrect: 0,          // Correct answer count
    totalWrong: 0,            // Incorrect answer count
    streak: 0,                // Current correct streak
    skippedCount: 0,          // Times skipped
    lastResult: null,         // "correct" | "wrong" | "skipped"
    lastReviewedAt: null,     // Last review timestamp
    createdAt: "2025-10-29T12:34:56.789Z"
  }
}
```

### SRS Scheduling (Leitner System)

- **Box 0**: New words (2-minute cooldown, immediate review)
- **Box 1**: 1-day interval
- **Box 2**: 3-day interval
- **Box 3**: 7-day interval
- **Box 4**: 14-day interval
- **Box 5**: 30-day interval (mastered)

Words move up boxes on correct answers and down on incorrect answers, optimizing review timing based on your performance.

## 🔒 Privacy & Security

- **Local-First**: All translation happens using Chrome's built-in Translation API
- **No External APIs**: Selected text never leaves your browser
- **No Tracking**: Zero data collection, analytics, or telemetry
- **No Network Requests**: Offline-capable once language models are downloaded
- **Local Storage Only**: All vocabulary stored in your browser's IndexedDB
- **Open Source**: Full transparency - inspect the code yourself
- **Minimal Permissions**: Only requests necessary Chrome extension permissions:
  - `storage` - Save user preferences and vocabulary
  - `tabs` - Detect page language for translation context
  - `notifications` - Optional exercise reminders
  - `alarms` - Schedule SRS review notifications

## 🧪 Testing

Veris includes a comprehensive test suite with **145+ passing tests** covering unit, integration, and end-to-end scenarios.

### Run Tests

```cmd
# Run all tests
npm test

# Run specific test categories
npm run test:unit          # Unit tests (81 tests)
npm run test:integration   # Integration tests (50 tests)
npm run test:e2e          # End-to-end tests (7 tests)

# Development testing
npm run test:watch        # Watch mode for TDD
npm run test:coverage     # Generate coverage report
npm run test:debug        # Debug tests with Node inspector
```

### Testing Infrastructure

- **Jest**: Test framework with JSDOM environment
- **Puppeteer**: Browser automation for E2E tests
- **Fake-IndexedDB**: Realistic database mocking
- **Chrome API Mocks**: Complete extension API simulation
- **Sinon**: Spies, stubs, and mocks for complex scenarios

## 🔧 Development

### Build Scripts

```cmd
# Development build with watch mode
npm run dev

# Production build (minified, optimized)
npm run build

# Run tests
npm test
```

### Project Commands

```cmd
# Install dependencies
npm install

# Build for development (source maps enabled)
npm run dev

# Build for production
npm run build

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Architecture Guidelines

- **Modular Design**: Keep files focused and single-purpose
- **Service Layer**: Business logic in service files
- **Template System**: Use templates for consistent HTML generation
- **Error Handling**: Always handle promise rejections and API errors
- **Memory Management**: Clean up event listeners and resources
- **Testing**: Write tests for new features and bug fixes

### Code Quality

- **ESLint**: Code linting (configured in project)
- **Prettier**: Code formatting (configured in project)
- **Babel**: Transpilation for older browsers
- **Webpack**: Module bundling and optimization

## 🐛 Troubleshooting

### Translation Not Working

- **Check Chrome Version**: Ensure you're using Chrome 120+ for Translation API support
- **Enable Translation API**: The feature may be experimental in your Chrome version
- **Check Browser Console**: Look for error messages (F12 → Console tab)
- **Reload Extension**: Go to `chrome://extensions/` and click the reload button
- **Reload Page**: Some pages require a refresh after extension installation

### Popup Not Appearing

- **Text Selection**: Make sure you're selecting text (not just clicking)
- **Extension Enabled**: Check that the extension toggle is on in the options
- **Page Compatibility**: Some pages (chrome://, about:, file://) block content scripts
- **Clear Bubble**: Press `Esc` to clear any stuck bubbles

### Vocabulary Not Saving

- **IndexedDB Support**: Ensure your browser supports IndexedDB
- **Storage Quota**: Check if you've exceeded browser storage limits
- **Private/Incognito Mode**: Some storage features may be limited
- **Check Console**: Look for database errors in the console

### Exercises Not Loading

- **Vocabulary Required**: Save at least 4 words before starting exercises
- **Database Access**: Ensure IndexedDB is accessible
- **Service Worker**: Check background service worker status in `chrome://extensions/`

### Performance Issues

- **Large Vocabulary**: Exercise performance may degrade with 10,000+ words
- **Memory Usage**: Close and reopen popup if it feels sluggish
- **Clear Cache**: Try clearing browser cache and reloading the extension

### Build Errors

- **Node Version**: Use Node.js 18+ for best compatibility
- **Clean Install**: Delete `node_modules` and run `npm install` again
- **Clear Dist**: Delete the `dist` folder and rebuild

## 🌟 Acknowledgments

- Chrome Translation API for enabling offline translation
- The Leitner System for scientific spaced repetition methodology

## 🔗 Links

- **Repository**: [github.com/receperis/SRS-Training](https://github.com/receperis/SRS-Training)
- **Issues**: [Report a bug or request a feature](https://github.com/receperis/SRS-Training/issues)
- **Changelog**: See commit history for recent changes

---

**Built with ❤️ for language learners**

_Note: This extension uses Chrome's Translation API, which may be experimental. API availability and language support vary by Chrome version and system configuration._
