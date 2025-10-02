/**
 * Template Utilities
 * Helper functions for working with extracted templates
 */

// Re-export all template modules for easy access
export { PopupTemplates } from "./popup-templates.js";
export { ContentTemplates } from "./content-templates.js";
export { ExerciseTemplates } from "./exercise-templates.js";
export { StatsTemplates } from "./stats-templates.js";

// Common utility functions
export const TemplateUtils = {
  // Inject dynamic CSS if not already present
  injectCSS: (cssId, cssContent) => {
    if (document.getElementById(cssId)) return;

    const style = document.createElement("style");
    style.id = cssId;
    style.textContent = cssContent;
    document.head.appendChild(style);
  },

  // Load CSS file dynamically
  loadCSS: (cssPath) => {
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssPath;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  },

  // Create DOM element from template string
  createElement: (templateString, container = null) => {
    const temp = document.createElement("div");
    temp.innerHTML = templateString.trim();
    const element = temp.firstElementChild;

    if (container) {
      container.appendChild(element);
    }

    return element;
  },

  // Replace element content with template
  updateElement: (element, templateString) => {
    if (!element) return null;
    element.innerHTML = templateString;
    return element;
  },

  // Common HTML escape function
  escapeHtml: (text) => {
    if (typeof text !== "string") return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  // Remove all elements with a specific class
  removeElements: (className) => {
    const elements = document.querySelectorAll(`.${className}`);
    elements.forEach((el) => el.remove());
  },

  // Add CSS class to body for styling context
  addBodyClass: (className) => {
    document.body.classList.add(className);
  },

  // Remove CSS class from body
  removeBodyClass: (className) => {
    document.body.classList.remove(className);
  },
};

// Export commonly used utilities at module level
export const { escapeHtml, createElement, updateElement, injectCSS } =
  TemplateUtils;
