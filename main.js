window.toggleDropdown = function (className) {
  const section = document.querySelector("." + className);
  if (!section) return; // Silent return, da es oft nur ein UI-Zustand ist
  section.classList.toggle("d-none");
  section.classList.toggle("d-flex");
};

// Flag für main.js
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
  return script;
}

function startApp() {
  setTimeout(() => {
    try {
      if (typeof initializeApp === "function") {
        initializeApp();
      } else {
        // Fallback: Direkt die wichtigsten Funktionen aufrufen
        if (typeof loadPokemon === "function") {
          loadPokemon();
        } else if (typeof fetchAndDisplayPokemon === "function") {
          fetchAndDisplayPokemon();
        } else {
          console.error("No main pokemon function found");
          showError();
        }
      }
    } catch (error) {
      console.error("Error starting app:", error);
      showError();
    }

    // Team Modal & Analyzer Instanzen initialisieren
    try {
      if (!window.pokemonTeamModal && window.PokemonTeamModalCore) {
        window.pokemonTeamModal = new window.PokemonTeamModalCore();
        if (typeof window.pokemonTeamModal.init === "function")
          window.pokemonTeamModal.init();
      }
      if (!window.pokemonTeamAnalyzer && window.PokemonTeamAnalyzerCore) {
        window.pokemonTeamAnalyzer = new window.PokemonTeamAnalyzerCore();
        if (typeof window.pokemonTeamAnalyzer.init === "function")
          window.pokemonTeamAnalyzer.init();
      }
      if (
        window.pokemonGoFeatures &&
        typeof window.pokemonGoFeatures.init === "function"
      ) {
        window.pokemonGoFeatures.init();
      }

      if (
        window.pokemonCompare &&
        typeof window.pokemonCompare.init === "function"
      ) {
        window.pokemonCompare.init();
      }

      if (
        window.battleSimulator &&
        typeof window.battleSimulator.init === "function"
      ) {
        window.battleSimulator.init();
      }

      if (window.teamBattle && typeof window.teamBattle.init === "function") {
        window.teamBattle.init();
      }
    } catch (e) {
      /* Silent catch für optionale Komponenten */
    }

    try {
      if (typeof initDynamicBars === "function") {
        initDynamicBars();
      }
    } catch (e) {
      // Nur warnen, wenn die UI-Funktion existiert, aber crashed
    }
  }, 300);
}

function initDynamicBars() {
  const progressFills = document.querySelectorAll(
    ".progress-bar-fill[data-progress]",
  );
  progressFills.forEach((el) => {
    const val = parseFloat(el.getAttribute("data-progress"));
    if (!isNaN(val)) {
      el.style.width = val + "%";
    }
  });
  const coverageBars = document.querySelectorAll(
    ".progress-bar[data-coverage]",
  );
  coverageBars.forEach((el) => {
    const val = parseFloat(el.getAttribute("data-coverage"));
    if (!isNaN(val)) {
      el.style.width = val + "%";
    }
  });
}

function showError() {
  const container =
    document.getElementById("pokemonContainer") || document.body;
  container.innerHTML = `
        <div class="error-container text-center py-5">
            <h2>App Loading Failed</h2>
            <p>Could not initialize the Pokemon app.</p>
            <button class="btn btn-primary" onclick="window.location.reload()">
                Reload Page
            </button>
        </div>
    `;
}

function startPokemonApp() {
  const scripts = [
    "./script/dom-cache.js",
    "./script/api.js",
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

document.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-action="show-detail"][data-pokemon-id]');
  if (btn) {
    const id = parseInt(btn.getAttribute("data-pokemon-id"));
    if (!isNaN(id) && typeof window.showPokemonDetail === "function") {
      window.showPokemonDetail(id);
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    try {
      if (
        window.teamOffcanvas &&
        typeof window.teamOffcanvas.getTeam === "function" &&
        window.sanitizeTypes
      ) {
        const current = window.teamOffcanvas.getTeam();
        let mutated = false;
        current.forEach((p) => {
          const cleaned = window.sanitizeTypes(p.types);
          if (cleaned.join(",") !== p.types.join(",")) {
            p.types = cleaned;
            mutated = true;
          }
        });
        if (
          mutated &&
          typeof window.teamOffcanvas.saveTeamToStorage === "function"
        ) {
          window.teamOffcanvas.team = current;
          window.teamOffcanvas.saveTeamToStorage();
        }
      }
    } catch (e) {
      /* Silent fix */
    }
  }, 1000);
});
