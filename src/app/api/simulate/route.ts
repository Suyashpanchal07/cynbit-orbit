import { NextResponse } from "next/server";
import { z } from "zod";
import { advance, analyze, execute, initialState, inject, verify } from "@/lib/orbit";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";
const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset") }),
  z.object({ action: z.literal("advance"), steps: z.number().int().min(1).max(5) }),
  z.object({ action: z.literal("inject"), scenario: z.enum(["latency", "errors", "database", "deployment"]), serviceId: z.string().min(1).max(32), intensity: z.number().int().min(1).max(15) }),
  z.object({ action: z.literal("analyze"), incidentId: z.string().min(1).max(80) }),
  z.object({ action: z.literal("execute"), incidentId: z.string().min(1).max(80), actionType: z.enum(["scale_service", "restart_service", "rollback_release"]), approved: z.boolean().optional() }),
  z.object({ action: z.literal("verify"), incidentId: z.string().min(1).max(80) }),
]);
class SimulatorRuleError extends Error {}

export async function POST(request: Request) {
  let value: unknown;
  try { value = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 }); }
  const parsed = requestSchema.safeParse(value);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`).join("; ") }, { status: 400 });
  const body = parsed.data;
  if (body.action === "execute" && body.actionType === "rollback_release" && body.approved !== true) return NextResponse.json({ error: "High-impact rollback requires explicit approval." }, { status: 400 });

  try {
    const state = await updateState((current) => {
      try {
        switch (body.action) {
          case "reset": return initialState();
          case "advance": return advance(current, body.steps);
          case "inject": return inject(current, body.scenario, body.serviceId, body.intensity);
          case "analyze": return analyze(current, body.incidentId);
          case "execute": return execute(current, body.incidentId, body.actionType);
          case "verify": return verify(current, body.incidentId);
        }
      } catch (error) {
        throw new SimulatorRuleError(error instanceof Error ? error.message : "Simulator operation failed.");
      }
    });
    return NextResponse.json({ state });
  } catch (error) {
    if (error instanceof SimulatorRuleError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: process.env.DATABASE_URL ? "PostgreSQL is unavailable. Check the server-side database connection." : "Database persistence is not configured. Simulator writes are disabled in production." }, { status: 503 });
  }
}
