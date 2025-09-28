# Veris Chrome Extension

A Chrome extension that provides instant text translation with vocabulary learning features using the browser's built-in Translation API. Select text on any webpage to see an inline translation popup with word-level breakdown and vocabulary saving.

## Features

- 🌍 **Built-in Translation**: Uses Chrome's native Translation API for offline translation
- 🎯 **Inline Popup**: Translation appears right next to your selection
- 📚 **Word-Level Learning**: Click individual words to see their translations
- 💾 **Vocabulary Storage**: Save words to IndexedDB for vocabulary building
- 🔄 **Multi-Word Selection**: View translations for multiple words simultaneously
- ⚙️ **Customizable**: Configure target language
- 🔒 **Privacy-First**: No external API calls - all translation happens locally
- 🚀 **Fast & Lightweight**: Minimal performance impact on browsing
- 🎨 **Clean UI**: Elegant, non-intrusive design

## File Structure

```
📁 poc-chrome-extension/
├── 📄 manifest.json          # Extension configuration
├── 📄 content_script.js      # Main translation functionality
├── 📄 vocabulary-db.js       # IndexedDB storage utilities
├── 📄 content_styles.css     # Translation bubble styles
├── 📄 background.js          # Service worker for language detection
├── 📄 options.html           # Settings page UI
├── 📄 options.js             # Settings page logic
├── 📄 options.css            # Settings page styles
├── 📄 test.html              # Testing page with examples
└── 📄 README.md              # This file
```

## Installation

### From Source
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension should now appear in your extensions list

## Usage

### 1. Basic Translation
- Install the extension
- Visit any webpage
- Select text with your mouse or keyboard
- A translation popup will appear automatically

### 2. Word-Level Learning
- Click individual word pills in the translation bubble
- Each clicked word will show its individual translation
- Multiple words can be active simultaneously
- Word translations appear in a scrollable area below

### 3. Vocabulary Building
- Click the "+ Add" button next to word translations to select them
- Or double-click word pills directly to toggle selection
- Selected words show with green background and ✓ checkmark
- Click "Save Selected" button to store vocabulary to IndexedDB

### 4. Managing Saved Vocabulary
Open browser DevTools (F12) and use these console commands:
```javascript
// View all saved vocabulary
vocabularyExtension.getAllVocabulary()

// Get recent vocabulary (last 7 days)
vocabularyExtension.getRecentVocabulary(7)

// Get database statistics
vocabularyExtension.getStats()

// Export vocabulary as JSON file
vocabularyExtension.exportVocabulary()

// Clear all vocabulary (for testing)
vocabularyExtension.clearAllVocabulary()
```

## Configuration Options

### Target Language
Specify the language code you want text translated to:
- `en` - English
- `es` - Spanish  
- `fr` - French
- `de` - German
- `ja` - Japanese
- `zh` - Chinese
- And many more (use ISO 639-1 language codes)

## Data Storage

The extension stores vocabulary data locally in IndexedDB with this structure:
```javascript
{
  id: auto-generated,
  timestamp: "2025-09-17T...",
  originalText: "selected text context",
  sourceLanguage: "auto-detected language",
  targetLanguage: "en",
  words: [
    {
      original: "word",
      translation: "translated word", 
      context: "full sentence context"
    }
  ],
  totalWords: 3,
  url: "https://example.com/page",
  domain: "example.com"
}
```

## Privacy & Security

- **Local Translation**: Uses Chrome's built-in Translation API - no external servers
- **No Data Transmission**: Selected text never leaves your browser
- **No Tracking**: The extension doesn't collect or store personal data
- **Offline Capable**: Works without internet connection once language models are downloaded

## Technical Details

### Files Structure
```
├── manifest.json         # Extension configuration
├── content_script.js     # Main functionality (text selection & translation)
├── content_styles.css    # Styling for translation popup
├── background.js         # Service worker for language detection
├── options.html          # Options page HTML
├── options.js           # Options page functionality
├── options.css          # Options page styling
└── README.md            # This file
```

### Permissions
- `storage` - To save user preferences and detected source languages
- `tabs` - To detect page language for better translation context

### Translation API
This extension uses Chrome's experimental Translation API (`self.translation.createTranslator`). If the API is not available, it falls back to language detection and provides guidance to use Chrome's native translate feature.

## Development

### Setup
1. Clone the repository
2. Load the extension in Chrome (developer mode)
3. Make your changes
4. Reload the extension to test

### Testing
- Test on various websites
- Try different text selections (long, short, special characters)
- Test the options page functionality
- Verify error handling with invalid API endpoints

### Building
No build process required - this is a pure JavaScript extension.

## Troubleshooting

### Translation Not Working
1. Ensure you're using a compatible Chrome/Chromium browser
2. Check if the Translation API is enabled in your browser
3. Try reloading the page and extension
4. Check browser console for error messages

### Popup Not Appearing
1. Make sure you're selecting text (not just clicking)
2. Try selecting longer text (minimum 2 characters)
3. Check if the extension is enabled
4. Reload the page and try again

### API Limitations
- The Translation API is experimental and may not be available in all Chrome versions
- Some language pairs may not be supported
- Translation quality depends on Chrome's built-in models

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Ideas for Improvements
- Add support for more language pairs
- Implement caching to improve performance
- Add keyboard shortcuts
- Support for translating entire paragraphs
- Better error handling and user feedback
- UI improvements for better accessibility

## License

This project is open source. Feel free to use, modify, and distribute as needed.

## Support

If you encounter issues or have questions:
1. Check the troubleshooting section above
2. Look for similar issues in the project repository
3. Create a new issue with details about your problem

---

**Note**: This extension uses Chrome's experimental Translation API. The API availability and language support may vary depending on your Chrome version and system configuration.
