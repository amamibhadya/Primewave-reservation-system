import { handle } from "@/lib/api";
import { createResource, listResources } from "@/lib/queries";
import { resourceSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  handle(() => {
    const sp = new URL(req.url).searchParams;
    return listResources({
      includeInactive: sp.get("includeInactive") === "true",
      typeId: sp.get("typeId") ? Number(sp.get("typeId")) : undefined,
      q: sp.get("q") ?? undefined,
    });
  });

export const POST = (req: Request) =>
  handle(async () => createResource(resourceSchema.parse(await req.json())), 201);
