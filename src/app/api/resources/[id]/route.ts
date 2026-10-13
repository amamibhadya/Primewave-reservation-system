import { z } from "zod";
import { handle, idParam } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { getResource, updateResource } from "@/lib/queries";
import { resourceSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = (_req: Request, { params }: Ctx) =>
  handle(async () => {
    const r = await getResource(idParam((await params).id));
    if (!r) throw new AppError(404, "Resource not found");
    return r;
  });

const patchSchema = resourceSchema.partial().extend({ is_active: z.boolean().optional() });

export const PATCH = (req: Request, { params }: Ctx) =>
  handle(async () => updateResource(idParam((await params).id), patchSchema.parse(await req.json())));
