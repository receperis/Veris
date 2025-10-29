/**
 * HTML Templates for Popup Component
 * Extracted from popup.js for better maintainability
 */

export const PopupTemplates = {
  // Vocabulary item template (for normal view mode)
  vocabularyItem: (item, id, hasContext) => `
    <div class="vocabulary-item" data-id="${id}">
      <div class="vocabulary-content">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="flex:1;">
            <div class="source-text">${escapeHtml(
              item.originalWord || ""
            )}</div>
            <div class="translation">${escapeHtml(
              item.translatedWord || ""
            )}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            ${
              hasContext
                ? `<button class="context-toggle" title="Show context" data-id="${id}">📖</button>`
                : ""
            }
          </div>
        </div>
      </div>
      ${hasContext ? PopupTemplates.contextPanel(item, id) : ""}
    </div>
  `,

  // Vocabulary item template for edit mode
  vocabularyItemEdit: (item, id, hasContext) => `
    <div class="vocabulary-item" data-id="${id}">
      <div class="vocabulary-content">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="flex:1;">
            <div class="source-text">${escapeHtml(
              item.originalWord || ""
            )}</div>
            <div class="translation">${escapeHtml(
              item.translatedWord || ""
            )}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="icon-btn icon-edit" title="Edit" data-id="${id}" style="background:transparent;border:none;cursor:pointer;font-size:16px;color:#6b7280;padding:6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"></path>
                <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"></path>
              </svg>
            </button>
            ${
              hasContext
                ? `<button class="context-toggle" title="Show context" data-id="${id}">📖</button>`
                : ""
            }
          </div>
        </div>
      </div>
      ${hasContext ? PopupTemplates.contextPanel(item, id) : ""}
    </div>
  `,

  // Inline edit form
  inlineEditForm: (item, id) => `
    <div class="vocabulary-content">
      <input class="edit-original" data-id="${id}" value="${escapeHtml(
    item.originalWord || ""
  )}" style="width:100%;padding:6px;margin-bottom:6px;box-sizing:border-box;" />
      <input class="edit-translation" data-id="${id}" value="${escapeHtml(
    item.translatedWord || ""
  )}" style="width:100%;padding:6px;margin-bottom:6px;box-sizing:border-box;" />
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button class="quick-action-btn save-word" data-id="${id}">Save</button>
        <button class="quick-action-btn cancel-edit" data-id="${id}">Cancel</button>
        <button class="quick-action-btn delete-word" data-id="${id}" style="background:#fee2e2;border-color:#fecaca;color:#991b1b;">Delete</button>
      </div>
    </div>
  `,

  // Context panel
  contextPanel: (item, id) => {
    const hasContext =
      (item.context && item.context.trim()) ||
      (item.contextTranslation && item.contextTranslation.trim());
    if (!hasContext) return "";
    return `
      <div class="context-panel" data-id="${id}" style="display: none;">
        ${
          item.context && item.context.trim()
            ? `
          <div class="context-original">
            <span class="context-text">${escapeHtml(item.context)}</span>
          </div>
        `
            : ""
        }
        ${
          item.contextTranslation && item.contextTranslation.trim()
            ? `
          <div class="context-translation">
            <span class="context-text">${escapeHtml(
              item.contextTranslation
            )}</span>
          </div>
        `
            : ""
        }
      </div>
    `;
  },

  // Confirm dialog
  confirmDialog: (
    title,
    details,
    confirmLabel = "Delete",
    cancelLabel = "Cancel"
  ) => `
    <div class="mini-confirm" role="dialog" aria-modal="true">
      <p><strong>${escapeHtml(
        title
      )}</strong><br/><small style="color:#6b7280">${escapeHtml(
    details || ""
  )}</small></p>
      <div class="actions">
        <button class="btn cancel">${escapeHtml(cancelLabel)}</button>
        <button class="btn confirm">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>
  `,

  // Toast notification
  toastNotification: (message, kind = "info") => `
    <div class="mini-toast ${kind}">
      ${escapeHtml(message)}
    </div>
  `,

  // Loading state
  loadingState: (message = "Loading vocabulary...") => `
    <div class="loading">${escapeHtml(message)}</div>
  `,

  // No results state
  noResultsState: (message) => `
    <div class="no-results">${escapeHtml(message)}</div>
  `,

  // Language option
  languageOption: (langCode, displayName) => `
    <option value="${escapeHtml(langCode)}">${escapeHtml(displayName)}</option>
  `,
};

// Import shared utilities
import { escapeHtml } from "../shared/utils.js";

// Make escapeHtml available for templates
PopupTemplates.escapeHtml = escapeHtml;
