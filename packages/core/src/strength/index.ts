import { zxcvbn } from "@zxcvbn-ts/core";
import { ensureOptionsLoaded } from "./options.js";

/**
 * Maximum password length accepted by the strength engine.
 *
 * Rationale:
 * - zxcvbn scoring cost grows super-linearly with input length; inputs beyond
 *   ~100 chars cause noticeable latency with no meaningful scoring benefit.
 * - The downstream HIBP k-anonymity check hashes the full input, so length is
 *   irrelevant there, but keeping a bound prevents abuse of the analysis path.
 * - 128 is a generous upper bound that covers any real-world passphrase while
 *   still capping worst-case computation.
 */
export const MAX_PASSWORD_LENGTH = 128;

/** Crack-time scenario names matching zxcvbn-ts output keys. */
export interface CrackTimesSeconds {
  onlineThrottling: number;
  onlineNoThrottling: number;
  offlineSlowHashing: number;
  offlineFastHashing: number;
}

/**
 * Stable zxcvbn match-sequence pattern identifiers.
 * These are cross-version/cross-implementation stable names, unlike
 * zxcvbn's English warning/suggestion strings. Used by the feedback
 * layer (Phase 2) to derive structured findings.
 */
export type MatchPattern =
  | "dictionary"
  | "spatial"
  | "repeat"
  | "sequence"
  | "regex"
  | "date"
  | "bruteforce"
  | "separator";

export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  guesses: number;
  crackTimesSeconds: CrackTimesSeconds;
  /**
   * Deduplicated set of stable zxcvbn match-sequence pattern names found
   * in the password. These are machine identifiers (e.g. "dictionary",
   * "spatial"), NOT English strings. See ADR 0001 §"Pattern names extension".
   */
  patterns: MatchPattern[];
  /** Raw zxcvbn feedback — Phase 2 owns transformation into actionable UI feedback. */
  rawFeedback: {
    warning: string | null;
    suggestions: string[];
  };
}

export function evaluateStrength(password: string): StrengthResult {
  if (typeof password !== "string") {
    throw new TypeError("password must be a string");
  }

  if (password.length === 0) {
    return {
      score: 0,
      guesses: 0,
      crackTimesSeconds: {
        onlineThrottling: 0,
        onlineNoThrottling: 0,
        offlineSlowHashing: 0,
        offlineFastHashing: 0,
      },
      patterns: [],
      rawFeedback: { warning: null, suggestions: [] },
    };
  }

  // Reject passwords exceeding the length cap. Truncation would silently
  // change the scored value, so we reject to fail loud per CLAUDE.md.
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new RangeError(
      `password exceeds maximum length of ${MAX_PASSWORD_LENGTH} characters`,
    );
  }

  ensureOptionsLoaded();

  const result = zxcvbn(password);

  const patterns = [
    ...new Set(result.sequence.map((m) => m.pattern)),
  ] as MatchPattern[];

  return {
    score: result.score as 0 | 1 | 2 | 3 | 4,
    guesses: result.guesses,
    patterns,
    crackTimesSeconds: {
      onlineThrottling: result.crackTimesSeconds.onlineThrottling100PerHour,
      onlineNoThrottling:
        result.crackTimesSeconds.onlineNoThrottling10PerSecond,
      offlineSlowHashing:
        result.crackTimesSeconds.offlineSlowHashing1e4PerSecond,
      offlineFastHashing:
        result.crackTimesSeconds.offlineFastHashing1e10PerSecond,
    },
    rawFeedback: {
      warning: result.feedback.warning || null,
      suggestions: result.feedback.suggestions ?? [],
    },
  };
}
