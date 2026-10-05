export type HostedCurrency = string;

export type HostedPrice = {
  amountMinor: number;
  currency: HostedCurrency;
};

export type HostedPricingContext = {
  countryCode: string;
  currency?: HostedCurrency;
};

export type HostedPriceRule = {
  countryCode: string;
  amountMinor: number;
  currency: HostedCurrency;
};

const defaultNigeriaPriceRule: HostedPriceRule = {
  countryCode: "NG",
  amountMinor: 650000,
  currency: "NGN",
};

const defaultInternationalPrice: HostedPrice = {
  amountMinor: 500,
  currency: "USD",
};

function normalizeCountryCode(
  countryCode: string,
): string {
  return countryCode.trim().toUpperCase();
}

function normalizeCurrency(
  currency: string,
): string {
  return currency.trim().toUpperCase();
}

function loadConfiguredPriceRules(): HostedPriceRule[] {
  const raw = process.env.HOSTED_PRICE_RULES;

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("HOSTED_PRICE_RULES_NOT_ARRAY");
    }

    return parsed.map((rule) => {
      if (
        typeof rule !== "object" ||
        rule === null ||
        typeof (rule as Record<string, unknown>)
          .countryCode !== "string" ||
        typeof (rule as Record<string, unknown>)
          .amountMinor !== "number" ||
        typeof (rule as Record<string, unknown>)
          .currency !== "string"
      ) {
        throw new Error("HOSTED_PRICE_RULE_INVALID");
      }

      const typedRule = rule as {
        countryCode: string;
        amountMinor: number;
        currency: string;
      };

      if (
        !Number.isSafeInteger(typedRule.amountMinor) ||
        typedRule.amountMinor <= 0
      ) {
        throw new Error(
          "HOSTED_PRICE_RULE_INVALID_AMOUNT",
        );
      }

      const countryCode = normalizeCountryCode(
        typedRule.countryCode,
      );

      const currency = normalizeCurrency(
        typedRule.currency,
      );

      if (!countryCode) {
        throw new Error(
          "HOSTED_PRICE_RULE_INVALID_COUNTRY",
        );
      }

      if (!currency) {
        throw new Error(
          "HOSTED_PRICE_RULE_INVALID_CURRENCY",
        );
      }

      return {
        countryCode,
        amountMinor: typedRule.amountMinor,
        currency,
      };
    });
  } catch {
    throw new Error(
      "HOSTED_PRICE_RULES_INVALID_CONFIGURATION",
    );
  }
}

export function resolveHostedPrice(
  context: HostedPricingContext,
): HostedPrice {
  const countryCode = normalizeCountryCode(
    context.countryCode,
  );

  if (!countryCode) {
    throw new Error(
      "HOSTED_PRICING_COUNTRY_REQUIRED",
    );
  }

  const configuredRules = loadConfiguredPriceRules();

  const matchingConfiguredRule = configuredRules.find(
    (rule) =>
      rule.countryCode === countryCode,
  );

  if (matchingConfiguredRule) {
    return {
      amountMinor: matchingConfiguredRule.amountMinor,
      currency: matchingConfiguredRule.currency,
    };
  }

  if (countryCode === "NG") {
    return {
      amountMinor: defaultNigeriaPriceRule.amountMinor,
      currency: defaultNigeriaPriceRule.currency,
    };
  }

  return {
    amountMinor: defaultInternationalPrice.amountMinor,
    currency: defaultInternationalPrice.currency,
  };
}

export function assertHostedPrice(
  price: HostedPrice,
): void {
  if (
    !Number.isSafeInteger(price.amountMinor) ||
    price.amountMinor <= 0
  ) {
    throw new Error(
      "HOSTED_PRICE_INVALID_AMOUNT",
    );
  }

  if (!price.currency.trim()) {
    throw new Error(
      "HOSTED_PRICE_INVALID_CURRENCY",
    );
  }
}
