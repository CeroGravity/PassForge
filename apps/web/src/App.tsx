import { useState, useEffect, useRef } from "react";
import {
  evaluateStrength,
  generateFeedback,
  sha1Hash,
  MAX_PASSWORD_LENGTH,
} from "@passforge/core";
import type { StrengthResult, Finding } from "@passforge/core";
import { PasswordInput } from "./components/PasswordInput.js";
import { StrengthMeter } from "./components/StrengthMeter.js";
import { CrackTimeDisplay } from "./components/CrackTimeDisplay.js";
import { FeedbackList } from "./components/FeedbackList.js";
import { BreachCheck } from "./components/BreachCheck.js";
import { KAnonymityExplainer } from "./components/KAnonymityExplainer.js";

const DEBOUNCE_MS = 200;

export default function App() {
  const [password, setPassword] = useState("");
  const [strength, setStrength] = useState<StrengthResult | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [hash, setHash] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!password) {
      setStrength(null);
      setFindings([]);
      setHash(null);
      return;
    }

    timerRef.current = setTimeout(() => {
      const s = evaluateStrength(password);
      setStrength(s);
      setFindings(generateFeedback(password, s));
      sha1Hash(password)
        .then((h) => setHash(h.full))
        .catch(() => {});
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [password]);

  return (
    <main className="pf-app">
      <header className="pf-header">
        <h1 className="pf-title">PassForge</h1>
        <p className="pf-subtitle">Client-side password strength analyzer</p>
      </header>

      <div className="pf-card">
        <PasswordInput
          value={password}
          onChange={setPassword}
          maxLength={MAX_PASSWORD_LENGTH}
        />
        <StrengthMeter strength={strength} />
        {strength && password && (
          <CrackTimeDisplay crackTimes={strength.crackTimesSeconds} />
        )}
      </div>

      {findings.length > 0 && (
        <div className="pf-card">
          <FeedbackList findings={findings} />
        </div>
      )}

      {password && (
        <div className="pf-card">
          <BreachCheck password={password} />
          <KAnonymityExplainer hash={hash} />
        </div>
      )}
    </main>
  );
}
