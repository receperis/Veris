/* IndexedDB utility for vocabulary storage */

// IndexedDB Configuration
const DB_NAME = 'VocabularyExtension';
const DB_VERSION = 1;
const STORE_NAME = 'vocabulary';

// IndexedDB utility functions
class VocabularyDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create vocabulary store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          
          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('sourceLanguage', 'sourceLanguage', { unique: false });
          store.createIndex('targetLanguage', 'targetLanguage', { unique: false });
          store.createIndex('originalText', 'originalText', { unique: false });
          store.createIndex('originalWord', 'originalWord', { unique: false });
          store.createIndex('translatedWord', 'translatedWord', { unique: false });
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('domain', 'domain', { unique: false });
          
          console.log('Vocabulary store created');
        }
      };
    });
  }

  async saveVocabularyEntry(vocabularyData) {
    if (!this.db) {
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.add(vocabularyData);
      
      request.onsuccess = () => {
        console.log('Vocabulary saved with ID:', request.result);
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to save vocabulary:', request.error);
        reject(request.error);
      };
    });
  }

  async getAllVocabulary() {
    if (!this.db) {
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getVocabularyByDateRange(startDate, endDate) {
    if (!this.db) {
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async deleteVocabularyEntry(id) {
    if (!this.db) {
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async updateVocabularyEntry(id, updatedData) {
    if (!this.db) {
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // First get the existing entry
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const existingData = getRequest.result;
        if (existingData) {
          // Merge the updated data with existing data
          const mergedData = { ...existingData, ...updatedData, id: id };
          
          const putRequest = store.put(mergedData);
          
          putRequest.onsuccess = () => {
            console.log('Vocabulary updated with ID:', id);
            resolve(putRequest.result);
          };
          
          putRequest.onerror = () => {
            console.error('Failed to update vocabulary:', putRequest.error);
            reject(putRequest.error);
          };
        } else {
          reject(new Error('Entry not found'));
        }
      };
      
      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  async getVocabularyByLanguagePair(sourceLanguage, targetLanguage) {
    if (!this.db) {
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const filtered = request.result.filter(entry => 
          entry.sourceLanguage === sourceLanguage && 
          entry.targetLanguage === targetLanguage
        );
        resolve(filtered);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getWordsByOriginal(originalWord) {
    if (!this.db) {
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('originalWord');
      const request = index.getAll(originalWord);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getWordsByTranslation(translatedWord) {
    if (!this.db) {
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('translatedWord');
      const request = index.getAll(translatedWord);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getWordsBySession(sessionId) {
    if (!this.db) {
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getWordsByDomain(domain) {
    if (!this.db) {
      await this.init();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('domain');
      const request = index.getAll(domain);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// Utility functions for debugging and testing
const VocabularyUtils = {
  // Get all saved vocabulary
  async getAllVocabulary() {
    try {
      const vocabulary = await vocabularyDB.getAllVocabulary();
      console.table(vocabulary);
      return vocabulary;
    } catch (error) {
      console.error('Failed to retrieve vocabulary:', error);
      return [];
    }
  },

  // Get all unique words with their translations
  async getUniqueWords() {
    try {
      const vocabulary = await vocabularyDB.getAllVocabulary();
      const wordMap = new Map();
      
      vocabulary.forEach(entry => {
        if (entry.originalWord && entry.translatedWord) {
          const key = `${entry.originalWord}→${entry.translatedWord}`;
          if (!wordMap.has(key)) {
            wordMap.set(key, {
              original: entry.originalWord,
              translation: entry.translatedWord,
              count: 0,
              contexts: [],
              firstSeen: entry.timestamp,
              lastSeen: entry.timestamp
            });
          }
          const wordData = wordMap.get(key);
          wordData.count++;
          wordData.contexts.push(entry.context);
          if (entry.timestamp < wordData.firstSeen) wordData.firstSeen = entry.timestamp;
          if (entry.timestamp > wordData.lastSeen) wordData.lastSeen = entry.timestamp;
        }
      });
      
      const uniqueWords = Array.from(wordMap.values());
      console.table(uniqueWords);
      return uniqueWords;
    } catch (error) {
      console.error('Failed to get unique words:', error);
      return [];
    }
  },

  // Search for a specific word
  async searchWord(word) {
    try {
      const results = await vocabularyDB.getWordsByOriginal(word.toLowerCase());
      console.table(results);
      return results;
    } catch (error) {
      console.error('Failed to search word:', error);
      return [];
    }
  },

  // Get words from a specific session
  async getWordsFromSession(sessionId) {
    try {
      const words = await vocabularyDB.getWordsBySession(sessionId);
      console.table(words);
      return words;
    } catch (error) {
      console.error('Failed to get session words:', error);
      return [];
    }
  },

  // Get words from a specific domain
  async getWordsFromDomain(domain) {
    try {
      const words = await vocabularyDB.getWordsByDomain(domain);
      console.table(words);
      return words;
    } catch (error) {
      console.error('Failed to get domain words:', error);
      return [];
    }
  },
  
  // Get vocabulary from last N days
  async getRecentVocabulary(days = 7) {
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const vocabulary = await vocabularyDB.getVocabularyByDateRange(startDate, endDate);
      console.table(vocabulary);
      return vocabulary;
    } catch (error) {
      console.error('Failed to retrieve recent vocabulary:', error);
      return [];
    }
  },
  
  // Clear all vocabulary data (for testing)
  async clearAllVocabulary() {
    try {
      const all = await vocabularyDB.getAllVocabulary();
      for (const entry of all) {
        await vocabularyDB.deleteVocabularyEntry(entry.id);
      }
      console.log('All vocabulary data cleared');
    } catch (error) {
      console.error('Failed to clear vocabulary:', error);
    }
  },
  
  // Get database stats
  async getStats() {
    try {
      const all = await vocabularyDB.getAllVocabulary();
      
      // Count unique words
      const uniqueWords = new Set();
      const languagePairs = new Set();
      const domains = new Set();
      const sessions = new Set();
      
      all.forEach(entry => {
        if (entry.originalWord) {
          uniqueWords.add(entry.originalWord.toLowerCase());
          languagePairs.add(`${entry.sourceLanguage} → ${entry.targetLanguage}`);
          domains.add(entry.domain);
          if (entry.sessionId) sessions.add(entry.sessionId);
        }
      });
      
      const stats = {
        totalEntries: all.length,
        uniqueWords: uniqueWords.size,
        totalSessions: sessions.size,
        languagePairs: Array.from(languagePairs),
        domains: Array.from(domains),
        dateRange: all.length > 0 ? {
          first: new Date(Math.min(...all.map(entry => new Date(entry.timestamp)))).toLocaleDateString(),
          last: new Date(Math.max(...all.map(entry => new Date(entry.timestamp)))).toLocaleDateString()
        } : null
      };
      console.log('Vocabulary Statistics:', stats);
      return stats;
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  },

  // Export vocabulary as JSON
  async exportVocabulary() {
    try {
      const vocabulary = await vocabularyDB.getAllVocabulary();
      const dataStr = JSON.stringify(vocabulary, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `vocabulary-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      console.log('Vocabulary exported successfully');
      return vocabulary;
    } catch (error) {
      console.error('Failed to export vocabulary:', error);
      return null;
    }
  }
};

// Initialize the vocabulary database
const vocabularyDB = new VocabularyDB();

// Make utilities available globally for debugging
if (typeof window !== 'undefined') {
  window.vocabularyExtension = VocabularyUtils;
}