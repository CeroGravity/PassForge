import { useState } from "react";

interface Props {
  hash: string | null;
}

export function KAnonymityExplainer({ hash }: Props) {
  const [open, setOpen] = useState(false);

  const prefix = hash ? hash.slice(0, 5) : "5BAA6";
  const suffix = hash ? hash.slice(5) : "1E4C9B93F3F0682250B6CF8331B7EE68FD8";

  return (
    <div className="pf-explainer">
      <button
        type="button"
        className="pf-explainer-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="pf-explainer-body"
      >
        How does the breach check protect my privacy?
      </button>
      {open && (
        <div
          id="pf-explainer-body"
          className="pf-explainer-body"
          data-testid="k-anonymity-explainer"
        >
          <p>
            PassForge uses <strong>k-anonymity</strong> to check your password
            against known data breaches without ever sending your password or
            its full hash over the network.
          </p>
          <p>
            Your password is hashed locally using SHA-1, producing a
            40-character hex string. Only the{" "}
            <strong>first 5 characters</strong> of that hash are sent to the
            Have I Been Pwned API. The remaining 35 characters — and the
            password itself — never leave your device.
          </p>
          <div
            className="pf-prefix-visual"
            aria-label="Visual showing which part of the hash is sent"
          >
            <div className="pf-hash-row">
              <span className="pf-hash-label">Full hash:</span>
              <span>
                <span className="pf-hash-prefix">{prefix}</span>
                <span className="pf-hash-suffix">{suffix}</span>
              </span>
            </div>
            <div className="pf-hash-row">
              <span className="pf-hash-label">Sent:</span>
              <span className="pf-hash-prefix">{prefix}</span>
              <span className="pf-sent-arrow">
                → sent to api.pwnedpasswords.com
              </span>
            </div>
            <div className="pf-hash-row">
              <span className="pf-hash-label">Stays local:</span>
              <span
                className="pf-hash-suffix"
                style={{ textDecoration: "none", opacity: 1 }}
              >
                {suffix}
              </span>
              <span className="pf-kept-arrow">✕ never leaves your device</span>
            </div>
          </div>
          <p>
            The API returns all hash suffixes matching that 5-character prefix
            (hundreds of entries). PassForge then checks locally whether your
            full hash appears in the list. The API operator sees only the prefix
            — one of over 1 million possible prefixes — and cannot determine
            which password you checked.
          </p>
        </div>
      )}
    </div>
  );
}
