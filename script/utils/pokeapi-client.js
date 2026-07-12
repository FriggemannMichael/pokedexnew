// Single Source of Truth fuer ALLE PokeAPI-Zugriffe des Frontends.
//
// Normalfall: Die Anfrage laeuft ueber das Django-Backend, das die Antworten
// cached und die Detailseiten selbst nachlaedt.
// Notfall: Ist das Backend nicht gestartet, faellt der Client automatisch auf
// die oeffentliche PokeAPI zurueck - der Pokedex funktioniert also weiterhin.

const PUBLIC_BASE = "https://pokeapi.co/api/v2";
const BACKEND_BASE = window.BACKEND_URL || "http://127.0.0.1:8000";
const API_BASE = `${BACKEND_BASE}/api`;
const PROXY_BASE = `${API_BASE}/pokeapi`;

// Damit auch die klassisch geladenen Skripte (z.B. der KI-Service) dieselbe
// Backend-Adresse benutzen und sie nicht jeweils neu erfinden.
window.BACKEND_URL = BACKEND_BASE;

let backendAvailable = true;

/** Fehler MIT Antwort vom Server (z.B. 404) - kein Grund, das Backend aufzugeben. */
class HttpError extends Error {
  constructor(status, url) {
    super(`HTTP ${status}: ${url}`);
    this.status = status;
  }
}

/** Macht aus "/type/fire", "type/fire" oder einer vollen PokeAPI-URL: "type/fire". */
function toPath(target) {
  const raw = String(target || "").trim();
  const relative = raw.startsWith(PUBLIC_BASE)
    ? raw.slice(PUBLIC_BASE.length)
    : raw;
  return relative.replace(/^\/+/, "");
}

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new HttpError(response.status, url);
  return response.json();
}

/** Nur echte Ausfaelle (Backend aus) fuehren zum Umschalten auf die PokeAPI. */
function isOutage(error) {
  return !(error instanceof HttpError);
}

function switchToPublicApi(error) {
  backendAvailable = false;
  console.warn(
    "[PokeApi] Backend nicht erreichbar - nutze die PokeAPI direkt.",
    error,
  );
}

/** Beliebige PokeAPI-Ressource, gecacht ueber das Backend. */
async function fetchResource(target) {
  const path = toPath(target);
  if (!backendAvailable) return readJson(`${PUBLIC_BASE}/${path}`);
  try {
    return await readJson(`${PROXY_BASE}/${path}`);
  } catch (error) {
    if (!isOutage(error)) throw error;
    switchToPublicApi(error);
    return readJson(`${PUBLIC_BASE}/${path}`);
  }
}

/** Das schlanke Kartenformat - identisch zu dem, was das Backend liefert. */
function slimPokemon(raw) {
  const sprites = raw.sprites || {};
  const artwork = sprites.other?.["official-artwork"]?.front_default;
  return {
    id: raw.id,
    name: raw.name,
    image: artwork || sprites.front_default || "",
    types: (raw.types || []).map((entry) => entry.type.name),
    stats: Array.isArray(raw.stats) ? raw.stats : [],
    base_experience: raw.base_experience ?? 0,
  };
}

/** Notfall-Pfad: die Details einzeln laden, so wie frueher im Browser. */
async function loadDetails(urls) {
  const details = await Promise.all(urls.map((url) => readJson(url)));
  return details.map(slimPokemon);
}

async function listFromPublicApi(offset, limit) {
  const index = await readJson(
    `${PUBLIC_BASE}/pokemon?offset=${offset}&limit=${limit}`,
  );
  const results = await loadDetails(index.results.map((entry) => entry.url));
  return { results, count: index.count || 0 };
}

async function byTypeFromPublicApi(type, offset, limit) {
  const data = await readJson(`${PUBLIC_BASE}/type/${type}`);
  const members = data.pokemon || [];
  const page = members.slice(offset, offset + limit);
  const results = await loadDetails(page.map((entry) => entry.pokemon.url));
  return { results, count: members.length };
}

/** Eine Seite fertiger Karten-Daten: {results, count} - EINE Anfrage statt 21. */
async function fetchList(offset = 0, limit = 20) {
  if (!backendAvailable) return listFromPublicApi(offset, limit);
  try {
    return await readJson(
      `${API_BASE}/pokemon/?offset=${offset}&limit=${limit}`,
    );
  } catch (error) {
    if (!isOutage(error)) throw error;
    switchToPublicApi(error);
    return listFromPublicApi(offset, limit);
  }
}

/** Wie fetchList, aber nur Pokemon eines Typs. */
async function fetchByType(type, offset = 0, limit = 20) {
  if (!backendAvailable) return byTypeFromPublicApi(type, offset, limit);
  const url = `${API_BASE}/pokemon/by-type/${type}/?offset=${offset}&limit=${limit}`;
  try {
    return await readJson(url);
  } catch (error) {
    if (!isOutage(error)) throw error;
    switchToPublicApi(error);
    return byTypeFromPublicApi(type, offset, limit);
  }
}

export const PokeApi = {
  fetch: fetchResource,
  list: fetchList,
  byType: fetchByType,
  slimPokemon,
  isBackendAvailable: () => backendAvailable,
};

// Die uebrigen Skripte werden klassisch (nicht als Modul) geladen und
// greifen deshalb ueber window.PokeApi zu.
window.PokeApi = PokeApi;
