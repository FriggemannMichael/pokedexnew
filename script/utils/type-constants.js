const VALID_POKEMON_TYPES = new Set([
  "normal", "fire", "water", "grass", "electric", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
]);

const TYPE_COLORS = {
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

function sanitizeTypes(rawTypes) {
  if (!Array.isArray(rawTypes)) return ["normal"];
  const cleaned = rawTypes
    .map((t) => (t || "").toString().toLowerCase().replace(/[^a-z]/g, ""))
    .filter((t) => VALID_POKEMON_TYPES.has(t));
  return cleaned.length === 0 ? ["normal"] : cleaned;
}

window.VALID_POKEMON_TYPES = VALID_POKEMON_TYPES;
window.TYPE_COLORS = TYPE_COLORS;
window.sanitizeTypes = sanitizeTypes;
