import { handle } from "@/lib/api";
import { createType, listTypes } from "@/lib/queries";
import { typeSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = () => handle(() => listTypes());

export const POST = (req: Request) =>
  handle(async () => createType(typeSchema.parse(await req.json()).name), 201);
