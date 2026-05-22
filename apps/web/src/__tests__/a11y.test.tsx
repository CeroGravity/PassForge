/**
 * Automated accessibility audit via axe-core.
 * Asserts zero serious/critical violations on the rendered main view.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import axe from "axe-core";
import App from "../App.js";

afterEach(() => {
  vi.restoreAllMocks();
});

async function typePassword(pw: string) {
  const input = screen.getByLabelText("Password");
  await act(async () => {
    fireEvent.change(input, { target: { value: pw } });
  });
  // Wait for debounce
  await act(async () => {
    await new Promise((r) => setTimeout(r, 300));
  });
}

describe("axe accessibility audit", () => {
  it("main view with password entered has zero serious/critical violations", async () => {
    render(<App />);
    await typePassword("testpassword");

    const results = await axe.run(document.body, {
      rules: {
        // jsdom doesn't render real color / layout — disable color-contrast
        // which can only be reliably tested in a real browser.
        "color-contrast": { enabled: false },
      },
    });

    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    if (serious.length > 0) {
      const summary = serious.map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`,
      );
      // Log for visibility, then fail
      console.error("axe serious/critical violations:\n" + summary.join("\n"));
    }

    expect(serious).toHaveLength(0);
  });
});
