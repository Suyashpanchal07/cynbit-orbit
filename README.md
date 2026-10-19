# Cynbit ORBIT

Cynbit ORBIT is a synthetic operations intelligence proof of concept. It demonstrates a service topology, deterministic telemetry fault injection, dependency impact traversal, signal ranking, allowlisted simulated actions, and recovery checks. It does not connect to real infrastructure and is not autonomous operations software.

## Features

- Live synthetic service status, topology graph, latency/error trend, active incident panel, history and detail pages.
- Bounded simulator actions for latency, error rate, database pressure, and deployment regression.
- Deterministic signal scoring and caller-to-dependency impact traversal.
- Allowlisted `scale_service`, `restart_service`, and `rollback_release` actions. High-impact rollback requires confirmation.
- Recovery criteria: impacted services healthy, latency no more than 1.25× baseline, and errors no more than 2%.
- Evaluation fixtures, incident JSON export, responsive navigation, CSP/security headers, and `/api/health`.
- PostgreSQL-backed simulator state when `DATABASE_URL` is set. Local development without a database uses process-local demo state; production never falls back to server memory and reports missing persistence.

## Architecture

```mermaid
flowchart LR
  UI[Next.js operations UI] --> API[Validated App Router API]
  API --> Engine[Deterministic simulator and analysis]
  API --> DB[(PostgreSQL JSON state + evaluation records)]
  Engine -->|allowlisted action only| Sim[Synthetic service state]
  API -. optional text explanation .-> LLM[Server-side provider adapter]
```

The optional evidence explanation uses the OpenAI Responses API only when `AI_API_KEY` is configured. It requests a constrained JSON explanation, validates the result, renders it as text, and falls back deterministically on missing keys, API errors, timeouts, or invalid output. The key remains server-side. No model output is executable. The only execution boundary is the simulator allowlist. State records include only synthetic data.

## Local setup

Requirements: Node.js 20.9 or newer and npm. Node 24 is used in the current workspace.

```sh
npm install
npm run dev
```

On PowerShell, copy the example first with `Copy-Item .env.example .env`. On macOS/Linux, use `cp .env.example .env`. The database variable is optional for local development.

Open `http://localhost:3000`. Without `DATABASE_URL`, local actions work in a process-local session. Restarting the dev server clears that session. Configure PostgreSQL to preserve state across server restarts.

## Database

Create a PostgreSQL database (Neon is supported). Put its server-side connection string in `.env`:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

Then initialize and seed an empty database:

```sh
npm run db:migrate
npm run db:seed
```

The application also creates the minimal state/evaluation tables on first server use. The migration is safe to rerun. `db:seed` inserts the baseline only when the singleton state is absent. Simulator history is part of the state JSON document; evaluation runs have a separate PostgreSQL table in the current schema.

## Environment variables

See [.env.example](.env.example). `DATABASE_URL` is required for durable production operation. `AI_API_KEY` is optional and only enables the evidence explanation panel; core simulator functionality works without it. `AI_MODEL` selects the OpenAI model used for that optional explanation.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run test:e2e` runs the Playwright browser journey (Chromium must be installed with `npx playwright install chromium`). The unit suite covers deterministic algorithms and state transitions. No paid model provider is contacted by tests.

## Cynbit demo

1. Open Live operations and point out the synthetic-data banner, health score, and service graph.
2. Load the demo scenario, then inspect the impacted dependency path and updated telemetry.
3. Open the active incident, run analysis, and explain that the scores are deterministic signal rankings.
4. Execute the low-risk scale simulation and verify the explicit latency/error/status criteria.
5. Open incident history and export a report; run the fixture evaluation suite.
6. Reset the environment and show the seeded baseline.

## Known limitations

- Telemetry, incidents, actions, and evaluations are synthetic. Signal ranks are not a validated causal model.
- Local no-database state is process-local and intended only for development; production writes require PostgreSQL.
- Detailed labeled-model precision, recall, and calibration metrics are not exposed in the UI.
- The optional model explanation depends on provider availability and is not a validated operational recommendation.
- End-to-end tests require the Playwright Chromium browser download. Do not use the demo to direct production incident response.

## Security boundary

The app accepts only schema-validated scenario parameters and the fixed simulator action allowlist. It never accepts shell commands, arbitrary code, real endpoints, or credentials. Reset is confirmed in the UI; rollback requires a second approval confirmation. Treat every displayed estimate as synthetic until independently validated.
