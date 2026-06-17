(function () {
  const MAX_TEAM_SIZE = 6;
  const MIN_ADVICE_TEAM_SIZE = 4;
  const TEAM_STORAGE_KEY = "pokemonTeam";
  const TEAM_EVENT_NAME = "pokemon-team-updated";
  const VALID_TYPES = window.VALID_POKEMON_TYPES;

  class TeamBuilderState {
    constructor(size, onChange) {
      this.size = size;
      this.onChange = onChange;
      this.slots = Array.from({ length: size }, () => null);
    }

    getSlots() {
      return this.slots.map((pokemon) => (pokemon ? { ...pokemon } : null));
    }

    getTeam() {
      return this.slots.filter(Boolean).map((pokemon) => ({ ...pokemon }));
    }

    setSlotsFromTeam(team, options = {}) {
      const nextSlots = Array.from({ length: this.size }, () => null);
      let cursor = 0;
      (team || []).forEach((pokemon) => {
        if (cursor >= this.size) return;
        const normalized = normalizePokemon(pokemon);
        if (!normalized) return;
        nextSlots[cursor] = normalized;
        cursor += 1;
      });
      return this.commit(nextSlots, options.reason || "hydrate", {
        emit: options.emit !== false,
      });
    }

    assignPokemonToSlot(slotIndex, pokemon) {
      if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= this.size) {
        return { changed: false };
      }

      const normalized = normalizePokemon(pokemon);
      if (!normalized) return { changed: false };

      const nextSlots = this.getSlots();
      const existingIndex = nextSlots.findIndex(
        (entry) => entry && Number(entry.id) === Number(normalized.id),
      );

      if (existingIndex !== -1 && existingIndex !== slotIndex) {
        nextSlots[existingIndex] = null;
      }

      const replaced = nextSlots[slotIndex];
      const noChange =
        replaced &&
        Number(replaced.id) === Number(normalized.id) &&
        existingIndex === slotIndex;
      if (noChange) {
        return { changed: false, replaced: null, movedFrom: null, pokemon: normalized };
      }

      nextSlots[slotIndex] = normalized;
      const changed = this.commit(nextSlots, "assign", { emit: true });

      return {
        changed,
        replaced,
        movedFrom: existingIndex !== slotIndex ? existingIndex : null,
        pokemon: normalized,
      };
    }

    removeFromSlot(slotIndex) {
      if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= this.size) {
        return null;
      }
      const nextSlots = this.getSlots();
      const removed = nextSlots[slotIndex];
      if (!removed) return null;
      nextSlots[slotIndex] = null;
      this.commit(nextSlots, "remove", { emit: true });
      return removed;
    }

    commit(nextSlots, reason, options = {}) {
      if (!this.hasChanged(nextSlots)) return false;
      this.slots = nextSlots;
      if (options.emit && typeof this.onChange === "function") {
        this.onChange({ reason, slots: this.getSlots(), team: this.getTeam() });
      }
      return true;
    }

    hasChanged(nextSlots) {
      for (let i = 0; i < this.slots.length; i += 1) {
        const currentId = this.slots[i] ? Number(this.slots[i].id) : null;
        const nextId = nextSlots[i] ? Number(nextSlots[i].id) : null;
        if (currentId !== nextId) return true;
      }
      return false;
    }
  }

  function normalizePokemon(pokemon) {
    if (!pokemon) return null;
    const id = Number(pokemon.id);
    if (!id) return null;

    const sourcePokemon = getPokemonSourceData(id);
    const rawTypes =
      Array.isArray(pokemon.types) && pokemon.types.length
        ? pokemon.types
        : Array.isArray(sourcePokemon?.types) ? sourcePokemon.types : [];
    const types = rawTypes
      .map((type) => String(type || "").toLowerCase().replace(/[^a-z]/g, ""))
      .filter((type) => VALID_TYPES.has(type));
    const stats =
      Array.isArray(pokemon.stats) && pokemon.stats.length
        ? pokemon.stats
        : Array.isArray(sourcePokemon?.stats) ? sourcePokemon.stats : [];

    return {
      id,
      name: (pokemon.name || "").trim() || `pokemon-${id}`,
      image: pokemon.image || pokemon.spriteUrl || "",
      spriteUrl: pokemon.spriteUrl || pokemon.image || "",
      types: types.length ? types : ["normal"],
      stats,
      base_experience: Number.isFinite(Number(pokemon.base_experience))
        ? Number(pokemon.base_experience)
        : Number(sourcePokemon?.base_experience || 0),
    };
  }

  function extractPokemonFromCard(pokemonId) {
    const sourceContainer = document.getElementById("pokemonContainer");
    const selector = `.pokemon-card[data-pokemon-id="${pokemonId}"], .pokemon-card[data-id="${pokemonId}"]`;
    const card = sourceContainer?.querySelector(selector) || document.querySelector(selector);
    if (!card) return null;

    const sourcePokemon = getPokemonSourceData(pokemonId);
    const nameElement = card.querySelector(".pokemon-name, .card-title");
    const imageElement = card.querySelector(".pokemon-image, img");
    const typeElements = card.querySelectorAll(".type-badge, .detail-type-badge, .type-badge-inline");

    const types = Array.from(typeElements)
      .map((element) => element.textContent.toLowerCase().trim().replace(/[^a-z]/g, ""))
      .filter((type) => VALID_TYPES.has(type));

    return normalizePokemon({
      id: pokemonId,
      name: nameElement ? nameElement.textContent : sourcePokemon?.name || `pokemon-${pokemonId}`,
      image: imageElement ? imageElement.src : sourcePokemon?.image || sourcePokemon?.spriteUrl || "",
      spriteUrl: imageElement ? imageElement.src : sourcePokemon?.spriteUrl || sourcePokemon?.image || "",
      types: types.length ? types : Array.isArray(sourcePokemon?.types) ? sourcePokemon.types : [],
      stats: Array.isArray(sourcePokemon?.stats) ? sourcePokemon.stats : [],
      base_experience: sourcePokemon?.base_experience ?? 0,
    });
  }

  function getPokemonSourceData(pokemonId) {
    const numericId = Number(pokemonId);
    if (!numericId) return null;

    const pools = [];
    if (typeof appState !== "undefined") {
      if (Array.isArray(appState.pokemonList)) pools.push(appState.pokemonList);
      if (Array.isArray(appState.allPokemonList)) pools.push(appState.allPokemonList);
    }
    if (window.appState) {
      if (Array.isArray(window.appState.pokemonList)) pools.push(window.appState.pokemonList);
      if (Array.isArray(window.appState.allPokemonList)) pools.push(window.appState.allPokemonList);
    }

    for (const pool of pools) {
      const found = pool.find((pokemon) => Number(pokemon.id) === numericId);
      if (found) return found;
    }

    if (window.services?.pokemon?.getPokemonById) {
      try { return window.services.pokemon.getPokemonById(numericId) || null; } catch (error) {}
    }
    return null;
  }

  function loadTeamFromStorage() {
    try {
      const raw = localStorage.getItem(TEAM_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) { return []; }
  }

  function teamsEqualById(leftTeam, rightTeam) {
    if (leftTeam.length !== rightTeam.length) return false;
    for (let index = 0; index < leftTeam.length; index += 1) {
      if (Number(leftTeam[index].id) !== Number(rightTeam[index].id)) return false;
    }
    return true;
  }

  const escapeHtml = window.escapeHtml;

  class TeamBuilderUI {
    constructor() {
      this.root = document.getElementById("activeTeamBuilder");
      this.grid = document.getElementById("activeTeamGrid");
      this.counter = document.getElementById("activeTeamCounter");
      this.advisor = document.getElementById("teamBuilderAdvisor") || document.getElementById("ai-advice");
      this.liveRegion = document.getElementById("teamBuilderLiveRegion");
      this.actions = document.getElementById("teamBuilderActions");
      this.state = new TeamBuilderState(MAX_TEAM_SIZE, (payload) => this.onStateChange(payload));
      this.lastAdvisorSignature = "";
      this.cachedAdvisorAssessment = null;
      this.advisorRequestId = 0;
    }

    init() {
      if (!this.root || !this.grid) return;
      this.attachGridEvents();
      this.attachGlobalEvents();
      this.attachActionEvents();
      this.hydrateInitialState();
      this.render();
      this.updateCounter();
      this.updateActionBar();
      this.refreshAdvisor();
      this.syncToOffcanvas();
      window.teamBuilder = this;
    }

    hydrateInitialState() {
      const teamFromOffcanvas =
        window.teamOffcanvas && typeof window.teamOffcanvas.getTeam === "function"
          ? window.teamOffcanvas.getTeam()
          : [];

      if (Array.isArray(teamFromOffcanvas) && teamFromOffcanvas.length > 0) {
        this.state.setSlotsFromTeam(teamFromOffcanvas, { reason: "offcanvas-hydrate", emit: false });
        return;
      }

      const teamFromStorage = loadTeamFromStorage();
      if (teamFromStorage.length > 0) {
        this.state.setSlotsFromTeam(teamFromStorage, { reason: "storage-hydrate", emit: false });
      }
    }

    onStateChange() {
      this.render();
      this.updateCounter();
      this.updateActionBar();
      this.refreshAdvisor();
      this.syncToOffcanvas();
    }

    syncToOffcanvas() {
      const compactTeam = this.state.getTeam();
      if (window.teamOffcanvas && typeof window.teamOffcanvas.syncExternalTeam === "function") {
        const currentOffcanvasTeam =
          typeof window.teamOffcanvas.getTeam === "function" ? window.teamOffcanvas.getTeam() : [];
        if (teamsEqualById(compactTeam, currentOffcanvasTeam)) return;
        window.teamOffcanvas.syncExternalTeam(compactTeam, "team-builder");
        return;
      }
      try { localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(compactTeam)); } catch (error) {}
    }

    updateCounter() {
      if (!this.counter) return;
      this.counter.textContent = `${this.state.getTeam().length}/${MAX_TEAM_SIZE}`;
    }

    clearHoveredSlots() {
      this.grid.querySelectorAll(".team-slot.is-hovered").forEach((slot) => {
        slot.classList.remove("is-hovered");
      });
    }

    getTeamSignature(team) {
      return team.map((pokemon) => Number(pokemon?.id || 0)).filter(Boolean).join("-");
    }

    announce(message) {
      if (!this.liveRegion) return;
      this.liveRegion.textContent = "";
      window.setTimeout(() => { this.liveRegion.textContent = message; }, 15);
    }
  }

  window._TeamBuilderUI = TeamBuilderUI;
  window._teamBuilderExtractPokemonFromCard = extractPokemonFromCard;
  window._teamBuilderEscapeHtml = escapeHtml;
  window._TEAM_EVENT_NAME = TEAM_EVENT_NAME;
  window._MIN_ADVICE_TEAM_SIZE = MIN_ADVICE_TEAM_SIZE;
})();
