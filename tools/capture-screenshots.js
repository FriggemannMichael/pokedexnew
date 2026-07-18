/* Erzeugt die README-Screenshots aus der laufenden App (neues Design).
   Startet den Frontend-Server selbst; das Django-Backend muss auf
   127.0.0.1:8000 laufen, sonst zeigt der Pokédex nur den Fallback. */
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");
const { chromium } = require("@playwright/test");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "assets", "screenshots");
/* Port 3000, weil das Backend per CORS nur dem normalen Frontend-Port
   vertraut – auf anderen Ports kaemen nur die Fallback-Daten an. */
const PORT = Number(process.env.SCREENSHOT_PORT || 3000);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/* Ein sechser Vorzeige-Team; Bilder holt die App selbst über die id. */
const TEAM = [
  { id: 3, name: "venusaur", nameDe: "Bisaflor", types: ["grass", "poison"] },
  { id: 6, name: "charizard", nameDe: "Glurak", types: ["fire", "flying"] },
  { id: 9, name: "blastoise", nameDe: "Turtok", types: ["water"] },
  { id: 25, name: "pikachu", nameDe: "Pikachu", types: ["electric"] },
  { id: 94, name: "gengar", nameDe: "Gengar", types: ["ghost", "poison"] },
  { id: 149, name: "dragoran", nameDe: "Dragoran", types: ["dragon", "flying"] },
];

function startServer() {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (c) => process.stderr.write(`[server] ${c}`));
  return child;
}

function warteAufServer(timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const versuch = () => {
      const req = http.get(BASE_URL, (res) => (res.resume(), resolve()));
      req.on("error", () => {
        if (Date.now() - start > timeoutMs)
          reject(new Error(`Server antwortet nicht: ${BASE_URL}`));
        else setTimeout(versuch, 500);
      });
    };
    versuch();
  });
}

/* Intro überspringen und Team vorbelegen – sonst ist alles leer. */
async function seitePraeparieren(browser, viewport) {
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(30000);
  await page.addInitScript((team) => {
    localStorage.setItem("pokedexIntroGesehen", "1");
    localStorage.setItem("pokemonTeam", JSON.stringify(team));
  }, TEAM);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".card", { timeout: 30000 });
  await page.waitForTimeout(1200); // Bilder und Einblend-Animationen
  return page;
}

async function tabOeffnen(page, view) {
  await page.locator(`.tab[data-view="${view}"]`).click();
  await page.waitForTimeout(800);
}

async function schuss(page, datei) {
  await page.screenshot({ path: path.join(OUTPUT_DIR, datei) });
}

async function desktopSchuesse(browser) {
  const page = await seitePraeparieren(browser, { width: 1440, height: 1100 });
  await schuss(page, "pokedex-desktop.png");
  await page.locator(".card").first().click();
  await page.waitForSelector("#sheetImg[src]");
  await page.waitForTimeout(1000);
  await page.locator("#sheetCard").screenshot({
    path: path.join(OUTPUT_DIR, "pokemon-detail.png"),
  });
  await page.locator("#sheetClose").click();
  await tabOeffnen(page, "team");
  await schuss(page, "team.png");
  await tabOeffnen(page, "fight");
  await schuss(page, "liga.png");
  await page.close();
}

async function mobilSchuss(browser) {
  const page = await seitePraeparieren(browser, { width: 390, height: 844 });
  await schuss(page, "mobile-view.png");
  await page.close();
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const server = startServer();
  try {
    await warteAufServer();
    const browser = await chromium.launch();
    try {
      await desktopSchuesse(browser);
      await mobilSchuss(browser);
    } finally {
      await browser.close();
    }
    console.log(`Screenshots liegen in ${path.relative(ROOT_DIR, OUTPUT_DIR)}`);
  } finally {
    server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
