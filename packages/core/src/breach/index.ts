/**
 * HIBP k-anonymity breach check.
 *
 * Uses SHA-1 via Web Crypto (globalThis.crypto.subtle) — NOT node:crypto.
 * SHA-1 is used SOLELY for HIBP API compatibility, not as a security
 * primitive. The full hash never leaves the client; security derives from
 * k-anonymity (only the 5-char prefix is transmitted) plus local suffix
 * matching. See docs/privacy-model.md for the complete privacy guarantee.
 */

// ---------------------------------------------------------------------------
// Result type — discriminated union; "unavailable" is NEVER collapsed to "safe"
// ---------------------------------------------------------------------------

export type BreachResult =
  | { status: "breached"; count: number }
  | { status: "safe" }
  | { status: "unavailable"; reason: string };

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const HIBP_BASE = "https://api.pwnedpasswords.com/range/";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 1_000;
const SUFFIX_LINE_RE = /^[0-9A-F]{35}:\d+$/;

// ---------------------------------------------------------------------------
// SHA-1 hashing — Web Crypto only, no node:crypto
// ---------------------------------------------------------------------------

/**
 * Compute uppercase hex SHA-1 of a UTF-8 string using Web Crypto.
 * Returns { prefix, suffix } split at 5 / 35 characters.
 */
export async function sha1Hash(
  password: string,
): Promise<{ full: string; prefix: string; suffix: string }> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-1", data);
  const hashArray = new Uint8Array(hashBuffer);
  const full = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join("");
  return { full, prefix: full.slice(0, 5), suffix: full.slice(5) };
}

// ---------------------------------------------------------------------------
// Request with timeout, retry, backoff, Retry-After
// ---------------------------------------------------------------------------

async function fetchWithRetry(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "Add-Padding": "true" },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) return res;

      // 429 / 503 — honor Retry-After then retry
      if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
        const retryAfter = parseRetryAfter(res.headers.get("Retry-After"));
        await sleep(retryAfter ?? backoffMs(attempt));
        continue;
      }

      // Other non-OK — no retry
      return res;
    } catch (err: unknown) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(backoffMs(attempt));
        continue;
      }
    }
  }

  throw lastError;
}

function backoffMs(attempt: number): number {
  return INITIAL_BACKOFF_MS * 2 ** attempt;
}

// Only delta-seconds supported; HIBP uses integer seconds. HTTP-date intentionally not handled.
function parseRetryAfter(value: string | null): number | null {
  if (value === null) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Response parser — strict validation of untrusted HIBP body
// ---------------------------------------------------------------------------

/**
 * Parse HIBP range response body. Each line is SUFFIX:COUNT (CRLF-separated).
 * Malformed lines are silently skipped — we never throw on garbage input.
 * Returns the matched count (or 0 if suffix not found) and the number of
 * regex-valid lines seen, so the caller can distinguish "no match in a
 * well-formed response" from "garbage/empty 200".
 */
function parseHibpResponse(
  body: string,
  suffix: string,
): { count: number; validLines: number } {
  const lines = body.split("\n");
  let validLines = 0;

  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (line === "") continue;
    if (!SUFFIX_LINE_RE.test(line)) continue;

    validLines++;

    const colonIdx = line.indexOf(":");
    const lineSuffix = line.slice(0, colonIdx);
    const lineCount = line.slice(colonIdx + 1);

    if (lineSuffix === suffix) {
      return { count: Number(lineCount), validLines };
    }
  }

  return { count: 0, validLines };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a password appears in known data breaches via the HIBP
 * Pwned Passwords API using k-anonymity.
 *
 * PRIVACY GUARANTEE: only the 5-character SHA-1 prefix leaves the client.
 * The full hash, suffix, and password never appear in any outgoing request.
 */
export async function checkBreach(password: string): Promise<BreachResult> {
  let hash: { prefix: string; suffix: string };

  try {
    hash = await sha1Hash(password);
  } catch {
    return { status: "unavailable", reason: "SHA-1 hashing failed" };
  }

  let response: Response;

  try {
    response = await fetchWithRetry(`${HIBP_BASE}${hash.prefix}`);
  } catch {
    return { status: "unavailable", reason: "Network request failed" };
  }

  if (!response.ok) {
    return {
      status: "unavailable",
      reason: `HIBP returned HTTP ${String(response.status)}`,
    };
  }

  let body: string;

  try {
    body = await response.text();
  } catch {
    return { status: "unavailable", reason: "Failed to read response body" };
  }

  const { count, validLines } = parseHibpResponse(body, hash.suffix);

  if (validLines === 0) {
    return { status: "unavailable", reason: "Invalid or empty HIBP response" };
  }

  if (count > 0) {
    return { status: "breached", count };
  }

  return { status: "safe" };
}
