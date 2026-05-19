# ADR 0001: Architecture — Web SPA Now, Python CLI Later

## Status

Accepted

## Date

2026-05-18

## Context

PassForge is a password-strength analyzer that needs to ship as a browser-based
SPA first (Architecture A) while keeping the door open for a Python CLI
(Architecture B) later. The existing `CLAUDE.md` in this repository was written
for a Python-first cybersecurity tooling workflow, so several of its conventions
need to be substituted or marked not-applicable for Phase 0.

## Decision

### Monorepo with workspaces

We use a **pnpm workspace monorepo** with the following layout:

| Path                   | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `packages/core/`       | Framework-agnostic TypeScript logic (strength, feedback, breach) |
| `apps/web/`            | Vite + React + TypeScript SPA                                    |
| `shared/test-vectors/` | Language-neutral JSON fixtures                                   |
| `apps/cli-py/`         | _(reserved, not created)_ — future Python CLI home               |

### B-readiness mechanism

Both the TS core and a future Python CLI will validate against the same
language-neutral JSON test vectors in `shared/test-vectors/`. Any behavioral
change must pass both implementations against the same expected outputs. This
is the contract that keeps the two architectures in sync.

### Tooling substitutions vs CLAUDE.md

The repository `CLAUDE.md` prescribes a Python-centric stack. The following
substitutions are made for the JavaScript/TypeScript SPA architecture:

| CLAUDE.md prescription       | Phase 0 substitution                         | Rationale                                                             |
| ---------------------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| `uv` for packages            | **pnpm** workspaces                          | `uv` is Python-only; pnpm is the JS equivalent with workspace support |
| `mypy --strict`              | **TypeScript strict mode**                   | Same role: static type checking with maximum strictness               |
| `ruff` lint + format         | **ESLint + Prettier**                        | Industry-standard TS/JS equivalents of ruff's dual role               |
| `pytest` + coverage gate 80% | **Vitest** + `@vitest/coverage-v8`, 80% gate | Same role: test runner with coverage threshold enforcement            |
| `pydantic` for models        | TypeScript interfaces                        | Structural typing via TS interfaces; no runtime validation needed yet |
| `typer`/`click` for CLI      | N/A this phase                               | No CLI in Architecture A                                              |
| `rich` for output            | N/A this phase                               | Browser renders output                                                |
| `httpx` over `requests`      | Browser `fetch`                              | Native browser API; no HTTP client library needed                     |
| `asyncio` for concurrency    | Native `Promise`/`async-await`               | Built into the language                                               |
| `structlog` for logging      | N/A this phase                               | No structured logging needed in a client-side SPA stub                |
| `Docker` for isolation       | N/A this phase                               | SPA is deployed as static files                                       |
| `Make` for workflows         | **pnpm scripts + GitHub Actions**            | JS-ecosystem equivalent                                               |

### CLAUDE.md safety rails — applicability

Several CLAUDE.md rails are designed for offensive/recon security tools that
interact with live targets. PassForge is a purely defensive, client-side
password analyzer. The following rails are **not applicable** and are replaced
by the project's privacy model (`docs/privacy-model.md`):

| Rail                        | Status                | Explanation                                                                                            |
| --------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| Scope file required         | **N/A**               | PassForge has no scan targets; it analyzes passwords locally                                           |
| Authorization flag required | **N/A**               | No authorization is needed to check your own password strength                                         |
| `robots.txt` respect        | **N/A**               | PassForge does not crawl websites                                                                      |
| Out-of-scope = hard stop    | **N/A**               | There is no "scope" concept for a password checker                                                     |
| Custom User-Agent string    | **Documented-as-N/A** | Browser `fetch` cannot set a custom `User-Agent` header; documented in privacy model rather than faked |
| Dry-run mode default        | **N/A**               | PassForge performs no destructive operations                                                           |

These rails are **replaced by** the privacy model, which documents exactly what
data leaves the client (only k-anonymity hash prefixes to the HIBP API) and
what stays local (everything else).

### Style enforcement decision

The CLAUDE.md response-style rules (terse 3–6 word sentences, no filler) are
**enforced during build/code work** but **relaxed for documentation files**
(README, ADRs, privacy model, code comments) and **git commit messages**, which
use normal clear prose and Conventional Commits format. This distinction exists
because documentation must be readable by people who have never seen the
CLAUDE.md, and commit messages must be self-explanatory in `git log`.

### Pattern names extension (Phase 2)

The feedback layer needs to know _why_ a password is weak (dictionary word,
keyboard walk, repeated characters, etc.) without depending on zxcvbn's
English warning/suggestion strings, which are localized, change between
versions, and differ across implementations.

zxcvbn's match-sequence exposes a `pattern` field on each match with stable
machine identifiers: `"dictionary"`, `"spatial"`, `"repeat"`, `"sequence"`,
`"regex"`, `"date"`, `"bruteforce"`, `"separator"`. These are structural
labels defined by the algorithm, not English text — they are consistent
across zxcvbn-ts, zxcvbn-python, and zxcvbn-rs.

In Phase 2 the `StrengthResult` type was extended with a `patterns: MatchPattern[]`
field containing the deduplicated set of pattern names found in the password.
The feedback layer maps these to its own `FindingCode` enum (e.g.
`"dictionary"` → `DICTIONARY_WORD`, `"spatial"` → `KEYBOARD_PATTERN`) and
produces structured `Finding` objects with our own action wording, never
passing through or branching on zxcvbn's English strings.

**Derivation source: optimal sequence.** The `patterns` array is extracted from
`result.sequence` — zxcvbn's optimal (minimum-guesses) match decomposition —
not from all candidate matches. All-matches are not exposed by zxcvbn's public
API. This means a token like "qwerty" may be classified as `"dictionary"` or
`"spatial"` depending on which implementation's scoring algorithm considers
optimal. Cross-implementation test vectors therefore only assert pattern-derived
codes when the optimal-sequence classification is unambiguous (e.g. `DATE_PATTERN`
for `"01/01/2000"`) and rely on our own checks (length, character classes) for
implementation-variable cases like keyboard walks.

### Runtime validation at the HIBP boundary (Phase 3)

The CLAUDE.md tooling substitutions table notes that TypeScript interfaces
provide structural typing but no runtime validation. For internal data flowing
between `strength/` → `feedback/` this is acceptable — both sides are our code
and type-checked at build time.

The HIBP API response, however, is **untrusted external input** — the only
system boundary where runtime validation is mandatory. In Phase 3, the breach
module implements strict line-by-line validation of the HIBP response body:
each line must match `/^[0-9A-F]{35}:\d+$/` or it is silently skipped. This
is the deferred runtime-validation boundary noted in the original `pydantic`
substitution row: validation is now in place exactly where it is needed.

## Consequences

- Phase 0 produces a buildable, type-safe skeleton with all gates passing.
- Adding Architecture B later means creating `apps/cli-py/` with its own
  `pyproject.toml` and importing the shared test vectors — no restructuring
  of the existing code is required.
- All tooling substitutions are documented here so future contributors
  understand why the JS toolchain differs from the CLAUDE.md defaults.
