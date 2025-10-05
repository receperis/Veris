/**
 * Unit tests for Translation API
 * Tests the content script's translation functionality
 */

// Mock the Translator API
global.Translator = {
  create: jest.fn(),
};

// Import the API module
import { translateTextWithAPI } from "../../src/content/api.js";

describe("Translation API", () => {
  let mockTranslator;

  beforeEach(() => {
    mockTranslator = {
      translate: jest.fn(),
    };

    global.Translator.create.mockResolvedValue(mockTranslator);
    jest.clearAllMocks();
  });

  describe("translateTextWithAPI", () => {
    test("should translate text successfully", async () => {
      const inputText = "Hello world";
      const expectedTranslation = "Hola mundo";

      mockTranslator.translate.mockResolvedValue(expectedTranslation);

      const result = await translateTextWithAPI(inputText, "es", "en");

      expect(Translator.create).toHaveBeenCalledWith({
        sourceLanguage: "en",
        targetLanguage: "es",
      });
      expect(mockTranslator.translate).toHaveBeenCalledWith(inputText);
      expect(result).toBe(expectedTranslation);
    });

    test("should handle empty text gracefully", async () => {
      await expect(translateTextWithAPI("", "es", "en")).rejects.toThrow(
        "Empty text provided for translation"
      );

      expect(Translator.create).not.toHaveBeenCalled();
    });

    test("should handle whitespace-only text", async () => {
      await expect(
        translateTextWithAPI("   \n\t   ", "es", "en")
      ).rejects.toThrow("Empty text provided for translation");

      expect(Translator.create).not.toHaveBeenCalled();
    });

    test("should trim input text before translation", async () => {
      const inputText = "  Hello world  ";
      const trimmedText = "Hello world";
      const expectedTranslation = "Hola mundo";

      mockTranslator.translate.mockResolvedValue(expectedTranslation);

      await translateTextWithAPI(inputText, "es", "en");

      expect(mockTranslator.translate).toHaveBeenCalledWith(trimmedText);
    });

    test("should handle translator creation failure", async () => {
      Translator.create.mockRejectedValue(new Error("Translator unavailable"));

      await expect(translateTextWithAPI("test", "es", "en")).rejects.toThrow(
        "Translator unavailable"
      );
    });

    test("should handle translation failure", async () => {
      mockTranslator.translate.mockRejectedValue(
        new Error("Translation failed")
      );

      await expect(translateTextWithAPI("test", "es", "en")).rejects.toThrow(
        "Translation failed"
      );
    });

    test("should work with auto-detected source language", async () => {
      const result = await translateTextWithAPI("test", "es", "auto");

      expect(Translator.create).toHaveBeenCalledWith({
        sourceLanguage: "auto",
        targetLanguage: "es",
      });
    });

    test("should handle API unavailable scenario", async () => {
      // Simulate Translation API not being available
      delete global.Translator;

      await expect(translateTextWithAPI("test", "es", "en")).rejects.toThrow(
        "Built-in Translation API not available"
      );

      // Restore for other tests
      global.Translator = {
        create: jest.fn(),
      };
    });

    test("should validate language codes", async () => {
      const validCodes = ["en", "es", "fr", "de", "auto"];

      for (const code of validCodes) {
        expect(code).toBeValidLanguageCode();
      }

      expect("invalid").not.toBeValidLanguageCode();
    });

    test("should handle long text translation", async () => {
      const longText =
        "This is a very long text that needs to be translated. ".repeat(50);
      mockTranslator.translate.mockResolvedValue("Translated long text");

      const result = await translateTextWithAPI(longText, "es", "en");

      expect(mockTranslator.translate).toHaveBeenCalledWith(longText.trim());
      expect(result).toBe("Translated long text");
    });

    test("should handle special characters in text", async () => {
      const specialText = "Hello! How are you? 你好 🌟";
      const translatedText = "¡Hola! ¿Cómo estás? 你好 🌟";

      mockTranslator.translate.mockResolvedValue(translatedText);

      const result = await translateTextWithAPI(specialText, "es", "en");

      expect(result).toBe(translatedText);
    });

    test("should handle numeric and mixed content", async () => {
      const mixedText = "Price: $29.99 for 5 items";
      mockTranslator.translate.mockResolvedValue(
        "Precio: $29.99 por 5 artículos"
      );

      const result = await translateTextWithAPI(mixedText, "es", "en");

      expect(result).toBe("Precio: $29.99 por 5 artículos");
    });

    test("should handle null or undefined inputs appropriately", async () => {
      await expect(translateTextWithAPI(null, "es", "en")).rejects.toThrow();

      await expect(
        translateTextWithAPI(undefined, "es", "en")
      ).rejects.toThrow();
    });
  });

  describe("Error scenarios and edge cases", () => {
    test("should handle network timeout", async () => {
      const timeoutError = new Error("Network timeout");
      timeoutError.name = "TimeoutError";

      Translator.create.mockRejectedValue(timeoutError);

      await expect(translateTextWithAPI("test", "es", "en")).rejects.toThrow(
        "Network timeout"
      );
    });

    test("should handle quota exceeded error", async () => {
      const quotaError = new Error("Translation quota exceeded");
      mockTranslator.translate.mockRejectedValue(quotaError);

      await expect(translateTextWithAPI("test", "es", "en")).rejects.toThrow(
        "Translation quota exceeded"
      );
    });

    test("should handle unsupported language pair", async () => {
      const unsupportedError = new Error("Language pair not supported");
      Translator.create.mockRejectedValue(unsupportedError);

      await expect(
        translateTextWithAPI("test", "unsupported", "en")
      ).rejects.toThrow("Language pair not supported");
    });

    test("should handle malformed response", async () => {
      mockTranslator.translate.mockResolvedValue(null);

      const result = await translateTextWithAPI("test", "es", "en");
      expect(result).toBeNull();
    });

    test("should handle concurrent translations", async () => {
      const texts = ["hello", "world", "test"];
      const translations = ["hola", "mundo", "prueba"];

      mockTranslator.translate
        .mockResolvedValueOnce(translations[0])
        .mockResolvedValueOnce(translations[1])
        .mockResolvedValueOnce(translations[2]);

      const promises = texts.map((text) =>
        translateTextWithAPI(text, "es", "en")
      );

      const results = await Promise.all(promises);

      expect(results).toEqual(translations);
    });
  });

  describe("Performance and caching behavior", () => {
    test("should handle repeated translations of same text", async () => {
      const text = "repeated text";
      const translation = "texto repetido";

      mockTranslator.translate.mockResolvedValue(translation);

      // Translate the same text multiple times
      const results = await Promise.all([
        translateTextWithAPI(text, "es", "en"),
        translateTextWithAPI(text, "es", "en"),
        translateTextWithAPI(text, "es", "en"),
      ]);

      expect(results).toEqual([translation, translation, translation]);
      expect(Translator.create).toHaveBeenCalledTimes(3); // Each call creates new translator
    });

    test("should handle different language pairs efficiently", async () => {
      const text = "test";

      mockTranslator.translate
        .mockResolvedValueOnce("prueba") // Spanish
        .mockResolvedValueOnce("test") // French
        .mockResolvedValueOnce("Test"); // German

      await translateTextWithAPI(text, "es", "en");
      await translateTextWithAPI(text, "fr", "en");
      await translateTextWithAPI(text, "de", "en");

      expect(Translator.create).toHaveBeenCalledTimes(3);
      expect(Translator.create).toHaveBeenCalledWith({
        sourceLanguage: "en",
        targetLanguage: "es",
      });
      expect(Translator.create).toHaveBeenCalledWith({
        sourceLanguage: "en",
        targetLanguage: "fr",
      });
      expect(Translator.create).toHaveBeenCalledWith({
        sourceLanguage: "en",
        targetLanguage: "de",
      });
    });
  });
});
