import { ApiService } from "./script/services/ApiService.js";
import { PokeApi } from "./script/utils/pokeapi-client.js";

function initializeAppIntro() {
  const intro = document.getElementById("appIntro");
  if (!intro) return;

  const removeIntro = () => intro.remove();
  const dismissIntro = () => {
    intro.classList.add("is-leaving");
    window.setTimeout(removeIntro, 560);
  };

  window.setTimeout(dismissIntro, 6600);
}

initializeAppIntro();

window.POKEMON_API_CONFIG = {
  pokemonPerPage: 20,
  defaultOffset: 0,
};

window.apiService = new ApiService();

// Beide Bruecken holen ihre Daten fertig aufbereitet vom Backend. Das Nachladen
// der Detailseiten passiert dort - hier reicht eine einzige Anfrage.
window.fetchPokemonData = async (offset, limit) => {
  try {
    const { results } = await PokeApi.list(offset, limit);
    return results;
  } catch (error) {
    AppError.log(
      AppError.CATEGORY.API,
      "fetchPokemonData Brücke Fehler",
      error,
    );
    return [];
  }
};

async function fetchTypePage(type, offset) {
  try {
    const { results } = await PokeApi.byType(
      type,
      offset,
      window.POKEMON_API_CONFIG.pokemonPerPage,
    );
    return results;
  } catch (error) {
    AppError.log(
      AppError.CATEGORY.API,
      `Typ-Seite (${type}, ab ${offset}) Fehler`,
      error,
    );
    return [];
  }
}

window.fetchPokemonByTypeData = (type) => fetchTypePage(type, 0);

// Wird von navigation.js und pokemon-core.js fuers Nachladen gebraucht.
window.fetchMorePokemonByType = (type, offset) => fetchTypePage(type, offset);

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
      AppError.log(
        AppError.CATEGORY.APP,
        `Script laden fehlgeschlagen: ${path}`,
        error,
      );
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
  return script;
}

function runMainFunction() {
  if (typeof initializeApp === "function") return initializeApp();
  if (typeof loadPokemon === "function") return loadPokemon();
  console.error("No main pokemon function found");
  showError();
}

function startApp() {
  setTimeout(() => {
    try {
      runMainFunction();
    } catch (error) {
      AppError.log(AppError.CATEGORY.APP, "App-Start fehlgeschlagen", error);
      showError();
    }
    initializeComponents();
  }, 300);
}

function initComponent(comp) {
  if (comp.coreKey && !window[comp.winKey] && window[comp.coreKey]) {
    window[comp.winKey] = new window[comp.coreKey]();
  }
  if (window[comp.winKey] && typeof window[comp.winKey].init === "function") {
    window[comp.winKey].init();
  }
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
      initComponent(comp);
    } catch (e) {
      console.warn(`Could not init component: ${comp.winKey}`, e);
    }
  });
}

function showError() {
  const container =
    document.getElementById("pokemonContainer") || document.body;
  container.innerHTML =
    typeof createAppErrorTemplate === "function"
      ? createAppErrorTemplate()
      : "<p>App Loading Failed. Check console.</p>";
}

function getUtilScripts() {
  return [
    "./script/utils/error-handler.js",
    "./script/utils/fetch-retry.js",
    "./script/utils/type-constants.js",
    "./script/utils/type-effectiveness.js",
    "./script/type-chart-sync.js",
    "./script/utils/modal-factory.js",
    "./script/utils/ui-helpers.js",
    "./script/utils/team-actions.js",
    "./script/templates/error-template.js",
    "./script/dom-cache.js",
    "./script/template.js",
  ];
}

function getPokemonScripts() {
  return [
    "./script/pokemon-core.js",
    "./script/pokemon-detail.js",
    "./script/pokemon-detail-sections.js",
    "./script/pokemon-detail-evolution.js",
    "./script/pokemon-modal.js",
    "./script/pokemon-ui.js",
    "./script/navigation.js",
    "./script/search.js",
  ];
}

function getTeamCoreScripts() {
  return [
    "./script/team-offcanvas-core.js",
    "./script/team-offcanvas-ui.js",
    "./script/drag-drop-enhanced.js",
    "./js/ai-service.js",
    "./script/team-builder.js",
    "./script/team-builder-ui.js",
    "./script/team-builder-events.js",
  ];
}

function getAiScripts() {
  // Die Prompts liegen im Backend (backend/api/prompts.py), nicht mehr hier.
  return ["./script/team-ai-service.js"];
}

function getAccountScripts() {
  // Konto und Team-Sync (M3). Ohne Login aendert sich nichts am Verhalten.
  return [
    "./script/auth-service.js",
    "./script/auth-ui.js",
    "./script/team-presets.js",
    "./script/team-presets-ui.js",
    "./script/team-sync.js",
    "./script/pokedex-sync.js",
    "./script/battle-sync.js",
    "./script/preset-sync.js",
  ];
}

function getTeamModalScripts() {
  return [
    "./script/team-modal-core.js",
    "./script/team-modal-render.js",
    "./script/team-modal-actions.js",
    "./script/team-modal-events.js",
  ];
}

function getAnalyzerScripts() {
  return [
    "./script/mypokedex-render.js",
    "./script/mypokedex-section.js",
    "./script/team-analyzer-core.js",
    "./script/team-analyzer-logic.js",
    "./script/team-analyzer-modal.js",
    "./script/team-analyzer-render.js",
  ];
}

function getPokemonGoScripts() {
  return [
    "./script/pokemon-go-core.js",
    "./script/pokemon-go-power.js",
    "./script/pokemon-go-dom.js",
    "./script/pokemon-go-favorites.js",
    "./script/pokemon-go-filters.js",
    "./script/pokemon-go-observer.js",
  ];
}

function getBattleScripts() {
  return [
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
}

function getAllScripts() {
  return [
    ...getUtilScripts(),
    ...getPokemonScripts(),
    ...getTeamCoreScripts(),
    ...getAiScripts(),
    ...getAccountScripts(),
    ...getTeamModalScripts(),
    ...getAnalyzerScripts(),
    ...getPokemonGoScripts(),
    ...getBattleScripts(),
  ];
}

function startPokemonApp() {
  loadAllScripts(getAllScripts()).catch((error) => {
    AppError.log(
      AppError.CATEGORY.APP,
      "Kritisch: Script-Laden fehlgeschlagen",
      error,
    );
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
