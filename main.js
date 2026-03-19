import { ApiService } from "./script/services/ApiService.js";

window.POKEMON_API_CONFIG = {
  baseUrl: "https://pokeapi.co/api/v2/pokemon",
  pokemonPerPage: 20,
  defaultOffset: 0,
};

window.apiService = new ApiService({
  baseUrl: "https://pokeapi.co/api/v2",
});

window.fetchPokemonData = async (offset, limit) => {
  try {
    const result = await window.apiService.fetchPokemonList(offset, limit);
    return result.pokemon;
  } catch (error) {
    console.error("Fehler in fetchPokemonData Brücke:", error);
    return [];
  }
};

window.fetchPokemonByTypeData = async (type) => {
  try {
    const typeData = await window.apiService.fetch(`/type/${type}`);
    const pokemonUrls = typeData.pokemon
      .slice(0, window.POKEMON_API_CONFIG.pokemonPerPage)
      .map((p) => p.pokemon.url);

    return await Promise.all(
      pokemonUrls.map((url) =>
        window.apiService.fetch(url).then((data) => {
          return window.apiService.transformPokemonData(data);
        }),
      ),
    );
  } catch (error) {
    console.error(`Fehler in fetchPokemonByTypeData (${type}):`, error);
    return [];
  }
};

window.toggleDropdown = function (className) {
  const section = document.querySelector("." + className);
  if (!section) return;
  section.classList.toggle("d-none");
  section.classList.toggle("d-flex");
};

window.mainJsLoaded = true;
let loadedCount = 0;

async function loadAllScripts(scripts) {
  for (const path of scripts) {
    await loadScript(path);
  }
  startApp();
}

function loadScript(path) {
  return new Promise((resolve, reject) => {
    if (isAlreadyLoaded(path)) {
      resolve();
      return;
    }
    const script = createScriptElement(path);
    script.onload = () => {
      loadedCount++;
      resolve();
    };
    script.onerror = (error) => {
      console.error(`✗ Failed to load script: ${path}`, error);
      reject(new Error(`Failed to load ${path}`));
    };
    document.head.appendChild(script);
  });
}

function isAlreadyLoaded(path) {
  return Boolean(document.querySelector(`script[src="${path}"]`));
}

function createScriptElement(path) {
  const script = document.createElement("script");
  script.src = path;
  if (path.includes("ai-service.js")) {
    script.type = "module";
  }
  return script;
}

function startApp() {
  setTimeout(() => {
    try {
      if (typeof initializeApp === "function") {
        initializeApp();
      } else if (typeof loadPokemon === "function") {
        loadPokemon();
      } else {
        console.error("No main pokemon function found");
        showError();
      }
    } catch (error) {
      console.error("Error starting app:", error);
      showError();
    }
    initializeComponents();
  }, 300);
}

function initializeComponents() {
  const components = [
    { winKey: "pokemonTeamModal", coreKey: "PokemonTeamModalCore" },
    { winKey: "pokemonTeamAnalyzer", coreKey: "PokemonTeamAnalyzerCore" },
    { winKey: "pokemonGoFeatures" },
    { winKey: "pokemonCompare" },
    { winKey: "battleSimulator" },
    { winKey: "teamBattle" },
  ];

  components.forEach((comp) => {
    try {
      if (comp.coreKey && !window[comp.winKey] && window[comp.coreKey]) {
        window[comp.winKey] = new window[comp.coreKey]();
      }
      if (
        window[comp.winKey] &&
        typeof window[comp.winKey].init === "function"
      ) {
        window[comp.winKey].init();
      }
    } catch (e) {
      console.warn(`Could not init component: ${comp.winKey}`, e);
    }
  });
}

function showError() {
  const container =
    document.getElementById("pokemonContainer") || document.body;
  container.innerHTML = typeof createAppErrorTemplate === "function"
    ? createAppErrorTemplate()
    : "<p>App Loading Failed. Check console.</p>";
}

function startPokemonApp() {
  const scripts = [
    "./script/utils/fetch-retry.js",
    "./script/utils/type-constants.js",
    "./script/utils/modal-factory.js",
    "./script/utils/ui-helpers.js",
    "./script/templates/error-template.js",
    "./script/dom-cache.js",
    "./script/template.js",
    "./script/pokemon-core.js",
    "./script/pokemon-detail.js",
    "./script/pokemon-modal.js",
    "./script/pokemon-ui.js",
    "./script/navigation.js",
    "./script/search.js",
    "./script/team-offcanvas-core.js",
    "./script/team-offcanvas-ui.js",
    "./script/drag-drop-enhanced.js",
    "./js/ai-service.js",
    "./script/team-builder.js",
    "./script/team-builder-ui.js",
    "./script/team-builder-events.js",
    "./script/prompts/team-analysis-prompt.js",
    "./script/prompts/team-advice-prompt.js",
    "./script/prompts/battle-strategy-prompt.js",
    "./script/prompts/coach-prompt.js",
    "./script/team-ai-service.js",
    "./script/team-modal-core.js",
    "./script/team-modal-render.js",
    "./script/team-modal-actions.js",
    "./script/team-modal-events.js",
    "./script/mypokedex-render.js",
    "./script/mypokedex-section.js",
    "./script/team-analyzer-core.js",
    "./script/team-analyzer-logic.js",
    "./script/team-analyzer-modal.js",
    "./script/team-analyzer-render.js",
    "./script/pokemon-go-core.js",
    "./script/pokemon-go-power.js",
    "./script/pokemon-go-dom.js",
    "./script/pokemon-go-favorites.js",
    "./script/pokemon-go-filters.js",
    "./script/pokemon-go-observer.js",
    "./script/pokemon-compare.js",
    "./script/pokemon-compare-ui.js",
    "./script/battle-history.js",
    "./script/battle-sim-core.js",
    "./script/battle-sim-moves.js",
    "./script/battle-sim-ui.js",
    "./script/team-battle-core.js",
    "./script/team-battle-ui.js",
    "./script/team-battle-combat.js",
  ];

  loadAllScripts(scripts).catch((error) => {
    console.error("Critical: Script loading failed:", error);
    showError();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startPokemonApp);
} else {
  startPokemonApp();
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-action="show-detail"][data-pokemon-id]');
  if (btn) {
    const id = parseInt(btn.getAttribute("data-pokemon-id"));
    if (!isNaN(id) && typeof window.showPokemonDetail === "function") {
      window.showPokemonDetail(id);
    }
  }
});
