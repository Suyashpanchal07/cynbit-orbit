import "server-only";
import { initialState, type OrbitState } from "@/lib/orbit";
export type EvaluationRun = { id: string; createdAt: string; results: { name: string; passed: boolean; expected: string; actual: string }[] };

import type postgres from "postgres";
declare global { var orbitDemoState: OrbitState | undefined; var orbitEvaluations: EvaluationRun[] | undefined; var orbitPostgres: ReturnType<typeof postgres> | undefined; var orbitDbInit: Promise<void> | undefined }

async function database() {
  if (!process.env.DATABASE_URL) return null;
  const postgres = (await import("postgres")).default;
  globalThis.orbitPostgres ??= postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 20, connect_timeout: 10, ssl: "require" });
  globalThis.orbitDbInit ??= (async () => {
    const sql = globalThis.orbitPostgres!;
    await sql`CREATE TABLE IF NOT EXISTS orbit_simulator_state (singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton), state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS orbit_evaluations (id text PRIMARY KEY, results jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`INSERT INTO orbit_simulator_state (singleton, state) VALUES (true, ${JSON.stringify(initialState())}::jsonb) ON CONFLICT (singleton) DO NOTHING`;
  })();
  await globalThis.orbitDbInit;
  return globalThis.orbitPostgres;
}

export async function getState(): Promise<OrbitState | null> {
  const sql = await database();
  if (sql) { const rows = await sql<{ state: OrbitState }[]>`SELECT state FROM orbit_simulator_state WHERE singleton = true`; return rows[0]?.state ?? null; }
  if (process.env.NODE_ENV === "production") return null;
  globalThis.orbitDemoState ??= initialState();
  return globalThis.orbitDemoState;
}
export async function updateState(mutator: (state: OrbitState) => OrbitState) {
  const sql = await database();
  if (sql) {
    return await sql.begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(72618421)`;
      const rows = await transaction<{ state: OrbitState }[]>`SELECT state FROM orbit_simulator_state WHERE singleton = true FOR UPDATE`;
      if (!rows[0]) throw new Error("Simulator state has not been initialized.");
      const next = mutator(rows[0].state);
      await transaction`UPDATE orbit_simulator_state SET state = ${JSON.stringify(next)}::jsonb, updated_at = now() WHERE singleton = true`;
      return next;
    });
  }
  if (process.env.NODE_ENV === "production") throw new Error("Configure DATABASE_URL before using simulator writes in production.");
  globalThis.orbitDemoState ??= initialState();
  globalThis.orbitDemoState = mutator(globalThis.orbitDemoState);
  return globalThis.orbitDemoState;
}
export async function saveEvaluation(run: EvaluationRun) {
  const sql = await database();
  if (sql) { await sql`INSERT INTO orbit_evaluations (id, results, created_at) VALUES (${run.id}, ${JSON.stringify(run.results)}::jsonb, ${run.createdAt})`; return; }
  if (process.env.NODE_ENV === "production") throw new Error("Configure DATABASE_URL before saving evaluation history in production.");
  globalThis.orbitEvaluations ??= [];
  globalThis.orbitEvaluations = [run, ...globalThis.orbitEvaluations].slice(0, 30);
}
export async function listEvaluations() {
  const sql = await database();
  if (sql) return await sql<EvaluationRun[]>`SELECT id, created_at as "createdAt", results FROM orbit_evaluations ORDER BY created_at DESC LIMIT 30`;
  if (process.env.NODE_ENV === "production") throw new Error("Configure DATABASE_URL before reading evaluation history in production.");
  return globalThis.orbitEvaluations ?? [];
}
