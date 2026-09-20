// Screenshots at both marking viewports: `pnpm shot` (after `pnpm build`).
//
// Windows Chrome cannot do this: `chrome.exe --headless --window-size=390,844`
// lays the page out at 526 CSS px and crops the PNG to 390, so the file has the
// size you asked for and a layout you did not. A Linux Chromium lays out at
// exactly 390. This uses Playwright's cached chrome-headless-shell with three
// shared libraries fetched unprivileged into ~/chromium-libs (see CLAUDE.md).
//
// Every run verifies the layout viewport with a probe page before it trusts a
// PNG. A screenshot whose layout width is not the width claimed is not evidence.

import { spawn } from "node:child_process";
import { globSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { gitOrigin, resolveDeployment } from "./pages-base.ts";

const OUT = "docs/screenshots";
const PORT = 4173;
const { base } = resolveDeployment(process.env, gitOrigin);
const BASE = `http://localhost:${PORT}${base.replace(/\/$/, "")}`;
const LIBS = join(homedir(), "chromium-libs/root/usr/lib/x86_64-linux-gnu");

// SHOT_TALL=1 keeps the marking widths but captures 3000 px of height, so a
// table or a long page can be checked below the fold. The layout width is
// what the probe verifies; height only changes how much of the page is kept.
const TALL = process.env.SHOT_TALL === "1";
const VIEWPORTS = [
  { name: TALL ? "1920-tall" : "1920", width: 1920, height: TALL ? 3000 : 1080 },
  { name: TALL ? "390-tall" : "390", width: 390, height: TALL ? 3000 : 844 },
] as const;

// The pages a marker is likely to open, one of each kind.
const PAGES = [
  { name: "home", path: "/" },
  { name: "lectures", path: "/lectures/" },
  { name: "lecture-w04", path: "/lectures/w04-back-with-battery/" },
  { name: "tutorial-w09", path: "/sessions/w09-same-place/" },
  { name: "assignment-2", path: "/assessments/assignment-2/" },
  { name: "people", path: "/people/" },
  { name: "policies", path: "/policies/" },
  { name: "deck-w9", path: "/decks/same-place/" },
] as const;

function binary(): string {
  const found = globSync(
    join(homedir(), ".cache/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell"),
  );
  const path = found[0];
  if (path === undefined) {
    throw new Error(
      "No chrome-headless-shell in ~/.cache/ms-playwright. This needs a LINUX Chromium; " +
        "Windows Chrome clamps the viewport (CLAUDE.md).",
    );
  }
  return path;
}

const CHROME = binary();
const ENV = { ...process.env, LD_LIBRARY_PATH: `${LIBS}:${process.env.LD_LIBRARY_PATH ?? ""}` };

function run(args: readonly string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(CHROME, args, { env: ENV });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => (out += String(chunk)));
    child.stderr.on("data", (chunk) => (err += String(chunk)));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else if (/lib[^\s]*\.so[^\s]*/.test(err)) {
        const missing = /lib[^\s]*\.so[^\s.]*/.exec(err)?.[0];
        reject(
          new Error(
            `${CHROME} is missing ${missing}. Fetch it unprivileged:\n` +
              `  cd ~/chromium-libs && apt-get download <package providing ${missing}>\n` +
              `  for d in *.deb; do dpkg-deb -x "$d" root/; done`,
          ),
        );
      } else reject(new Error(err.trim() || `chrome exited ${code}`));
    });
  });
}

/** Prove the layout viewport really is what was asked for, before shooting it. */
async function verifyViewport(width: number, height: number): Promise<void> {
  const probe = "dist/.viewport-probe.html";
  writeFileSync(
    probe,
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>probe</title></head><body><b id="o"></b><script>` +
      `document.getElementById('o').textContent='W='+document.documentElement.clientWidth;` +
      `</script></body></html>`,
  );
  try {
    const dom = await run([
      "--headless", "--no-sandbox", "--disable-gpu",
      `--window-size=${width},${height}`, "--virtual-time-budget=2000", "--dump-dom",
      `${BASE}/.viewport-probe.html`,
    ]);
    const measured = Number(/W=(\d+)/.exec(dom)?.[1]);
    if (measured !== width) {
      throw new Error(
        `asked for ${width} CSS px, the page laid out at ${measured}. ` +
          `A screenshot from this browser is not evidence of the ${width} viewport.`,
      );
    }
  } finally {
    rmSync(probe, { force: true });
  }
}

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE}/`);
      if (res.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`preview server did not answer at ${BASE}/`);
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const now = new Date();
  const stamp = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  const preview = spawn("node_modules/.bin/astro", ["preview", "--port", String(PORT)], { stdio: "ignore" });
  try {
    await waitForServer();
    for (const viewport of VIEWPORTS) {
      await verifyViewport(viewport.width, viewport.height);
      for (const page of PAGES) {
        const path = `${OUT}/${stamp}-${page.name}-${viewport.name}.png`;
        await run([
          "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
          `--window-size=${viewport.width},${viewport.height}`, "--virtual-time-budget=5000",
          `--screenshot=${path}`, `${BASE}${page.path}`,
        ]);
        console.log(`${path}  ${viewport.width}x${viewport.height} CSS px (verified)`);
      }
    }
  } finally {
    preview.kill();
  }
}

await main();
