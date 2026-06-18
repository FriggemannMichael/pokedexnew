async function loadEvolutionChain(evolutionUrl, currentPokemonId) {
  const api = getDetailApi();
  const evolutionData = await api.fetch(evolutionUrl);
  const evolutionChain = parseEvolutionChain(evolutionData.chain);
  await displayEvolutionChain(evolutionChain, currentPokemonId);
}

function parseEvolutionChain(chain) {
  const evolutions = [];
  addEvolution(chain, evolutions);
  return evolutions;
}

function addEvolution(evolutionData, evolutions) {
  const pokemonName = evolutionData.species.name;
  const pokemonId = extractPokemonId(evolutionData.species.url);

  evolutions.push(createEvolutionData(pokemonId, pokemonName));

  if (hasEvolutions(evolutionData)) {
    evolutionData.evolves_to.forEach((evolution) =>
      addEvolution(evolution, evolutions),
    );
  }
}

function extractPokemonId(url) {
  return url.split("/").slice(-2, -1)[0];
}

function createEvolutionData(pokemonId, pokemonName) {
  return {
    id: parseInt(pokemonId),
    name: pokemonName,
    image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`,
  };
}

function hasEvolutions(evolutionData) {
  return evolutionData.evolves_to && evolutionData.evolves_to.length > 0;
}

async function displayEvolutionChain(evolutions, currentPokemonId) {
  const container = document.getElementById("detailEvolutions");
  if (!container) return;

  if (evolutions.length <= 1) {
    showNoEvolutions(container);
    return;
  }

  renderEvolutionChain(container, evolutions, currentPokemonId);
  setupEvolutionClickEvents(container, currentPokemonId);
}

function showNoEvolutions(container) {
  container.innerHTML =
    '<div class="no-evolutions"><p>No evolutions available</p></div>';
}

function renderEvolutionChain(container, evolutions, currentPokemonId) {
  const html = createEvolutionHTML(evolutions, currentPokemonId);
  container.innerHTML = html;
}

function createEvolutionHTML(evolutions, currentPokemonId) {
  let html = '<div class="evolution-chain">';

  evolutions.forEach((evolution, index) => {
    const isCurrent = evolution.id === currentPokemonId;
    html += createEvolutionItemTemplate(evolution, isCurrent);

    if (index < evolutions.length - 1) {
      html += createEvolutionArrowTemplate();
    }
  });

  html += "</div>";
  return html;
}

function setupEvolutionClickEvents(container, currentPokemonId) {
  const evolutionItems = container.querySelectorAll(".evolution-item");
  evolutionItems.forEach((item) => {
    item.addEventListener(
      "click",
      async () => await handleEvolutionClick(item, currentPokemonId),
    );
  });
}

async function handleEvolutionClick(item, currentPokemonId) {
  const pokemonId = item.dataset.pokemonId;

  if (shouldLoadNewPokemon(pokemonId, currentPokemonId)) {
    const newPokemon = await loadNewEvolutionPokemon(pokemonId);
    loadPokemonDetailData(newPokemon);
  }
}
