import { ApiService } from "./script/services/ApiService.js";

/**
 * 1. GLOBALE KONFIGURATION & SERVICE INITIALISIERUNG
 */
window.POKEMON_API_CONFIG = {
  baseUrl: "https://pokeapi.co/api/v2/pokemon",
  pokemonPerPage: 20,
  defaultOffset: 0,
};

// Instanz mit der API-Root erstellen
window.apiService = new ApiService({
  baseUrl: "https://pokeapi.co/api/v2",
});

/**
 * 2. KOMPATIBILITÄTS-BRÜCKE (Legacy Support)
 * Emuliert die Funktionen der alten api.js für pokemon-core.js
 */
window.fetchPokemonData = async (offset, limit) => {
  try {
    const result = await window.apiService.fetchPokemonList(offset, limit);
    return result.pokemon; // Gibt das transformierte Array zurück (jetzt inkl. .image)
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

/**
 * 3. UI HELFER & GLOBALE VARIABLEN
 */
window.toggleDropdown = function (className) {
  const section = document.querySelector("." + className);
  if (!section) return;
  section.classList.toggle("d-none");
  section.classList.toggle("d-flex");
};

window.mainJsLoaded = true;
let loadedCount = 0;

/**
 * 4. SCRIPT LOADER LOGIK
 */
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

/**
 * 5. APP INITIALISIERUNG
 */
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
  container.innerHTML = `
        <div class="error-container text-center py-5">
            <h2>App Loading Failed</h2>
            <p>Check the console for errors.</p>
            <button class="btn btn-primary" onclick="window.location.reload()">Reload Page</button>
        </div>
    `;
}

/**
 * 6. START-PROZESS
 */
function startPokemonApp() {
  const scripts = [
    "./script/dom-cache.js",
    "./script/template.js",
    "./script/pokemon-core.js",
    "./script/pokemon-detail.js",
    "./script/pokemon-modal.js",
    "./script/pokemon-ui.js",
    "./script/navigation.js",
    "./script/search.js",
    "./script/team-offcanvas.js",
    "./script/drag-drop-enhanced.js",
    "./js/ai-service.js",
    "./script/team-builder.js",
    "./script/team-ai-service.js",
    "./script/team-modal-core.js",
    "./script/team-modal-render.js",
    "./script/team-modal-actions.js",
    "./script/team-modal-events.js",
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
    "./script/battle-history.js",
    "./script/battle-simulator.js",
    "./script/team-battle.js",
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

// Globaler Click-Listener
document.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-action="show-detail"][data-pokemon-id]');
  if (btn) {
    const id = parseInt(btn.getAttribute("data-pokemon-id"));
    if (!isNaN(id) && typeof window.showPokemonDetail === "function") {
      window.showPokemonDetail(id);
    }
  }
});
