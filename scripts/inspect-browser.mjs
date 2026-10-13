import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require(
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
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:5173");
await page.getByRole("button", { name: "Enter workspace", exact: true }).click();
await page.waitForLoadState("networkidle");
await page.screenshot({
  path: path.join(out, "home-desktop.png"),
  fullPage: true,
});
console.log(
  JSON.stringify(
    {
      title: await page.title(),
      errors,
      body: await page.locator("body").innerText(),
      assets: await page
        .locator("img")
        .evaluateAll((imgs) =>
          imgs.map((i) => ({
            src: i.src,
            ok: i.complete && i.naturalWidth > 0,
            w: i.getBoundingClientRect().width,
            h: i.getBoundingClientRect().height,
          })),
        ),
      overflow: await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        viewport: innerWidth,
      })),
    },
    null,
    2,
  ),
);
await browser.close();
