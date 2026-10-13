import Link from "next/link";
import { ReservationBadge } from "@/components/Badges";
import CancelButton from "@/components/CancelButton";
import { listReservations, listResources } from "@/lib/queries";
import { formatRange } from "@/lib/time";
import { displayStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
] as const;

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; resource?: string }>;
}) {
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "upcoming";
  const resourceId = sp.resource ? Number(sp.resource) : undefined;

  const [resources, reservations] = await Promise.all([
    listResources({ includeInactive: true }),
    listReservations({
      resourceId,
      status: tab === "cancelled" ? "cancelled" : tab === "upcoming" ? "confirmed" : undefined,
      scope: tab === "upcoming" ? "upcoming" : tab === "past" ? "past" : "all",
    }),
  ]);
  const href = (t: string) => `/reservations?tab=${t}${resourceId ? `&resource=${resourceId}` : ""}`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reservations</h1>
          <p className="muted" style={{ margin: 0 }}>Every booking, with full history.</p>
        </div>
        <div className="actions"><Link href="/reservations/new" className="btn primary">+ New reservation</Link></div>
      </div>

      <div className="tabs">
        {TABS.map((t) => <Link key={t.key} href={href(t.key)} className={t.key === tab ? "active" : ""}>{t.label}</Link>)}
      </div>

      <form className="filters" method="get">
        <input type="hidden" name="tab" value={tab} />
        <label>Resource
          <select name="resource" defaultValue={sp.resource ?? ""}>
            <option value="">All resources</option>
            {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
        <button className="btn">Filter</button>
      </form>

      <div className="card table-wrap">
        {reservations.length === 0 ? (
          <div className="empty">No reservations to show.</div>
        ) : (
          <table>
            <thead><tr><th>When</th><th>Resource</th><th>Title</th><th>Reserved by</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {reservations.map((r) => {
                const st = displayStatus(r);
                return (
                  <tr key={r.id}>
                    <td>{formatRange(r.start_at, r.end_at)}</td>
                    <td><Link href={`/resources/${r.resource_id}`}>{r.resource_name}</Link><div className="muted small">{r.resource_type}</div></td>
                    <td>{r.title}<div className="muted small">{r.attendees} attendee{r.attendees > 1 ? "s" : ""}</div></td>
                    <td>{r.reserved_by}{r.contact_email && <div className="muted small">{r.contact_email}</div>}</td>
                    <td><ReservationBadge status={st} />{r.cancel_reason && <div className="muted small">{r.cancel_reason}</div>}</td>
                    <td>{(st === "upcoming" || st === "in-progress") && <CancelButton id={r.id} label={r.title} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
