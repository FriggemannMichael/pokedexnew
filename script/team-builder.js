(function () {
  const MAX_TEAM_SIZE = 6;
  const MIN_ADVICE_TEAM_SIZE = 3;
  const TEAM_STORAGE_KEY = "pokemonTeam";
  const TEAM_EVENT_NAME = "pokemon-team-updated";
  const VALID_TYPES = new Set([
    "normal",
    "fire",
    "water",
    "grass",
    "electric",
    "ice",
    "fighting",
    "poison",
    "ground",
    "flying",
    "psychic",
    "bug",
    "rock",
    "ghost",
    "dragon",
    "dark",
    "steel",
    "fairy",
  ]);

  const TYPE_COLORS = {
    normal: "#a8a878",
    fire: "#f08030",
    water: "#6890f0",
    electric: "#f8d030",
    grass: "#78c850",
    ice: "#98d8d8",
    fighting: "#c03028",
    poison: "#a040a0",
    ground: "#e0c068",
    flying: "#a890f0",
    psychic: "#f85888",
    bug: "#a8b820",
    rock: "#b8a038",
    ghost: "#705898",
    dragon: "#7038f8",
    dark: "#705848",
    steel: "#b8b8d0",
    fairy: "#ee99ac",
  };

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
      if (
        !Number.isInteger(slotIndex) ||
        slotIndex < 0 ||
        slotIndex >= this.size
      ) {
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
        return {
          changed: false,
          replaced: null,
          movedFrom: null,
          pokemon: normalized,
        };
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
      if (
        !Number.isInteger(slotIndex) ||
        slotIndex < 0 ||
        slotIndex >= this.size
      ) {
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
        const current = this.slots[i];
        const next = nextSlots[i];
        const currentId = current ? Number(current.id) : null;
        const nextId = next ? Number(next.id) : null;
        if (currentId !== nextId) return true;
      }
      return false;
    }
  }

  class TeamBuilderUI {
    constructor() {
      this.root = document.getElementById("activeTeamBuilder");
      this.grid = document.getElementById("activeTeamGrid");
      this.counter = document.getElementById("activeTeamCounter");
      this.advisor =
        document.getElementById("teamBuilderAdvisor") ||
        document.getElementById("ai-advice");
      this.liveRegion = document.getElementById("teamBuilderLiveRegion");
      this.state = new TeamBuilderState(MAX_TEAM_SIZE, (payload) =>
        this.onStateChange(payload),
      );
      this.lastAdvisorSignature = "";
      this.cachedAdvisorAssessment = null;
      this.advisorRequestId = 0;
    }

    init() {
      if (!this.root || !this.grid) return;

      this.attachGridEvents();
      this.attachGlobalEvents();
      this.hydrateInitialState();
      this.render();
      this.updateCounter();
      this.refreshAdvisor();
      this.syncToOffcanvas();

      window.teamBuilder = this;
    }

    hydrateInitialState() {
      const teamFromOffcanvas =
        window.teamOffcanvas &&
        typeof window.teamOffcanvas.getTeam === "function"
          ? window.teamOffcanvas.getTeam()
          : [];

      if (Array.isArray(teamFromOffcanvas) && teamFromOffcanvas.length > 0) {
        this.state.setSlotsFromTeam(teamFromOffcanvas, {
          reason: "offcanvas-hydrate",
          emit: false,
        });
        return;
      }

      const teamFromStorage = loadTeamFromStorage();
      if (teamFromStorage.length > 0) {
        this.state.setSlotsFromTeam(teamFromStorage, {
          reason: "storage-hydrate",
          emit: false,
        });
      }
    }

    attachGridEvents() {
      this.grid.addEventListener("dragover", (event) => {
        const slot = event.target.closest(".team-slot");
        if (!slot) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      });

      this.grid.addEventListener("dragenter", (event) => {
        const slot = event.target.closest(".team-slot");
        if (!slot) return;
        slot.classList.add("is-hovered");
      });

      this.grid.addEventListener("dragleave", (event) => {
        const slot = event.target.closest(".team-slot");
        if (!slot) return;
        if (!event.relatedTarget || !slot.contains(event.relatedTarget)) {
          slot.classList.remove("is-hovered");
        }
      });

      this.grid.addEventListener("drop", (event) => {
        const slot = event.target.closest(".team-slot");
        if (!slot) return;

        event.preventDefault();
        slot.classList.remove("is-hovered");

        const slotIndex = Number(slot.dataset.slotIndex);
        const pokemonId =
          event.dataTransfer.getData("pokedex-card-id") ||
          event.dataTransfer.getData("text/plain");

        this.handleDrop(slotIndex, pokemonId);
      });

      this.grid.addEventListener("click", (event) => {
        const removeButton = event.target.closest(
          'button[data-action="remove-slot"][data-slot-index]',
        );
        if (!removeButton) return;

        const slotIndex = Number(removeButton.dataset.slotIndex);
        const removed = this.state.removeFromSlot(slotIndex);
        if (removed) {
          this.announce(`${removed.name} removed from slot ${slotIndex + 1}.`);
        }
      });

      this.grid.addEventListener("keydown", (event) => {
        const slot = event.target.closest(".team-slot");
        if (!slot) return;

        if (event.key !== "Backspace" && event.key !== "Delete") return;
        const slotIndex = Number(slot.dataset.slotIndex);
        const removed = this.state.removeFromSlot(slotIndex);
        if (removed) {
          event.preventDefault();
          this.announce(`${removed.name} removed from slot ${slotIndex + 1}.`);
        }
      });
    }

    attachGlobalEvents() {
      document.addEventListener("pokemon-card-drag-end", () => {
        this.clearHoveredSlots();
      });

      window.addEventListener(TEAM_EVENT_NAME, (event) => {
        const source = event.detail?.source;
        if (source === "team-builder") return;

        const externalTeam = Array.isArray(event.detail?.team)
          ? event.detail.team
          : [];
        this.state.setSlotsFromTeam(externalTeam, {
          reason: "external-sync",
          emit: false,
        });
        this.render();
        this.updateCounter();
        this.refreshAdvisor();
      });
    }

    async handleDrop(slotIndex, pokemonId) {
      const numericId = Number(pokemonId);
      if (!numericId) return;

      let pokemon = extractPokemonFromCard(numericId);
      if (!pokemon) {
        this.announce("Pokemon data could not be read.");
        return;
      }

      // Prüfe, ob Stats oder base_experience fehlen und lade ggf. nach
      const needsApi =
        !Array.isArray(pokemon.stats) ||
        pokemon.stats.length === 0 ||
        !pokemon.base_experience ||
        pokemon.base_experience === 0;
      if (needsApi) {
        try {
          const response = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${numericId}`,
          );
          if (response.ok) {
            const apiData = await response.json();
            // Stats und base_experience übernehmen
            pokemon = {
              ...pokemon,
              stats: Array.isArray(apiData.stats) ? apiData.stats : [],
              base_experience: apiData.base_experience || 0,
              types: Array.isArray(apiData.types)
                ? apiData.types.map((t) => t.type.name)
                : pokemon.types,
            };
          }
        } catch (err) {
          console.warn("[TeamBuilder] Konnte Daten nicht nachladen:", err);
        }
      }

      const result = this.state.assignPokemonToSlot(slotIndex, pokemon);
      if (!result.changed) return;

      if (
        result.replaced &&
        Number(result.replaced.id) !== Number(result.pokemon.id)
      ) {
        this.announce(
          `${result.pokemon.name} replaced ${result.replaced.name} in slot ${slotIndex + 1}.`,
        );
        return;
      }

      this.announce(`${result.pokemon.name} placed in slot ${slotIndex + 1}.`);
    }

    onStateChange() {
      this.render();
      this.updateCounter();
      this.refreshAdvisor();
      this.syncToOffcanvas();
    }

    syncToOffcanvas() {
      const compactTeam = this.state.getTeam();

      if (
        window.teamOffcanvas &&
        typeof window.teamOffcanvas.syncExternalTeam === "function"
      ) {
        const currentOffcanvasTeam =
          typeof window.teamOffcanvas.getTeam === "function"
            ? window.teamOffcanvas.getTeam()
            : [];
        if (teamsEqualById(compactTeam, currentOffcanvasTeam)) return;
        window.teamOffcanvas.syncExternalTeam(compactTeam, "team-builder");
        return;
      }

      try {
        localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(compactTeam));
      } catch (error) {
        console.warn("Team storage fallback failed", error);
      }
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

    render() {
      const slots = this.state.getSlots();
      this.grid.innerHTML = slots
        .map((pokemon, index) => this.renderSlot(pokemon, index))
        .join("");
    }

    async refreshAdvisor() {
      if (!this.advisor) return;

      const team = this.state.getTeam();
      if (team.length < MIN_ADVICE_TEAM_SIZE) {
        this.lastAdvisorSignature = "";
        this.cachedAdvisorAssessment = null;
        this.renderAdvisorWaiting(team.length);
        return;
      }

      const signature = this.getTeamSignature(team);
      if (
        signature &&
        signature === this.lastAdvisorSignature &&
        this.cachedAdvisorAssessment
      ) {
        this.renderAdvisorResult(this.cachedAdvisorAssessment);
        return;
      }

      const requestId = ++this.advisorRequestId;
      this.renderAdvisorLoading();

      const assessment = await this.generateTeamAssessment(team);
      if (requestId !== this.advisorRequestId) return;

      if (!assessment) {
        this.renderAdvisorError();
        return;
      }

      this.lastAdvisorSignature = signature;
      this.cachedAdvisorAssessment = assessment;
      this.renderAdvisorResult(assessment);
    }

    getTeamSignature(team) {
      return team
        .map((pokemon) => Number(pokemon?.id || 0))
        .filter(Boolean)
        .join("-");
    }

    async generateTeamAssessment(team) {
      const staticAnalysis = this.getStaticTeamAnalysis(team);
      const aiService = window.aiService;
      const localFallback = this.createLocalProfessorAdvice(
        team,
        staticAnalysis,
      );

      // Debug: Logge das Team-Array vor dem KI-Aufruf
      console.log("[TeamBuilder][KI Übergabe] Team-Array:", team);
      if (Array.isArray(team)) {
        team.forEach((p, i) => {
          console.log(`[TeamBuilder][KI Übergabe] Slot ${i + 1}:`, p);
        });
      }

      // Ensure proxy detection has completed before checking key
      if (aiService && typeof aiService.detectProxy === "function") {
        await aiService.detectProxy();
      }

      if (
        aiService &&
        typeof aiService.requestProfessorTeamAdvice === "function" &&
        typeof aiService.hasGroqKey === "function" &&
        aiService.hasGroqKey()
      ) {
        try {
          const aiAdvice = await aiService.requestProfessorTeamAdvice({
            team,
            staticAnalysis,
          });
          return {
            providerLabel: "Professor Eich (Groq)",
            adviceText: this.normalizeProfessorAdvice(aiAdvice, localFallback),
          };
        } catch (error) {
          console.warn("Professor advisor AI failed, fallback to local", error);
        }
      }

      return {
        providerLabel: "Professor Eich (lokal)",
        adviceText: localFallback,
      };
    }

    getStaticTeamAnalysis(team) {
      if (
        window.pokemonTeamAnalyzer &&
        typeof window.pokemonTeamAnalyzer.analyzeTeam === "function"
      ) {
        try {
          return window.pokemonTeamAnalyzer.analyzeTeam(team);
        } catch (error) {
          console.warn("Team analyzer static analysis failed", error);
        }
      }
      return null;
    }

    createLocalProfessorAdvice(team, staticAnalysis) {
      const teamTypes = new Set();
      team.forEach((pokemon) => {
        (pokemon.types || []).forEach((type) => teamTypes.add(type));
      });

      const weaknessEntries = Object.entries(staticAnalysis?.weaknesses || {});
      const weaknessRanking = weaknessEntries
        .map(([type, data]) => ({
          type,
          weight: this.getWeaknessWeight(data?.severity?.level),
        }))
        .sort((left, right) => right.weight - left.weight);
      const weakestType = weaknessRanking[0]?.type;

      const coverage = staticAnalysis?.coverage || {};
      const coveredCount = Object.values(coverage).filter(
        (entry) => entry?.covered,
      ).length;
      const totalCoverageTypes = Object.keys(coverage).length || 18;

      const weaknessSentence = weakestType
        ? `Groesste Schwaeche: Gegen ${weakestType} fehlt dir aktuell die beste Absicherung.`
        : "Groesste Schwaeche: Dein Team hat noch keine klare Defensiv-Achse.";
      const strengthSentence =
        coveredCount >= Math.max(8, Math.round(totalCoverageTypes * 0.45))
          ? `Staerke: Deine Coverage trifft bereits ${coveredCount} von ${totalCoverageTypes} Typen.`
          : `Staerke: Du nutzt schon ${teamTypes.size} verschiedene Typen fuer flexible Matchups.`;

      return `${weaknessSentence} ${strengthSentence}`;
    }

    getWeaknessWeight(level) {
      if (level === "critical") return 3;
      if (level === "high") return 2;
      if (level === "medium") return 1;
      return 0;
    }

    normalizeProfessorAdvice(text, fallbackText) {
      const raw = String(text || "")
        .replace(/\s+/g, " ")
        .trim();
      const fallback = String(fallbackText || "").trim();
      const fallbackParts = this.splitSentences(fallback);
      const parts = this.splitSentences(raw);

      const first =
        parts[0] ||
        fallbackParts[0] ||
        "Groesste Schwaeche: Analyse unvollstaendig.";
      const second =
        parts[1] ||
        fallbackParts[1] ||
        "Staerke: Dein Team zeigt trotzdem offensive Optionen.";

      return `${first} ${second}`.trim();
    }

    splitSentences(text) {
      return String(text || "")
        .split(/(?<=[.!?])\s+/)
        .map((segment) => segment.trim())
        .filter(Boolean)
        .slice(0, 2);
    }

    renderAdvisorWaiting(count) {
      if (!this.advisor) return;
      this.advisor.className = "team-builder-advisor is-waiting";
      this.advisor.innerHTML = `
        <div class="advisor-head">
          <div class="advisor-avatar" aria-hidden="true">Prof</div>
          <div class="advisor-title-wrap">
            <div class="advisor-title">Professor Eich</div>
            <div class="advisor-provider">Team-Analyse</div>
          </div>
        </div>
        <p class="advisor-text">Noch ${MIN_ADVICE_TEAM_SIZE - count} Slot(s) bis zur Analyse.</p>
      `;
    }

    renderAdvisorLoading() {
      if (!this.advisor) return;
      this.advisor.className = "team-builder-advisor is-loading";
      this.advisor.innerHTML = `
        <div class="advisor-head">
          <div class="advisor-avatar is-thinking" aria-hidden="true">Prof</div>
          <div class="advisor-title-wrap">
            <div class="advisor-title">Professor Eich</div>
            <div class="advisor-provider">Analysiert Team</div>
          </div>
        </div>
        <p class="advisor-text">
          Professor Eich denkt
          <span class="advisor-dots" aria-hidden="true"><span></span><span></span><span></span></span>
        </p>
      `;
    }

    renderAdvisorError() {
      if (!this.advisor) return;
      this.advisor.className = "team-builder-advisor is-error";
      this.advisor.innerHTML = `
        <div class="advisor-head">
          <div class="advisor-avatar" aria-hidden="true">Prof</div>
          <div class="advisor-title-wrap">
            <div class="advisor-title">Professor Eich</div>
            <div class="advisor-provider">Offline</div>
          </div>
        </div>
        <p class="advisor-text">Analyse nicht verfuegbar. Team kurz aendern und erneut pruefen.</p>
      `;
    }

    renderAdvisorResult(assessment) {
      if (!this.advisor) return;

      const safeProvider = escapeHtml(
        assessment.providerLabel || "Professor Eich",
      );
      const adviceText = String(assessment.adviceText || "").trim();

      this.advisor.className = "team-builder-advisor is-ready";
      this.advisor.innerHTML = `
        <div class="advisor-head">
          <div class="advisor-avatar" aria-hidden="true">Prof</div>
          <div class="advisor-title-wrap">
            <div class="advisor-title">Professor Eich</div>
            <div class="advisor-provider">${safeProvider}</div>
          </div>
        </div>
        <p class="advisor-text advisor-typewriter" data-role="advisor-output"></p>
      `;

      const output = this.advisor.querySelector('[data-role="advisor-output"]');
      if (!output) return;

      if (
        window.aiService &&
        typeof window.aiService.typewriterToElement === "function"
      ) {
        window.aiService.typewriterToElement(output, adviceText, { speed: 17 });
      } else {
        output.textContent = adviceText;
      }
    }

    renderSlot(pokemon, index) {
      if (!pokemon) {
        return `
          <div
            class="team-slot"
            data-slot-index="${index}"
            role="listitem"
            tabindex="0"
            aria-label="Slot ${index + 1}, empty"
          >
            <span class="team-slot-index">${index + 1}</span>
            <div class="team-slot-placeholder">
              <span class="team-slot-plus" aria-hidden="true">+</span>
              <span class="team-slot-placeholder-text">Drop Pokemon</span>
            </div>
          </div>
        `;
      }

      const primaryType = pokemon.types[0] || "normal";
      const accent = TYPE_COLORS[primaryType] || "#4ecdc4";
      const safeName = escapeHtml(pokemon.name);
      const safeImage = escapeHtml(pokemon.image || pokemon.spriteUrl || "");

      return `
        <div
          class="team-slot is-filled"
          data-slot-index="${index}"
          data-type="${primaryType}"
          role="listitem"
          tabindex="0"
          style="--slot-accent:${accent}"
          aria-label="Slot ${index + 1}, ${safeName}"
        >
          <span class="team-slot-index">${index + 1}</span>
          <button
            type="button"
            class="team-slot-remove"
            data-action="remove-slot"
            data-slot-index="${index}"
            aria-label="Remove ${safeName} from slot ${index + 1}"
          >
            x
          </button>
          <img src="${safeImage}" alt="${safeName}" class="team-slot-sprite" loading="lazy" />
          <p class="team-slot-name">${safeName}</p>
        </div>
      `;
    }

    announce(message) {
      if (!this.liveRegion) return;
      this.liveRegion.textContent = "";
      window.setTimeout(() => {
        this.liveRegion.textContent = message;
      }, 15);
    }
  }

  function normalizePokemon(pokemon) {
    if (!pokemon) return null;

    const id = Number(pokemon.id);
    if (!id) return null;

    const sourcePokemon = getPokemonSourceData(id);
    const name = (pokemon.name || "").trim();
    const image = pokemon.image || pokemon.spriteUrl || "";
    const spriteUrl = pokemon.spriteUrl || pokemon.image || "";
    const rawTypes =
      Array.isArray(pokemon.types) && pokemon.types.length
        ? pokemon.types
        : Array.isArray(sourcePokemon?.types)
          ? sourcePokemon.types
          : [];
    const types = rawTypes
      .map((type) =>
        String(type || "")
          .toLowerCase()
          .replace(/[^a-z]/g, ""),
      )
      .filter((type) => VALID_TYPES.has(type));
    const stats =
      Array.isArray(pokemon.stats) && pokemon.stats.length
        ? pokemon.stats
        : Array.isArray(sourcePokemon?.stats)
          ? sourcePokemon.stats
          : [];
    const baseExperience = Number.isFinite(Number(pokemon.base_experience))
      ? Number(pokemon.base_experience)
      : Number(sourcePokemon?.base_experience || 0);

    return {
      id,
      name: name || `pokemon-${id}`,
      image,
      spriteUrl,
      types: types.length ? types : ["normal"],
      stats,
      base_experience: baseExperience,
    };
  }

  function extractPokemonFromCard(pokemonId) {
    const sourceContainer = document.getElementById("pokemonContainer");
    const selector = `.pokemon-card[data-pokemon-id="${pokemonId}"], .pokemon-card[data-id="${pokemonId}"]`;
    const card =
      sourceContainer?.querySelector(selector) ||
      document.querySelector(selector);
    if (!card) return null;

    const sourcePokemon = getPokemonSourceData(pokemonId);
    const nameElement = card.querySelector(".pokemon-name, .card-title");
    const imageElement = card.querySelector(".pokemon-image, img");
    const typeElements = card.querySelectorAll(
      ".type-badge, .detail-type-badge, .type-badge-inline",
    );

    const types = Array.from(typeElements)
      .map((element) =>
        element.textContent
          .toLowerCase()
          .trim()
          .replace(/[^a-z]/g, ""),
      )
      .filter((type) => VALID_TYPES.has(type));

    return normalizePokemon({
      id: pokemonId,
      name: nameElement
        ? nameElement.textContent
        : sourcePokemon?.name || `pokemon-${pokemonId}`,
      image: imageElement
        ? imageElement.src
        : sourcePokemon?.image || sourcePokemon?.spriteUrl || "",
      spriteUrl: imageElement
        ? imageElement.src
        : sourcePokemon?.spriteUrl || sourcePokemon?.image || "",
      types: types.length
        ? types
        : Array.isArray(sourcePokemon?.types)
          ? sourcePokemon.types
          : [],
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
      if (Array.isArray(appState.allPokemonList))
        pools.push(appState.allPokemonList);
    }
    if (window.appState) {
      if (Array.isArray(window.appState.pokemonList))
        pools.push(window.appState.pokemonList);
      if (Array.isArray(window.appState.allPokemonList))
        pools.push(window.appState.allPokemonList);
    }

    for (const pool of pools) {
      const found = pool.find((pokemon) => Number(pokemon.id) === numericId);
      if (found) return found;
    }

    if (window.services?.pokemon?.getPokemonById) {
      try {
        return window.services.pokemon.getPokemonById(numericId) || null;
      } catch (error) {
        console.warn("Team builder source lookup failed", error);
      }
    }

    return null;
  }

  function loadTeamFromStorage() {
    try {
      const raw = localStorage.getItem(TEAM_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Could not load team from storage", error);
      return [];
    }
  }

  function teamsEqualById(leftTeam, rightTeam) {
    if (leftTeam.length !== rightTeam.length) return false;

    for (let index = 0; index < leftTeam.length; index += 1) {
      if (Number(leftTeam[index].id) !== Number(rightTeam[index].id)) {
        return false;
      }
    }

    return true;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function initializeTeamBuilder() {
    if (window.teamBuilder) return;
    const teamBuilder = new TeamBuilderUI();
    teamBuilder.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeTeamBuilder);
  } else {
    initializeTeamBuilder();
  }
})();
