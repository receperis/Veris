import { state } from "./state.js";
// Import shared utilities to avoid duplication
import {
  escapeHtml,
  parseHotkeyString,
  hotkeyModifiersMatch,
} from "../shared/utils.js";
import {
  getLanguageName,
  getFullLanguageName,
  buildLanguageList,
} from "../shared/languages.js";

// Re-export shared functions for backwards compatibility
export {
  escapeHtml,
  getLanguageName,
  getFullLanguageName,
  buildLanguageList,
  parseHotkeyString,
  hotkeyModifiersMatch,
};

export function findBlockAncestor(node) {
  if (!node) return null;

  // If a text node was provided, use its parent element
  const startElement =
    node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

  if (!startElement) return null;

  const BLOCK_LEVEL_TAGS = new Set([
    "P",
    "DIV",
    "LI",
    "ARTICLE",
    "SECTION",
    "MAIN",
    "TD",
    "TH",
  ]);

  const MAX_DEPTH = 10;
  let ancestor = startElement;
  for (
    let depth = 0;
    ancestor && ancestor !== document.body && depth < MAX_DEPTH;
    depth++
  ) {
    if (
      ancestor.nodeType === Node.ELEMENT_NODE &&
      BLOCK_LEVEL_TAGS.has(ancestor.tagName)
    ) {
      return ancestor;
    }
    ancestor = ancestor.parentElement;
  }

  // Preserve previous behavior: return the current ancestor (could be document.body) or null
  return ancestor || null;
}

export function computeContextSentence(originalString, translatedString) {
  const { selectionContextElement, lastSelection } = state;
  if (!selectionContextElement) return lastSelection;
  let raw = "";
  try {
    raw =
      selectionContextElement.innerText ||
      selectionContextElement.textContent ||
      "";
  } catch {}
  if (!raw) return lastSelection;
  raw = raw.replace(/\s+/g, " ").trim();
  if (!raw) return lastSelection;

  const sentences = raw.split(/(?<=[.!?])\s+/); // Split by sentence-ending punctuation
  const lw = (originalString || "").toLowerCase();
  const lt = (translatedString || "").toLowerCase();
  let found;
  const lwTrim = lw.trim();
  if (lwTrim) {
    const lwWords = lwTrim.split(/\s+/).filter(Boolean); // Splits into words in case it is a phrase
    found = sentences.find((s) => {
      const lower = s.toLowerCase();
      return lwWords.some((w) => lower.includes(w));
    });
  }

  if (!found && lt) found = sentences.find((s) => s.toLowerCase().includes(lt));
  return (found || lastSelection).trim();
}
