import { handle, idParam } from "@/lib/api";
import { cancelReservation } from "@/lib/queries";
import { cancelSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    const id = idParam((await params).id);
    const body = await req.json().catch(() => ({}));
    return cancelReservation(id, cancelSchema.parse(body).reason);
  });
