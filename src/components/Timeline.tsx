import type { Reservation } from "@/lib/types";
import { dayBounds, formatTime } from "@/lib/time";

/** A 24-hour bar for one day showing booked periods for a single resource. */
export default function Timeline({ day, reservations }: { day: string; reservations: Reservation[] }) {
  const { start, end } = dayBounds(day);
  const total = end.getTime() - start.getTime();
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - start.getTime()) / total) * 100));
  const now = Date.now();
  const showNow = now >= start.getTime() && now < end.getTime();

  return (
    <div>
      <div className="timeline" role="img" aria-label="Bookings for the day">
        {reservations
          .filter((r) => r.status === "confirmed")
          .map((r) => {
            const left = pct(new Date(r.start_at).getTime());
            const right = pct(new Date(r.end_at).getTime());
            return (
              <div
                key={r.id}
                className="tl-block"
                style={{ left: `${left}%`, width: `${right - left}%` }}
                title={`${r.title} — ${r.reserved_by} (${formatTime(r.start_at)}–${formatTime(r.end_at)})`}
              >
                {r.title}
              </div>
            );
          })}
        {showNow && <div className="tl-now" style={{ left: `${pct(now)}%` }} title="Now" />}
      </div>
      <div className="tl-axis">
        {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
          <span key={h} style={{ left: `${(h / 24) * 100}%` }}>
            {String(h).padStart(2, "0")}:00
          </span>
        ))}
      </div>
    </div>
  );
}
