/* Lokale Ablage: Team, Favoriten, Presets, Kampfhistorie.
   Dieselben Schlüssel wie die alte Oberfläche – vorhandene Daten bleiben. */

function jsonLaden(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Die Pokémon-Nummern des lokal gespeicherten Teams. */
function teamIdsLokal() {
  return jsonLaden("pokemonTeam", [])
    .map((p) => Number(p?.id))
    .filter((id) => Number.isFinite(id) && id > 0)
    .slice(0, 6);
}

function teamLokalSpeichern() {
  localStorage.setItem("pokemonTeam", JSON.stringify(team));
}

function favoritenLokalSpeichern() {
  localStorage.setItem("pokemonFavorites", JSON.stringify([...favorites]));
}

function presetsLokal() {
  return jsonLaden("pokemonTeamPresets", []).filter((e) => e && e.name);
}

function presetsLokalSpeichern(liste) {
  localStorage.setItem(
    "pokemonTeamPresets",
    JSON.stringify(liste.slice(0, 20)),
  );
}

function historieLokal() {
  return jsonLaden("pokemonBattleHistory", []);
}

function historieLokalSpeichern(liste) {
  localStorage.setItem(
    "pokemonBattleHistory",
    JSON.stringify(liste.slice(0, 50)),
  );
}

function ordenLokalSpeichern() {
  localStorage.setItem("pokemonBadges", JSON.stringify([...orden]));
}

/* Beim Start: gespeicherte Favoriten und Orden übernehmen. */
favorites = new Set(jsonLaden("pokemonFavorites", []));
let orden = new Set(jsonLaden("pokemonBadges", []));
