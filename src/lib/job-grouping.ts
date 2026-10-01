/**
 * Groups an already-`createdAt desc`-sorted job list into consecutive
 * same-UTC-day runs. Because the input is already sorted, a single
 * left-to-right walk is enough - no re-sorting, no O(n^2) bucketing.
 *
 * UTC, not the viewer's local timezone or `toLocaleDateString` with an
 * implicit default - this runs in a client component that Next's RSC
 * architecture still renders once on the server for the initial HTML, so an
 * ambient-timezone-dependent label would be the exact class of
 * server/client hydration mismatch (React error #418) already hit and
 * fixed once this session (creations-tabs.tsx's date rendering).
 */
export interface DayGroup<T> {
  dayKey: string; // "2026-10-01" - stable, sortable, safe as a React key
  label: string; // "Today" / "Yesterday" / "Oct 1, 2026"
  jobs: T[];
}

function utcDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function formatDayLabel(date: Date, todayKey: string, yesterdayKey: string): string {
  const key = utcDayKey(date);
  if (key === todayKey) return "Today";
  if (key === yesterdayKey) return "Yesterday";
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export function groupJobsByDay<T extends { createdAt: Date }>(jobs: T[]): DayGroup<T>[] {
  if (jobs.length === 0) return [];

  const now = new Date();
  const todayKey = utcDayKey(now);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = utcDayKey(yesterday);

  const groups: DayGroup<T>[] = [];
  for (const job of jobs) {
    const dayKey = utcDayKey(job.createdAt);
    const current = groups[groups.length - 1];
    if (current && current.dayKey === dayKey) {
      current.jobs.push(job);
    } else {
      groups.push({ dayKey, label: formatDayLabel(job.createdAt, todayKey, yesterdayKey), jobs: [job] });
    }
  }
  return groups;
}
