const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "assets", "screenshots");
const PORT = Number(process.env.SCREENSHOT_PORT || 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const screenshotTeam = [
  pokemon(1, "Bulbasaur", ["grass", "poison"]),
  pokemon(6, "Charizard", ["fire", "flying"]),
  pokemon(9, "Blastoise", ["water"]),
  pokemon(25, "Pikachu", ["electric"]),
  pokemon(94, "Gengar", ["ghost", "poison"]),
  pokemon(149, "Dragonite", ["dragon", "flying"]),
];

function pokemon(id, name, types) {
  return {
    id,
    name,
    types,
    image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
    stats: [],
    base_experience: 100,
  };
}

function ensureOutputDir() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function startServer() {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => process.stdout.write(`[server] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[server] ${chunk}`));

  return child;
}

function waitForServer(timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(BASE_URL, (res) => {
        res.resume();
        resolve();
      });

      req.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Server did not respond at ${BASE_URL}`));
          return;
        }
        setTimeout(check, 500);
      });

      req.setTimeout(2000, () => {
        req.destroy();
      });
    };

    check();
  });
}

async function preparePage(browser, viewport) {
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(30000);
  await page.addInitScript((team) => {
    localStorage.setItem("pokemonTeam", JSON.stringify(team));
  }, screenshotTeam);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.locator("#appIntro").evaluate((intro) => intro.remove()).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForSelector("#pokemonContainer", { timeout: 30000 });
  await page.waitForSelector(".pokemon-card", { timeout: 30000 }).catch(() => {});
  return page;
}

async function captureDesktop(browser) {
  const page = await preparePage(browser, { width: 1440, height: 1100 });
  await page.screenshot({ path: path.join(OUTPUT_DIR, "pokedex-desktop.png"), fullPage: false });
  await page.close();
}

async function captureDetail(browser) {
  const page = await preparePage(browser, { width: 1440, height: 1100 });
  await page.evaluate(() => {
    const list = window.appState?.pokemonList || (typeof appState !== "undefined" ? appState.pokemonList : []);
    const first = list[0];
    if (first && typeof window.openPokemonDetail === "function") {
      window.openPokemonDetail(first);
    }
  });
  const opened = await page.locator("#pokemonOverlay:not(.d-none), .pokemon-detail-card").count();
  if (!opened) {
    await page.locator(".pokemon-card").first().click();
  }
  await page.waitForSelector("#pokemonOverlay:not(.d-none) .pokemon-detail-card", { timeout: 15000 });
  await page.waitForFunction(() => {
    const name = document.getElementById("detailName")?.textContent?.trim();
    const image = document.getElementById("detailImage");
    return name && name !== "-" && image?.getAttribute("src");
  }, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.locator("#pokemonOverlay .pokemon-detail-card").screenshot({
    path: path.join(OUTPUT_DIR, "pokemon-detail.png"),
  });
  await page.close();
}

async function captureTeamBuilder(browser) {
  const page = await preparePage(browser, { width: 1440, height: 1100 });
  await page.locator("#activeTeamBuilder").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.locator("#activeTeamBuilder").screenshot({
    path: path.join(OUTPUT_DIR, "team-builder.png"),
  });
  await page.close();
}

async function captureGymChallenge(browser) {
  const page = await preparePage(browser, { width: 1440, height: 1100 });
  page.on("dialog", (dialog) => dialog.accept());
  await page.evaluate(async (team) => {
    if (!window.teamBattle?.initialized && typeof window.teamBattle?.init === "function") {
      window.teamBattle.init();
    }
    await window.teamBattle?.startChallenge(team);
  }, screenshotTeam);
  await page.waitForSelector("#teamBattleOverviewModal.show, .team-battle-preview", { timeout: 30000 });
  await page.screenshot({ path: path.join(OUTPUT_DIR, "gym-challenge.png"), fullPage: false });
  await page.close();
}

async function captureMobile(browser) {
  const page = await preparePage(browser, { width: 390, height: 900 });
  await page.screenshot({ path: path.join(OUTPUT_DIR, "mobile-view.png"), fullPage: false });
  await page.close();
}

async function main() {
  ensureOutputDir();
  const server = startServer();

  try {
    await waitForServer();
    const browser = await chromium.launch();
    try {
      await captureDesktop(browser);
      await captureDetail(browser);
      await captureTeamBuilder(browser);
      await captureGymChallenge(browser);
      await captureMobile(browser);
    } finally {
      await browser.close();
    }
    console.log(`Screenshots written to ${path.relative(ROOT_DIR, OUTPUT_DIR)}`);
  } finally {
    server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
