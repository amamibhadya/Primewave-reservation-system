import Link from "next/link";
import { ReservationBadge, ResourceStatus } from "@/components/Badges";
import { dashboardStats, listReservations, listResources } from "@/lib/queries";
import { formatRange } from "@/lib/time";
import { displayStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [stats, resources, upcoming] = await Promise.all([
    dashboardStats(),
    listResources(),
    listReservations({ scope: "upcoming", status: "confirmed", limit: 8 }),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted" style={{ margin: 0 }}>Live view of resource usage and availability.</p>
        </div>
        <div className="actions">
          <Link href="/reservations/new" className="btn primary">+ New reservation</Link>
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <div className="card stat"><div className="num">{stats.active_resources}</div><div className="label">Active resources</div></div>
        <div className="card stat"><div className="num">{stats.in_use_now}</div><div className="label">In use right now</div></div>
        <div className="card stat"><div className="num">{stats.today}</div><div className="label">Reservations today</div></div>
        <div className="card stat"><div className="num">{stats.upcoming}</div><div className="label">Upcoming reservations</div></div>
      </div>

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <section className="card">
          <h2>Resource availability</h2>
          {resources.length === 0 ? (
            <div className="empty">No resources yet. <Link href="/resources/new">Add one</Link>.</div>
          ) : (
            <table>
              <tbody>
                {resources.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/resources/${r.id}`}><strong>{r.name}</strong></Link>
                      <div className="muted small">{r.type_name}</div>
                    </td>
                    <td><ResourceStatus r={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2>Next reservations</h2>
          {upcoming.length === 0 ? (
            <div className="empty">Nothing booked.</div>
          ) : (
            <table>
              <tbody>
                {upcoming.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.title}</strong>
                      <div className="muted small">{r.resource_name} · {r.reserved_by}</div>
                      <div className="small">{formatRange(r.start_at, r.end_at)}</div>
                    </td>
                    <td><ReservationBadge status={displayStatus(r)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="small" style={{ margin: "10px 0 0" }}><Link href="/reservations">View all reservations →</Link></p>
        </section>
      </div>
    </>
  );
}
