import { useState, useCallback, useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
}

export function PasswordInput({ value, onChange, maxLength }: Props) {
  const [visible, setVisible] = useState(false);
  const [capped, setCapped] = useState(false);
  const capTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggle = useCallback(() => setVisible((v) => !v), []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw.length > maxLength) {
        onChange(raw.slice(0, maxLength));
        setCapped(true);
        if (capTimerRef.current) clearTimeout(capTimerRef.current);
        capTimerRef.current = setTimeout(() => setCapped(false), 3000);
      } else {
        onChange(raw);
        setCapped(false);
      }
    },
    [maxLength, onChange],
  );

  return (
    <div className="pf-input-group">
      <label className="pf-input-label" htmlFor="pf-password">
        Password
      </label>
      <div className="pf-input-wrapper">
        <input
          id="pf-password"
          className="pf-input"
          type={visible ? "text" : "password"}
          value={value}
          onChange={handleChange}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="pf-meter-status pf-length-warning"
          placeholder="Enter a password to analyze"
        />
        <button
          type="button"
          className="pf-toggle-vis"
          onClick={toggle}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {capped && (
        <p id="pf-length-warning" className="pf-length-warning" role="alert">
          Truncated to {maxLength} characters.
        </p>
      )}
    </div>
  );
}
