/**
 * 2026-11-19: the same night can't be logged twice. Sleep logs on one day add up, so a nap counts, but logging the
 * same night again counted it twice (7.5 hours became 15, scored as too much sleep). The server refuses an overlapping
 * log too (backend/app/services/sleep_logs.py); this check gives the message straight away.
 */
export type SavedSleep = { bedtime?: string | null; wake_time?: string | null; is_deleted?: boolean | null };

/** The saved log whose sleep overlaps bedtime to wakeTime, or null. Sleep that only touches doesn't count. */
export function overlappingSleep(bedtime: Date, wakeTime: Date, saved: SavedSleep[] | null | undefined): SavedSleep | null {
  const start = bedtime.getTime();
  const end = wakeTime.getTime();
  if (!(end > start)) return null;
  for (const log of saved ?? []) {
    if (log.is_deleted || !log.bedtime || !log.wake_time) continue;
    const s = new Date(log.bedtime).getTime();
    const e = new Date(log.wake_time).getTime();
    if (Number.isFinite(s) && Number.isFinite(e) && start < e && s < end) return log;
  }
  return null;
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** The same words the server uses. */
export function overlapMessage(log: SavedSleep): string {
  return log.bedtime && log.wake_time
    ? `You already logged sleep from ${clock(log.bedtime)} to ${clock(log.wake_time)}. A nap at another time can still be added.`
    : "You already logged sleep for this time.";
}
