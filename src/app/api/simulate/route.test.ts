import { describe, expect, it } from "vitest";
import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
describe("simulator API validation", () => {
  it("rejects out-of-range intensity", async () => {
    const response = await POST(request({ action: "inject", scenario: "latency", serviceId: "postgres", intensity: 30 }));
    expect(response.status).toBe(400);
  });
  it("rejects unallowlisted actions at the request boundary", async () => {
    const response = await POST(request({ action: "execute", incidentId: "INC-1", actionType: "run_shell" }));
    expect(response.status).toBe(400);
  });
  it("requires approval for rollback", async () => {
    const response = await POST(request({ action: "execute", incidentId: "INC-1", actionType: "rollback_release" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("requires explicit approval");
  });
});
