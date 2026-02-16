import { initializeServices } from "./services/ServiceContainer.js";

class PokemonApp {
  #services;
  #initialized = false;

  constructor() {
    console.log(" Initializing Pokémon App...");
  }

  /**
   * Initialisiert die App
   */
  async initialize() {
    if (this.#initialized) {
      console.warn("App already initialized");
      return;
    }

    try {
      // 1. Services initialisieren
      this.#services = initializeServices();
      console.log("Services loaded");

      // 2. DOM Cache initialisieren (später)
      // await this.#initializeDOMCache();

      // 3. Initial Pokemon laden
      await this.#loadInitialPokemon();

      // 4. Event Listeners initialisieren
      this.#initializeEventListeners();

      // 5. Legacy Code Support (temporär)
      this.#setupLegacyCompatibility();

      this.#initialized = true;
      console.log("✅ App initialized successfully");

      // Debug Info
      if (window.POKE_DEBUG) {
        console.log("Debug Info:", this.#services.getDebugInfo());
      }
    } catch (error) {
      console.error("❌ App initialization failed:", error);
      throw error;
    }
  }

  /**
   * Lädt initiale Pokemon
   * @private
   */
  async #loadInitialPokemon() {
    const pokemonService = this.#services.get("pokemonService");

    try {
      console.log("📦 Loading initial Pokemon...");
      await pokemonService.loadPokemon(0, 20);
      console.log("✅ Initial Pokemon loaded");
    } catch (error) {
      console.error("❌ Error loading initial Pokemon:", error);
    }
  }

  /**
   * Initialisiert Event Listeners
   * @private
   */
  #initializeEventListeners() {
    // State Changes abonnieren
    const stateManager = this.#services.get("stateManager");

    stateManager.subscribe((state, changes) => {
      if (window.POKE_DEBUG) {
        console.log("State changed:", changes);
      }

      // UI Updates triggern
      this.#handleStateChange(state, changes);
    });

    console.log("✅ Event listeners initialized");
  }

  /**
   * Behandelt State Changes
   * @private
   */
  #handleStateChange(state, changes) {
    // Wenn Pokemon Liste sich ändert, UI updaten
    if (changes.pokemonList !== undefined) {
      this.#renderPokemonList(state.pokemonList);
    }

    // Wenn Loading State sich ändert, Loading UI updaten
    if (changes.isLoading !== undefined) {
      this.#updateLoadingState(state.isLoading);
    }

    // Wenn Team sich ändert, Team UI updaten
    if (changes.team !== undefined) {
      this.#updateTeamUI(state.team);
    }
  }

  /**
   * Rendert Pokemon Liste (Placeholder)
   * @private
   */
  #renderPokemonList(pokemonList) {
    console.log("🎨 Rendering Pokemon list:", pokemonList.length);
    // Hier würde die tatsächliche Rendering-Logik kommen
    // TODO: Integration mit bestehenden Rendering-Funktionen
  }

  /**
   * Updated Loading State UI
   * @private
   */
  #updateLoadingState(isLoading) {
    const spinner = document.querySelector(".loading-spinner");
    if (spinner) {
      spinner.classList.toggle("d-none", !isLoading);
    }
  }

  /**
   * Updated Team UI
   * @private
   */
  #updateTeamUI(team) {
    const teamCounter = document.getElementById("teamCounter");
    if (teamCounter) {
      teamCounter.textContent = `${team.length}/6`;
    }

    const pokedexCount = document.getElementById("pokedexCount");
    const pokedexCountOffcanvas = document.getElementById(
      "pokedexCountOffcanvas",
    );

    if (pokedexCount) pokedexCount.textContent = team.length;
    if (pokedexCountOffcanvas) pokedexCountOffcanvas.textContent = team.length;
  }

  /**
   * Setup für Legacy Code Kompatibilität
   * @private
   */
  #setupLegacyCompatibility() {
    // Services global verfügbar machen für alten Code
    window.app = this;
    window.services = {
      pokemon: this.#services.get("pokemonService"),
      team: this.#services.get("teamService"),
      favorites: this.#services.get("favoritesService"),
      api: this.#services.get("apiService"),
      storage: this.#services.get("storageService"),
      state: this.#services.get("stateManager"),
    };

    console.log("✅ Legacy compatibility layer active");
  }

  /**
   * Gibt einen Service zurück
   */
  getService(name) {
    return this.#services.get(name);
  }

  /**
   * Gibt alle Services zurück
   */
  getServices() {
    return this.#services;
  }
}

/**
 * App initialisieren wenn DOM geladen ist
 */
let appInstance = null;

async function initializeApp() {
  if (appInstance) {
    console.warn("⚠️ App already initialized");
    return appInstance;
  }

  appInstance = new PokemonApp();
  await appInstance.initialize();

  return appInstance;
}

// Auto-initialize wenn DOM ready ist
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

// Exports
export { PokemonApp, initializeApp };
export default appInstance;
