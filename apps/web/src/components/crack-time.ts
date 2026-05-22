/**
 * Convert raw crack-time seconds to honest human-readable text.
 *
 * Derived ONLY from raw crackTimesSeconds values — NEVER from the
 * t0–t5 test-contract tiers, which are a cross-implementation test
 * token only and must not appear in or drive the UI.
 */

import type { CrackTimesSeconds } from "@passforge/core";

export interface CrackScenario {
  label: string;
  description: string;
  seconds: number;
  text: string;
}

const SCENARIOS: {
  key: keyof CrackTimesSeconds;
  label: string;
  description: string;
}[] = [
  {
    key: "onlineThrottling",
    label: "Online (throttled)",
    description: "100 guesses/hour — rate-limited login page",
  },
  {
    key: "onlineNoThrottling",
    label: "Online (unthrottled)",
    description: "10 guesses/second — weak rate limit",
  },
  {
    key: "offlineSlowHashing",
    label: "Offline (slow hash)",
    description: "10k guesses/second — bcrypt/scrypt/argon2",
  },
  {
    key: "offlineFastHashing",
    label: "Offline (fast hash)",
    description: "10B guesses/second — MD5/SHA-1 on GPU",
  },
];

export function formatSeconds(seconds: number): string {
  if (seconds < 1) return "instant";
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 2592000) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 31536000) return `${Math.round(seconds / 2592000)} months`;
  if (seconds < 3153600000) return `${Math.round(seconds / 31536000)} years`;
  return "centuries";
}

export function getHeadlineScenario(
  crackTimes: CrackTimesSeconds,
): CrackScenario {
  const key = "offlineSlowHashing" as const;
  const seconds = crackTimes[key];
  const meta = SCENARIOS.find((s) => s.key === key);
  if (!meta) throw new Error(`Unknown scenario: ${key}`);
  return {
    label: meta.label,
    description: meta.description,
    seconds,
    text: formatSeconds(seconds),
  };
}

export function getAllScenarios(
  crackTimes: CrackTimesSeconds,
): CrackScenario[] {
  return SCENARIOS.map((s) => ({
    label: s.label,
    description: s.description,
    seconds: crackTimes[s.key],
    text: formatSeconds(crackTimes[s.key]),
  }));
}
