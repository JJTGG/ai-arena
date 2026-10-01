import type {
  HostedProviderId,
  HostedProviderRequest,
  HostedProviderResult,
} from "./types";

export interface HostedProvider {
  readonly id: HostedProviderId;

  generate(
    request: HostedProviderRequest,
  ): Promise<HostedProviderResult>;
}

export type HostedProviderRegistry = Record<
  HostedProviderId,
  HostedProvider
>;

export function createHostedProviderRegistry(
  providers: HostedProvider[],
): HostedProviderRegistry {
  const registry = {} as HostedProviderRegistry;

  for (const provider of providers) {
    if (registry[provider.id]) {
      throw new Error(
        `HOSTED_PROVIDER_DUPLICATE:${provider.id}`,
      );
    }

    registry[provider.id] = provider;
  }

  return registry;
}

export function getHostedProvider(
  registry: HostedProviderRegistry,
  providerId: HostedProviderId,
): HostedProvider {
  const provider = registry[providerId];

  if (!provider) {
    throw new Error(
      `HOSTED_PROVIDER_NOT_REGISTERED:${providerId}`,
    );
  }

  return provider;
}