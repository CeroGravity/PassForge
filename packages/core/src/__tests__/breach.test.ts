import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkBreach, sha1Hash } from "../breach/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// -- Load shared test vectors --

interface BreachVector {
  description: string;
  input: { password: string };
  expected: {
    sha1: string;
    prefix: string;
    suffix: string;
  };
}

const vectorsPath = resolve(
  __dirname,
  "../../../../shared/test-vectors/breach.json",
);
const vectors: BreachVector[] = JSON.parse(
  readFileSync(vectorsPath, "utf-8"),
) as BreachVector[];

// -- Helpers --

function mockFetch(
  body: string,
  status = 200,
  headers: Record<string, string> = {},
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers(headers),
      text: () => Promise.resolve(body),
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

// -- Vector-driven SHA-1 tests --

describe("breach vectors — SHA-1 hashing", () => {
  for (const v of vectors) {
    it(v.description, async () => {
      const hash = await sha1Hash(v.input.password);
      expect(hash.full).toBe(v.expected.sha1);
      expect(hash.prefix).toBe(v.expected.prefix);
      expect(hash.suffix).toBe(v.expected.suffix);
    });
  }
});

// -- Privacy interception test --

describe("privacy interception", () => {
  it("only prefix leaves client; suffix/password never in request", async () => {
    // Use a password whose text cannot appear as a substring in its own
    // SHA-1 hex prefix (avoid "password" whose prefix "5BAA6" is fine,
    // but "password" is a substring of "pwnedpasswords.com" in the URL).
    const password = "zQ9$mK2!vX";
    const hash = await sha1Hash(password);

    // Build a response that includes the suffix so we get a "breached" result
    mockFetch(`${hash.suffix}:5\r\n`);

    const result = await checkBreach(password);
    expect(result.status).toBe("breached");

    const mockFn = vi.mocked(fetch);
    expect(mockFn).toHaveBeenCalledTimes(1);

    const call = mockFn.mock.calls[0];
    const url = call?.[0] as string;
    const init = call?.[1] as RequestInit;

    // URL contains exactly the 5-char prefix
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${hash.prefix}`);
    expect(url).toMatch(/\/range\/[0-9A-F]{5}$/);

    // Suffix NEVER appears in URL
    expect(url).not.toContain(hash.suffix);

    // Password NEVER appears in URL
    expect(url.toLowerCase()).not.toContain(password.toLowerCase());

    // Method is GET
    expect(init.method).toBe("GET");

    // Add-Padding header present
    const headers = init.headers as Record<string, string>;
    expect(headers["Add-Padding"]).toBe("true");

    // Suffix NEVER in headers
    const headerStr = JSON.stringify(headers);
    expect(headerStr).not.toContain(hash.suffix);

    // Password NEVER in headers
    expect(headerStr.toLowerCase()).not.toContain(password.toLowerCase());

    // No body on GET
    expect(init.body).toBeUndefined();
  });
});

// -- Mocked-network tests --

describe("breach check — mocked network", () => {
  it("match → breached with count", async () => {
    const hash = await sha1Hash("password");
    mockFetch(
      `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1\r\n${hash.suffix}:3861493\r\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB:42\r\n`,
    );
    const result = await checkBreach("password");
    expect(result).toEqual({ status: "breached", count: 3861493 });
  });

  it("no match → safe", async () => {
    mockFetch(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1\r\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB:42\r\n",
    );
    const result = await checkBreach("password");
    expect(result).toEqual({ status: "safe" });
  });

  it("padded response lines handled correctly", async () => {
    const hash = await sha1Hash("password");
    // Padded lines have count 0 — they should not cause a false "breached"
    mockFetch(
      `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0\r\n${hash.suffix}:99\r\nCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC:0\r\n`,
    );
    const result = await checkBreach("password");
    expect(result).toEqual({ status: "breached", count: 99 });
  });

  it("malformed lines skipped without error", async () => {
    const hash = await sha1Hash("password");
    mockFetch(`not-valid-line\r\n${hash.suffix}:7\r\nshort:1\r\n:::bad\r\n`);
    const result = await checkBreach("password");
    expect(result).toEqual({ status: "breached", count: 7 });
  });

  it("completely malformed body → unavailable (zero valid lines)", async () => {
    mockFetch("garbage\nmore garbage\n");
    const result = await checkBreach("password");
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.reason).toContain("Invalid or empty HIBP response");
    }
  });

  it("empty body → unavailable (zero valid lines)", async () => {
    mockFetch("");
    const result = await checkBreach("password");
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.reason).toContain("Invalid or empty HIBP response");
    }
  });

  it("valid lines but no suffix match → safe", async () => {
    mockFetch(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1\r\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB:42\r\nCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC:100\r\n",
    );
    const result = await checkBreach("password");
    expect(result).toEqual({ status: "safe" });
  });

  it("timeout / abort → unavailable", async () => {
    // Simulate AbortError (what fetch throws when signal is aborted)
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          new DOMException("The operation was aborted.", "AbortError"),
        ),
    );
    const result = await checkBreach("password");
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.reason).toContain("Network request failed");
    }
  });

  it("429 + Retry-After → retry then resolve", async () => {
    const hash = await sha1Hash("password");
    const mockFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ "Retry-After": "1" }),
        text: () => Promise.resolve(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(`${hash.suffix}:42\r\n`),
      });
    vi.stubGlobal("fetch", mockFn);

    const result = await checkBreach("password");
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ status: "breached", count: 42 });
  });

  it("503 without Retry-After → retry with backoff", async () => {
    const hash = await sha1Hash("password");
    const mockFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers(),
        text: () => Promise.resolve(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(`${hash.suffix}:10\r\n`),
      });
    vi.stubGlobal("fetch", mockFn);

    const result = await checkBreach("password");
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ status: "breached", count: 10 });
  });

  it("non-200 non-retryable → unavailable", async () => {
    mockFetch("", 500);
    const result = await checkBreach("password");
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.reason).toContain("500");
    }
  });

  it("network error → unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    const result = await checkBreach("password");
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.reason).toContain("Network request failed");
    }
  });

  it("429 with non-numeric Retry-After → uses backoff instead", async () => {
    const hash = await sha1Hash("password");
    const mockFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ "Retry-After": "invalid-date-string" }),
        text: () => Promise.resolve(""),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(`${hash.suffix}:5\r\n`),
      });
    vi.stubGlobal("fetch", mockFn);

    const result = await checkBreach("password");
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ status: "breached", count: 5 });
  });

  it("response.text() failure → unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.reject(new Error("stream error")),
      }),
    );
    const result = await checkBreach("password");
    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.reason).toContain("Failed to read response body");
    }
  });
});
