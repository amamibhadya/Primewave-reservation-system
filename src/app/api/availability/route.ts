import { handle } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { findAvailableResources, findConflicts } from "@/lib/queries";
import { localToDate } from "@/lib/time";
import { localDateTime } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?start=2026-10-20T10:00&end=2026-10-20T11:00
 *   -> resources that are free for the whole period
 * add &resourceId=3 to check one resource and get the conflicting reservations back.
 */
export const GET = (req: Request) =>
  handle(async () => {
    const sp = new URL(req.url).searchParams;
    const start = localToDate(localDateTime.parse(sp.get("start")));
    const end = localToDate(localDateTime.parse(sp.get("end")));
    if (end <= start) throw new AppError(400, "End time must be after the start time");

    const resourceId = sp.get("resourceId");
    if (resourceId) {
      const conflicts = await findConflicts(Number(resourceId), start, end);
      return { available: conflicts.length === 0, conflicts };
    }
    return {
      resources: await findAvailableResources(start, end, {
        typeId: sp.get("typeId") ? Number(sp.get("typeId")) : undefined,
        minCapacity: sp.get("minCapacity") ? Number(sp.get("minCapacity")) : undefined,
      }),
    };
  });
