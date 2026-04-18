export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "MarketPulseBoard/2.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} -> ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export function toIsoFromUnix(timestamp: number | null | undefined) {
  if (!timestamp) {
    return new Date().toISOString();
  }

  return new Date(timestamp * 1000).toISOString();
}

export function toDisplayStatus(freshness: string) {
  switch (freshness) {
    case "realtime":
      return "REALTIME";
    case "after-market":
      return "AFTER MARKET";
    case "end-of-day":
      return "END OF DAY";
    case "demo":
      return "DEMO DATA";
    case "delayed":
    default:
      return "DELAYED";
  }
}

export function maxUpdatedAt(values: Array<string | null | undefined>) {
  return values.filter(Boolean).sort().at(-1) ?? null;
}
