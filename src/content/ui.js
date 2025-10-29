import { state } from "./state.js";
import {
  escapeHtml,
  getLanguageName,
  getFullLanguageName,
  buildLanguageList,
} from "./utils.js";
import { ContentTemplates } from "../templates/template-utils.js";

// Note: some functions reference other modules; import cycles are avoided by keeping DOM-only helpers here.

export function ensureTriggerStyles() {
  if (document.getElementById("__veris_trigger_icon_style")) return;
  const style = document.createElement("style");
  style.id = "__veris_trigger_icon_style";
  style.textContent = `.__veris_trigger_icon{background:linear-gradient(135deg,#16a34a,#059669);color:#fff;font-size:16px;font-weight:700;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;line-height:1;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;cursor:pointer;box-shadow:0 6px 16px rgba(22,163,74,.3),inset 0 1px 0 rgba(255,255,255,.2);transition:all .2s cubic-bezier(.4,0,.2,1);border:2px solid rgba(255,255,255,.1);text-shadow:0 1px 2px rgba(0,0,0,.3);}.__veris_trigger_icon:hover{background:linear-gradient(135deg,#15803d,#047857);transform:scale(1.08) translateY(-1px);box-shadow:0 8px 20px rgba(22,163,74,.4),inset 0 1px 0 rgba(255,255,255,.25);}.__veris_trigger_icon:active{background:linear-gradient(135deg,#166534,#065f46);transform:scale(.95);box-shadow:0 4px 8px rgba(22,163,74,.2);} `;
  document.head.appendChild(style);
}

export function showTriggerIcon(rect, triggerClickHandler) {
  if (!state.extensionEnabled) return;
  clearTriggerIcon();
  const icon = document.createElement("div");
  icon.className = "__veris_trigger_icon";
  icon.title = "Translate selection";
  icon.textContent = ContentTemplates.triggerIcon();
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  icon.style.position = "absolute";
  const offsetX = 4;
  const offsetY = 6;
  icon.style.left = rect.right + scrollX - 14 + offsetX + "px";
  icon.style.top = rect.bottom + scrollY + offsetY + "px";
  icon.style.zIndex = 999999;
  icon.addEventListener("click", (e) => {
    e.stopPropagation();
    state.skipNextSelection = true;
    clearTriggerIcon();
    if (typeof triggerClickHandler === "function") triggerClickHandler();
  });
  document.body.appendChild(icon);
  state.triggerIconEl = icon;
}

export function clearTriggerIcon() {
  if (state.triggerIconTimer) {
    clearTimeout(state.triggerIconTimer);
    state.triggerIconTimer = null;
  }
  if (state.triggerIconEl) {
    state.triggerIconEl.remove();
    state.triggerIconEl = null;
  }
}

export function createBubbleAtRect(
  rect,
  sourceText,
  translatedText,
  isLoading = false,
  languageInfo = null
) {
  removeBubble();
  console.log({ rect });
  const bubble = document.createElement("div");
  bubble.className =
    "__translator_bubble" + (isLoading ? " __translator_loading" : "");
  bubble.id = "translate_bubble";

  // Use template for bubble content
  bubble.innerHTML = ContentTemplates.translationBubble(
    sourceText,
    translatedText,
    isLoading,
    languageInfo
  );

  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;

  const rectHasZero = [rect.left, rect.right, rect.top, rect.bottom].some(
    (v) => v === 0
  );

  // If any rect value is 0, position bubble under the browser extensions area (top-right)
  if (rectHasZero) {
    bubble.style.position = "absolute";
    bubble.style.left = "auto";
    bubble.style.right = "12px"; // small gap from right edge
    bubble.style.top = window.scrollY + 5 + "px"; // place slightly below top bar
  } else {
    const left = rect.left + scrollX;
    const top = rect.bottom + scrollY + 5;
    bubble.style.left = left + "px";
    bubble.style.top = top + "px";
  }

  document.body.appendChild(bubble);
  state.bubbleEl = bubble;

  const closeBtn = bubble.querySelector(".close-btn");
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    removeBubble();
  });

  const saveBtn = bubble.querySelector(".save-button-translate");
  saveBtn.addEventListener("click", (e) => {
    e.stopPropagation(); /* handler attached in words module */
  });

  const combinationBtn = bubble.querySelector(".combination-btn");
  combinationBtn.addEventListener("click", (e) => {
    e.stopPropagation(); /* handler in words module */
  });

  // word pills and event handlers are attached from the words module after bubble creation

  return bubble;
}

export function removeBubble() {
  if (state.bubbleEl) {
    state.bubbleEl.remove();
    state.bubbleEl = null;
    state.selectedWords.clear();
    state.combinationMode = false;
    state.selectedWordsForCombination.length = 0;
    state.tempTargetLang = null;
    state.tempSourceLang = null;
  }
}

export function openLanguageMenu(targetBadge, retranslateCallback) {
  closeLanguageMenu();
  const menu = document.createElement("div");
  menu.className = "__translator_lang_menu";
  menu.id = "lang_menu";
  const codes = buildLanguageList();
  const current = state.tempTargetLang || state.settings?.target_lang || "en";

  // Use template for language menu
  menu.innerHTML = ContentTemplates.languageMenu(codes, current);
  document.body.appendChild(menu);
  state.bubbleLangMenuEl = menu;
  const rect = targetBadge.getBoundingClientRect();
  menu.style.position = "absolute";
  menu.style.top = window.scrollY + rect.bottom + 6 + "px";
  menu.style.left = window.scrollX + rect.left + "px";
  menu.style.zIndex = 9999;
  menu.addEventListener("click", async (e) => {
    const item = e.target.closest(".__lang_menu_item");
    if (!item) return;
    const code = item.dataset.code;
    if (typeof retranslateCallback === "function")
      await retranslateCallback(code);
    closeLanguageMenu();
  });
  const search = menu.querySelector(".__lang_menu_search");
  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    menu.querySelectorAll(".__lang_menu_item").forEach((it) => {
      const code = it.dataset.code;
      const name = getFullLanguageName(code).toLowerCase();
      const short = getLanguageName(code).toLowerCase();
      it.style.display =
        !q || name.includes(q) || short.includes(q) ? "" : "none";
    });
  });
  setTimeout(() => {
    document.addEventListener("mousedown", handleOutsideMenuClick, {
      capture: true,
      once: true,
    });
  }, 0);
}

function handleOutsideMenuClick(e) {
  if (state.bubbleLangMenuEl && !state.bubbleLangMenuEl.contains(e.target))
    closeLanguageMenu();
}

export function closeLanguageMenu() {
  if (state.bubbleLangMenuEl) {
    state.bubbleLangMenuEl.remove();
    state.bubbleLangMenuEl = null;
  }
}

// Inject minimal menu styles
const existingStyle = document.getElementById("__translator_lang_menu_style");
if (!existingStyle) {
  const style = document.createElement("style");
  style.id = "__translator_lang_menu_style";
  style.textContent = `
  .__translator_lang_menu{background:#fff;border:1px solid #d1d5db;border-radius:8px;padding:8px 0;width:220px;box-shadow:0 8px 24px rgba(0,0,0,.15);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:12px;}
  .__translator_lang_menu .__lang_menu_header{padding:0 10px 6px;}
  .__translator_lang_menu .__lang_menu_search{width:100%;padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;}
  .__translator_lang_menu .__lang_menu_list{max-height:260px;overflow-y:auto;}
  .__translator_lang_menu .__lang_menu_item{padding:6px 10px;display:flex;gap:6px;cursor:pointer;align-items:center;}
  .__translator_lang_menu .__lang_menu_item .code{font-weight:600;color:#374151;min-width:32px;}
  .__translator_lang_menu .__lang_menu_item .name{color:#6b7280;flex:1;}
  .__translator_lang_menu .__lang_menu_item:hover{background:#f3f4f6;}
  .__translator_lang_menu .__lang_menu_item.active{background:#eef2ff;}
  `;
  document.head.appendChild(style);
}
