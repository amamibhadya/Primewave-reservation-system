import Link from "next/link";
import { ResourceStatus } from "@/components/Badges";
import { listResources, listTypes } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; inactive?: string }>;
}) {
  const sp = await searchParams;
  const [types, resources] = await Promise.all([
    listTypes(),
    listResources({
      includeInactive: sp.inactive === "1",
      typeId: sp.type ? Number(sp.type) : undefined,
      q: sp.q?.trim() || undefined,
    }),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Resources</h1>
          <p className="muted" style={{ margin: 0 }}>Rooms, vehicles, equipment and other shared assets.</p>
        </div>
        <div className="actions"><Link href="/resources/new" className="btn primary">+ Add resource</Link></div>
      </div>

      <form className="filters" method="get">
        <label>Search<input name="q" defaultValue={sp.q} placeholder="Name or location" /></label>
        <label>Type
          <select name="type" defaultValue={sp.type ?? ""}>
            <option value="">All types</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <input type="checkbox" name="inactive" value="1" defaultChecked={sp.inactive === "1"} style={{ width: "auto" }} />
          Show inactive
        </label>
        <button className="btn">Filter</button>
      </form>

      <div className="card table-wrap">
        {resources.length === 0 ? (
          <div className="empty">No resources match.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>Location</th><th>Capacity</th><th>Status now</th><th></th></tr></thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/resources/${r.id}`}><strong>{r.name}</strong></Link></td>
                  <td>{r.type_name}</td>
                  <td>{r.location ?? "—"}</td>
                  <td>{r.capacity}</td>
                  <td><ResourceStatus r={r} /></td>
                  <td>{r.is_active && <Link className="btn sm" href={`/reservations/new?resourceId=${r.id}`}>Reserve</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
