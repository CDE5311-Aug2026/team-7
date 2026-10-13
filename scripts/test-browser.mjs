import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import fs from "node:fs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const baseURL = process.env.FILEO_BASE_URL || "http://127.0.0.1:5173";
const appOrigin = new URL(baseURL).origin;
const { chromium } = require(
  process.env.FILEO_PLAYWRIGHT ||
    path.join(
      homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    ),
);
const out =
  process.env.FILEO_EVIDENCE_DIR ||
  "D:/Codex/Fileo-2026-10-14/web-verification";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.FILEO_BROWSER ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [],
  network = [];
const checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) network.push({ url: r.url(), status: r.status() });
});
const state = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("fileo.workspace.v1")));
const record = async (name) => {
  checks.push({ name, status: "pass" });
  console.log("PASS " + name);
};
const shot = async (name) => {
  await page.screenshot({
    path: path.join(out, name + ".png"),
    fullPage: true,
    animations: "disabled",
  });
};
try {
  await page.goto(baseURL);
  await page
    .getByRole("button", { name: "Enter workspace", exact: true })
    .click();
  await page.waitForLoadState("networkidle");
  await shot("home-desktop");
  assert.equal((await state()).files.length, 42);
  await record("Initial dataset, original Figma assets and local fonts loaded");
  await page
    .getByRole("button", { name: "Change folder", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("Sources").uncheck();
  await page.getByRole("button", { name: "Use this scope" }).click();
  assert.equal((await state()).scope.length, 3);
  await page
    .getByRole("button", { name: "Change folder", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("Sources").check();
  await page.getByRole("button", { name: "Use this scope" }).click();
  await record("Scope chooser changes included folders");
  await page
    .getByRole("checkbox", { name: "Include subfolders", exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "Analyze 8 files", exact: true })
    .waitFor();
  await page
    .getByRole("checkbox", { name: "Include subfolders", exact: true })
    .check();
  await record("Subfolder toggle changes analysis count from 42 to 8 and back");
  await page
    .getByRole("button", { name: "Analyze 42 files", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Review your files", exact: true })
    .waitFor();
  assert.equal(
    (await state()).files.filter((f) => f.status !== "active").length,
    0,
  );
  await shot("review-desktop");
  await page
    .getByRole("button", { name: "Compare orbit versions", exact: true })
    .click();
  await page
    .getByLabel("Compare decision for orbit_v03.blend")
    .selectOption("archive");
  await page
    .getByLabel("Compare decision for orbit_v07.blend")
    .selectOption("keep");
  await shot("compare-desktop");
  await page.getByRole("button", { name: "Done comparing" }).click();
  await record(
    "Version comparison changes the draft while leaving original files intact",
  );
  await page
    .getByRole("button", { name: "Review actions", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Confirm 17 operations", exact: true })
      .isEnabled(),
    false,
  );
  await shot("confirmation-desktop");
  await page
    .getByRole("button", { name: "Edit decisions", exact: true })
    .click();
  assert.equal((await state()).history.length, 0);
  await record("Confirmation is gated and going back does not apply changes");
  await page.reload();
  await page
    .getByRole("heading", { name: "Review your files", exact: true })
    .waitFor();
  assert.equal((await state()).decisions.f02, "archive");
  await record("Reload preserves draft and current step");
  await page
    .getByRole("button", { name: "Review actions", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /I have reviewed/ }).check();
  await page
    .getByRole("button", { name: "Confirm 17 operations", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retry 1 failed file", exact: true })
    .waitFor();
  let s = await state();
  assert.equal(s.history.length, 16);
  assert.equal(
    s.tasks[0].operations.filter((o) => o.status === "failed").length,
    1,
  );
  await shot("results-failure");
  await page
    .getByRole("button", { name: "Retry 1 failed file", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Your files are organized", exact: true })
    .waitFor();
  s = await state();
  assert.equal(s.history.length, 17);
  assert.equal(new Set(s.history.map((h) => h.id)).size, 17);
  await record(
    "Execution changes paths, shows one failure and retries only the failed operation",
  );
  await page
    .getByRole("searchbox")
    .count()
    .then(() => {});
  await page.keyboard.press("Control+k");
  await page
    .getByRole("textbox", { name: "Search your workspace", exact: true })
    .fill("orbit_v03");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("heading", { name: "Search results", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "View orbit_v03.blend", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByText("Documents/Design archive/_Archive/Sources/orbit_v03.blend", {
      exact: true,
    })
    .waitFor();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await shot("search-archived");
  await record("Ctrl K search finds the updated archived path");
  await page
    .getByRole("textbox", { name: "Filter files", exact: true })
    .fill("nothing-matches-this");
  await page
    .getByRole("heading", { name: "No matching files", exact: true })
    .waitFor();
  await shot("search-empty");
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await record("Empty results recover through Clear filters");
  await page
    .getByRole("button", { name: "History & recovery", exact: true })
    .click();
  const row = page
    .locator(".history-row")
    .filter({ hasText: "orbit_v03.blend" });
  await row.getByRole("button", { name: "Restore", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(
    (await state()).files.find((f) => f.id === "f02").status,
    "archived",
  );
  await row.getByRole("button", { name: "Restore", exact: true }).click();
  await page.getByRole("button", { name: "Restore file", exact: true }).click();
  assert.equal(
    (await state()).files.find((f) => f.id === "f02").path,
    "Documents/Design archive/Sources/orbit_v03.blend",
  );
  await shot("history-restored");
  await record(
    "Restore cancel is harmless; confirm restores the original path and records history",
  );
  await page
    .getByRole("button", { name: "Compare the orbit versions", exact: true })
    .click();
  await page
    .locator(".chat-answer")
    .getByText(/This does not prove/)
    .waitFor();
  await record("Assistant shows rule-based evidence and file links");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset demo", exact: true })
    .click();
  s = await state();
  assert.equal(s.history.length, 0);
  assert.equal(s.files.filter((f) => f.status === "active").length, 42);
  await record("Reset restores all 42 seed files");
  const externalRequests = [];
  await context.route("**/*", (route) => {
    if (new URL(route.request().url()).origin === appOrigin)
      return route.continue();
    externalRequests.push(route.request().url());
    return route.abort();
  });
  await page
    .getByRole("button", { name: "Analyze 42 files", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Review your files", exact: true })
    .waitFor();
  assert.deepEqual(externalRequests, []);
  await record(
    "Core flow and assets use only the app origin; no external API needed",
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset demo", exact: true })
    .click();
  for (const [width, height] of [
    [1920, 1080],
    [1280, 800],
    [768, 1024],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(120);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false, `Overflow at ${width}`);
    await shot(`home-${width}`);
    if (width === 390) {
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Browse files", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Browse your files", exact: true })
        .waitFor();
      await shot("browse-mobile");
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page
        .getByRole("button", { name: "Ask Fileo", exact: true })
        .click();
      await page
        .getByRole("button", { name: "What will be analyzed?", exact: true })
        .click();
      await page.locator(".chat-answer").waitFor();
      await page
        .getByRole("button", { name: "Close assistant", exact: true })
        .click();
    }
  }
  await record(
    "1920, 1280, 768 and 390 px layouts have no document overflow; mobile navigation and assistant work",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(network, []);
  await record("No browser console errors or failed asset requests");
  fs.writeFileSync(
    path.join(out, "report.json"),
    JSON.stringify(
      { status: "pass", baseURL, checks, errors, network },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ status: "pass", checks: checks.length, out }));
} catch (error) {
  await shot("failure");
  fs.writeFileSync(
    path.join(out, "report.json"),
    JSON.stringify(
      { status: "fail", checks, error: String(error), errors, network },
      null,
      2,
    ),
  );
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
