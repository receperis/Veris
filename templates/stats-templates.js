/**
 * HTML Templates for Stats Component
 * Extracted from stats.js for better maintainability
 */

export const StatsTemplates = {
  // Language distribution item
  languageItem: (language, count, percentage, languageDisplayName) => `
    <div class="language-item">
      <span class="language-name">${escapeHtml(languageDisplayName)}</span>
      <div class="language-progress">
        <div class="progress-bar" style="width: ${percentage}%"></div>
      </div>
      <span class="language-count">${count}</span>
    </div>
  `,

  // No language data message
  noLanguageData: () => `
    <div class="language-item">
      <span class="language-name">No vocabulary data</span>
      <div class="language-progress">
        <div class="progress-bar" style="width: 0%"></div>
      </div>
      <span class="language-count">0</span>
    </div>
  `,

  // Timeline activity item
  timelineItem: (activity) => `
    <div class="timeline-item">
      <div class="timeline-icon">${activity.icon}</div>
      <div class="timeline-content">
        <p class="timeline-text">${escapeHtml(activity.text)}</p>
        <span class="timeline-date">${escapeHtml(activity.date)}</span>
      </div>
    </div>
  `,

  // No activity message
  noActivity: () => `
    <div class="timeline-item">
      <div class="timeline-icon">📝</div>
      <div class="timeline-content">
        <p class="timeline-text">No recent activity</p>
        <span class="timeline-date">Start translating to see activity here</span>
      </div>
    </div>
  `,

  // Import progress overlay
  importProgressOverlay: (message) => `
    <div class="loading-spinner"></div>
    <p id="import-progress-message">${escapeHtml(message)}</p>
  `,

  // Success notification
  successNotification: (message) => `
    <div class="notification-content">
      <div class="notification-icon">✅</div>
      <p>${escapeHtml(message)}</p>
    </div>
  `,

  // Error notification
  errorNotification: (message) => `
    <div class="notification-content">
      <div class="notification-icon">❌</div>
      <p>${escapeHtml(message)}</p>
      <button class="close-btn" data-action="close-notification">×</button>
    </div>
  `,

  // Loading error content
  loadingError: (message) => `
    <div style="text-align: center; color: #e53e3e;">
      <div style="font-size: 3rem; margin-bottom: 20px;">⚠️</div>
      <p>${escapeHtml(message)}</p>
      <button id="retry-btn" style="
        margin-top: 20px;
        padding: 10px 20px;
        background: #4f46e5;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      ">Retry</button>
    </div>
  `,

  // Import modal file info
  importModalInfo: (fileName, wordCount) => ({
    fileName: escapeHtml(fileName),
    wordCount: wordCount.toString(),
  }),
};

// Helper function for HTML escaping
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Make escapeHtml available for templates
StatsTemplates.escapeHtml = escapeHtml;
