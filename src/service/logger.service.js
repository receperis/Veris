/**
 * Shared Logger Utility for Service Worker
 * Provides consistent logging across all service files
 * Compatible with service worker (IIFE pattern, no ES modules)
 */

const createLogger = (prefix) => ({
  log: (...args) => console.log(prefix, ...args),
  warn: (...args) => console.warn(prefix, ...args),
  error: (...args) => console.error(prefix, ...args),
});

// Make available globally for service worker
self.createLogger = createLogger;
