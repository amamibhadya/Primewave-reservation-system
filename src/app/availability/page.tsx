import Link from "next/link";
import { findAvailableResources, listTypes } from "@/lib/queries";
import { formatRange, localToDate, toLocalInput } from "@/lib/time";

export const dynamic = "force-dynamic";

/** "I need something on <time> — what is free?" Pure server-rendered GET form. */
export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; type?: string; capacity?: string }>;
}) {
  const sp = await searchParams;
  const nextHour = new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000);
  const start = sp.start ?? toLocalInput(nextHour);
  const end = sp.end ?? toLocalInput(new Date(nextHour.getTime() + 3_600_000));
  const types = await listTypes();

  const s = localToDate(start);
  const e = localToDate(end);
  const valid = !isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s;
  const results = valid
    ? await findAvailableResources(s, e, {
        typeId: sp.type ? Number(sp.type) : undefined,
        minCapacity: sp.capacity ? Number(sp.capacity) : undefined,
      })
    : [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Find availability</h1>
          <p className="muted" style={{ margin: 0 }}>Pick a time and see which resources are free for the whole period.</p>
        </div>
      </div>

      <form className="filters card" method="get" style={{ alignItems: "end" }}>
        <label>From<input type="datetime-local" name="start" defaultValue={start} required /></label>
        <label>To<input type="datetime-local" name="end" defaultValue={end} required /></label>
        <label>Type
          <select name="type" defaultValue={sp.type ?? ""}>
            <option value="">Any</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label>Min. capacity<input type="number" min={1} name="capacity" defaultValue={sp.capacity} style={{ minWidth: 100 }} /></label>
        <button className="btn primary">Search</button>
      </form>

      {!valid ? (
        <div className="alert error">The end time must be after the start time.</div>
      ) : (
        <div className="card">
          <h2>{results.length} available · {formatRange(s, e)}</h2>
          {results.length === 0 ? (
            <div className="empty">Nothing is free for that whole period. Try a different time.</div>
          ) : (
            <table>
              <thead><tr><th>Resource</th><th>Type</th><th>Location</th><th>Capacity</th><th></th></tr></thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/resources/${r.id}`}><strong>{r.name}</strong></Link></td>
                    <td>{r.type_name}</td>
                    <td>{r.location ?? "—"}</td>
                    <td>{r.capacity}</td>
                    <td>
                      <Link className="btn sm primary" href={`/reservations/new?resourceId=${r.id}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`}>
                        Reserve
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
