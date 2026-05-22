import { useState } from "react";
import type { CrackTimesSeconds } from "@passforge/core";
import { getHeadlineScenario, getAllScenarios } from "./crack-time.js";

interface Props {
  crackTimes: CrackTimesSeconds;
}

export function CrackTimeDisplay({ crackTimes }: Props) {
  const [expanded, setExpanded] = useState(false);
  const headline = getHeadlineScenario(crackTimes);
  const all = getAllScenarios(crackTimes);

  return (
    <div className="pf-crack-time">
      <div className="pf-crack-headline">
        Time to crack: <strong>{headline.text}</strong>
      </div>
      <div className="pf-crack-context">{headline.description}</div>
      <button
        type="button"
        className="pf-crack-expand"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls="pf-crack-details"
      >
        {expanded ? "Hide all scenarios" : "Show all attack scenarios"}
      </button>
      {expanded && (
        <div id="pf-crack-details" className="pf-crack-details">
          {all.map((s) => (
            <div key={s.label} className="pf-crack-row">
              <span className="pf-crack-scenario">
                {s.label}
                <br />
                <span className="pf-crack-scenario-detail">
                  {s.description}
                </span>
              </span>
              <span className="pf-crack-value">{s.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
