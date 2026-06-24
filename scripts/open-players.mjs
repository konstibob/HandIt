// Opens N isolated browser windows pointed at the Expo web dev server, so you
// can play-test the game as several players without juggling real browsers.
//
// Each window is launched as its own browser instance, which means a fully
// isolated session (separate cookies / localStorage / Convex session) — the
// backend sees each window as a different player, exactly like separate devices.
//
// Usage:
//   npm run players            -> 4 players at http://localhost:8081
//   npm run players 6          -> 6 players
//   npm run players 3 http://localhost:8082   -> custom player count + URL
//
// This ONLY opens the windows and arranges them in a grid. It does not fill in
// names or join lobbies — you drive everything by hand.

import { chromium } from "playwright";

const playerCount = Number(process.argv[2]) || 4;
const url = process.argv[3] || process.env.DEV_URL || "http://localhost:8081";

// Phone-ish window size so the layout matches mobile.
const WIDTH = 430;
const HEIGHT = 780;

// Tile the windows in a grid across the screen.
const cols = Math.ceil(Math.sqrt(playerCount));

console.log(`Opening ${playerCount} player window(s) at ${url} ...`);

const browsers = [];

for (let i = 0; i < playerCount; i++) {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const x = col * (WIDTH + 20);
  const y = row * (HEIGHT + 40);

  const browser = await chromium.launch({
    headless: false,
    args: [
      `--window-size=${WIDTH},${HEIGHT}`,
      `--window-position=${x},${y}`,
    ],
  });

  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT - 120 }, // leave room for browser chrome
  });
  const page = await context.newPage();
  // domcontentloaded + short timeout so windows pop up fast and don't block
  // for 30s each if the dev server is slow or not up yet.
  await page
    .goto(url, { waitUntil: "domcontentloaded", timeout: 10000 })
    .catch(() => {
      console.warn(`Player ${i + 1}: could not load ${url} — is the dev server running on that port?`);
    });

  browsers.push(browser);
}

console.log("\nAll windows open. Play away!");
console.log("Press Ctrl+C in this terminal to close them all.\n");

// Close everything cleanly on Ctrl+C.
const shutdown = async () => {
  console.log("\nClosing windows...");
  await Promise.all(browsers.map((b) => b.close().catch(() => {})));
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Keep the process alive so the windows stay open.
await new Promise(() => {});
