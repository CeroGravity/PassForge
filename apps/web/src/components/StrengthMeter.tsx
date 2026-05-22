import type { StrengthResult } from "@passforge/core";

const SCORE_LABELS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "Very weak",
  1: "Weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
};

const SCORE_SEVERITY: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "crit",
  1: "high",
  2: "med",
  3: "low",
  4: "info",
};

const METER_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "var(--pf-meter-0)",
  1: "var(--pf-meter-1)",
  2: "var(--pf-meter-2)",
  3: "var(--pf-meter-3)",
  4: "var(--pf-meter-4)",
};

interface Props {
  strength: StrengthResult | null;
}

export function StrengthMeter({ strength }: Props) {
  const score = strength?.score ?? 0;
  const hasInput = strength !== null;
  const severity = SCORE_SEVERITY[score];

  return (
    <div className="pf-meter" role="group" aria-label="Password strength">
      <div className="pf-meter-track" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="pf-meter-seg"
            data-active={hasInput && i <= score}
            style={
              hasInput && i <= score
                ? ({
                    "--meter-color": METER_COLORS[score],
                  } as React.CSSProperties)
                : undefined
            }
          />
        ))}
      </div>
      <div className="pf-meter-label">
        <span
          id="pf-meter-status"
          className="pf-score-text"
          data-severity={hasInput ? severity : undefined}
          role="status"
          aria-live="polite"
        >
          {hasInput ? SCORE_LABELS[score] : ""}
        </span>
        {hasInput && (
          <span className="pf-score-text" data-severity={severity}>
            {score} / 4
          </span>
        )}
      </div>
    </div>
  );
}
