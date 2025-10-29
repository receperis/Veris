// options.js — save and restore settings

import "./options.css";
import { TemplateUtils } from "../templates/template-utils.js";
// Import shared utilities and constants
import {
  getSettings,
  saveSettings,
  DEFAULT_SETTINGS,
} from "../shared/storage.js";

// Use shared default settings
const defaultSettings = DEFAULT_SETTINGS;

function qs(id) {
  return document.getElementById(id);
}

function saveStatus(msg, success = true) {
  const status = qs("status");
  status.textContent = msg;
  status.style.color = success ? "#0a0" : "#a00";
  setTimeout(() => (status.textContent = ""), 3000);
}

async function saveOptions() {
  const target_lang = qs("target_lang").value;
  const bubbleMode =
    document.querySelector('input[name="bubble_mode"]:checked')?.value ||
    "auto";
  const bubbleIconDelay = parseInt(qs("bubble_icon_delay").value) || 450;
  const bubbleHotkey = qs("bubble_hotkey").value.trim();

  if (!target_lang) {
    saveStatus("Please select a target language", false);
    return;
  }

  // Get exercise settings
  const exerciseEnabled = qs("exercise_enabled").checked;
  const exerciseTime = qs("exercise_time").value;
  const exerciseDays = Array.from(
    document.querySelectorAll(".day-checkbox:checked")
  ).map((cb) => parseInt(cb.value));
  const difficulty = qs("difficulty").value;
  const questionsPerSession = parseInt(qs("questions_per_session").value);

  if (exerciseEnabled && exerciseDays.length === 0) {
    saveStatus("Please select at least one exercise day", false);
    return;
  }

  try {
    const success = await saveSettings({
      target_lang,
      bubbleMode,
      bubbleIconDelay,
      bubbleHotkey,
      exerciseSettings: {
        enabled: exerciseEnabled,
        time: exerciseTime,
        days: exerciseDays,
        difficulty: difficulty,
        questionsPerSession: questionsPerSession,
      },
    });

    if (success) {
      // Notify background script to update alarms
      chrome.runtime.sendMessage({ type: "UPDATE_EXERCISE_SETTINGS" });
      saveStatus("Settings saved successfully!");
    } else {
      saveStatus("Failed to save settings", false);
    }
  } catch (err) {
    console.error("Error saving settings:", err);
    saveStatus("Error saving settings: " + err.message, false);
  }
}

async function restoreOptions() {
  try {
    const settings = await getSettings(defaultSettings);

    // Restore translation settings
    qs("target_lang").value = settings.target_lang;
    // Bubble trigger
    const mode = settings.bubbleMode || defaultSettings.bubbleMode;
    const radio = document.querySelector(
      `input[name="bubble_mode"][value="${mode}"]`
    );
    if (radio) radio.checked = true;
    else qs("bubble_mode_auto").checked = true;
    qs("bubble_icon_delay").value = (
      settings.bubbleIconDelay ?? defaultSettings.bubbleIconDelay
    ).toString();
    qs("bubble_hotkey").value = settings.bubbleHotkey || "";

    // Restore exercise settings
    const exerciseSettings =
      settings.exerciseSettings || defaultSettings.exerciseSettings;

    qs("exercise_enabled").checked = exerciseSettings.enabled;
    qs("exercise_time").value = exerciseSettings.time;
    qs("difficulty").value = exerciseSettings.difficulty;
    qs("questions_per_session").value =
      exerciseSettings.questionsPerSession.toString();

    // Restore exercise days
    document.querySelectorAll(".day-checkbox").forEach((cb) => {
      cb.checked = exerciseSettings.days.includes(parseInt(cb.value));
    });

    // Update UI state
    updateExerciseOptionsVisibility();
  } catch (err) {
    console.error("Error loading settings:", err);
    // Use defaults if loading fails
    qs("target_lang").value = defaultSettings.target_lang;
    restoreExerciseDefaults();
  }
}

function restoreExerciseDefaults() {
  const exerciseSettings = defaultSettings.exerciseSettings;

  qs("exercise_enabled").checked = exerciseSettings.enabled;
  qs("exercise_time").value = exerciseSettings.time;
  qs("difficulty").value = exerciseSettings.difficulty;
  qs("questions_per_session").value =
    exerciseSettings.questionsPerSession.toString();

  document.querySelectorAll(".day-checkbox").forEach((cb) => {
    cb.checked = exerciseSettings.days.includes(parseInt(cb.value));
  });

  updateExerciseOptionsVisibility();
}

function resetToDefaults() {
  qs("target_lang").value = defaultSettings.target_lang;
  qs("bubble_mode_auto").checked = true;
  qs("bubble_icon_delay").value = defaultSettings.bubbleIconDelay;
  qs("bubble_hotkey").value = "";
  restoreExerciseDefaults();
  saveStatus("Reset to defaults. Click Save to apply.");
}

function updateExerciseOptionsVisibility() {
  const exerciseOptions = qs("exercise_options");
  const exerciseEnabled = qs("exercise_enabled").checked;

  if (exerciseEnabled) {
    exerciseOptions.classList.remove("disabled");
  } else {
    exerciseOptions.classList.add("disabled");
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", restoreOptions);
qs("saveBtn").addEventListener("click", saveOptions);
qs("resetBtn").addEventListener("click", resetToDefaults);

// Exercise enabled checkbox listener
qs("exercise_enabled").addEventListener(
  "change",
  updateExerciseOptionsVisibility
);

// Save on Enter key
let isRecordingHotkey = false;
let sequenceKeys = [];
let sequenceTimer = null;
const sequenceTimeout = 1200; // ms to finish sequence
const recordBtn = document.getElementById("bubble_record_hotkey");
const hotkeyInput = document.getElementById("bubble_hotkey");
const hotkeyHint = document.getElementById("bubble_hotkey_hint");

function resetSequenceTimer() {
  if (sequenceTimer) {
    clearTimeout(sequenceTimer);
  }
  sequenceTimer = setTimeout(() => finishSequenceCapture(), sequenceTimeout);
}

function finishSequenceCapture() {
  if (!isRecordingHotkey) return;
  if (sequenceKeys.length) {
    const combo = sequenceKeys.join("+");
    hotkeyInput.value = combo;
    hotkeyHint.textContent = "Captured: " + combo + " (Click Save to apply)";
  } else {
    hotkeyHint.textContent = "No hotkey captured.";
  }
  isRecordingHotkey = false;
  recordBtn.textContent = "Record";
  sequenceKeys = [];
  setTimeout(() => {
    if (!isRecordingHotkey)
      hotkeyHint.textContent = "Leave blank to use double Ctrl+C.";
  }, 3500);
}

function formatKey(e) {
  let key = e.key;
  if (!key) return null;
  if (key === " ") key = "Space";
  if (key === "Meta") return null; // ignore solo meta
  if (key === "Dead") return null;
  if (key.startsWith("Arrow")) key = key.replace("Arrow", "");
  if (key.length === 1) key = key.toLowerCase();
  return key.toLowerCase();
}

function buildDisplay(parts) {
  // Distinguish modifiers (only apply to first real key or whole sequence uniformly)
  return parts
    .map((p) =>
      p.length === 1
        ? p.toUpperCase()
        : /^(ctrl|shift|alt|meta)$/i.test(p)
        ? p[0].toUpperCase() + p.slice(1).toLowerCase()
        : p
    )
    .join("+");
}

function startHotkeyRecording() {
  if (isRecordingHotkey) {
    isRecordingHotkey = false;
    sequenceKeys = [];
    recordBtn.textContent = "Record";
    hotkeyHint.textContent = "Recording cancelled.";
    setTimeout(() => {
      if (!isRecordingHotkey)
        hotkeyHint.textContent = "Leave blank to use double Ctrl+C.";
    }, 1500);
    return;
  }
  isRecordingHotkey = true;
  sequenceKeys = [];
  recordBtn.textContent = "Finish";
  hotkeyHint.textContent =
    "Press keys in order (Esc to cancel, Enter to finish)";
  hotkeyInput.focus();
  hotkeyInput.select();
  resetSequenceTimer();
}

recordBtn.addEventListener("click", startHotkeyRecording);

document.addEventListener("keydown", (e) => {
  if (isRecordingHotkey) {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      isRecordingHotkey = false;
      sequenceKeys = [];
      recordBtn.textContent = "Record";
      hotkeyHint.textContent = "Recording cancelled.";
      setTimeout(() => {
        if (!isRecordingHotkey)
          hotkeyHint.textContent = "Leave blank to use double Ctrl+C.";
      }, 1500);
      return;
    }
    if (e.key === "Enter") {
      finishSequenceCapture();
      return;
    }
    // Build current modifier prefix once (only applied to sequence if first key)
    if (sequenceKeys.length === 0) {
      const mods = [];
      if (e.ctrlKey) mods.push("ctrl");
      if (e.shiftKey) mods.push("shift");
      if (e.altKey) mods.push("alt");
      if (e.metaKey) mods.push("meta");
      mods.forEach((m) => sequenceKeys.push(m));
    }
    const k = formatKey(e);
    if (!k) return; // ignore pure modifiers
    sequenceKeys.push(k);
    hotkeyHint.textContent = "Recording: " + buildDisplay(sequenceKeys);
    resetSequenceTimer();
    return;
  }
  if (e.key === "Enter") saveOptions();
});
