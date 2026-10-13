"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Reservation, Resource } from "@/lib/types";
import { formatRange } from "@/lib/time";

type Props = {
  resources: Resource[];
  defaults: { resourceId?: number; start: string; end: string };
  minLocal: string; // earliest selectable local datetime
};

export default function ReservationForm({ resources, defaults, minLocal }: Props) {
  const router = useRouter();
  const [resourceId, setResourceId] = useState(String(defaults.resourceId ?? resources[0]?.id ?? ""));
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Reservation[]>([]);

  const resource = resources.find((r) => String(r.id) === resourceId);

  // Live availability check while the user picks a time (debounced).
  useEffect(() => {
    setConflicts([]);
    if (!resourceId || !start || !end || end <= start) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/availability?resourceId=${resourceId}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
          { signal: ctrl.signal },
        );
        const j = await res.json();
        if (res.ok) setConflicts(j.data.conflicts);
      } catch {
        /* ignore aborted / offline checks — the server still enforces the rule on submit */
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [resourceId, start, end]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource_id: resourceId,
        title: f.get("title"),
        reserved_by: f.get("reserved_by"),
        contact_email: f.get("contact_email"),
        attendees: f.get("attendees"),
        start,
        end,
      }),
    });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(j.error ?? "Could not create the reservation");
      if (res.status === 409 && Array.isArray(j.details)) setConflicts(j.details);
      return;
    }
    router.push(`/resources/${resourceId}?date=${start.slice(0, 10)}&booked=1`);
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      {error && <div className="alert error">{error}</div>}
      <label>
        Resource
        <select value={resourceId} onChange={(e) => setResourceId(e.target.value)} required>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} — {r.type_name} (capacity {r.capacity})
            </option>
          ))}
        </select>
      </label>
      <label>
        Title / purpose
        <input name="title" required maxLength={120} placeholder="e.g. Sprint planning" />
      </label>
      <div className="row">
        <label>
          Reserved by <span className="field-hint">(person or team)</span>
          <input name="reserved_by" required maxLength={100} />
        </label>
        <label>
          Contact email <span className="field-hint">(optional)</span>
          <input name="contact_email" type="email" />
        </label>
      </div>
      <div className="row">
        <label>
          Start
          <input type="datetime-local" required value={start} min={minLocal} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          End
          <input type="datetime-local" required value={end} min={start || minLocal} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      <label style={{ maxWidth: 220 }}>
        Attendees {resource && <span className="field-hint">(max {resource.capacity})</span>}
        <input name="attendees" type="number" min={1} max={resource?.capacity} defaultValue={1} required />
      </label>

      {conflicts.length > 0 && (
        <div className="alert warn">
          <strong>That time is not free.</strong> Already booked:
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {conflicts.map((c) => (
              <li key={c.id}>
                {formatRange(c.start_at, c.end_at)} — {c.title} ({c.reserved_by})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="actions">
        <button className="btn primary" disabled={busy || conflicts.length > 0}>
          {busy ? "Reserving…" : "Reserve"}
        </button>
        <button type="button" className="btn" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
