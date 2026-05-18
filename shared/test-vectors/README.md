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

## Structure

Each JSON file in this directory contains an array of test cases following
a consistent schema. See `strength.schema.json` for the canonical format.

## Adding Vectors

1. Add cases to the appropriate JSON file (or create a new one with a matching schema).
2. Run both the TS and Python test suites to confirm they agree.
3. Never include real passwords — use synthetic examples only.
