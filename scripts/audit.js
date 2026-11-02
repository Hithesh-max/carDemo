import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const port = 3104,
  base = process.env.AUDIT_BASE_URL || `http://127.0.0.1:${port}`;
const server = process.env.AUDIT_BASE_URL
  ? null
  : spawn(process.execPath, ["server.js"], {
      env: { ...process.env, PORT: String(port), DB_PATH: ":memory:" },
      stdio: "pipe",
    });
const routes = [
  ["home", "index.html"],
  ["catalogue", "cars.html"],
  ["car", "car.html?id=creta"],
  ["create-group", "create-group.html"],
  ["group", "groups.html?id=1"],
  ["bids", "bids.html?id=1"],
  ["showrooms", "dealers.html"],
  ["dealer", "dealer.html"],
];
let chrome;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/api/cars")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  const response = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "dealer1@demo.test",
      password: "Collective2026!",
    }),
  });
  const cookie = response.headers.get("set-cookie").split(";")[0];
  chrome = await launch({
    chromePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
    chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
  });
  mkdirSync("docs/audits", { recursive: true });
  const results = [];
  for (const [name, route] of routes) {
    const r = await lighthouse(base + "/" + route, {
      port: chrome.port,
      output: "html",
      onlyCategories: ["accessibility"],
      logLevel: "error",
      formFactor: "desktop",
      screenEmulation: { disabled: true },
      extraHeaders: name === "dealer" ? { Cookie: cookie } : {},
      blockedUrlPatterns: ["*tile.openstreetmap.org*"],
    });
    writeFileSync(`docs/audits/${name}.html`, r.report.replace(/ac_session=[a-f0-9]{64}/g, "[redacted demo session]"));
    const result = {
      page: name,
      url: route,
      score: Math.round(r.lhr.categories.accessibility.score * 100),
      failed: Object.values(r.lhr.audits)
        .filter((x) => x.score === 0)
        .map((x) => ({ id: x.id, title: x.title })),
      lighthouseVersion: r.lhr.lighthouseVersion,
    };
    results.push(result);
    console.log(JSON.stringify(result));
  }
  writeFileSync("docs/audits/results.json", JSON.stringify(results, null, 2));
} finally {
  if (chrome) await chrome.kill();
  if (server) server.kill("SIGTERM");
}
