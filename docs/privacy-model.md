# Privacy Model

This document defines exactly what data PassForge sends over the network, what
stays on the client, and how the application degrades when offline.

## Core Principle

**Passwords never leave the browser.** All strength evaluation, feedback
generation, and hash computation happen locally in the user's browser. The only
network request PassForge ever makes is a k-anonymity prefix lookup against the
Have I Been Pwned (HIBP) API.

## What leaves the client

| Data                                                   | Destination              | When                         | Purpose                                                |
| ------------------------------------------------------ | ------------------------ | ---------------------------- | ------------------------------------------------------ |
| First 5 hex characters of a SHA-1 hash of the password | `api.pwnedpasswords.com` | User triggers a breach check | k-anonymity range lookup (HIBP Pwned Passwords API v3) |

That is the **complete** list. Nothing else is transmitted.

### What does NOT leave the client

- The full SHA-1 hash (only the first 5 of 40 hex characters are sent).
- The password itself, in any form.
- Strength scores, feedback text, or any analysis results.
- Any telemetry, analytics, or usage data.

## How the HIBP k-anonymity check works

1. The password is hashed locally using SHA-1.
2. The first 5 hex characters of the hash (the "prefix") are sent to
   `GET https://api.pwnedpasswords.com/range/{prefix}`.
3. The API returns all hash suffixes that match that prefix, along with breach
   counts.
4. PassForge checks locally whether the full hash appears in the returned list.
5. The API operator sees only a 5-character prefix, which maps to hundreds of
   possible hashes — they cannot determine which password was checked.

This is the same k-anonymity model used by 1Password, Firefox Monitor, and
other password-checking tools.

## User-Agent header

The CLAUDE.md prescribes setting a custom `User-Agent` string for all HTTP
requests. Browser `fetch()` does not allow setting the `User-Agent` header —
it is a [forbidden header name](https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name)
per the Fetch specification. This rail is therefore **documented as
not-applicable** rather than faked with a non-functional workaround. The
browser's default `User-Agent` is sent instead.

## Offline degradation

When the device is offline or the HIBP API is unreachable:

- **Strength evaluation**: fully functional (runs locally).
- **Feedback generation**: fully functional (runs locally).
- **Breach check**: gracefully unavailable. The UI will indicate that the
  breach check could not be performed and the user should try again later.
  No cached breach data is stored locally.

## No local storage of sensitive data

PassForge does not persist passwords, hashes, or analysis results to
`localStorage`, `sessionStorage`, `IndexedDB`, cookies, or any other browser
storage mechanism. All data exists only in memory for the duration of the
analysis and is discarded when the user navigates away or closes the tab.
