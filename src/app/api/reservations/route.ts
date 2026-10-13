import { handle } from "@/lib/api";
import { createReservation, listReservations } from "@/lib/queries";
import { localToDate } from "@/lib/time";
import { reservationSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  handle(() => {
    const sp = new URL(req.url).searchParams;
    const status = sp.get("status");
    const scope = sp.get("scope");
    const from = sp.get("from");
    const to = sp.get("to");
    return listReservations({
      resourceId: sp.get("resourceId") ? Number(sp.get("resourceId")) : undefined,
      status: status === "confirmed" || status === "cancelled" ? status : undefined,
      scope: scope === "upcoming" || scope === "past" ? scope : "all",
      from: from ? localToDate(from) : undefined,
      to: to ? localToDate(to) : undefined,
    });
  });

export const POST = (req: Request) =>
  handle(async () => createReservation(reservationSchema.parse(await req.json())), 201);
