export interface HostedClock {
  now(): Date;
}

export class SystemHostedClock implements HostedClock {
  now(): Date {
    return new Date();
  }
}

export class FixedHostedClock implements HostedClock {
  private readonly currentTime: Date;

  constructor(currentTime: Date) {
    this.currentTime = new Date(currentTime);
  }

  now(): Date {
    return new Date(this.currentTime);
  }
}

export function toIsoString(
  date: Date,
): string {
  return date.toISOString();
}

export function addDays(
  date: Date,
  days: number,
): Date {
  const result = new Date(date);

  result.setUTCDate(
    result.getUTCDate() + days,
  );

  return result;
}

export function isValidTimeZone(
  timeZone: string,
): boolean {
  const normalized = timeZone.trim();

  if (!normalized) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: normalized,
    }).format(new Date());

    return true;
  } catch {
    return false;
  }
}

export function getDateKeyInTimeZone(
  date: Date,
  timeZone: string,
): string {
  const normalized = timeZone.trim();

  if (!isValidTimeZone(normalized)) {
    throw new RangeError(
      `Invalid IANA time zone: "${timeZone}".`,
    );
  }

  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: normalized,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(date);

  const values = new Map(
    parts
      .filter(
        (part) =>
          part.type === "year" ||
          part.type === "month" ||
          part.type === "day",
      )
      .map((part) => [
        part.type,
        part.value,
      ]),
  );

  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");

  if (!year || !month || !day) {
    throw new Error(
      "Unable to derive a usage date from the supplied time zone.",
    );
  }

  return `${year}-${month}-${day}`;
}

export function getUtcDateKey(
  date: Date,
): string {
  return getDateKeyInTimeZone(
    date,
    "UTC",
  );
}

export function isBefore(
  left: Date,
  right: Date,
): boolean {
  return left.getTime() < right.getTime();
}

export function isAtOrAfter(
  left: Date,
  right: Date,
): boolean {
  return left.getTime() >= right.getTime();
}