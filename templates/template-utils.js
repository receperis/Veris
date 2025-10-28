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

/**
 * BaseTemplates - Common reusable template patterns
 * These can be used across different template modules
 */
export const BaseTemplates = {
  // Generic button
  button: (label, className = "", attrs = {}) => {
    const attrString = Object.entries(attrs)
      .map(([key, value]) => `${key}="${TemplateUtils.escapeHtml(value)}"`)
      .join(" ");
    return `<button class="btn ${className}" ${attrString}>${TemplateUtils.escapeHtml(
      label
    )}</button>`;
  },

  // Loading spinner
  loadingSpinner: (message = "Loading...") => `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      ${
        message
          ? `<p class="loading-message">${TemplateUtils.escapeHtml(
              message
            )}</p>`
          : ""
      }
    </div>
  `,

  // Error message
  errorMessage: (message, showClose = false) => `
    <div class="error-container">
      <div class="error-icon">⚠️</div>
      <p class="error-message">${TemplateUtils.escapeHtml(message)}</p>
      ${showClose ? '<button class="close-error-btn">Close</button>' : ""}
    </div>
  `,

  // Success message
  successMessage: (message) => `
    <div class="success-container">
      <div class="success-icon">✓</div>
      <p class="success-message">${TemplateUtils.escapeHtml(message)}</p>
    </div>
  `,

  // Empty state
  emptyState: (message, iconOrEmoji = "📭") => `
    <div class="empty-state">
      <div class="empty-icon">${iconOrEmoji}</div>
      <p class="empty-message">${TemplateUtils.escapeHtml(message)}</p>
    </div>
  `,

  // Modal container
  modal: (title, content, actions = "") => `
    <div class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title">${TemplateUtils.escapeHtml(title)}</h3>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-content">
          ${content}
        </div>
        ${actions ? `<div class="modal-actions">${actions}</div>` : ""}
      </div>
    </div>
  `,

  // Confirmation dialog
  confirmDialog: (
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel"
  ) => `
    <div class="confirm-dialog">
      <h4 class="confirm-title">${TemplateUtils.escapeHtml(title)}</h4>
      <p class="confirm-message">${TemplateUtils.escapeHtml(message)}</p>
      <div class="confirm-actions">
        <button class="btn btn-cancel">${TemplateUtils.escapeHtml(
          cancelLabel
        )}</button>
        <button class="btn btn-confirm">${TemplateUtils.escapeHtml(
          confirmLabel
        )}</button>
      </div>
    </div>
  `,

  // Toast notification
  toast: (message, type = "info", duration = 3000) => {
    const icons = {
      success: "✓",
      error: "✕",
      warning: "⚠",
      info: "ℹ",
    };
    return `
      <div class="toast toast-${type}" data-duration="${duration}">
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${TemplateUtils.escapeHtml(message)}</span>
      </div>
    `;
  },

  // Badge
  badge: (text, variant = "default") => `
    <span class="badge badge-${variant}">${TemplateUtils.escapeHtml(
    text
  )}</span>
  `,

  // Card container
  card: (title, content, footer = "") => `
    <div class="card">
      ${
        title
          ? `<div class="card-header"><h3>${TemplateUtils.escapeHtml(
              title
            )}</h3></div>`
          : ""
      }
      <div class="card-body">
        ${content}
      </div>
      ${footer ? `<div class="card-footer">${footer}</div>` : ""}
    </div>
  `,
};

// Export commonly used utilities at module level
export const { escapeHtml, createElement, updateElement, injectCSS } =
  TemplateUtils;
