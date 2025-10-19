/**
 * Common utilities shared across the extension
 * These utilities are used by multiple components
 */

/**
 * Escape HTML content to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} The escaped HTML text
 */
export function escapeHtml(text) {
  if (typeof text !== "string") return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Normalize ID values for consistent storage/retrieval
 * Handles conversion between string and number IDs used by different storage systems
 * @param {string|number} id - The ID to normalize
 * @returns {string|number} The normalized ID
 */
export function normalizeId(id) {
  if (id === null || id === undefined) return id;

  // If already a number, return as-is
  if (typeof id === "number") return id;

  // If it's a numeric string, convert to number
  if (typeof id === "string" && id.trim() !== "" && !isNaN(Number(id))) {
    return Number(id);
  }

  // Otherwise return original (likely a string key)
  return id;
}

/**
 * Parse a hotkey string into a structured format
 * @param {string} str - Hotkey string like "ctrl+shift+f"
 * @returns {object|null} Parsed hotkey specification or null
 */
export function parseHotkeyString(str) {
  if (!str) return null;

  const tokens = str
    .split("+")
    .map((t) => t.trim())
    .filter(Boolean);

  const spec = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    keys: [],
  };

  tokens.forEach((tok) => {
    const low = tok.toLowerCase();
    if (["ctrl", "control"].includes(low)) {
      spec.ctrl = true;
    } else if (low === "shift") {
      spec.shift = true;
    } else if (["alt", "option"].includes(low)) {
      spec.alt = true;
    } else if (["meta", "cmd", "command"].includes(low)) {
      spec.meta = true;
    } else {
      spec.keys.push(tok.toLowerCase());
    }
  });

  if (spec.keys.length === 0) return null;
  return spec;
}

/**
 * Check if hotkey modifiers match an event
 * @param {object} spec - Hotkey specification from parseHotkeyString
 * @param {KeyboardEvent} e - Keyboard event to check
 * @returns {boolean} True if modifiers match
 */
export function hotkeyModifiersMatch(spec, e) {
  return (
    spec.ctrl === e.ctrlKey &&
    spec.shift === e.shiftKey &&
    spec.alt === e.altKey &&
    spec.meta === e.metaKey
  );
}

/**
 * Create a DOM element from template string
 * @param {string} templateString - HTML template string
 * @param {Element} container - Optional container to append to
 * @returns {Element} The created element
 */
export function createElement(templateString, container = null) {
  const temp = document.createElement("div");
  temp.innerHTML = templateString.trim();
  const element = temp.firstElementChild;

  if (container) {
    container.appendChild(element);
  }

  return element;
}

/**
 * Update element content with template string
 * @param {Element} element - Element to update
 * @param {string} templateString - New HTML content
 * @returns {Element|null} The updated element or null if element not found
 */
export function updateElement(element, templateString) {
  if (!element) return null;
  element.innerHTML = templateString;
  return element;
}

/**
 * Remove all elements with a specific class name
 * @param {string} className - Class name to remove
 */
export function removeElements(className) {
  const elements = document.querySelectorAll(`.${className}`);
  elements.forEach((el) => el.remove());
}

/**
 * Inject CSS content into the page if not already present
 * @param {string} cssId - Unique ID for the style element
 * @param {string} cssContent - CSS content to inject
 */
export function injectCSS(cssId, cssContent) {
  if (document.getElementById(cssId)) return;

  const style = document.createElement("style");
  style.id = cssId;
  style.textContent = cssContent;
  document.head.appendChild(style);
}

/**
 * Format a date for relative display (e.g., "2 hours ago", "yesterday")
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted relative date string
 */
export function formatRelativeDate(date) {
  const now = new Date();
  const targetDate = typeof date === "string" ? new Date(date) : date;
  const diffMs = now - targetDate;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    if (diffDays === 1) return "yesterday";
    return `${diffDays} days ago`;
  } else {
    return targetDate.toLocaleDateString();
  }
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute on leading edge
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function executedFunction(...args) {
    if (!lastRan) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}
