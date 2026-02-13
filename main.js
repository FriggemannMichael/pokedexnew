window.toggleDropdown = function (className) {
  const section = document.querySelector("." + className);
  if (!section) return console.warn("Section not found:", className);
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
      console.log(`Script already loaded: ${path}`);
      resolve();
      return;
    }

    console.log(`Loading script: ${path}`);
    const script = createScriptElement(path);
    
    script.onload = () => {
      loadedCount++;
      console.log(`✓ Loaded script: ${path} (${loadedCount} total)`);
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
    console.log("Starting Pokemon App...");
    
    try {
      if (typeof initializeApp === "function") {
        console.log("Found initializeApp, calling it...");
        initializeApp();
      } else {
        console.warn("initializeApp not found, calling main pokemon functions directly");
        // Fallback: Direkt die wichtigsten Funktionen aufrufen
        if (typeof loadPokemon === "function") {
          console.log("Calling loadPokemon...");
          loadPokemon();
        } else if (typeof fetchAndDisplayPokemon === "function") {
          console.log("Calling fetchAndDisplayPokemon...");
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

    // Sicherstellen, dass Team Modal & Analyzer Instanzen existieren (nach Refactor modularisiert)
    try {
      if (!window.pokemonTeamModal && window.PokemonTeamModalCore) {
        window.pokemonTeamModal = new window.PokemonTeamModalCore();
        if (typeof window.pokemonTeamModal.init === 'function') window.pokemonTeamModal.init();
        if (window.POKE_DEBUG) console.debug('[Init] TeamModal initialisiert');
      }
      if (!window.pokemonTeamAnalyzer && window.PokemonTeamAnalyzerCore) {
        window.pokemonTeamAnalyzer = new window.PokemonTeamAnalyzerCore();
        if (typeof window.pokemonTeamAnalyzer.init === 'function') window.pokemonTeamAnalyzer.init();
        if (window.POKE_DEBUG) console.debug('[Init] TeamAnalyzer initialisiert');
      }
      if(window.pokemonGoFeatures && typeof window.pokemonGoFeatures.init==='function'){
        window.pokemonGoFeatures.init();
        if (window.POKE_DEBUG) console.debug('[Init] PokemonGoFeatures init aufgerufen');
      }

      // Compare System initialisieren
      if (window.pokemonCompare && typeof window.pokemonCompare.init === 'function') {
        window.pokemonCompare.init();
        console.log('[Init] PokemonCompare initialisiert');
      }

      // Battle Simulator initialisieren
      if (window.battleSimulator && typeof window.battleSimulator.init === 'function') {
        window.battleSimulator.init();
        console.log('[Init] BattleSimulator initialisiert');
      }

      // Team Battle System initialisieren
      if (window.teamBattle && typeof window.teamBattle.init === 'function') {
        window.teamBattle.init();
        console.log('[Init] TeamBattle initialisiert');
      }
    } catch(e){ console.warn('Team Komponenten Init fehlgeschlagen', e); }

    // Dynamische Balken initialisieren (Progress & Coverage)
    try {
      if (typeof initDynamicBars === 'function') {
        initDynamicBars();
      }
    } catch(e){
      console.warn('initDynamicBars failed or not present', e);
    }
  }, 300); // Noch mehr Zeit für Script-Loading
}

// Initialisierung für Progress-Balken aus data-Attributen
function initDynamicBars() {
  const progressFills = document.querySelectorAll('.progress-bar-fill[data-progress]');
  progressFills.forEach(el => {
    const val = parseFloat(el.getAttribute('data-progress'));
    if (!isNaN(val)) {
      el.style.width = val + '%';
    }
  });
  const coverageBars = document.querySelectorAll('.progress-bar[data-coverage]');
  coverageBars.forEach(el => {
    const val = parseFloat(el.getAttribute('data-coverage'));
    if (!isNaN(val)) {
      el.style.width = val + '%';
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
  console.log("Starting to load Pokemon app scripts...");
  
  const scripts = [
    // 1. Core Foundation Scripts
    "./script/dom-cache.js",
    "./script/api.js",
    "./script/template.js",
    
    // 2. Pokemon Core Functionality
    "./script/pokemon-core.js",
    "./script/pokemon-detail.js",
    "./script/pokemon-modal.js",
    "./script/pokemon-ui.js",
    
    // 3. Navigation and Search
    "./script/navigation.js",
    "./script/search.js",
    
    // 4. Team System (Order matters for dependencies)
    "./script/team-offcanvas.js",      // Base team system - MUSS ZUERST sein
    "./script/drag-drop-enhanced.js",  // Drag & drop functionality
    "./script/team-builder.js",        // Central 6-slot team builder
  // Team modal modular
  "./script/team-modal-core.js",
  "./script/team-modal-render.js",
  "./script/team-modal-actions.js",
  "./script/team-modal-events.js",
  "./script/mypokedex-section.js",   // Team section integration - NACH team-offcanvas
  // Team Analyzer modular
  "./script/team-analyzer-core.js",
  "./script/team-analyzer-logic.js",
  "./script/team-analyzer-modal.js",
  "./script/team-analyzer-render.js",
    
    // 5. Additional Features
    // Pokemon GO modular features (Replaces former single file)
    "./script/pokemon-go-core.js",
    "./script/pokemon-go-power.js",
    "./script/pokemon-go-dom.js",
    "./script/pokemon-go-favorites.js",
    "./script/pokemon-go-filters.js",
    "./script/pokemon-go-observer.js",

    // 6. Compare & Battle Features
    "./script/pokemon-compare.js",
    "./script/battle-simulator.js",
    "./script/team-battle.js",
  ];

  loadAllScripts(scripts)
    .then(() => {
      console.log("All scripts loaded successfully");
    })
    .catch((error) => {
      console.error("Script loading failed:", error);
      showError();
    });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startPokemonApp);
} else {
  startPokemonApp();
}

// Delegiertes Click Handling für Detail-Buttons (ersetzt alte inline onclick Aufrufe)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="show-detail"][data-pokemon-id]');
  if (btn) {
    const id = parseInt(btn.getAttribute('data-pokemon-id'));
    if (!isNaN(id) && typeof window.showPokemonDetail === 'function') {
      window.showPokemonDetail(id);
    }
  }
});

// Einmalige Team-Daten Bereinigung (Badge Pollution Fix)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    try {
      if (window.teamOffcanvas && typeof window.teamOffcanvas.getTeam === 'function' && window.sanitizeTypes) {
        const current = window.teamOffcanvas.getTeam();
        let mutated = false;
        current.forEach(p => {
          const cleaned = window.sanitizeTypes(p.types);
            if (cleaned.join(',') !== p.types.join(',')) {
              p.types = cleaned;
              mutated = true;
            }
        });
        if (mutated && typeof window.teamOffcanvas.saveTeamToStorage === 'function') {
          window.teamOffcanvas.team = current; // überschreiben
          window.teamOffcanvas.saveTeamToStorage();
          console.log('[Sanitize] Team-Typen bereinigt & gespeichert');
        }
      }
    } catch(e) { console.warn('Sanitize team types failed', e); }
  }, 1000);
});
