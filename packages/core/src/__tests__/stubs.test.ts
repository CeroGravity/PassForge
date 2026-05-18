import { describe, it, expect } from "vitest";
import { generateFeedback, checkBreach } from "../index.js";

describe("feedback stub", () => {
  it("returns empty feedback", () => {
    const result = generateFeedback("test");
    expect(result.warning).toBeNull();
    expect(result.suggestions).toEqual([]);
  });
});

describe("breach stub", () => {
  it("returns no breach", async () => {
    const result = await checkBreach("test");
    expect(result.breached).toBe(false);
    expect(result.count).toBe(0);
  });
});
