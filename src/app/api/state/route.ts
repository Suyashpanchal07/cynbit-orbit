import { NextResponse } from "next/server";
import { getState } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  let state;
  try { state = await getState(); } catch { return NextResponse.json({ error: "PostgreSQL is configured but unavailable. Check the server-side database connection." }, { status: 503 }); }
  if (!state) return NextResponse.json({ error: "Database persistence is not configured. Simulator data is unavailable in production until DATABASE_URL is set." }, { status: 503 });
  return NextResponse.json({ state, persistence: process.env.DATABASE_URL ? "postgresql" : "development-session" });
}
