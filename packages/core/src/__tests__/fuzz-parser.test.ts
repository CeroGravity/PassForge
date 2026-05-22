import { describe, it, expect } from "vitest";
import { parseHibpResponse } from "../breach/index.js";

const SUFFIX_LINE_RE = /^[0-9A-F]{35}:\d+$/;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomHexSuffix(): string {
  const chars = "0123456789ABCDEF";
  let s = "";
  for (let i = 0; i < 35; i++) s += chars[randomInt(0, 15)];
  return s;
}

function randomBytes(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(randomInt(0, 255));
  return s;
}

function randomUnicode(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCodePoint(randomInt(0, 0xffff));
  return s;
}

type LineKind =
  | "valid"
  | "near-valid"
  | "garbage"
  | "empty"
  | "oversized"
  | "unicode";

function generateLine(kind: LineKind): string {
  switch (kind) {
    case "valid":
      return `${randomHexSuffix()}:${randomInt(1, 99999)}`;
    case "near-valid": {
      const idx = randomInt(0, 7);
      if (idx === 0) return `${randomHexSuffix()}:`;
      if (idx === 1) return `${randomHexSuffix()}:-1`;
      if (idx === 2) return `${randomHexSuffix().slice(0, 30)}:100`;
      if (idx === 3) return `${randomHexSuffix().toLowerCase()}:100`;
      if (idx === 4) return `:${randomInt(1, 100)}`;
      if (idx === 5) return `${randomHexSuffix()}:${randomInt(1, 100)} `;
      if (idx === 6) return ` ${randomHexSuffix()}:${randomInt(1, 100)}`;
      return `${randomHexSuffix()}:0x${randomInt(1, 100).toString(16)}`;
    }
    case "garbage":
      return randomBytes(randomInt(0, 200));
    case "empty":
      return "";
    case "oversized":
      return randomBytes(randomInt(500, 2000));
    case "unicode":
      return randomUnicode(randomInt(10, 100));
  }
}

function generateBody(): { body: string; expectedValidLines: number } {
  const lineCount = randomInt(0, 50);
  const kinds: LineKind[] = [
    "valid",
    "near-valid",
    "garbage",
    "empty",
    "oversized",
    "unicode",
  ];
  const lines: string[] = [];
  let expectedValidLines = 0;

  for (let i = 0; i < lineCount; i++) {
    const kind: LineKind = kinds[randomInt(0, kinds.length - 1)] as LineKind;
    const line = generateLine(kind);
    lines.push(line);
    if (SUFFIX_LINE_RE.test(line)) expectedValidLines++;
  }

  const separators = ["\n", "\r\n"];
  const sep = separators[randomInt(0, 1)];
  return { body: lines.join(sep), expectedValidLines };
}

const ITERATIONS = 2500;

describe("parseHibpResponse fuzz", () => {
  it(`never throws across ${ITERATIONS} random inputs`, () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const { body } = generateBody();
      const suffix = randomHexSuffix();
      expect(() => parseHibpResponse(body, suffix)).not.toThrow();
    }
  });

  it(`validLines matches regex-valid line count across ${ITERATIONS} inputs`, () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const { body, expectedValidLines } = generateBody();
      const suffix = randomHexSuffix();
      const result = parseHibpResponse(body, suffix);

      expect(result.validLines).toBeLessThanOrEqual(expectedValidLines);

      if (result.count > 0) {
        expect(result.validLines).toBeGreaterThan(0);
      }
    }
  });

  it(`count is 0 unless suffix actually appears in input across ${ITERATIONS} inputs`, () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const { body } = generateBody();
      const suffix = randomHexSuffix();
      const result = parseHibpResponse(body, suffix);

      if (result.count > 0) {
        const lines = body.split(/\n/).map((l) => l.replace(/\r$/, ""));
        const found = lines.some((l) => {
          const colonIdx = l.indexOf(":");
          return colonIdx >= 0 && l.slice(0, colonIdx) === suffix;
        });
        expect(found).toBe(true);
      }
    }
  });

  it("handles targeted edge cases without throwing", () => {
    const edgeCases = [
      "",
      "\n",
      "\r\n",
      "\n\n\n",
      "\r\n\r\n",
      "::::",
      "\0".repeat(100),
      "A".repeat(10000),
      `${"F".repeat(35)}:1`,
      `${"0".repeat(35)}:0`,
      `${"0".repeat(35)}:999999999999999`,
      `${"G".repeat(35)}:1`,
      `${"f".repeat(35)}:1`,
      "﻿" + `${"A".repeat(35)}:1`,
      Array.from(
        { length: 100 },
        () => `${randomHexSuffix()}:${randomInt(1, 999)}`,
      ).join("\r\n"),
    ];

    for (const body of edgeCases) {
      expect(() => parseHibpResponse(body, "A".repeat(35))).not.toThrow();
    }
  });
});
