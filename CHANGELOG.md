# Changelog

## Phase 0 — Project Scaffold

pnpm workspace monorepo with `packages/core`, `apps/web`, `shared/test-vectors`. TypeScript strict, ESLint, Prettier, Vitest with v8 coverage gate at 80%.

## Phase 1 & 2 — Strength Scoring + Feedback Engine

Integrated zxcvbn-ts for combinatorial password strength scoring. `evaluateStrength` returns score 0–4, crack-time estimates across four attack scenarios, and stable pattern identifiers. `generateFeedback` maps patterns to structured findings with severity levels and actionable text.

## Phase 3 — HIBP Breach Check

k-anonymity breach check via the HIBP Pwned Passwords API. SHA-1 hashing through Web Crypto (not node:crypto). Only the 5-character hash prefix is transmitted. Bounded retry with backoff, Add-Padding header, strict response parser. Safety fix: empty/garbage 200 responses return "unavailable" — never "safe."

## Phase 4 — UI/UX & Meaningful Design

Full React SPA with CSS custom-property design tokens. Honest strength meter (5 segments, score-driven). Crack-time from raw seconds across four scenarios. Three visually distinct breach states (breached/safe/unavailable). K-anonymity explainer with prefix/suffix visual. No sensitive storage. WCAG AA via axe-core audit. Nine behavioral + accessibility tests.

## Phase 5 — Hardening & Privacy Proof

Strict CSP (no unsafe-inline/unsafe-eval) via `_headers` + `<meta>` fallback. Security headers (HSTS, nosniff, no-referrer, COOP, CORP, X-Frame-Options). Input cap enforcement with visible truncation warning. Fuzz tests on the HIBP response parser (2,500+ iterations). Threat model documenting 11 threats with mitigations. Supply chain audit clean (vitest 3→4 to resolve vite advisories).

## Phase 6 — Packaging & CV Polish

README with privacy story, Mermaid architecture diagram, quickstart, and documentation links. MIT license. User manual. CHANGELOG. Reproducible build verification.
