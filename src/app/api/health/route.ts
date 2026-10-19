import { NextResponse } from "next/server";
import { getState } from "@/lib/store";
export async function GET() {
  const configured = Boolean(process.env.DATABASE_URL);
  let databaseAvailable = false;
  if (configured) { try { databaseAvailable = Boolean(await getState()); } catch { databaseAvailable = false; } }
  return NextResponse.json({ status: databaseAvailable ? "ok" : "degraded", syntheticOnly: true, persistenceConfigured: configured, databaseAvailable, explanationMode: process.env.AI_API_KEY ? "openai-optional" : "deterministic-fallback" }, { status: databaseAvailable ? 200 : 503 });
}
