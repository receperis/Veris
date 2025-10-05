import { state } from "./state.js";

export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function getLanguageName(langCode) {
  const languageNames = {
    auto: "Auto",
    en: "EN",
    es: "ES",
    fr: "FR",
    de: "DE",
    it: "IT",
    pt: "PT",
    ru: "RU",
    ja: "JA",
    ko: "KO",
    zh: "ZH",
    "zh-cn": "CN",
    "zh-tw": "TW",
    ar: "AR",
    hi: "HI",
    tr: "TR",
    nl: "NL",
    sv: "SV",
    da: "DA",
    no: "NO",
    fi: "FI",
    pl: "PL",
    cs: "CS",
    sk: "SK",
    hu: "HU",
    ro: "RO",
    bg: "BG",
    hr: "HR",
    sr: "SR",
    sl: "SL",
    et: "ET",
    lv: "LV",
    lt: "LT",
    uk: "UK",
    be: "BE",
    mk: "MK",
    mt: "MT",
    ca: "CA",
    eu: "EU",
    gl: "GL",
    is: "IS",
    sq: "SQ",
    el: "EL",
    he: "HE",
    fa: "FA",
    th: "TH",
    vi: "VI",
    id: "ID",
    ms: "MS",
    ur: "UR",
    bn: "BN",
    ta: "TA",
    te: "TE",
    ml: "ML",
    kn: "KN",
    gu: "GU",
    pa: "PA",
    ne: "NE",
    si: "SI",
    my: "MY",
    km: "KM",
    lo: "LO",
    ka: "KA",
    am: "AM",
    sw: "SW",
    af: "AF",
  };
  return languageNames[langCode] || langCode.toUpperCase().slice(0, 3);
}

export function getFullLanguageName(code) {
  const map = {
    auto: "Auto Detected",
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    "zh-cn": "Chinese (Simplified)",
    "zh-tw": "Chinese (Traditional)",
    ar: "Arabic",
    hi: "Hindi",
    tr: "Turkish",
    nl: "Dutch",
    sv: "Swedish",
    da: "Danish",
    no: "Norwegian",
    fi: "Finnish",
    pl: "Polish",
    cs: "Czech",
    sk: "Slovak",
    hu: "Hungarian",
    ro: "Romanian",
    bg: "Bulgarian",
    hr: "Croatian",
    uk: "Ukrainian",
    el: "Greek",
    he: "Hebrew",
    fa: "Persian",
    th: "Thai",
    vi: "Vietnamese",
    id: "Indonesian",
    ms: "Malay",
    ur: "Urdu",
    bn: "Bengali",
    ta: "Tamil",
    te: "Telugu",
    ml: "Malayalam",
    kn: "Kannada",
    gu: "Gujarati",
    pa: "Punjabi",
    ne: "Nepali",
    si: "Sinhala",
    my: "Burmese",
    km: "Khmer",
    lo: "Lao",
    ka: "Georgian",
    am: "Amharic",
    sw: "Swahili",
    af: "Afrikaans",
  };
  return map[code] || code.toUpperCase();
}

export function buildLanguageList() {
  return [
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "ru",
    "ja",
    "ko",
    "zh",
    "ar",
    "hi",
    "tr",
    "nl",
    "sv",
    "da",
    "no",
    "fi",
    "pl",
    "cs",
    "sk",
    "hu",
    "ro",
    "bg",
    "hr",
    "uk",
    "el",
    "he",
    "fa",
    "th",
    "vi",
    "id",
    "ms",
    "sw",
  ];
}

export function parseHotkeyString(str) {
  if (!str) return null;
  const tokens = str
    .split("+")
    .map((t) => t.trim())
    .filter(Boolean);
  const spec = { ctrl: false, shift: false, alt: false, meta: false, keys: [] };
  tokens.forEach((tok) => {
    const low = tok.toLowerCase();
    if (["ctrl", "control"].includes(low)) spec.ctrl = true;
    else if (low === "shift") spec.shift = true;
    else if (["alt", "option"].includes(low)) spec.alt = true;
    else if (["meta", "cmd", "command"].includes(low)) spec.meta = true;
    else spec.keys.push(tok.toLowerCase());
  });
  if (spec.keys.length === 0) return null;
  return spec;
}

export function hotkeyModifiersMatch(spec, e) {
  return (
    spec.ctrl === e.ctrlKey &&
    spec.shift === e.shiftKey &&
    spec.alt === e.altKey &&
    spec.meta === e.metaKey
  );
}

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
