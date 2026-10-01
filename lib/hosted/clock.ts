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

export function getUtcDateKey(
  date: Date,
): string {
  return date.toISOString().slice(0, 10);
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