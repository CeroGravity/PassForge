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

1. The password is hashed locally using SHA-1 via Web Crypto
   (`globalThis.crypto.subtle.digest("SHA-1", ...)`). The hash is converted to
   40 uppercase hex characters.
2. The hash is split into a **prefix** (first 5 characters) and a **suffix**
   (remaining 35 characters). Only the prefix ever leaves the client.
3. A single GET request is sent:
   ```
   GET https://api.pwnedpasswords.com/range/{prefix}
   Headers: Add-Padding: true
   ```
4. The API returns all hash suffixes that match that prefix, along with breach
   counts, in the format `SUFFIX:COUNT` (one per line, CRLF-separated).
5. PassForge checks locally whether the suffix appears in the returned list.
   If found, the associated count is returned as a "breached" result.
6. The API operator sees only a 5-character prefix, which maps to hundreds of
   possible hashes — they cannot determine which password was checked.

This is the same k-anonymity model used by 1Password, Firefox Monitor, and
other password-checking tools.

### SHA-1 for HIBP compatibility

SHA-1 is used **solely** because the HIBP Pwned Passwords API requires it as
the hash function for its k-anonymity range lookup protocol. SHA-1 is not used
as a security primitive in PassForge. The security of the breach check does not
depend on SHA-1's collision resistance — it depends on the k-anonymity property:
only a 5-character prefix (one of 16^5 = 1,048,576 possible prefixes) is ever
transmitted, making it computationally infeasible to determine which password
was checked.

### Add-Padding header

The `Add-Padding: true` request header instructs the HIBP API to pad its
response with dummy entries (having a count of 0). This ensures that every
response has a similar size, defeating response-size correlation attacks where
an observer could infer information about the queried prefix from the byte
length of the API response. PassForge always sends this header.

### Exact request shape

For a password whose SHA-1 hash begins with `5BAA6`:

```
GET /range/5BAA6 HTTP/1.1
Host: api.pwnedpasswords.com
Add-Padding: true
```

No other data is included in the request. There is no request body. The suffix,
the full hash, and the password itself never appear in the URL, headers, or
body of any outgoing request.

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
