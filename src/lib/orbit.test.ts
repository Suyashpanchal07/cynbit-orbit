import { describe, expect, it } from "vitest";
import { advance, analyze, downstream, execute, initialState, inject, rankCauses, rankSignals, runEvaluationSuite, verify } from "@/lib/orbit";
import { deterministicExplanation, explainIncident } from "@/lib/explanation";

describe("synthetic ORBIT engine", () => {
  it("creates reproducible seeded baselines", () => {
    const a = initialState(); const b = initialState();
    expect(a).toEqual(b);
  });
  it("traverses impact edges from a dependency to its callers", () => {
    expect(downstream("postgres")).toEqual(["postgres", "orders", "checkout", "web"]);
  });
  it("ranks elevated latency above unrelated signals", () => {
    const state = inject(initialState(), "latency", "postgres", 10);
    const incident = state.incidents[0];
    const result = analyze(state, incident.id);
    expect(result.incidents[0].analysis?.[0].signal).toBe("latency");
    expect(rankSignals(state.services.find(s => s.id === "postgres")!, "latency")[0].score).toBeGreaterThan(0.5);
  });
  it("ranks the injected service as the leading plausible cause", () => {
    const state = inject(initialState(), "latency", "postgres", 9);
    expect(rankCauses(state, "postgres")[0].serviceId).toBe("postgres");
  });
  it("rejects non-allowlisted actions", () => {
    const state = inject(initialState(), "errors", "checkout", 8);
    expect(() => execute(state, state.incidents[0].id, "run_shell")).toThrow("allowlisted");
  });
  it("advances bounded propagation and rejects unbounded requests", () => {
    const injected = inject(initialState(), "latency", "postgres", 2);
    const stepped = advance(injected, 2);
    expect(stepped.step).toBe(injected.step + 2);
    expect(stepped.services.find(s => s.id === "web")!.latency).toBeGreaterThan(injected.services.find(s => s.id === "web")!.latency);
    expect(() => advance(injected, 6)).toThrow("between 1 and 5");
  });
  it("only resolves after objective recovery verification passes", () => {
    const state = inject(initialState(), "database", "postgres", 8);
    const id = state.incidents[0].id;
    const failed = verify(execute(state, id, "restart_service"), id);
    expect(failed.incidents[0].status).toBe("mitigation_failed");
    const passed = verify(execute(state, id, "scale_service"), id);
    expect(passed.incidents[0].status).toBe("resolved");
    expect(passed.incidents[0].verification).toBe("PASS");
  });
  it("uses the same injection metrics for the same seeded input", () => {
    const a=inject(initialState(),"latency","postgres",7);
    const b=inject(initialState(),"latency","postgres",7);
    expect(a.services).toEqual(b.services);
  });
  it("calculates evaluation expectations from synthetic fixture outputs", () => {
    const results = runEvaluationSuite();
    expect(results).toHaveLength(4);
    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.find((result) => result.name === "Healthy baseline")?.actual).toBe("no alert");
  });
  it("provides a clear deterministic evidence explanation without a provider", () => {
    const state = inject(initialState(), "latency", "postgres", 6);
    const explanation = deterministicExplanation(state.incidents[0], state.services.find(s => s.id === "postgres")!);
    expect(explanation.mode).toBe("deterministic fallback");
    expect(explanation.text).toContain("synthetic evidence");
  });
  it("falls back when the optional provider fails", async () => {
    const state = inject(initialState(), "latency", "postgres", 6);
    const incident = state.incidents[0];
    const service = state.services.find(s => s.id === "postgres")!;
    const originalKey = process.env.AI_API_KEY;
    const originalFetch = globalThis.fetch;
    process.env.AI_API_KEY = "test-only-key";
    globalThis.fetch = async () => new Response("provider unavailable", { status: 503 });
    try {
      expect((await explainIncident(incident, service)).mode).toBe("deterministic fallback");
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey === undefined) delete process.env.AI_API_KEY;
      else process.env.AI_API_KEY = originalKey;
    }
  });
  it("rejects verification before an action is executed", () => {
    const state = inject(initialState(), "latency", "postgres", 5);
    expect(() => verify(state, state.incidents[0].id)).toThrow("Execute a simulated action");
  });
});
