/**
 * Template Utilities
 * Helper functions for working with extracted templates
 */

// Import shared DOM utilities to avoid duplication
import {
  createElement as domCreateElement,
  injectCSS as domInjectCSS,
} from "../shared/dom-utils.js";

// Import shared HTML utilities
import { escapeHtml as sharedEscapeHtml } from "../shared/utils.js";

// Re-export all template modules for easy access
export { PopupTemplates } from "./popup-templates.js";
export { ContentTemplates } from "./content-templates.js";
export { ExerciseTemplates } from "./exercise-templates.js";
export { StatsTemplates } from "./stats-templates.js";

// Common utility functions
export const TemplateUtils = {
  // Inject dynamic CSS if not already present (wrapper for backward compatibility)
  injectCSS: (cssId, cssContent) => {
    domInjectCSS(cssContent, cssId);
  },

  // Create DOM element from template string (uses shared implementation)
  createElement: domCreateElement,

  // Common HTML escape function (uses shared implementation)
  escapeHtml: sharedEscapeHtml,

  // Remove all elements with a specific class
  removeElements: (className) => {
    const elements = document.querySelectorAll(`.${className}`);
    elements.forEach((el) => el.remove());
  },
};

// Export commonly used utilities at module level for backward compatibility
export const { escapeHtml, createElement, injectCSS } = TemplateUtils;
