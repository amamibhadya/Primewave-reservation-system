// All timestamps are stored in UTC (timestamptz). People think in the organisation's
// local time, so every conversion to/from "local" text goes through ORG_TIMEZONE.
export const ORG_TZ = process.env.ORG_TIMEZONE || "Asia/Colombo";

function parts(date: Date, tz = ORG_TZ) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(date)) o[p.type] = p.value;
  return {
    year: +o.year,
    month: +o.month,
    day: +o.day,
    hour: +o.hour,
    minute: +o.minute,
    second: +o.second,
  };
}

/** Offset (ms) of `tz` from UTC at the given instant. */
function tzOffsetMs(date: Date, tz: string) {
  const p = parts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convert "YYYY-MM-DDTHH:mm" (wall-clock time in the org timezone) to a real instant. */
export function localToDate(local: string, tz = ORG_TZ): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return new Date(NaN);
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let ts = guess - tzOffsetMs(new Date(guess), tz);
  ts = guess - tzOffsetMs(new Date(ts), tz); // second pass handles DST edges
  return new Date(ts);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" for an instant, in the org timezone. */
export function dateKey(date: Date): string {
  const p = parts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "YYYY-MM-DDTHH:mm" for an instant, in the org timezone (value for <input type=datetime-local>). */
export function toLocalInput(date: Date): string {
  const p = parts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function minutesIntoDay(date: Date): number {
  const p = parts(date);
  return p.hour * 60 + p.minute;
}

export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function dayBounds(key: string): { start: Date; end: Date } {
  return { start: localToDate(`${key}T00:00`), end: localToDate(`${addDaysToKey(key, 1)}T00:00`) };
}

export const isValidDateKey = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(localToDate(`${s}T00:00`).getTime());

const dt = new Intl.DateTimeFormat("en-GB", {
  timeZone: ORG_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const tm = new Intl.DateTimeFormat("en-GB", { timeZone: ORG_TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const dd = new Intl.DateTimeFormat("en-GB", {
  timeZone: ORG_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const formatDateTime = (d: Date | string) => dt.format(new Date(d));
export const formatTime = (d: Date | string) => tm.format(new Date(d));
export const formatDay = (d: Date | string) => dd.format(new Date(d));

/** "Thu 15 Oct, 10:00 – 11:30" (adds the end date if it is a different day). */
export function formatRange(start: Date | string, end: Date | string) {
  const s = new Date(start);
  const e = new Date(end);
  return dateKey(s) === dateKey(e)
    ? `${formatDateTime(s)} – ${formatTime(e)}`
    : `${formatDateTime(s)} → ${formatDateTime(e)}`;
}
