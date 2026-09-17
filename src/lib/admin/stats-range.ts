import type { StatsRange } from "@/lib/types";

export const STATS_RANGES: Array<{ value: StatsRange; label: string }> = [
  { value: "7d", label: "7 днів" },
  { value: "30d", label: "30 днів" },
  { value: "90d", label: "90 днів" },
  { value: "365d", label: "Рік" },
  { value: "all", label: "Увесь час" },
];

export function parseStatsRange(value: string | null): StatsRange {
  if (
    value === "7d" ||
    value === "30d" ||
    value === "90d" ||
    value === "365d" ||
    value === "all"
  ) {
    return value;
  }
  return "30d";
}
