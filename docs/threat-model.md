# PassForge Threat Model

## Assets

| Asset                       | Sensitivity | Location                                                 |
| --------------------------- | ----------- | -------------------------------------------------------- |
| User's password (plaintext) | Critical    | In-memory only; never persisted, logged, or transmitted  |
| SHA-1 hash of password      | High        | In-memory only; full hash never leaves the browser       |
| SHA-1 prefix (5 chars)      | Low         | Transmitted to HIBP API; one of ~1M possible prefixes    |
| Strength analysis results   | Low         | In-memory only; derived metadata, no credential material |

## Trust Boundaries

```
┌─────────────────────────────────────┐
│  Browser (client)                   │
│  ┌───────────────────────────────┐  │
│  │ PassForge SPA                 │  │
│  │ - password never leaves here  │  │
│  │ - SHA-1 computed locally      │  │
│  │ - only 5-char prefix exits    │  │
│  └───────────┬───────────────────┘  │
│              │ HTTPS                 │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │ Browser network stack         │  │
│  └───────────┬───────────────────┘  │
└──────────────┼──────────────────────┘
               │  TLS 1.2+
               ▼
┌──────────────────────────────────────┐
│  api.pwnedpasswords.com (HIBP)      │
│  - receives 5-char SHA-1 prefix     │
│  - returns all matching suffixes     │
│  - no authentication required        │
│  - Add-Padding header used           │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Deploy host (static file server)    │
│  - serves HTML/CSS/JS assets         │
│  - no server-side logic              │
│  - no user data received             │
└──────────────────────────────────────┘
```

## Threats, Mitigations, and Residual Risk

### 1. Network Observation (Passive)

**Threat**: An attacker on the network path observes the HIBP request and learns the 5-character SHA-1 prefix.

**Mitigation**: The prefix maps to ~1M possible buckets. With HIBP's Add-Padding header enabled, response sizes are normalized, preventing traffic-analysis correlation. TLS encrypts the request in transit.

**Residual risk**: An observer learns that the user is checking a password and can narrow the hash bucket to 1/1,048,576. This is not practically exploitable.

### 2. Man-in-the-Middle (Active)

**Threat**: An attacker intercepts and modifies the HIBP response (e.g., removing a matching suffix to make a breached password appear safe).

**Mitigation**: TLS with certificate validation (browser-enforced). HSTS header prevents downgrade. CSP `connect-src` restricts fetch targets.

**Residual risk**: A compromised CA or browser-level MITM proxy (e.g., corporate TLS inspection) could forge responses. The application cannot defend against this — it is a browser trust model limitation.

### 3. Malicious HIBP Response

**Threat**: HIBP returns garbage, oversized, or maliciously crafted data to exploit the parser.

**Mitigation**: `parseHibpResponse` uses strict regex validation (`/^[0-9A-F]{35}:\d+$/`). Malformed lines are silently skipped. Empty/garbage 200s return "unavailable", never "safe". The parser is fuzz-tested with 2,500+ iterations of random/near-valid/garbage/unicode input.

**Residual risk**: A response that conforms to the regex but has fabricated counts would mislead the user. This requires HIBP compromise or MITM — both addressed above.

### 4. Response-Size Correlation

**Threat**: An observer correlates the HIBP response size with the hash prefix to narrow down which password was checked.

**Mitigation**: The `Add-Padding: true` header is sent on every request. HIBP pads responses with dummy entries to normalize sizes across prefixes.

**Residual risk**: If HIBP changes or removes padding support, this mitigation degrades. The application checks for valid lines; padding entries are indistinguishable from real ones by design.

### 5. Storage Exposure

**Threat**: Password, hash, or analysis results persist in localStorage, sessionStorage, IndexedDB, or cookies, where other scripts or physical access could recover them.

**Mitigation**: The application writes zero data to any web storage API. This is verified by a behavioral test that intercepts `setItem`, `getItem`, `document.cookie` setter, and `indexedDB.open` — all must be zero-call.

**Residual risk**: Browser autofill may cache the input despite `autocomplete="off"`. This is browser behavior outside application control.

### 6. Log Exposure

**Threat**: The password appears in console logs, error reports, or developer tool network panels.

**Mitigation**: Zero `console.*` calls in application source (verified by grep). No error-reporting SDK (Sentry, Datadog, etc.) is installed. The password is never included in any `fetch()` URL or body — only the 5-char prefix is transmitted.

**Residual risk**: A browser extension or devtools open during use could observe in-memory values. See "browser-extension snooping" below.

### 7. Dependency Supply Chain

**Threat**: A compromised npm package (zxcvbn-ts, React, Vite, etc.) exfiltrates the password or injects malicious code.

**Mitigation**: Dependencies are pinned via `pnpm-lock.yaml`. `pnpm audit` is run to check for known advisories. The CSP blocks script injection (`script-src 'self'`) and restricts network targets (`connect-src 'self' https://api.pwnedpasswords.com`). No CDN or external script sources are used.

**Residual risk**: A compromised dependency that operates within the CSP boundary (e.g., exfiltrating via the allowed HIBP endpoint) would not be blocked. Lockfile review and periodic auditing are the primary defenses.

### 8. Cross-Site Scripting (XSS)

**Threat**: An attacker injects script that reads the password from the DOM.

**Mitigation**: React's JSX escapes all rendered content by default. CSP `script-src 'self'` blocks inline scripts and eval. No `dangerouslySetInnerHTML` is used. No user-supplied content is rendered as HTML.

**Residual risk**: A React framework vulnerability that bypasses JSX escaping. Mitigated by keeping React updated.

### 9. Clipboard Capture

**Threat**: The password is placed on the system clipboard (via copy/paste), where other applications can read it.

**Mitigation**: PassForge does not programmatically copy anything to the clipboard. The user may copy manually — this is user-initiated and outside application scope.

**Residual risk**: If the user copies their password, any clipboard-monitoring software can capture it. No application-level mitigation exists.

### 10. Browser-Extension Snooping

**Threat**: A browser extension with DOM access reads the password input value.

**Mitigation**: None possible at the application level. Extensions with `<all_urls>` permission can read any DOM element.

**Residual risk**: Full. This is a browser trust model limitation. Users should audit their installed extensions.

### 11. Physical Access

**Threat**: An attacker with physical access to the device reads the password from the screen or browser memory.

**Mitigation**: Password input defaults to `type="password"` (masked). The show/hide toggle requires deliberate user action. No data is persisted to storage.

**Residual risk**: Screen shoulder-surfing when the password is visible. Memory forensics on a running or recently-closed browser process. Both require physical access.

## Out of Scope

The following threats are explicitly **not** protected against by PassForge:

- **Compromised browser or OS**: If the browser itself is compromised (e.g., malware with DOM access), no web application can protect user input.
- **Keyloggers**: Hardware or software keyloggers capture input before it reaches the application.
- **Corporate TLS inspection proxies**: These MITM all HTTPS traffic by design; the browser trusts the proxy's CA.
- **User re-use of analyzed passwords**: PassForge analyzes strength but cannot prevent the user from choosing a weak password.
- **Denial of service against HIBP**: If HIBP is unavailable, breach check returns "unavailable" — not "safe". The user is warned.
- **Side-channel timing attacks on zxcvbn**: The strength scoring library is not constant-time. An attacker would need co-located code execution to exploit this, which implies a more severe compromise.
- **Browser memory dumps / core dumps**: Sensitive data exists in JavaScript heap memory during analysis. OS-level memory protection is outside application scope.

## COEP Decision

`Cross-Origin-Embedder-Policy: require-corp` is intentionally **not** set. It would block the cross-origin `fetch()` to `api.pwnedpasswords.com` unless HIBP sets `Cross-Origin-Resource-Policy` headers, which it does not control. COOP (`same-origin`) is set; CORP (`same-origin`) is set for assets served by the deploy host.
