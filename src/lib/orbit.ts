export type Status = "healthy" | "degraded" | "critical";
export type Service = { id: string; name: string; kind: string; status: Status; latency: number; baseline: number; error: number; baselineError: number; cpu: number; memory: number };
export type Scenario = "latency" | "errors" | "database" | "deployment";
export type RootCauseCandidate = { serviceId: string; score: number; confidence: "high" | "medium" | "low"; evidenceFor: string[]; evidenceAgainst: string[] };
export type Incident = { id: string; title: string; scenario: Scenario; trigger: string; severity: "critical" | "high" | "medium"; status: "open" | "investigating" | "mitigated" | "monitoring" | "resolved" | "mitigation_failed"; createdAt: string; dataMode: "synthetic"; timeline: { at: string; title: string; description: string }[]; analysis?: { signal: string; score: number }[]; rootCauseCandidates?: RootCauseCandidate[]; action?: string; verification?: string };
export type OrbitState = { services: Service[]; incidents: Incident[]; events: { at: string; text: string }[]; step: number; scenario: string };

const initialServices: Service[] = [
  { id: "web", name: "Web Gateway", kind: "edge", status: "healthy", latency: 48, baseline: 48, error: 0.2, baselineError: 0.2, cpu: 31, memory: 54 },
  { id: "checkout", name: "Checkout API", kind: "service", status: "healthy", latency: 82, baseline: 82, error: 0.4, baselineError: 0.4, cpu: 42, memory: 61 },
  { id: "catalog", name: "Catalog API", kind: "service", status: "healthy", latency: 67, baseline: 67, error: 0.1, baselineError: 0.1, cpu: 28, memory: 48 },
  { id: "orders", name: "Order Worker", kind: "worker", status: "healthy", latency: 105, baseline: 105, error: 0.3, baselineError: 0.3, cpu: 37, memory: 58 },
  { id: "cache", name: "Redis Cache", kind: "cache", status: "healthy", latency: 4, baseline: 4, error: 0, baselineError: 0, cpu: 22, memory: 46 },
  { id: "postgres", name: "Orders DB", kind: "database", status: "healthy", latency: 12, baseline: 12, error: 0.1, baselineError: 0.1, cpu: 35, memory: 66 },
];

export const dependencies = [
  ["web", "checkout"], ["web", "catalog"], ["checkout", "orders"], ["checkout", "cache"], ["orders", "postgres"], ["catalog", "cache"],
] as const;
export const serviceNames = Object.fromEntries(initialServices.map((s) => [s.id, s.name]));
export function initialState(): OrbitState { return { services: initialServices.map((s) => ({ ...s })), incidents: [], events: [{ at: "2026-01-01T00:00:00.000Z", text: "Synthetic environment initialized" }], step: 0, scenario: "Baseline" }; }
export function downstream(trigger: string) {
  const impacted = new Set<string>([trigger]);
  let changed = true;
  while (changed) { changed = false; for (const [caller, dependency] of dependencies) if (impacted.has(dependency) && !impacted.has(caller)) { impacted.add(caller); changed = true; } }
  return [...impacted];
}
export function rankSignals(service: Service, scenario: Scenario) {
  return (["latency", "error", "cpu", "memory"] as const).map((signal) => {
    const current = signal === "latency" ? service.latency / service.baseline : signal === "error" ? service.error / 0.5 : signal === "cpu" ? service.cpu / 50 : service.memory / 70;
    const anomaly = Math.min(current / 3, 0.99);
    const weight = signal === "latency" || (scenario === "errors" && signal === "error") ? 1 : 0.62;
    return { signal, score: Math.min(0.99, Math.max(0.01, Number((anomaly * weight).toFixed(2)))) };
  }).sort((a, b) => b.score - a.score);
}
export function rankCauses(state: OrbitState, triggerServiceId: string): RootCauseCandidate[] {
  return state.services.map((service) => {
    const latencyRatio = service.latency / Math.max(1, service.baseline);
    const errorRatio = service.error / 2;
    const pressure = Math.max(service.cpu / 90, service.memory / 95);
    const anomaly = Math.min(1, Math.max(0, Math.max((latencyRatio - 1) / 2, (errorRatio - 1) / 4, (pressure - 0.65) / 0.8)));
    const score = Number(Math.min(0.99, Math.max(0.01, anomaly * 0.72 + (service.id === triggerServiceId ? 0.28 : 0))).toFixed(2));
    const evidenceFor = [`${service.latency} ms latency vs ${service.baseline} ms baseline`, `${service.error}% error rate; status ${service.status}`];
    const evidenceAgainst = service.status === "healthy" ? ["Service remains healthy in the current snapshot"] : ["No contradicting synthetic signal recorded"];
    return { serviceId: service.id, score, confidence: score >= 0.75 ? "high" as const : score >= 0.4 ? "medium" as const : "low" as const, evidenceFor, evidenceAgainst };
  }).sort((a, b) => b.score - a.score);
}

const scenarioCopy: Record<Scenario, { title: string; description: string }> = {
  latency: { title: "Elevated latency", description: "Latency increased across a dependency path; telemetry is synthetic." },
  errors: { title: "Error-rate spike", description: "A controlled error-rate increase was injected into one service." },
  database: { title: "Database saturation", description: "Database latency and resource pressure were raised in the simulator." },
  deployment: { title: "Failed deployment", description: "A synthetic release regression was injected into one service." },
};
export function inject(state: OrbitState, scenario: Scenario, serviceId: string, intensity: number): OrbitState {
  if (!scenarioCopy[scenario] || !state.services.some((service) => service.id === serviceId)) throw new Error("Choose a valid scenario and service.");
  const now = new Date().toISOString();
  const affected = downstream(serviceId);
  const services = state.services.map((service) => {
    if (!affected.includes(service.id)) return service;
    const direct = service.id === serviceId;
    const factor = direct ? 1 : 0.35;
    const next = { ...service };
    if (scenario === "latency" || scenario === "database" || scenario === "deployment") next.latency = Math.round(service.baseline * (1 + intensity * factor));
    if (scenario === "errors" || scenario === "deployment") next.error = Number(Math.min(35, service.error + intensity * 0.7 * factor).toFixed(1));
    if (scenario === "database" && service.id === "postgres") { next.cpu = Math.min(99, 35 + intensity * 4); next.memory = Math.min(99, 66 + intensity * 2); }
    const ratio = next.latency / Math.max(1, next.baseline);
    next.status = ratio > 2.4 || next.error > 8 ? "critical" : ratio > 1.35 || next.error > 2 || next.cpu > 80 ? "degraded" : "healthy";
    return next;
  });
  const incident: Incident = { id: `INC-${Date.now().toString(36).toUpperCase()}`, title: `${scenarioCopy[scenario].title} · ${serviceNames[serviceId]}`, scenario, trigger: serviceId, severity: intensity >= 12 ? "critical" : intensity >= 7 ? "high" : "medium", status: "open", createdAt: now, dataMode: "synthetic", timeline: [{ at: now, title: "Fault injected", description: `${scenarioCopy[scenario].description} Trigger: ${serviceNames[serviceId]}. Intensity ${intensity}/15.` }] };
  return { ...state, services, incidents: [incident, ...state.incidents], scenario: scenarioCopy[scenario].title, events: [{ at: now, text: `Fault injected: ${incident.title}` }, ...state.events].slice(0, 40), step: state.step + 1 };
}
export function advance(state: OrbitState, steps: number): OrbitState {
  if (!Number.isInteger(steps) || steps < 1 || steps > 5) throw new Error("Advance between 1 and 5 bounded simulation steps.");
  const incident = state.incidents.find((item) => item.status === "open" || item.status === "investigating");
  if (!incident) {
    const now = new Date().toISOString();
    return { ...state, step: state.step + steps, events: [{ at: now, text: `Advanced ${steps} synthetic baseline step${steps === 1 ? "" : "s"}` }, ...state.events].slice(0, 40) };
  }
  const affected = downstream(incident.trigger);
  const services = state.services.map((service) => {
    if (!affected.includes(service.id) || service.id === incident.trigger) return service;
    const next = { ...service };
    for (let i = 0; i < steps; i++) {
      const propagationLimit = Math.max(next.latency, Math.round(next.baseline * 2.2));
      next.latency = Math.min(next.latency + Math.round(next.baseline * 0.08), propagationLimit);
      if (incident.scenario === "errors" || incident.scenario === "deployment") next.error = Number(Math.min(12, next.error + 0.35).toFixed(1));
      if (incident.scenario === "database" && service.id === "postgres") next.cpu = Math.min(99, next.cpu + 2);
    }
    const ratio = next.latency / Math.max(1, next.baseline);
    next.status = ratio > 2.4 || next.error > 8 ? "critical" : ratio > 1.35 || next.error > 2 || next.cpu > 80 ? "degraded" : "healthy";
    return next;
  });
  const now = new Date().toISOString();
  const message = `Advanced ${steps} bounded synthetic step${steps === 1 ? "" : "s"}; dependency propagation recalculated.`;
  const updatedIncident = { ...incident, timeline: [...incident.timeline, { at: now, title: "Simulation advanced", description: message }] };
  return { ...state, services, incidents: state.incidents.map((item) => item.id === incident.id ? updatedIncident : item), step: state.step + steps, events: [{ at: now, text: message }, ...state.events].slice(0, 40) };
}
export function analyze(state: OrbitState, incidentId: string): OrbitState {
  const incident = state.incidents.find((i) => i.id === incidentId); if (!incident) throw new Error("Incident not found.");
  const impacted = downstream(incident.trigger);
  const service = state.services.find((s) => s.id === incident.trigger)!;
  const scores = rankSignals(service, incident.scenario);
  const causes = rankCauses(state, incident.trigger);
  const now = new Date().toISOString();
  const updated = { ...incident, status: "investigating" as const, analysis: scores, rootCauseCandidates: causes, timeline: [...incident.timeline, { at: now, title: "Analysis completed", description: `Deterministic signal scoring found ${impacted.length} services in the dependency impact set. Top signal: ${scores[0].signal} (${Math.round(scores[0].score * 100)}%). Leading service candidate: ${serviceNames[causes[0].serviceId]} (${Math.round(causes[0].score * 100)}%).` }] };
  return { ...state, incidents: state.incidents.map((i) => i.id === incidentId ? updated : i), events: [{ at: now, text: `Analysis completed for ${incidentId}` }, ...state.events] };
}
export function execute(state: OrbitState, incidentId: string, action: string): OrbitState {
  const allowed = ["scale_service", "restart_service", "rollback_release"];
  if (!allowed.includes(action)) throw new Error("Action is not allowlisted.");
  const incident = state.incidents.find((i) => i.id === incidentId); if (!incident) throw new Error("Incident not found.");
  const now = new Date().toISOString();
  const critical = action === "rollback_release";
  const repaired = action !== "restart_service";
  const impacted = downstream(incident.trigger);
  const services = repaired ? state.services.map((s) => impacted.includes(s.id) ? { ...s, status: "healthy" as const, latency: s.baseline * 1.12, error: Math.min(s.error, s.baselineError + 0.3) } : s) : state.services;
  const next = { ...incident, status: "mitigated" as const, action, timeline: [...incident.timeline, { at: now, title: "Simulated action executed", description: `${action} ran inside the isolated simulator. This did not contact external infrastructure.${critical ? " Approval confirmed for high-impact rollback." : ""}` }] };
  return { ...state, services, incidents: state.incidents.map((i) => i.id === incidentId ? next : i), events: [{ at: now, text: `${action} executed for ${incidentId}` }, ...state.events] };
}
export function verify(state: OrbitState, incidentId: string, forceFail = false): OrbitState {
  const incident = state.incidents.find((i) => i.id === incidentId); if (!incident) throw new Error("Incident not found.");
  if (!incident.action) throw new Error("Execute a simulated action before verification.");
  const now = new Date().toISOString();
  const impacted = downstream(incident.trigger);
  const observed = state.services.filter((s) => impacted.includes(s.id));
  const passes = !forceFail && observed.every((s) => s.status === "healthy" && s.latency <= s.baseline * 1.25 && s.error <= 2);
  const services = passes ? state.services.map((s) => impacted.includes(s.id) ? { ...s, status: "healthy" as const, latency: s.baseline, error: Math.min(s.error, s.baselineError), cpu: s.id === "postgres" ? 35 : s.cpu, memory: s.id === "postgres" ? 66 : s.memory } : s) : state.services;
  const next = { ...incident, status: passes ? "resolved" as const : "mitigation_failed" as const, verification: passes ? "PASS" : "FAIL", timeline: [...incident.timeline, { at: now, title: `Recovery verification ${passes ? "passed" : "failed"}`, description: `Criteria: impacted services healthy, latency ≤ 1.25× baseline, error rate ≤ 2%. ${observed.map((s) => `${s.name}: ${s.status}, ${s.latency} ms latency, ${s.error}% errors`).join("; ")}. Result: ${passes ? "all criteria passed" : "at least one recovery criterion was not met"}.` }] };
  return { ...state, services, incidents: state.incidents.map((i) => i.id === incidentId ? next : i), events: [{ at: now, text: `Verification ${passes ? "passed" : "failed"} for ${incidentId}` }, ...state.events], scenario: passes ? "Recovery verified" : "Mitigation failed" };
}
export function runEvaluationSuite() {
  const cases = [
    { name: "Latency anomaly", scenario: "latency" as const, target: "web", intensity: 9, expected: "latency alert" },
    { name: "Error spike", scenario: "errors" as const, target: "checkout", intensity: 9, expected: "error alert" },
    { name: "Database saturation", scenario: "database" as const, target: "postgres", intensity: 8, expected: "latency alert" },
    { name: "Healthy baseline", scenario: null, target: "web", intensity: 0, expected: "no alert" },
  ];
  return cases.map((fixture) => {
    const state = fixture.scenario ? inject(initialState(), fixture.scenario, fixture.target, fixture.intensity) : initialState();
    const service = state.services.find((item) => item.id === fixture.target)!;
    const topSignal = rankSignals(service, fixture.scenario ?? "latency")[0].signal;
    const actual = service.status === "healthy" ? "no alert" : `${topSignal} alert`;
    return { name: fixture.name, passed: actual === fixture.expected, expected: fixture.expected, actual };
  });
}
