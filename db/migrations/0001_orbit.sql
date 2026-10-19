CREATE TABLE IF NOT EXISTS orbit_simulator_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orbit_evaluations (
  id text PRIMARY KEY,
  results jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
