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
// Note: DOM helper `createElement` is implemented in `templates/template-utils.js` and
// TemplateUtils is used across the UI. The shared module no longer provides a global
// `createElement` export to avoid duplication. If a shared DOM helper is needed in
// multiple modules in the future, consider moving a single implementation into
// `templates/template-utils.js` or a dedicated `dom-utils.js` and import from there.

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
