import type { Finding } from "@passforge/core";

interface Props {
  findings: Finding[];
}

export function FeedbackList({ findings }: Props) {
  if (findings.length === 0) return null;

  return (
    <div>
      <h3 className="pf-section-heading">Findings</h3>
      <ul className="pf-findings" aria-label="Password findings">
        {findings.map((f) => (
          <li key={f.code} className="pf-finding" data-severity={f.severity}>
            <span className="pf-finding-code" aria-hidden="true">
              {f.code}
            </span>
            <span className="pf-finding-action">{f.action}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
