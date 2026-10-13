import Link from "next/link";
import ReservationForm from "@/components/ReservationForm";
import { listResources } from "@/lib/queries";
import { toLocalInput } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function NewReservation({
  searchParams,
}: {
  searchParams: Promise<{ resourceId?: string; start?: string; end?: string }>;
}) {
  const sp = await searchParams;
  const resources = (await listResources()).map((r) => ({
    id: r.id, type_id: r.type_id, type_name: r.type_name, name: r.name,
    location: r.location, capacity: r.capacity, description: r.description, is_active: r.is_active,
  }));

  const nextHour = new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000);
  const defStart = sp.start ?? toLocalInput(nextHour);
  const defEnd = sp.end ?? toLocalInput(new Date(nextHour.getTime() + 3_600_000));

  return (
    <>
      <div className="page-head"><h1>New reservation</h1></div>
      <div className="card" style={{ maxWidth: 680 }}>
        {resources.length === 0 ? (
          <div className="empty">There are no active resources to reserve. <Link href="/resources/new">Add one</Link>.</div>
        ) : (
          <ReservationForm
            resources={resources}
            defaults={{ resourceId: sp.resourceId ? Number(sp.resourceId) : undefined, start: defStart, end: defEnd }}
            minLocal={toLocalInput(new Date())}
          />
        )}
      </div>
    </>
  );
}
