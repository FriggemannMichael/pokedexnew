import { initializeServices } from "./services/ServiceContainer.js";

class PokemonApp {
  #services;
  #initialized = false;

  constructor() {
    console.log(" Initializing Pokémon App...");
  }

  async initialize() {
    if (this.#initialized) {
      console.warn("App already initialized");
      return;
    }

    try {
      this.#services = initializeServices();
      console.log("Services loaded");

      await this.#loadInitialPokemon();

      this.#initializeEventListeners();

      this.#setupLegacyCompatibility();

      this.#initialized = true;
      console.log("✅ App initialized successfully");

      if (window.POKE_DEBUG) {
        console.log("Debug Info:", this.#services.getDebugInfo());
      }
    } catch (error) {
      console.error("❌ App initialization failed:", error);
      throw error;
    }
  }

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

  #initializeEventListeners() {
    const stateManager = this.#services.get("stateManager");

    stateManager.subscribe((state, changes) => {
      if (window.POKE_DEBUG) {
        console.log("State changed:", changes);
      }

      this.#handleStateChange(state, changes);
    });

    console.log("✅ Event listeners initialized");
  }

  #handleStateChange(state, changes) {
    if (changes.pokemonList !== undefined) {
      this.#renderPokemonList(state.pokemonList);
    }

    if (changes.isLoading !== undefined) {
      this.#updateLoadingState(state.isLoading);
    }

    if (changes.team !== undefined) {
      this.#updateTeamUI(state.team);
    }
  }

  #renderPokemonList(pokemonList) {
    console.log("🎨 Rendering Pokemon list:", pokemonList.length);
  }

  #updateLoadingState(isLoading) {
    const spinner = document.querySelector(".loading-spinner");
    if (spinner) {
      spinner.classList.toggle("d-none", !isLoading);
    }
  }

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

  #setupLegacyCompatibility() {
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

  getService(name) {
    return this.#services.get(name);
  }

  getServices() {
    return this.#services;
  }
}

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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

export { PokemonApp, initializeApp };
export default appInstance;
