import { useState, useCallback } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
}

export function PasswordInput({ value, onChange, maxLength }: Props) {
  const [visible, setVisible] = useState(false);

  const toggle = useCallback(() => setVisible((v) => !v), []);

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
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="pf-meter-status"
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
    </div>
  );
}
