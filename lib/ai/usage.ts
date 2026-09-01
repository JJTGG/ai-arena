export type UsageRecord = {
  date: string;
  messages: number;
  providers: Record<string, number>;
};

const STORAGE_KEY = "ai-arena-usage";

function getUsage(): UsageRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function recordUsage(providers: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const usage = getUsage();

  let todayRecord = usage.find((record) => record.date === today);

  if (!todayRecord) {
    todayRecord = {
      date: today,
      messages: 0,
      providers: {},
    };

    usage.push(todayRecord);
  }

  todayRecord.messages += 1;

  for (const provider of providers) {
    todayRecord.providers[provider] =
      (todayRecord.providers[provider] ?? 0) + 1;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

export function getUsageHistory(): UsageRecord[] {
  return getUsage();
}