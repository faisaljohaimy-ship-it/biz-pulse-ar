import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/tour");
fs.mkdirSync(OUT, { recursive: true });

const BASE =
  process.env.TOUR_BASE || "https://id-preview--6f092c67-70c5-400b-9a7e-8c068475864f.lovable.app";

const ROUTES = [
  { name: "01-login", path: "/login" },
  { name: "02-cockpit", path: "/cockpit?demo=1" },
  { name: "03-intelligence", path: "/intelligence?demo=1" },
  { name: "04-decisions", path: "/decisions?demo=1" },
  { name: "05-risk", path: "/risk?demo=1" },
  { name: "06-integrations", path: "/integrations?demo=1" },
  { name: "07-agents", path: "/agents?demo=1" },
  { name: "08-boardroom", path: "/boardroom?demo=1" },
  { name: "09-governance", path: "/governance?demo=1" },
  { name: "10-analytics", path: "/analytics?demo=1" },
  { name: "11-briefing", path: "/briefing?demo=1" },
];

const browser = await puppeteer.launch({
  executablePath: "/bin/chromium",
  headless: "shell",
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--lang=ar-SA,ar"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
// Seed demo flag before any navigation
await page.evaluateOnNewDocument(() => {
  try {
    window.localStorage.setItem("nx_demo", "1");
  } catch {}
});

for (const r of ROUTES) {
  const url = BASE + r.path;
  console.log("→", url);
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
  } catch (e) {
    console.log("  (timeout, continuing):", e.message);
  }
  // Let charts / animations settle
  await new Promise((r) => setTimeout(r, 2200));
  const out = path.join(OUT, r.name + ".png");
  await page.screenshot({ path: out, type: "png", fullPage: false });
  console.log("  saved", out, fs.statSync(out).size);
}

await browser.close();
console.log("DONE");
