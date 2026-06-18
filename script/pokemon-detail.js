let currentPokemonIndex = 0;
let availablePokemonList = [];

function getDetailApi() {
  const api =
    window.services && window.services.api
      ? window.services.api
      : window.apiService;
  if (!api) {
    throw new Error(
      "Kein API-Service verfügbar: window.services.api oder window.apiService fehlt.",
    );
  }
  return api;
}

function openPokemonDetail(pokemon) {
  setNavigationData(pokemon);
  initializePokemonModal();
  openPokemonModal();
  loadPokemonDetailData(pokemon);
}

function setNavigationData(selectedPokemon) {
  availablePokemonList = appState.pokemonList;
  currentPokemonIndex = availablePokemonList.findIndex(
    (p) => p.id === selectedPokemon.id,
  );
}

async function loadPokemonDetailData(pokemon) {
  setDetailLoadingState(true);
  await initializePokemonData(pokemon);
  updateNavigationButtons();
  setDetailLoadingState(false);
}

async function initializePokemonData(pokemon) {
  setPokemonModalType(pokemon.types[0]);
  setDetailBasicData(pokemon);
  await loadDetailApiData(pokemon);
}

function updateNavigationButtons() {
  const prevBtn = document.querySelector(".nav-prev");
  const nextBtn = document.querySelector(".nav-next");

  if (!prevBtn || !nextBtn) return;

  updatePreviousButton(prevBtn);
  updateNextButton(nextBtn);
}

function updatePreviousButton(prevBtn) {
  const isDisabled = currentPokemonIndex <= 0;
  prevBtn.style.opacity = isDisabled ? "0.5" : "1";
  prevBtn.disabled = isDisabled;
}

function updateNextButton(nextBtn) {
  const isDisabled = currentPokemonIndex >= availablePokemonList.length - 1;
  nextBtn.style.opacity = isDisabled ? "0.5" : "1";
  nextBtn.disabled = isDisabled;
}

async function loadDetailApiData(pokemon) {
  const api = getDetailApi();
  const [pokemonDetails, speciesData] = await Promise.all([
    api.fetch(`/pokemon/${pokemon.id}`),
    api.fetch(`/pokemon-species/${pokemon.id}`),
  ]);

  displayPokemonDetails(pokemon, pokemonDetails, speciesData);
  await loadEvolutionChain(speciesData.evolution_chain.url, pokemon.id);
}

function displayPokemonDetails(pokemon, pokemonDetails, speciesData) {
  showPokemonTypes(pokemon.types);
  showPokemonStats(pokemonDetails);
  showPokemonBaseStats(pokemonDetails);
  showBreedingInfo(speciesData);
  showPokemonMoves(pokemonDetails);
  showPokemonDescription(speciesData);
}

function setPokemonModalType(primaryType) {
  const overlay = domCache.getPokemonOverlay();
  if (!overlay) return;

  const card = overlay.querySelector(".pokemon-detail-card");
  if (!card) return;

  removeExistingTypeClasses(card);
  card.classList.add(`type-${primaryType}`);
}

function removeExistingTypeClasses(card) {
  const existingTypeClasses = Array.from(card.classList).filter((cls) =>
    cls.startsWith("type-"),
  );
  existingTypeClasses.forEach((cls) => card.classList.remove(cls));
}

function setDetailBasicData(pokemon) {
  const nameElement = document.getElementById("detailName");
  const numberElement = document.getElementById("detailNumber");
  const imageElement = document.getElementById("detailImage");

  updateBasicElements(nameElement, numberElement, imageElement, pokemon);
}

function updateBasicElements(nameEl, numberEl, imageEl, pokemon) {
  if (nameEl) nameEl.textContent = pokemon.name;
  if (numberEl)
    numberEl.textContent = `#${pokemon.id.toString().padStart(3, "0")}`;
  if (imageEl) {
    imageEl.src = pokemon.image;
    imageEl.alt = pokemon.name;
  }
}

function setDetailLoadingState(loading) {
  const overlay = domCache.getPokemonOverlay();
  if (!overlay) return;

  const card = overlay.querySelector(".pokemon-detail-card");
  if (card) {
    card.style.opacity = loading ? "0.7" : "1";
    card.style.pointerEvents = loading ? "none" : "auto";
  }
}

function shouldLoadNewPokemon(pokemonId, currentPokemonId) {
  return pokemonId && pokemonId !== currentPokemonId.toString();
}

async function loadNewEvolutionPokemon(pokemonId) {
  const api = getDetailApi();
  const newPokemonData = await api.fetch(`/pokemon/${pokemonId}`);
  return createPokemonData(newPokemonData);
}

function navigatePokemon(direction) {
  if (!canNavigate()) return;

  currentPokemonIndex += direction;
  const newPokemon = availablePokemonList[currentPokemonIndex];
  loadPokemonDetailData(newPokemon);
}

function canNavigate() {
  return availablePokemonList && availablePokemonList.length > 0;
}

function resolveDetailFromState(id) {
  if (!Array.isArray(appState?.pokemonList)) return false;
  const pokemon = appState.pokemonList.find((p) => p.id === id);
  if (pokemon && typeof openPokemonDetail === "function") {
    openPokemonDetail(pokemon);
    return true;
  }
  return false;
}

function fetchDetailFallback(id) {
  fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
    .then((r) => r.json())
    .then((data) => {
      const pokemon = {
        id: data.id,
        name: data.name,
        image:
          data.sprites?.other?.["official-artwork"]?.front_default ||
          data.sprites?.front_default ||
          "",
        types: data.types.map((t) => t.type.name),
      };
      if (typeof openPokemonDetail === "function") openPokemonDetail(pokemon);
    })
    .catch((e) => console.warn("Fallback Detail Fetch fehlgeschlagen", e));
}

if (!window.showPokemonDetail) {
  window.showPokemonDetail = function (pokemonId) {
    try {
      const id = parseInt(pokemonId);
      if (isNaN(id)) return;
      if (
        window.pokemonTeamModal &&
        typeof window.pokemonTeamModal.showPokemonDetail === "function"
      ) {
        window.pokemonTeamModal.showPokemonDetail(id);
        return;
      }
      if (resolveDetailFromState(id)) return;
      fetchDetailFallback(id);
    } catch (e) {
      console.warn("showPokemonDetail Fehler", e);
    }
  };
}
