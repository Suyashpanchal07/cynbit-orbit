import { NextResponse } from "next/server";
import { z } from "zod";
import { listEvaluations, saveEvaluation } from "@/lib/store";
import { runEvaluationSuite } from "@/lib/orbit";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json({ runs: await listEvaluations(), persistence: process.env.DATABASE_URL ? "postgresql" : "development-session" }); }
  catch { return NextResponse.json({ error: "Evaluation history storage is unavailable. Check PostgreSQL configuration." }, { status: 503 }); }
}
export async function POST(request: Request) {
  let value: unknown; try { value = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const parsed = z.object({ run: z.literal(true) }).safeParse(value); if (!parsed.success) return NextResponse.json({ error: "Set run=true to execute the deterministic fixture suite." }, { status: 400 });
  const run = { id: `EVAL-${Date.now().toString(36).toUpperCase()}`, createdAt: new Date().toISOString(), results: runEvaluationSuite() };
  try { await saveEvaluation(run); return NextResponse.json({ saved: true, run }); }
  catch { return NextResponse.json({ error: "Evaluation history could not be saved. Check PostgreSQL configuration." }, { status: 503 }); }
}
