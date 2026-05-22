export { evaluateStrength, MAX_PASSWORD_LENGTH } from "./strength/index.js";
export type {
  StrengthResult,
  CrackTimesSeconds,
  MatchPattern,
} from "./strength/index.js";

export { generateFeedback } from "./feedback/index.js";
export type { Finding, FindingCode, Severity } from "./feedback/index.js";

export { checkBreach, sha1Hash, parseHibpResponse } from "./breach/index.js";
export type { BreachResult } from "./breach/index.js";
