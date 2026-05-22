/**
 * Behavioral tests for safety-relevant UI paths.
 *
 * These test the 5 paths documented in the ADR rather than chasing
 * shallow line coverage across presentational components.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import App from "../App.js";

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// Helper: type a password and wait for debounce
async function typePassword(pw: string) {
  const input = screen.getByLabelText("Password");
  await act(async () => {
    fireEvent.change(input, { target: { value: pw } });
  });
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
}

// ---------------------------------------------------------------------------
// (a) "unavailable" renders distinct from "safe"
// ---------------------------------------------------------------------------

describe("breach: unavailable renders distinct from safe", () => {
  it("unavailable has data-status='unavailable', not 'safe'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    render(<App />);
    await typePassword("testpassword");

    vi.useRealTimers();

    const btn = screen.getByRole("button", { name: /check if this password/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    await waitFor(
      () => {
        const result = document.querySelector("[data-status]");
        expect(result).toBeTruthy();
        expect(result?.getAttribute("data-status")).toBe("unavailable");
        expect(result?.getAttribute("data-status")).not.toBe("safe");
      },
      { timeout: 10000 },
    );

    // Text must clearly say "unavailable" and warn it's not safe
    const status = screen.getByRole("alert");
    expect(status.textContent).toContain("unavailable");
    expect(status.textContent).toMatch(/does NOT mean.*safe/i);
  });

  it("safe has data-status='safe'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () =>
          Promise.resolve(
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0\r\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB:0\r\n",
          ),
      }),
    );

    render(<App />);
    await typePassword("testpassword");

    vi.useRealTimers();

    const btn = screen.getByRole("button", { name: /check if this password/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    await waitFor(() => {
      const result = document.querySelector("[data-status]");
      expect(result).toBeTruthy();
      expect(result?.getAttribute("data-status")).toBe("safe");
    });
  });
});

// ---------------------------------------------------------------------------
// (b) Crack-time text derives from raw seconds, not tiers
// ---------------------------------------------------------------------------

describe("crack-time derives from raw seconds", () => {
  it("displays crack time text and attack scenario context", async () => {
    render(<App />);
    await typePassword("testpassword123");

    // Should show crack time text and an attack scenario description
    await waitFor(() => {
      expect(screen.getByText(/time to crack/i)).toBeInTheDocument();
    });

    // Headline scenario label should describe the attack model
    expect(screen.getByText(/guesses\/second/i)).toBeInTheDocument();
  });

  it("tiers t0-t5 never appear in crack time UI", async () => {
    render(<App />);
    await typePassword("testpassword123");

    await waitFor(() => {
      expect(screen.getByText(/time to crack/i)).toBeInTheDocument();
    });

    // No tier references anywhere in the rendered output
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/\bt[0-5]\b/);
    expect(html).not.toMatch(/crackTimeTier/);
  });
});

// ---------------------------------------------------------------------------
// (c) No sensitive data written to any storage API
// ---------------------------------------------------------------------------

describe("no sensitive data in storage", () => {
  it("never writes to localStorage, sessionStorage, cookies, or indexedDB", async () => {
    const localSetSpy = vi.spyOn(Storage.prototype, "setItem");
    const localGetSpy = vi.spyOn(Storage.prototype, "getItem");
    const cookieSpy = vi.spyOn(document, "cookie", "set");

    // indexedDB.open spy
    const idbOpenSpy = vi.fn();
    vi.stubGlobal("indexedDB", { open: idbOpenSpy });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:1\r\n"),
      }),
    );

    render(<App />);
    await typePassword("P@ssw0rd!123");

    vi.useRealTimers();

    // Trigger breach check
    const btn = screen.getByRole("button", { name: /check if this password/i });
    await act(async () => {
      fireEvent.click(btn);
    });

    await waitFor(() => {
      expect(document.querySelector("[data-status]")).not.toBeNull();
    });

    // Assert: zero writes to any storage mechanism
    expect(localSetSpy).not.toHaveBeenCalled();
    expect(localGetSpy).not.toHaveBeenCalled();
    expect(cookieSpy).not.toHaveBeenCalled();
    expect(idbOpenSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (d) K-anonymity explainer is present and accurate
// ---------------------------------------------------------------------------

describe("k-anonymity explainer", () => {
  it("is present and contains accurate privacy explanation", async () => {
    render(<App />);
    await typePassword("testpassword");

    const toggle = screen.getByRole("button", {
      name: /how does the breach check protect/i,
    });
    expect(toggle).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(toggle);
    });

    const explainer = screen.getByTestId("k-anonymity-explainer");
    const text = explainer.textContent ?? "";

    // Must mention k-anonymity
    expect(text).toMatch(/k-anonymity/i);

    // Must state only first 5 characters are sent
    expect(text).toMatch(/first 5 characters/i);

    // Must state remaining 35 stay local
    expect(text).toMatch(/never leave/i);

    // Must mention SHA-1 hashing happens locally
    expect(text).toMatch(/hashed locally/i);

    // Visual must show prefix and suffix
    expect(explainer.querySelector(".pf-hash-prefix")).not.toBeNull();
    expect(explainer.querySelector(".pf-hash-suffix")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// (e) Meter reflects core score
// ---------------------------------------------------------------------------

describe("meter reflects core score", () => {
  it("shows 'Very weak' for a weak password and 'Strong' for a strong one", async () => {
    render(<App />);

    // Weak password
    await typePassword("a");
    await waitFor(() => {
      expect(screen.getByText("Very weak")).toBeInTheDocument();
      expect(screen.getByText("0 / 4")).toBeInTheDocument();
    });

    // Strong password
    await typePassword("correct horse battery staple");
    await waitFor(() => {
      expect(screen.getByText("Strong")).toBeInTheDocument();
      expect(screen.getByText("4 / 4")).toBeInTheDocument();
    });
  });

  it("meter segments activate according to score", async () => {
    render(<App />);
    await typePassword("correct horse battery staple");

    await waitFor(() => {
      const segments = document.querySelectorAll(".pf-meter-seg");
      expect(segments.length).toBe(5);
      // All 5 segments active for score 4
      segments.forEach((seg) => {
        expect(seg.getAttribute("data-active")).toBe("true");
      });
    });
  });
});
