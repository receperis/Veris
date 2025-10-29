/* IndexedDB Service - Handles all vocabulary database operations */

// IndexedDB Configuration
const DB_NAME = "VocabularyExtension";
const DB_VERSION = 3; // Incremented to remove unused indexes (originalText, sessionId)
const STORE_NAME = "vocabulary";

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
        console.error("IndexedDB error:", request.error);
        this.db = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Handle unexpected database close
        this.db.onclose = () => {
          console.warn("Database connection was closed unexpectedly");
          this.db = null;
        };

        // Handle version change
        this.db.onversionchange = () => {
          console.warn("Database version changed, closing connection");
          this.db.close();
          this.db = null;
        };

        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const transaction = event.target.transaction;

        let store;

        // Create vocabulary store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          store = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });
        } else {
          store = transaction.objectStore(STORE_NAME);
        }

        // Create or update indexes for efficient querying
        const requiredIndexes = {
          timestamp: "timestamp",
          sourceLanguage: "sourceLanguage",
          targetLanguage: "targetLanguage",
          originalWord: "originalWord",
          translatedWord: "translatedWord",
          context: "context",
          contextTranslation: "contextTranslation",
          domain: "domain",
        };

        // Remove deprecated indexes if they exist (migration from v2)
        const deprecatedIndexes = ["originalText", "sessionId"];
        for (const indexName of deprecatedIndexes) {
          if (store.indexNames.contains(indexName)) {
            store.deleteIndex(indexName);
          }
        }

        // Add missing indexes
        for (const [indexName, keyPath] of Object.entries(requiredIndexes)) {
          if (!store.indexNames.contains(indexName)) {
            store.createIndex(indexName, keyPath, { unique: false });
          }
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

        const transaction = this.db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        transaction.onerror = () => {
          console.error("Transaction failed:", transaction.error);
          reject(transaction.error);
        };

        transaction.onabort = () => {
          console.error("Transaction aborted");
          reject(new Error("Transaction aborted"));
        };

        const request = store.add(vocabularyData);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.error("Failed to save vocabulary:", request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error("Error creating transaction:", error);
        // Try to reinitialize database and retry once
        try {
          await this.init();
          const transaction = this.db.transaction([STORE_NAME], "readwrite");
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

        const transaction = this.db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);

        transaction.onerror = () => {
          console.error("Transaction failed:", transaction.error);
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
        console.error("Error creating transaction:", error);
        // Try to reinitialize database and retry once
        try {
          await this.init();
          const transaction = this.db.transaction([STORE_NAME], "readonly");
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
      const transaction = this.db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("timestamp");
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
      const transaction = this.db.transaction([STORE_NAME], "readwrite");
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
      const transaction = this.db.transaction([STORE_NAME], "readwrite");
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
      const transaction = this.db.transaction([STORE_NAME], "readwrite");
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
            console.log("Vocabulary updated with ID:", id);
            resolve(putRequest.result);
          };

          putRequest.onerror = () => {
            console.error("Failed to update vocabulary:", putRequest.error);
            reject(putRequest.error);
          };
        } else {
          reject(new Error("Entry not found"));
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
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

      all.forEach((entry) => {
        if (entry.originalWord) {
          uniqueWords.add(entry.originalWord.toLowerCase());
          languagePairs.add(
            `${entry.sourceLanguage} → ${entry.targetLanguage}`
          );
          domains.add(entry.domain);
        }
      });

      const stats = {
        totalEntries: all.length,
        uniqueWords: uniqueWords.size,
        languagePairs: Array.from(languagePairs),
        domains: Array.from(domains),
        dateRange:
          all.length > 0
            ? {
                first: new Date(
                  Math.min(...all.map((entry) => new Date(entry.timestamp)))
                ).toLocaleDateString(),
                last: new Date(
                  Math.max(...all.map((entry) => new Date(entry.timestamp)))
                ).toLocaleDateString(),
              }
            : null,
      };
      console.log("Vocabulary Statistics:", stats);
      return stats;
    } catch (error) {
      console.error("Failed to get stats:", error);
      return null;
    }
  }
}

// Create global instance
if (typeof self !== "undefined") {
  // Service worker context
  self.vocabularyDB = new VocabularyDB();

  self.DatabaseService = {
    vocabularyDB: self.vocabularyDB,

    // Database operations
    saveVocabulary: (data) => self.vocabularyDB.saveVocabularyEntry(data),
    getAllVocabulary: () => self.vocabularyDB.getAllVocabulary(),
    getStats: () => self.vocabularyDB.getStats(),
    deleteVocabulary: (id) => self.vocabularyDB.deleteVocabularyEntry(id),
    deleteAllVocabulary: () => self.vocabularyDB.deleteAllVocabulary(),
    updateVocabulary: (id, updates) =>
      self.vocabularyDB.updateVocabularyEntry(id, updates),

    // Initialize database
    init: () => self.vocabularyDB.init(),
  };
}
