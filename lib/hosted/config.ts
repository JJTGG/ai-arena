import type {
  HostedConfig,
  HostedEntrantConfig,
} from "./types";

const hostedEntrants: HostedEntrantConfig[] = [
  {
    slot: 1,
    provider: "gemini",
    model: process.env.HOSTED_GEMINI_MODEL ?? "gemini-2.5-flash",
    enabled: true,
  },
  {
    slot: 2,
    provider: "groq",
    model: process.env.HOSTED_GROQ_MODEL ?? "llama-3.3-70b-versatile",
    enabled: true,
  },
];

export const hostedConfig: HostedConfig = {
  totalRounds: 60,
  dailyLimit: 2,
  durationDays: 30,
  entrantCount: 2,
  entrants: hostedEntrants,
};

export function getEnabledHostedEntrants(): HostedEntrantConfig[] {
  return hostedConfig.entrants.filter((entrant) => entrant.enabled);
}

export function validateHostedConfig(): void {
  const enabledEntrants = getEnabledHostedEntrants();

  if (hostedConfig.totalRounds <= 0) {
    throw new Error("HOSTED_CONFIG_INVALID_TOTAL_ROUNDS");
  }

  if (hostedConfig.dailyLimit <= 0) {
    throw new Error("HOSTED_CONFIG_INVALID_DAILY_LIMIT");
  }

  if (hostedConfig.durationDays <= 0) {
    throw new Error("HOSTED_CONFIG_INVALID_DURATION");
  }

  if (hostedConfig.entrantCount !== 2) {
    throw new Error("HOSTED_CONFIG_INVALID_ENTRANT_COUNT");
  }

  if (enabledEntrants.length !== hostedConfig.entrantCount) {
    throw new Error("HOSTED_CONFIG_INVALID_ENABLED_ENTRANTS");
  }

  const slots = new Set(enabledEntrants.map((entrant) => entrant.slot));

  if (slots.size !== hostedConfig.entrantCount) {
    throw new Error("HOSTED_CONFIG_DUPLICATE_ENTRANT_SLOT");
  }

  for (const entrant of enabledEntrants) {
    if (!entrant.model.trim()) {
      throw new Error(
        `HOSTED_CONFIG_MISSING_MODEL_${entrant.provider.toUpperCase()}`,
      );
    }
  }
}