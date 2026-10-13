import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

/** Wraps a route handler: turns validation / business errors into clean JSON responses. */
export async function handle(fn: () => Promise<unknown>, successStatus = 200) {
  try {
    const data = await fn();
    return NextResponse.json({ data }, { status: successStatus });
  } catch (e) {
    if (e instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of e.issues) fields[issue.path.join(".") || "_"] ??= issue.message;
      return NextResponse.json({ error: Object.values(fields)[0] ?? "Invalid input", fields }, { status: 400 });
    }
    if (e instanceof AppError) {
      return NextResponse.json({ error: e.message, details: e.details }, { status: e.status });
    }
    if (e instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Something went wrong on the server" }, { status: 500 });
  }
}

export const idParam = (v: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(404, "Not found");
  return n;
};
