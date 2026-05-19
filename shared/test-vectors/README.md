# Test Vectors

Language-neutral JSON test fixtures shared between implementations.

## Purpose

Both the TypeScript core (`packages/core`) and a future Python CLI (`apps/cli-py`)
validate against these same vectors. This is the mechanism that keeps the two
architectures (A: web SPA, B: Python CLI) in sync — any behavioral change must
pass both implementations against the same expected outputs.

## Why no exact `guesses` or raw `crackTimesSeconds`

Different zxcvbn implementations (TypeScript, Python, Rust) may produce
slightly different `guesses` estimates due to internal dictionary ordering,
floating-point handling, or version drift. Asserting exact numeric values
would create brittle cross-language tests that break on patch upgrades without
indicating a real behavioral difference.

Instead, vectors assert only **portable, stable properties**:

1. **`score` (0–4)** — the coarse strength tier. All conforming zxcvbn
   implementations agree on the score-to-guesses thresholds (< 10^3, < 10^6,
   < 10^8, < 10^10, ≥ 10^10), so the same password should produce the same
   score across implementations.

2. **`crackTimeTier`** — a neutral magnitude tier derived from the
   `offlineSlowHashing` crack-time scenario (1e4 guesses/second). Boundaries
   are aligned to powers of 10^2 so that every zxcvbn brute-force value
   (which produces exact 10^N seconds) lands with ≥ 10× margin from both
   boundaries:

   | Tier | Seconds range                 | Approx real time      |
   | ---- | ----------------------------- | --------------------- |
   | `t0` | < 1                           | sub-second            |
   | `t1` | ≥ 1 and < 100                 | 1 s – 1.7 min         |
   | `t2` | ≥ 100 and < 10,000            | 1.7 min – 2.8 hours   |
   | `t3` | ≥ 10,000 and < 1,000,000      | 2.8 hours – 11.6 days |
   | `t4` | ≥ 1,000,000 and < 100,000,000 | 11.6 days – 3.2 years |
   | `t5` | ≥ 100,000,000                 | 3.2+ years            |

   Tier names are deliberately neutral (`t0`–`t5`), not time words. These
   tiers exist **only** as a drift-proof cross-implementation test token;
   user-facing crack-time wording is produced in Phase 4 directly from
   raw `crackTimesSeconds`, never from these tiers.

   The 10^(2k) alignment is intentional: zxcvbn's brute-force model produces
   `guesses / 1e4` as the offline-slow-hashing seconds, which for random
   strings is always a power of 10. Using 10^(2k) boundaries guarantees
   every such value sits at the geometric center of its tier, making vectors
   robust against minor cross-implementation numeric drift.

## Feedback vectors — codes and severity only

`feedback.json` vectors assert the **structured output** of the feedback layer:
which `FindingCode` values must be present and what overall `severity` the score
maps to. They deliberately do **not** assert the `action` message text, because:

- Action wording is a UX concern that may be refined, A/B tested, or localized
  without changing the underlying detection logic.
- A future Python CLI will produce its own phrasing for the same codes.
- Asserting exact strings would make every wording tweak a cross-implementation
  breaking change, the same brittleness lesson learned with raw zxcvbn strings
  in Phase 1.

The contract is: given a password, the implementation must emit at least the
listed codes at the listed severity. It may emit additional codes (e.g. extra
character-class findings) — vectors use `codesPresent` (subset check), not an
exact match.

### Pattern derivation — optimal sequence only

The `patterns` field on `StrengthResult` is extracted from zxcvbn's **optimal
match sequence** (`result.sequence`), not from all candidate matches. The
optimal sequence is the minimum-guesses decomposition that zxcvbn selects for
scoring; it covers the full password without overlapping tokens.

This means a password like `"qwerty"` may be classified as `"dictionary"` in
one implementation (if "qwerty" exists in the loaded dictionary with fewer
guesses than the spatial match) and `"spatial"` in another. Both are correct
analyses — the difference is in which decomposition the implementation's
scoring algorithm considers optimal.

**Consequence for vectors:** feedback vectors must only assert pattern-derived
codes (like `DICTIONARY_WORD`, `KEYBOARD_PATTERN`) when the optimal-sequence
classification is unambiguous — i.e., when no competing pattern type could
plausibly produce fewer guesses for that token. Codes derived from our own
checks (length, character-class coverage) are always safe to assert because
they do not depend on zxcvbn internals.

Examples:

- `"qwerty"` → vectors assert only `TOO_SHORT` (our own length check), not
  `DICTIONARY_WORD` or `KEYBOARD_PATTERN`, because the optimal-sequence
  pattern is implementation-variable for keyboard walks.
- `"01/01/2000"` → vectors assert `DATE_PATTERN` because the date matcher
  unambiguously covers the full token in separated `DD/MM/YYYY` form; no
  competing decomposition yields fewer guesses.
- `"aaaaaaaaaaaaaaaa"` → vectors assert `REPEAT_PATTERN` because no other
  matcher produces a lower-guess single-token match for 16 identical chars.

## Breach vectors — exact SHA-1 values

Unlike strength and feedback vectors, `breach.json` asserts **exact values**:
the full uppercase hex SHA-1 hash, the 5-character prefix, and the 35-character
suffix for each test password. This is the correct approach here because:

- SHA-1 is a standardized algorithm (FIPS 180-4) with deterministic, bit-exact
  output. Every conforming implementation — TypeScript's Web Crypto, Python's
  `hashlib`, Rust's `sha1` crate — produces identical hashes for identical input.
- There is no implementation-variable scoring or heuristic involved, unlike
  zxcvbn's strength estimation where internal dictionary ordering can cause
  cross-implementation drift.
- The exact prefix/suffix split is the load-bearing privacy contract: the
  prefix (and only the prefix) leaves the client. Asserting exact values in
  vectors ensures every implementation computes the same split and sends the
  same prefix to the HIBP API.

This means `breach.json` is the strictest cross-implementation contract in the
project: a Python CLI that computes a different SHA-1 for the same password has
a bug, not a drift tolerance issue.

## Structure

Each JSON file in this directory contains an array of test cases following
a consistent schema. See `strength.schema.json`, `feedback.schema.json`, and
`breach.schema.json` for the canonical formats.

## Adding Vectors

1. Add cases to the appropriate JSON file (or create a new one with a matching schema).
2. Run both the TS and Python test suites to confirm they agree.
3. Never include real passwords — use synthetic examples only.
