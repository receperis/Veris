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
  if (node.nodeType === 3) node = node.parentElement;
  const BLOCK_TAGS = new Set([
    "P",
    "DIV",
    "LI",
    "ARTICLE",
    "SECTION",
    "MAIN",
    "TD",
    "TH",
  ]);
  let cur = node;
  let depth = 0;
  while (cur && cur !== document.body && depth < 10) {
    if (cur.tagName && BLOCK_TAGS.has(cur.tagName)) return cur;
    cur = cur.parentElement;
    depth++;
  }
  return cur || null;
}

export function computeContextSentence(originalWord, translatedWord) {
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
  const sentences = raw.split(/(?<=[.!?])\s+/);
  const lw = (originalWord || "").toLowerCase();
  const lt = (translatedWord || "").toLowerCase();
  let found = sentences.find((s) => s.toLowerCase().includes(lw));
  if (!found && lt) found = sentences.find((s) => s.toLowerCase().includes(lt));
  return (found || lastSelection).trim();
}
