import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateStrength, MAX_PASSWORD_LENGTH } from "../strength/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// -- Tier helper matching the documented boundaries in shared/test-vectors/README.md --

type CrackTimeTier = "t0" | "t1" | "t2" | "t3" | "t4" | "t5";

function toTier(offlineSlowSeconds: number): CrackTimeTier {
  if (offlineSlowSeconds < 1) return "t0";
  if (offlineSlowSeconds < 100) return "t1";
  if (offlineSlowSeconds < 10_000) return "t2";
  if (offlineSlowSeconds < 1_000_000) return "t3";
  if (offlineSlowSeconds < 100_000_000) return "t4";
  return "t5";
}

// -- Load shared test vectors --

interface TestVector {
  description: string;
  input: { password: string };
  expected: { score: number; crackTimeTier: CrackTimeTier };
}

const vectorsPath = resolve(
  __dirname,
  "../../../../shared/test-vectors/strength.json",
);
const vectors: TestVector[] = JSON.parse(
  readFileSync(vectorsPath, "utf-8"),
) as TestVector[];

// -- Vector-driven tests --

describe("strength vectors", () => {
  for (const v of vectors) {
    it(v.description, () => {
      const result = evaluateStrength(v.input.password);
      expect(result.score).toBe(v.expected.score);
      const tier = toTier(result.crackTimesSeconds.offlineSlowHashing);
      expect(tier).toBe(v.expected.crackTimeTier);
    });
  }
});

// -- Edge case tests --

describe("strength edge cases", () => {
  it("empty string returns score 0 with zero crack times", () => {
    const result = evaluateStrength("");
    expect(result.score).toBe(0);
    expect(result.guesses).toBe(0);
    expect(result.crackTimesSeconds.onlineThrottling).toBe(0);
    expect(result.crackTimesSeconds.offlineFastHashing).toBe(0);
  });

  it("whitespace-only returns score 0", () => {
    const result = evaluateStrength("   ");
    expect(result.score).toBe(0);
  });

  it("password at max length is accepted", () => {
    const atMax = "a".repeat(MAX_PASSWORD_LENGTH);
    expect(() => evaluateStrength(atMax)).not.toThrow();
  });

  it("password over max length throws RangeError", () => {
    const overMax = "a".repeat(MAX_PASSWORD_LENGTH + 1);
    expect(() => evaluateStrength(overMax)).toThrow(RangeError);
    expect(() => evaluateStrength(overMax)).toThrow(
      `password exceeds maximum length of ${MAX_PASSWORD_LENGTH} characters`,
    );
  });

  it("returns all four crack-time scenarios as numbers", () => {
    const result = evaluateStrength("test123");
    expect(typeof result.crackTimesSeconds.onlineThrottling).toBe("number");
    expect(typeof result.crackTimesSeconds.onlineNoThrottling).toBe("number");
    expect(typeof result.crackTimesSeconds.offlineSlowHashing).toBe("number");
    expect(typeof result.crackTimesSeconds.offlineFastHashing).toBe("number");
  });

  it("guesses is a positive number for non-empty input", () => {
    const result = evaluateStrength("hello");
    expect(result.guesses).toBeGreaterThan(0);
  });

  it("rawFeedback has warning and suggestions fields", () => {
    const result = evaluateStrength("password");
    expect(result.rawFeedback).toHaveProperty("warning");
    expect(result.rawFeedback).toHaveProperty("suggestions");
    expect(Array.isArray(result.rawFeedback.suggestions)).toBe(true);
  });

  it("unicode input is scored without throwing", () => {
    const result = evaluateStrength("日本語パスワード安全");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(4);
  });

  it("non-string argument throws TypeError", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => evaluateStrength(123 as any)).toThrow(TypeError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => evaluateStrength(null as any)).toThrow(TypeError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => evaluateStrength(undefined as any)).toThrow(TypeError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => evaluateStrength(123 as any)).toThrow(
      "password must be a string",
    );
  });
});
