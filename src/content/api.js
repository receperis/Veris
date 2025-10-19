import { showInfoToast } from "./toast";

export async function translateTextWithAPI(text, targetLang, sourceLanguage) {
  if (targetLang === sourceLanguage) {
    showInfoToast("Target and source languages are the same"); // If the target language is the same as the source language, no translation is needed
    return text;
  }
  try {
    const cleanText = text.trim();
    if (!cleanText) throw new Error("Empty text provided for translation");
    if ("Translator" in self) {
      const translator = await Translator.create({
        sourceLanguage,
        targetLanguage: targetLang,
      });
      const result = await translator.translate(cleanText);
      return result;
    } else {
      throw new Error("Built-in Translation API not available");
    }
  } catch (err) {
    console.error("Translation error:", err);
    throw err;
  }
}
