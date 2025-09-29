/* IndexedDB Service - Handles all vocabulary database operations */

// IndexedDB Configuration
const DB_NAME = 'VocabularyExtension';
const DB_VERSION = 1;
const STORE_NAME = 'vocabulary';

class VocabularyDB {
  constructor() {
    this.db = null;
  }

  async init() {
    // Close existing connection if it exists
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        this.db = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Handle unexpected database close
        this.db.onclose = () => {
          console.warn('Database connection was closed unexpectedly');
          this.db = null;
        };

        // Handle version change
        this.db.onversionchange = () => {
          console.warn('Database version changed, closing connection');
          this.db.close();
          this.db = null;
        };

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
        }
      };
    });
  }

  async saveVocabularyEntry(vocabularyData) {
    // Ensure database is connected and ready
    if (!this.db || this.db.version === undefined) {
      await this.init();
    }

    return new Promise(async (resolve, reject) => {
      try {
        // Double-check connection before creating transaction
        if (!this.db || this.db.version === undefined) {
          await this.init();
        }

        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        transaction.onerror = () => {
          console.error('Transaction failed:', transaction.error);
          reject(transaction.error);
        };

        transaction.onabort = () => {
          console.error('Transaction aborted');
          reject(new Error('Transaction aborted'));
        };

        const request = store.add(vocabularyData);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.error('Failed to save vocabulary:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('Error creating transaction:', error);
        // Try to reinitialize database and retry once
        try {
          await this.init();
          const transaction = this.db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.add(vocabularyData);

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } catch (retryError) {
          reject(retryError);
        }
      }
    });
  }

  async getAllVocabulary() {
    // Ensure database is connected and ready
    if (!this.db || this.db.version === undefined) {
      await this.init();
    }

    return new Promise(async (resolve, reject) => {
      try {
        // Double-check connection before creating transaction
        if (!this.db || this.db.version === undefined) {
          await this.init();
        }

        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        transaction.onerror = () => {
          console.error('Transaction failed:', transaction.error);
          reject(transaction.error);
        };

        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        console.error('Error creating transaction:', error);
        // Try to reinitialize database and retry once
        try {
          await this.init();
          const transaction = this.db.transaction([STORE_NAME], 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.getAll();

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } catch (retryError) {
          reject(retryError);
        }
      }
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

  async deleteAllVocabulary() {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve(request.result);
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

  async getStats() {
    try {
      const all = await this.getAllVocabulary();

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
  }

  async getRandomWords(count = 10, difficulty = 'mixed') {
    try {
      const allWords = await this.getAllVocabulary();

      if (allWords.length === 0) {
        return [];
      }

      let availableWords = [...allWords];

      // Filter by difficulty
      if (difficulty === 'easy') {
        // Recent words (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        availableWords = availableWords.filter(word =>
          new Date(word.timestamp) >= thirtyDaysAgo
        );
      } else if (difficulty === 'hard') {
        // Older words (more than 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        availableWords = availableWords.filter(word =>
          new Date(word.timestamp) < thirtyDaysAgo
        );
      }
      // 'mixed' uses all words

      // Shuffle and return random selection
      const shuffled = availableWords.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, Math.min(count, shuffled.length));
    } catch (error) {
      console.error('Failed to get random words:', error);
      return [];
    }
  }
}

// Create global instance
if (typeof self !== 'undefined') {
  // Service worker context
  self.vocabularyDB = new VocabularyDB();

  self.DatabaseService = {
    vocabularyDB: self.vocabularyDB,

    // Database operations
    saveVocabulary: (data) => self.vocabularyDB.saveVocabularyEntry(data),
    getAllVocabulary: () => self.vocabularyDB.getAllVocabulary(),
    getStats: () => self.vocabularyDB.getStats(),
    getRandomWords: (count, difficulty) => self.vocabularyDB.getRandomWords(count, difficulty),
    deleteVocabulary: (id) => self.vocabularyDB.deleteVocabularyEntry(id),
    deleteAllVocabulary: () => self.vocabularyDB.deleteAllVocabulary(),
    updateVocabulary: (id, updates) => self.vocabularyDB.updateVocabularyEntry(id, updates),
    getWordsByLanguage: (sourceLanguage, targetLanguage) => self.vocabularyDB.getVocabularyByLanguagePair(sourceLanguage, targetLanguage),
    getWordsByDomain: (domain) => self.vocabularyDB.getWordsByDomain(domain),

    // Initialize database
    init: () => self.vocabularyDB.init()
  };
}