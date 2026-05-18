export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  crackTimeSeconds: number;
  crackTimeDisplay: string;
}

export function evaluateStrength(_password: string): StrengthResult {
  return {
    score: 0,
    crackTimeSeconds: 0,
    crackTimeDisplay: "instant",
  };
}
