# PassForge User Manual

## What PassForge Does

PassForge analyzes password strength entirely in your browser. It scores your password, estimates how long it would take to crack under realistic attack scenarios, identifies specific weaknesses, and checks whether the password has appeared in known data breaches — all without transmitting your password over the network.

## Getting Started

Open PassForge in your browser (either the deployed version or locally via `pnpm dev`). Type or paste a password into the input field. Results appear automatically after a brief debounce.

## UI Elements

### Password Input

- Type or paste a password. Maximum length is 128 characters.
- If you paste something longer, it is truncated to 128 characters and a warning appears: **"Truncated to 128 characters."**
- Click **Show** to reveal the password in plain text. Click **Hide** to mask it again.
- The password is never stored, logged, or transmitted. It exists only in browser memory while the tab is open.

### Strength Meter

A five-segment bar that reflects the password's score on a 0–4 scale:

| Score | Label     | Meaning                                                 |
| ----- | --------- | ------------------------------------------------------- |
| 0     | Very weak | Trivially guessable — common passwords, simple patterns |
| 1     | Weak      | Easily guessable with minimal effort                    |
| 2     | Fair      | Offers some resistance but could be improved            |
| 3     | Good      | Reasonably strong for most purposes                     |
| 4     | Strong    | High resistance to guessing attacks                     |

Scores are computed by [zxcvbn-ts](https://github.com/zxcvbn-ts/zxcvbn), which models how real attackers guess passwords — using dictionaries, keyboard patterns, repeated characters, dates, and l33t substitutions. This is fundamentally different from "must contain uppercase + number + symbol" rules, which provide a false sense of security.

### Crack Time

Displayed below the meter. Shows how long the password would take to crack under a specific attack scenario (offline slow hashing at 10,000 guesses/second by default).

Click **"Show all attack scenarios"** to expand all four:

| Scenario             | Speed      | Represents                         |
| -------------------- | ---------- | ---------------------------------- |
| Online throttled     | 100/hour   | Login form with rate limiting      |
| Online unthrottled   | 10/second  | Compromised service, no rate limit |
| Offline slow hashing | 10k/second | Stolen bcrypt/scrypt hashes        |
| Offline fast hashing | 10B/second | Stolen MD5/SHA-1 hashes on GPU     |

These times are derived from raw seconds, not cosmetic tiers. "3 hours" means the math says 3 hours at that guess rate.

### Feedback Findings

A list of specific weaknesses found in the password, each with a severity level (critical, high, medium, low, info) and an actionable suggestion. Examples:

- **DICTIONARY**: "Avoid common words and names"
- **SPATIAL**: "Avoid keyboard patterns like qwerty or zxcvbn"
- **REPEAT**: "Avoid repeated characters"
- **SEQUENCE**: "Avoid sequences like abc or 123"

### Breach Check

A button labeled **"Check breach exposure"**. This is deliberately user-triggered — not automatic — to respect your privacy and avoid unnecessary API calls.

When you click it, PassForge:

1. Hashes your password locally using SHA-1 (via Web Crypto)
2. Sends only the first 5 characters of the 40-character hash to the HIBP API
3. Receives back all matching suffixes and checks locally

Three possible results:

- **Breached** (red): Found in N data breaches. Do not use this password.
- **Safe** (green): Not found in known breaches. This means the password was not in any breach that HIBP has indexed — it is not a guarantee of absolute safety.
- **Unavailable** (gray): The check could not be completed (network error, API down, invalid response). **This does NOT mean the password is safe.** The gray color and explicit warning text make this visually distinct from the green "safe" state.

### K-Anonymity Explainer

Click **"How does the breach check protect my privacy?"** to expand a plain-language explanation with a visual showing exactly which part of the hash is sent and which stays local.

## Privacy Guarantees

- Your password never leaves the browser
- Only a 5-character SHA-1 prefix is transmitted (1 of 1,048,576 possible)
- Response padding prevents size-correlation attacks
- No analytics, telemetry, or error reporting
- No data written to localStorage, sessionStorage, IndexedDB, or cookies
- No third-party scripts loaded

For full details, see [Privacy Model](privacy-model.md) and [Threat Model](threat-model.md).

## Keyboard Accessibility

- All interactive elements are keyboard-navigable (Tab / Shift+Tab)
- The strength meter announces changes via `aria-live="polite"`
- The truncation warning uses `role="alert"` for screen reader announcement
- Focus indicators are visible on all buttons and inputs
- The application respects `prefers-reduced-motion`

## Browser Support

PassForge requires a browser with Web Crypto API support (all current browsers). It is a static SPA with no server-side component.

## Offline Use

Strength scoring and feedback work fully offline. The breach check requires network access to the HIBP API and will return "unavailable" when offline.
