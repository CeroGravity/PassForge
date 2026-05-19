import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateStrength } from "../strength/index.js";
import { generateFeedback } from "../feedback/index.js";
import type { Severity, FindingCode } from "../feedback/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// -- Load shared test vectors --

interface FeedbackVector {
  description: string;
  input: { password: string };
  expected: {
    minFindings: number;
    codesPresent: FindingCode[];
    severity: Severity;
  };
}

const vectorsPath = resolve(
  __dirname,
  "../../../../shared/test-vectors/feedback.json",
);
const vectors: FeedbackVector[] = JSON.parse(
  readFileSync(vectorsPath, "utf-8"),
) as FeedbackVector[];

// -- Vector-driven tests --

describe("feedback vectors", () => {
  for (const v of vectors) {
    it(v.description, () => {
      const strength = evaluateStrength(v.input.password);
      const findings = generateFeedback(v.input.password, strength);

      expect(findings.length).toBeGreaterThanOrEqual(v.expected.minFindings);

      const codes = findings.map((f) => f.code);
      for (const expectedCode of v.expected.codesPresent) {
        expect(codes).toContain(expectedCode);
      }

      // All findings should have the expected severity (derived from score)
      if (findings.length > 0) {
        for (const f of findings) {
          expect(f.severity).toBe(v.expected.severity);
        }
      }
    });
  }
});

// -- Invariant: every score < 4 yields >= 1 actionable finding --

describe("feedback invariant", () => {
  const samples: [string, number][] = [
    ["", 0],
    ["a", 0],
    ["password", 0],
    ["qwerty", 0],
    ["1234", 0],
    ["aaaaaaaaaaaaaaaa", 0],
    ["abcdef", 0],
    ["01/01/2000", 1],
    ["pJ5&wR3", 2],
    ["mxqpzrvbk", 3],
  ];

  for (const [pw, expectedScore] of samples) {
    it(`score ${expectedScore} password "${pw}" → >=1 finding`, () => {
      const strength = evaluateStrength(pw);
      expect(strength.score).toBe(expectedScore);
      const findings = generateFeedback(pw, strength);
      expect(findings.length).toBeGreaterThanOrEqual(1);
      // Every finding must have a concrete code (not generic)
      for (const f of findings) {
        expect(f.code).toBeTruthy();
        expect(f.action).toBeTruthy();
        expect(f.action).not.toContain("make it stronger");
      }
    });
  }

  it("score 4 → empty findings", () => {
    const strength = evaluateStrength("correct horse battery staple");
    expect(strength.score).toBe(4);
    const findings = generateFeedback("correct horse battery staple", strength);
    expect(findings).toEqual([]);
  });
});

// -- Ordering test --

describe("feedback ordering", () => {
  it("findings are sorted most-severe first, then by code", () => {
    const strength = evaluateStrength("password");
    const findings = generateFeedback("password", strength);
    expect(findings.length).toBeGreaterThan(0);

    // All same severity for a single score, so check alphabetical code order
    for (let i = 1; i < findings.length; i++) {
      const prev = findings[i - 1];
      const curr = findings[i];
      if (prev === undefined || curr === undefined) continue;
      if (prev.severity === curr.severity) {
        expect(prev.code.localeCompare(curr.code)).toBeLessThanOrEqual(0);
      }
    }
  });
});

// -- Fallback: LOW_GUESSES when no specific check fires --

describe("feedback fallback", () => {
  it("emits LOW_GUESSES for score < 4 with no other findings", () => {
    // Synthetic StrengthResult: score 3, all-class long password,
    // only bruteforce pattern (not mapped to any FindingCode).
    const synthetic = {
      score: 3 as const,
      guesses: 1e9,
      crackTimesSeconds: {
        onlineThrottling: 1e7,
        onlineNoThrottling: 1e8,
        offlineSlowHashing: 1e5,
        offlineFastHashing: 0.1,
      },
      patterns: ["bruteforce" as const],
      rawFeedback: { warning: null, suggestions: [] },
    };
    // Password passes all character-class and length checks
    const pw = "aB3$xY7!zW9@";
    const findings = generateFeedback(pw, synthetic);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe("LOW_GUESSES");
    expect(findings[0]?.severity).toBe("low");
    expect(findings[0]?.action).toBeTruthy();
    expect(findings[0]?.action).not.toContain("make it stronger");
  });
});

// -- No zxcvbn English passthrough --

describe("feedback purity", () => {
  it("action text is our own wording, not zxcvbn raw strings", () => {
    const strength = evaluateStrength("password");
    const findings = generateFeedback("password", strength);
    for (const f of findings) {
      // These are known zxcvbn English phrases that must NOT appear
      expect(f.action).not.toMatch(/top-10/i);
      expect(f.action).not.toMatch(/top-100/i);
      expect(f.action).not.toMatch(/This is a very common password/i);
      expect(f.action).not.toMatch(/Add another word or two/i);
    }
  });
});
