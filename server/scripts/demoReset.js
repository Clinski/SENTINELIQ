// One-command demo reset — run between takes for a clean slate.
//   npm run demo:reset
//
// 1. Re-seeds the DB (fresh balances, decoys all "armed", access_logs cleared).
// 2. Kills whatever is listening on PORT (the old server + its in-memory risk state).
// 3. Relaunches the server DETACHED with MOCK_FEED=off, so this command returns but
//    the server keeps running. Server logs go to server/demo-server.log.
const path = require("path");
const fs = require("fs");
const { execSync, spawnSync, spawn } = require("child_process");

require("dotenv").config();
const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 5000);

function step(msg) {
  console.log(`\n→ ${msg}`);
}

// --- 1. seed ---------------------------------------------------------------
step("Re-seeding database…");
const seed = spawnSync(process.execPath, ["db/seed.js"], { cwd: ROOT, stdio: "inherit" });
if (seed.status !== 0) {
  console.error("✗ Seed failed — aborting reset.");
  process.exit(1);
}

// --- 2. free the port ------------------------------------------------------
function killPort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync("netstat -ano -p tcp", { stdio: ["ignore", "pipe", "ignore"] })
        .toString();
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        if (line.includes(`:${port} `) && /LISTENING/i.test(line)) {
          const pid = line.trim().split(/\s+/).pop();
          if (pid && pid !== "0") pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        } catch {
          /* already gone */
        }
      }
      return pids.size;
    }
    // POSIX
    try {
      execSync(`fuser -k ${port}/tcp`, { stdio: "ignore" });
      return 1;
    } catch {
      return 0;
    }
  } catch {
    return 0;
  }
}
step(`Freeing port ${PORT}…`);
const killed = killPort(PORT);
console.log(killed ? `  stopped ${killed} old server process(es)` : "  nothing was running");

// --- 3. relaunch detached --------------------------------------------------
step("Starting fresh server (MOCK_FEED=off)…");
const logPath = path.join(ROOT, "demo-server.log");
const out = fs.openSync(logPath, "a");
const child = spawn(process.execPath, ["index.js"], {
  cwd: ROOT,
  detached: true,
  stdio: ["ignore", out, out],
  env: { ...process.env, MOCK_FEED: "off" },
});
child.unref();

// --- 4. wait for health ----------------------------------------------------
(async () => {
  const url = `http://localhost:${PORT}/api/health`;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`\n✓ Demo reset complete — server live on http://localhost:${PORT}`);
        console.log(`  logs: ${logPath}`);
        console.log("  decoys armed, risk level LOW. Ready for a clean run.");
        process.exit(0);
      }
    } catch {
      /* not up yet */
    }
  }
  console.error("✗ Server did not become healthy in time — check demo-server.log");
  process.exit(1);
})();
