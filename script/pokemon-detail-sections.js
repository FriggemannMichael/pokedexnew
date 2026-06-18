function showPokemonTypes(types) {
  const typesContainer = document.getElementById("detailTypes");
  if (!typesContainer) return;

  typesContainer.innerHTML = types
    .map((type) => createTypeBadgeTemplate(type))
    .join("");
}

function showPokemonStats(pokemonDetails) {
  const statsContainer = document.getElementById("detailStats");
  if (!statsContainer) return;

  const statsData = calculateStatsData(pokemonDetails);
  statsContainer.innerHTML = createStatsHTML(statsData);
}

function calculateStatsData(pokemonDetails) {
  return {
    height: (pokemonDetails.height / 10).toFixed(1),
    weight: (pokemonDetails.weight / 10).toFixed(1),
    experience: pokemonDetails.base_experience || "?",
    id: pokemonDetails.id,
  };
}

function createStatsHTML(statsData) {
  return `
        ${createStatItemTemplate("Height", `${statsData.height} m`)}
        ${createStatItemTemplate("Weight", `${statsData.weight} kg`)}
        ${createStatItemTemplate("Experience", statsData.experience)}
        ${createStatItemTemplate("ID", `#${statsData.id}`)}
    `;
}

function showPokemonDescription(speciesData) {
  const descContainer = document.getElementById("detailDescription");
  if (!descContainer) return;

  const description = extractEnglishDescription(speciesData);
  descContainer.textContent = description;
}

function extractEnglishDescription(speciesData) {
  const englishEntry = speciesData.flavor_text_entries.find(
    (entry) => entry.language.name === "en",
  );
  return englishEntry
    ? cleanDescriptionText(englishEntry.flavor_text)
    : "No English description available.";
}

function cleanDescriptionText(text) {
  return text.replace(/\n/g, " ").replace(/\f/g, " ");
}

function showPokemonBaseStats(pokemonDetails) {
  const statsContainer = document.getElementById("detailBaseStats");
  if (!statsContainer) return;

  const baseStats = createBaseStatsArray(pokemonDetails);
  statsContainer.innerHTML = createBaseStatsHTML(baseStats);
}

function createBaseStatsArray(pokemonDetails) {
  return pokemonDetails.stats.map((stat) => ({
    name: translateStatName(stat.stat.name),
    value: stat.base_stat,
    maxValue: 255,
  }));
}

function createBaseStatsHTML(baseStats) {
  return `<div class="base-stats-grid">${baseStats.map((stat) => createProgressStatTemplate(stat)).join("")}</div>`;
}

function showBreedingInfo(speciesData) {
  const breedingContainer = document.getElementById("detailBreeding");
  if (!breedingContainer) return;

  const breedingData = createBreedingData(speciesData);
  breedingContainer.innerHTML = createBreedingHTML(breedingData);
}

function createBreedingData(speciesData) {
  const genderInfo = calculateGenderInfo(speciesData.gender_rate);
  const eggGroups = speciesData.egg_groups.map((g) => g.name).join(", ");

  return {
    gender: genderInfo,
    eggGroups: eggGroups,
    hatchCycles: speciesData.hatch_counter || "?",
    catchRate: speciesData.capture_rate,
  };
}

function createBreedingHTML(breedingData) {
  return `
        <div class="breeding-grid">
            ${createStatItemTemplate("Gender", breedingData.gender)}
            ${createStatItemTemplate("Egg Groups", breedingData.eggGroups)}
            ${createStatItemTemplate("Hatch Cycles", breedingData.hatchCycles)}
            ${createStatItemTemplate("Catch Rate", breedingData.catchRate)}
        </div>
    `;
}

function showPokemonMoves(pokemonDetails) {
  const movesContainer = document.getElementById("detailMoves");
  if (!movesContainer) return;

  const limitedMoves = pokemonDetails.moves.slice(0, 10);
  movesContainer.innerHTML = `
        <div class="moves-grid">
            ${limitedMoves.map((moveData) => createMoveBadgeTemplate(moveData.move.name)).join("")}
        </div>
    `;
}

function translateStatName(statName) {
  const translations = {
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    "special-attack": "Sp. Attack",
    "special-defense": "Sp. Defense",
    speed: "Speed",
  };
  return translations[statName] || statName;
}

function calculateGenderInfo(genderRate) {
  if (genderRate === -1) return "Genderless";

  const malePercent = (((8 - genderRate) / 8) * 100).toFixed(1);
  const femalePercent = ((genderRate / 8) * 100).toFixed(1);

  return `♂ ${malePercent}% ♀ ${femalePercent}%`;
}
