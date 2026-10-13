import Link from "next/link";
import { notFound } from "next/navigation";
import { ReservationBadge } from "@/components/Badges";
import CancelButton from "@/components/CancelButton";
import Timeline from "@/components/Timeline";
import ToggleActiveButton from "@/components/ToggleActiveButton";
import { getResource, listReservations } from "@/lib/queries";
import { addDaysToKey, dateKey, dayBounds, formatDay, formatRange, isValidDateKey } from "@/lib/time";
import { displayStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResourceDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; booked?: string }>;
}) {
  const id = Number((await params).id);
  const sp = await searchParams;
  const resource = await getResource(id);
  if (!resource) notFound();

  const day = isValidDateKey(sp.date) ? sp.date : dateKey(new Date());
  const { start, end } = dayBounds(day);
  const [dayReservations, upcoming] = await Promise.all([
    listReservations({ resourceId: id, status: "confirmed", from: start, to: end }),
    listReservations({ resourceId: id, scope: "upcoming", status: "confirmed", limit: 20 }),
  ]);
  const base = `/resources/${id}`;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="small muted" style={{ margin: 0 }}><Link href="/resources">← Resources</Link></p>
          <h1>{resource.name} {!resource.is_active && <span className="badge grey">Inactive</span>}</h1>
          <p className="muted" style={{ margin: 0 }}>{resource.type_name}{resource.location ? ` · ${resource.location}` : ""}</p>
        </div>
        <div className="actions">
          {resource.is_active && <Link className="btn primary" href={`/reservations/new?resourceId=${id}`}>Reserve</Link>}
          <Link className="btn" href={`${base}/edit`}>Edit</Link>
          <ToggleActiveButton id={id} active={resource.is_active} />
        </div>
      </div>

      {sp.booked && <div className="alert ok" style={{ marginBottom: 16 }}>Reservation confirmed.</div>}

      <div className="grid cols-2" style={{ alignItems: "start", gridTemplateColumns: "1fr 2fr" }}>
        <section className="card">
          <h2>Details</h2>
          <dl className="kv">
            <dt>Capacity</dt><dd>{resource.capacity}</dd>
            <dt>Location</dt><dd>{resource.location ?? "—"}</dd>
            <dt>Description</dt><dd>{resource.description ?? "—"}</dd>
          </dl>
        </section>

        <section className="card">
          <div className="res-row" style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Schedule — {formatDay(start)}</h2>
            <div className="actions">
              <Link className="btn sm" href={`${base}?date=${addDaysToKey(day, -1)}`}>← Prev</Link>
              <Link className="btn sm" href={base}>Today</Link>
              <Link className="btn sm" href={`${base}?date=${addDaysToKey(day, 1)}`}>Next →</Link>
            </div>
          </div>
          <Timeline day={day} reservations={dayReservations} />
          {dayReservations.length === 0 ? (
            <p className="muted small" style={{ marginBottom: 0 }}>Free all day.</p>
          ) : (
            <ul style={{ paddingLeft: 18, margin: "10px 0 0" }} className="small">
              {dayReservations.map((r) => (
                <li key={r.id}>{formatRange(r.start_at, r.end_at)} — <strong>{r.title}</strong> ({r.reserved_by})</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Upcoming reservations</h2>
        {upcoming.length === 0 ? (
          <div className="empty">No upcoming reservations.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Title</th><th>Reserved by</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {upcoming.map((r) => (
                  <tr key={r.id}>
                    <td>{formatRange(r.start_at, r.end_at)}</td>
                    <td>{r.title}</td>
                    <td>{r.reserved_by}</td>
                    <td><ReservationBadge status={displayStatus(r)} /></td>
                    <td><CancelButton id={r.id} label={r.title} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
