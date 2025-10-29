/**
 * DOM manipulation utilities shared across the extension
 * Provides helpers for creating, updating, and manipulating DOM elements
 */

/**
 * Create a DOM element from an HTML template string
 * @param {string} templateString - HTML template string
 * @param {Element} container - Optional container to append the element to
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
 * Inject CSS styles into the document
 * @param {string} cssText - CSS text to inject
 * @param {string} id - Optional ID for the style element (for deduplication)
 */
export function injectCSS(cssText, id = null) {
  if (id && document.getElementById(id)) {
    return; // Already injected
  }

  const style = document.createElement("style");
  if (id) {
    style.id = id;
  }
  style.textContent = cssText;
  document.head.appendChild(style);
}
