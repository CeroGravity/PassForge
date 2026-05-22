import { useState, useCallback } from "react";
import { checkBreach } from "@passforge/core";
import type { BreachResult } from "@passforge/core";

interface Props {
  password: string;
}

export function BreachCheck({ password }: Props) {
  const [result, setResult] = useState<BreachResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    try {
      const r = await checkBreach(password);
      setResult(r);
    } catch {
      setResult({ status: "unavailable", reason: "Unexpected error" });
    } finally {
      setLoading(false);
    }
  }, [password]);

  return (
    <div className="pf-breach">
      <h3 className="pf-section-heading">Breach Check</h3>
      <button
        type="button"
        className="pf-breach-btn"
        onClick={handleCheck}
        disabled={!password || loading}
        aria-describedby={result ? "pf-breach-status" : undefined}
      >
        {loading
          ? "Checking…"
          : "Check if this password appeared in data breaches"}
      </button>
      {result && <BreachResultDisplay result={result} />}
    </div>
  );
}

function BreachResultDisplay({ result }: { result: BreachResult }) {
  if (result.status === "breached") {
    return (
      <div
        id="pf-breach-status"
        className="pf-breach-result"
        data-status="breached"
        role="alert"
      >
        <span className="pf-breach-icon" aria-hidden="true">
          ⚠
        </span>
        <div className="pf-breach-text">
          <strong>Breached</strong>
          <span>
            Found in {result.count.toLocaleString()} data breaches. Do not use
            this password.
          </span>
        </div>
      </div>
    );
  }

  if (result.status === "safe") {
    return (
      <div
        id="pf-breach-status"
        className="pf-breach-result"
        data-status="safe"
        role="status"
      >
        <span className="pf-breach-icon" aria-hidden="true">
          ✓
        </span>
        <div className="pf-breach-text">
          <strong>Not found in breaches</strong>
          <span>This password was not found in known data breaches.</span>
        </div>
      </div>
    );
  }

  // unavailable — visually distinct: gray, warning icon, NOT green/safe
  return (
    <div
      id="pf-breach-status"
      className="pf-breach-result"
      data-status="unavailable"
      role="alert"
    >
      <span className="pf-breach-icon" aria-hidden="true">
        ?
      </span>
      <div className="pf-breach-text">
        <strong>Check unavailable</strong>
        <span>
          Could not verify — {result.reason}. This does NOT mean the password is
          safe.
        </span>
      </div>
    </div>
  );
}
