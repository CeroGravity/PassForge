import { describe, it, expect } from "vitest";
import { evaluateStrength, generateFeedback, checkBreach } from "../index.js";

describe("strength stub", () => {
  it("returns placeholder score", () => {
    const result = evaluateStrength("test");
    expect(result.score).toBe(0);
    expect(result.crackTimeSeconds).toBe(0);
    expect(result.crackTimeDisplay).toBe("instant");
  });
});

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
