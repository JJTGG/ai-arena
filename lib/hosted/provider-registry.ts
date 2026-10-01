import { hostedConfig } from "./config";
import { HostedError } from "./errors";
import { GeminiHostedProvider } from "./gemini";
import { GroqHostedProvider } from "./groq";
import {
  createHostedProviderRegistry,
  type HostedProviderRegistry,
} from "./providers";

let registry: HostedProviderRegistry | null = null;

export function getHostedProviderRegistry(): HostedProviderRegistry {
  if (registry) {
    return registry;
  }

  const entrants = hostedConfig.entrants.filter(
    (entrant) => entrant.enabled,
  );

  if (entrants.length !== hostedConfig.entrantCount) {
    throw new HostedError(
      "PROVIDER_CONFIGURATION_ERROR",
      {
        status: 500,
        message:
          "Hosted provider configuration is incomplete.",
      },
    );
  }

  const providers = entrants.map((entrant) => {
    switch (entrant.provider) {
      case "gemini":
        return new GeminiHostedProvider({
          apiKey: process.env.HOSTED_GEMINI_API_KEY,
          model: entrant.model,
        });

      case "groq":
        return new GroqHostedProvider({
          apiKey: process.env.HOSTED_GROQ_API_KEY,
          model: entrant.model,
        });

      default: {
        const exhaustiveCheck: never =
          entrant.provider;

        throw new HostedError(
          "PROVIDER_CONFIGURATION_ERROR",
          {
            status: 500,
            message:
              `Unsupported Hosted provider: ${exhaustiveCheck}`,
          },
        );
      }
    }
  });

  registry =
    createHostedProviderRegistry(providers);

  return registry;
}

export function resetHostedProviderRegistry(): void {
  registry = null;
}