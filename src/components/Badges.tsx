import type { DisplayStatus, ResourceWithStatus } from "@/lib/types";
import { formatDateTime, formatTime } from "@/lib/time";

export function ReservationBadge({ status }: { status: DisplayStatus }) {
  const map: Record<DisplayStatus, [string, string]> = {
    upcoming: ["blue", "Upcoming"],
    "in-progress": ["green", "In progress"],
    completed: ["grey", "Completed"],
    cancelled: ["red", "Cancelled"],
  };
  const [cls, label] = map[status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

/** Live availability of a resource right now. */
export function ResourceStatus({ r }: { r: ResourceWithStatus }) {
  if (!r.is_active) return <span className="badge grey">Inactive</span>;
  if (r.in_use_until)
    return (
      <span>
        <span className="badge amber">In use</span>{" "}
        <span className="muted small">until {formatTime(r.in_use_until)}</span>
      </span>
    );
  return (
    <span>
      <span className="badge green">Available now</span>
      {r.next_start && <span className="muted small"> · next booking {formatDateTime(r.next_start)}</span>}
    </span>
  );
}
