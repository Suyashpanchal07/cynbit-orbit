import { NextResponse } from "next/server";
import { z } from "zod";
import { explainIncident } from "@/lib/explanation";
import { getState } from "@/lib/store";
export const dynamic = "force-dynamic";
const requestSchema = z.object({ incidentId: z.string().min(1).max(80) });
export async function POST(request: Request) {
  let value: unknown; try { value = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const parsed = requestSchema.safeParse(value); if (!parsed.success) return NextResponse.json({ error: "A valid incidentId is required." }, { status: 400 });
  try {
    const state = await getState(); if (!state) return NextResponse.json({ error: "Simulator state is unavailable until production PostgreSQL is configured." }, { status: 503 });
    const incident = state.incidents.find((item) => item.id === parsed.data.incidentId); if (!incident) return NextResponse.json({ error: "Incident not found." }, { status: 404 });
    const service = state.services.find((item) => item.id === incident.trigger); if (!service) return NextResponse.json({ error: "Incident trigger service is missing." }, { status: 409 });
    return NextResponse.json(await explainIncident(incident, service));
  } catch { return NextResponse.json({ error: "Explanation service is unavailable." }, { status: 503 }); }
}
