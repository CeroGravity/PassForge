import type { StrengthResult, MatchPattern } from "../strength/index.js";

/**
 * Severity levels per CLAUDE.md output standards: info, low, med, high, crit.
 */
export type Severity = "info" | "low" | "med" | "high" | "crit";

/**
 * Stable finding codes WE define. These are the cross-implementation contract —
 * they never depend on zxcvbn's English text.
 */
export type FindingCode =
  | "TOO_SHORT"
  | "NO_UPPER"
  | "NO_LOWER"
  | "NO_DIGIT"
  | "NO_SYMBOL"
  | "KEYBOARD_PATTERN"
  | "REPEAT_PATTERN"
  | "SEQUENCE_PATTERN"
  | "DATE_PATTERN"
  | "DICTIONARY_WORD"
  | "LOW_GUESSES";

/**
 * A single actionable finding. `code` and `severity` are the stable
 * cross-implementation contract (asserted by test vectors). `action` is
 * our concise imperative wording — it may evolve and is NOT asserted
 * by cross-implementation vectors.
 */
export interface Finding {
  code: FindingCode;
  severity: Severity;
  action: string;
}

/**
 * Minimum password length before we emit TOO_SHORT.
 * 8 is the OWASP ASVS L1 minimum and the most widely adopted floor.
 */
const MIN_LENGTH = 8;

/** Score → overall severity mapping (score 0 most severe, score 4 info). */
const SCORE_SEVERITY: Record<0 | 1 | 2 | 3 | 4, Severity> = {
  0: "crit",
  1: "high",
  2: "med",
  3: "low",
  4: "info",
};

function scoreSeverity(score: 0 | 1 | 2 | 3 | 4): Severity {
  return SCORE_SEVERITY[score];
}

/** Count distinct character classes present in the password. */
function characterClasses(password: string): {
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
} {
  let hasUpper = false;
  let hasLower = false;
  let hasDigit = false;
  let hasSymbol = false;

  for (const ch of password) {
    if (/[A-Z]/.test(ch)) hasUpper = true;
    else if (/[a-z]/.test(ch)) hasLower = true;
    else if (/[0-9]/.test(ch)) hasDigit = true;
    else hasSymbol = true;
  }

  return { hasUpper, hasLower, hasDigit, hasSymbol };
}

/** Map from stable zxcvbn pattern names to our finding codes. */
const PATTERN_FINDINGS: ReadonlyMap<
  MatchPattern,
  { code: FindingCode; action: string }
> = new Map([
  [
    "dictionary",
    { code: "DICTIONARY_WORD", action: "Avoid common words or names." },
  ],
  [
    "spatial",
    {
      code: "KEYBOARD_PATTERN",
      action: "Avoid keyboard walks like qwerty or zxcvbn.",
    },
  ],
  [
    "repeat",
    {
      code: "REPEAT_PATTERN",
      action: "Avoid repeated characters or groups.",
    },
  ],
  [
    "sequence",
    {
      code: "SEQUENCE_PATTERN",
      action: "Avoid sequential characters like abc or 123.",
    },
  ],
  [
    "date",
    { code: "DATE_PATTERN", action: "Avoid dates — they are easy to guess." },
  ],
]);

/**
 * Derive actionable, structured findings from a strength result.
 *
 * Signals used (all stable/portable — no zxcvbn English strings):
 * - score (0–4)
 * - password length vs MIN_LENGTH
 * - character-class coverage (upper, lower, digit, symbol)
 * - zxcvbn match-sequence pattern names (stable cross-impl identifiers)
 *
 * Returns findings ordered most-severe first, then by code for determinism.
 */
export function generateFeedback(
  password: string,
  strength: StrengthResult,
): Finding[] {
  const findings: Finding[] = [];
  const sev = scoreSeverity(strength.score);

  // Score 4 with no detected weakness → no findings
  if (strength.score === 4) {
    return [];
  }

  // Length check — our own computation, independent of zxcvbn
  if (password.length < MIN_LENGTH) {
    findings.push({
      code: "TOO_SHORT",
      severity: sev,
      action: `Use at least ${MIN_LENGTH} characters.`,
    });
  }

  // Character-class variety — our own computation
  const classes = characterClasses(password);

  if (!classes.hasUpper) {
    findings.push({
      code: "NO_UPPER",
      severity: sev,
      action: "Add uppercase letters.",
    });
  }
  if (!classes.hasLower) {
    findings.push({
      code: "NO_LOWER",
      severity: sev,
      action: "Add lowercase letters.",
    });
  }
  if (!classes.hasDigit) {
    findings.push({
      code: "NO_DIGIT",
      severity: sev,
      action: "Add digits.",
    });
  }
  if (!classes.hasSymbol) {
    findings.push({
      code: "NO_SYMBOL",
      severity: sev,
      action: "Add symbols like !@#$.",
    });
  }

  // Pattern-based findings from zxcvbn stable pattern names
  for (const pattern of strength.patterns) {
    const finding = PATTERN_FINDINGS.get(pattern);
    if (finding) {
      findings.push({ ...finding, severity: sev });
    }
  }

  // Invariant enforcement: score < 4 must always yield >= 1 finding.
  // If no specific check fired, emit LOW_GUESSES as an explicit fallback.
  if (findings.length === 0) {
    findings.push({
      code: "LOW_GUESSES",
      severity: sev,
      action: "Use a longer or more varied password.",
    });
  }

  // Sort: most severe first, then alphabetical by code for determinism
  const severityOrder: Record<Severity, number> = {
    crit: 0,
    high: 1,
    med: 2,
    low: 3,
    info: 4,
  };
  findings.sort(
    (a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] ||
      a.code.localeCompare(b.code),
  );

  return findings;
}
