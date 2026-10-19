import { expect, test } from "@playwright/test";

test("synthetic operations journey: inject, investigate, act, verify, evaluate, reset", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("SYNTHETIC DEMO DATA")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Live operations" })).toBeVisible();
  await page.getByRole("combobox", { name: "Fault type" }).selectOption("latency");
  await page.getByRole("combobox", { name: "Target service" }).selectOption("postgres");
  await page.getByRole("button", { name: /Inject incident/ }).click();
  await expect(page.getByText("Fault injected. Telemetry and impact updated.")).toBeVisible();
  await page.getByRole("link", { name: "Investigate incident" }).click();
  await page.getByRole("button", { name: /Re-run analysis/ }).click();
  await expect(page.getByText(/Top signal: latency/)).toBeVisible();
  await page.getByRole("button", { name: "Execute simulated action", exact: true }).first().click();
  await expect(page.getByText(/Executed: scale_service/)).toBeVisible();
  await page.getByRole("button", { name: "Verify recovery" }).click();
  await expect(page.getByText("resolved", { exact: true }).first()).toBeVisible();
  await page.goto("/evaluations");
  await page.getByRole("button", { name: /Run evaluation suite/ }).click();
  await expect(page.getByRole("status")).toContainText("4 passed");
  await page.goto("/settings");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: /Reset demo environment/ }).click();
  await expect(page.getByText("Environment reset to baseline.")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("0 open")).toBeVisible();
});
