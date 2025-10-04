/**
 * Simple test to verify Jest is working
 */

describe("Basic Test Suite", () => {
  test("should perform basic arithmetic", () => {
    expect(1 + 1).toBe(2);
    expect(2 * 3).toBe(6);
    expect(10 / 2).toBe(5);
  });

  test("should handle arrays", () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  test("should handle objects", () => {
    const obj = { name: "test", value: 42 };
    expect(obj).toHaveProperty("name");
    expect(obj.value).toBe(42);
  });

  test("should handle async operations", async () => {
    const promise = Promise.resolve("success");
    const result = await promise;
    expect(result).toBe("success");
  });

  test("should handle Chrome mock", () => {
    expect(chrome).toBeDefined();
    expect(chrome.storage).toBeDefined();
    expect(chrome.runtime).toBeDefined();
  });
});
