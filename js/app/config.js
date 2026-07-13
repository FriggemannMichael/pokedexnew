/* Grunddaten und Zustand – aus dem abgenommenen Entwurf
   (design-draft/index.html), Werte unverändert.

   Alle js/app-Dateien sind klassische Skripte in fester Reihenfolge:
   Top-Level-Deklarationen landen im globalen Scope und sind in den
   nachfolgenden Dateien sichtbar. */

const art = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
/* Das kleine Pixel-Sprite: 5 KB statt ~300 KB. Rueckfallebene, wenn GitHub
   das grosse Artwork abwuergt ("Image corrupt or truncated"). */
const sprite = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

const $ = (id) => document.getElementById(id);

/* Echte Daten aus dem Django-Backend (Port 8000). Läuft es nicht, springt
   die App auf die eingebaute Fallback-Liste – filtern geht dann nicht. */
const BACKEND = "http://127.0.0.1:8000";

const PAGE = 24; // eine Seite, nicht der halbe Pokédex

/* Kontext = Farbe. Der Akzent färbt Tabs und Flächen, der Himmel
   wechselt über body[data-type]. Ein Prinzip, kein neues. */
const TYPE_HEX = {
  normal: "#a8a878",
  fire: "#f08030",
  water: "#6890f0",
  electric: "#f8d030",
  grass: "#78c850",
  ice: "#98d8d8",
  fighting: "#c03028",
  poison: "#a040a0",
  ground: "#e0c068",
  flying: "#a890f0",
  psychic: "#f85888",
  bug: "#a8b820",
  rock: "#b8a038",
  ghost: "#705898",
  dragon: "#7038f8",
  dark: "#705848",
  steel: "#b8b8d0",
  fairy: "#ee99ac",
};
const TYPE_DE = {
  normal: "Normal",
  fire: "Feuer",
  water: "Wasser",
  electric: "Elektro",
  grass: "Pflanze",
  ice: "Eis",
  fighting: "Kampf",
  poison: "Gift",
  ground: "Boden",
  flying: "Flug",
  psychic: "Psycho",
  bug: "Käfer",
  rock: "Gestein",
  ghost: "Geist",
  dragon: "Drache",
  dark: "Unlicht",
  steel: "Stahl",
  fairy: "Fee",
};
const STAT_DE = {
  hp: "KP",
  attack: "Angriff",
  defense: "Verteidigung",
  "special-attack": "Sp. Angriff",
  "special-defense": "Sp. Vert.",
  speed: "Initiative",
};

const FALLBACK = [
  { id: 1, name: "bulbasaur", types: ["grass", "poison"] },
  { id: 4, name: "charmander", types: ["fire"] },
  { id: 7, name: "squirtle", types: ["water"] },
  { id: 25, name: "pikachu", types: ["electric"] },
  { id: 6, name: "charizard", types: ["fire", "flying"] },
  { id: 9, name: "blastoise", types: ["water"] },
  { id: 94, name: "gengar", types: ["ghost", "poison"] },
  { id: 149, name: "dragonite", types: ["dragon", "flying"] },
  { id: 143, name: "snorlax", types: ["normal"] },
  { id: 95, name: "onix", types: ["rock", "ground"] },
].map((p) => ({ ...p, image: art(p.id), stats: [] }));

/* ---- Veränderlicher Zustand ---- */
let DEX = [];
let team = [];
let favorites = new Set([25, 143]);
let lastAdded = null;
let ladend = false;
let activeType = null;
let viewMode = "alle"; // alle | favoriten | pokedex
let query = "";

/* Namensverzeichnis für Suche und deutsche Anzeigenamen. */
let INDEX = [];
const NAME_DE = new Map();

/* Details je Pokémon, einmal geholt, dann aus dem Cache. */
const detailCache = new Map();

/* Zwei Listen: der normale Pokédex und – wenn ein Typ gewählt ist – die
   Liste dieses Typs. Die kommt aus /api/pokemon/by-type/<typ>/, sonst
   würde der Filter nur die 24 geladenen Karten durchsuchen und bei "Eis"
   gar nichts finden (unter Kanto 1–24 ist kein Eis-Pokémon). */
const listen = {
  alle: { items: [], offset: 0, total: Infinity },
  typ: { items: [], offset: 0, total: Infinity },
};

/** Der deutsche Name, solange er da ist – sonst der englische. */
const anzeigename = (p) => NAME_DE.get(p.id) || p.nameDe || p.name;
