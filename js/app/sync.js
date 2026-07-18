/* Abgleich mit dem Konto: Beim Anmelden gewinnt der Server – sonst würde
   ein leerer Browser das gespeicherte Team überschreiben. Ausnahme: Auf dem
   Server ist noch nichts (frisches Konto), dann wandert der lokale Stand
   nach oben. Danach schickt jede Änderung den neuen Stand mit Verzögerung
   hoch – nicht bei jedem Klick sofort. */

const PUSH_DELAY_MS = 800;
let pushTimerTeam = null;
let pushTimerFavoriten = null;
let pushTimerPresets = null;
let pushTimerOrden = null;
let pullLaeuft = false;

async function apiAbruf(pfad, options = {}) {
  const res = await fetch(`${BACKEND}/api${pfad}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${pfad}: ${res.status}`);
  return res.json();
}

/* ---- Push: Änderungen zum Server ---- */

function teamPush() {
  return apiAbruf("/team", {
    method: "PUT",
    body: JSON.stringify({ pokemonIds: team.map((p) => p.id) }),
  });
}

function favoritenPush() {
  return apiAbruf("/favorites", {
    method: "PUT",
    body: JSON.stringify({ pokemonIds: [...favorites] }),
  });
}

function presetsPush() {
  const presets = presetsLokal().map((e) => ({
    name: e.name,
    created: e.created,
    pokemonIds: e.pokemonIds || [],
  }));
  return apiAbruf("/presets", {
    method: "PUT",
    body: JSON.stringify({ presets }),
  });
}

function pushPlanen(timerSetzen, senden) {
  if (!istAngemeldet() || pullLaeuft) return;
  timerSetzen(
    setTimeout(() => {
      senden().catch(() => {
        /* Backend gerade nicht erreichbar – lokal ist alles gespeichert */
      });
    }, PUSH_DELAY_MS),
  );
}

function teamPushPlanen() {
  clearTimeout(pushTimerTeam);
  pushPlanen((t) => (pushTimerTeam = t), teamPush);
}

function favoritenPushPlanen() {
  clearTimeout(pushTimerFavoriten);
  pushPlanen((t) => (pushTimerFavoriten = t), favoritenPush);
}

function presetsPushPlanen() {
  clearTimeout(pushTimerPresets);
  pushPlanen((t) => (pushTimerPresets = t), presetsPush);
}

function ordenPush() {
  return apiAbruf("/badges", {
    method: "PUT",
    body: JSON.stringify({ leaderKeys: [...orden] }),
  });
}

function ordenPushPlanen() {
  clearTimeout(pushTimerOrden);
  pushPlanen((t) => (pushTimerOrden = t), ordenPush);
}

/* ---- Merken: lokal speichern und den Push anstoßen ---- */

function teamMerken() {
  teamLokalSpeichern();
  teamPushPlanen();
}

function favoritenMerken() {
  favoritenLokalSpeichern();
  favoritenPushPlanen();
  kontoStatsAnzeigen();
}

function ordenMerken() {
  ordenLokalSpeichern();
  ordenPushPlanen();
}

/* ---- Pull: beim Anmelden den Server-Stand übernehmen ---- */

async function teamPull() {
  const data = await apiAbruf("/team");
  const server = (data.team || []).map(slim);
  if (!server.length && team.length) return teamPush();
  pullLaeuft = true;
  team = server;
  refresh();
  pullLaeuft = false;
}

async function favoritenPull() {
  const data = await apiAbruf("/favorites");
  const server = data.pokemonIds || [];
  if (!server.length && favorites.size) return favoritenPush();
  favorites = new Set(server);
  favoritenLokalSpeichern();
  renderGrid();
}

function presetVomServer(e) {
  if (!e?.name) return null;
  const ids = e.pokemonIds || (e.team || []).map((p) => p.id);
  return { name: e.name, created: e.created, pokemonIds: ids };
}

async function presetsPull() {
  const data = await apiAbruf("/presets");
  const server = (data.presets || []).map(presetVomServer).filter(Boolean);
  if (!server.length && presetsLokal().length) return presetsPush();
  presetsLokalSpeichern(server);
  renderPresets();
}

async function ordenPull() {
  const data = await apiAbruf("/badges");
  const server = data.leaderKeys || [];
  if (!server.length && orden.size) return ordenPush();
  orden = new Set(server);
  ordenLokalSpeichern();
  ligaAktualisieren();
}

async function syncNachLogin() {
  try {
    await teamPull();
    await favoritenPull();
    await presetsPull();
    await ordenPull(); // Liga-Fortschritt gehört zum Konto
    await historiePull();
    await trainerLaden(); // Rangliste und Gegner-Auswahl
  } catch {
    /* Backend nicht erreichbar – die lokalen Daten bleiben gültig */
  }
  kontoStatsAnzeigen();
}
