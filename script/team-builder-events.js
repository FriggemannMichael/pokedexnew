(function () {
  const TeamBuilderUI = window._TeamBuilderUI;
  const extractPokemonFromCard = window._teamBuilderExtractPokemonFromCard;
  const TEAM_EVENT_NAME = window._TEAM_EVENT_NAME;

  TeamBuilderUI.prototype.attachGridEvents = function () {
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
  };

  TeamBuilderUI.prototype.attachGlobalEvents = function () {
    document.addEventListener("pokemon-card-drag-end", () => {
      this.clearHoveredSlots();
    });

    document.addEventListener("click", (event) => {
      const addButton = event.target.closest(
        'button[data-action="add-team"][data-pokemon-id]',
      );
      if (!addButton) return;
      this.addPokemonById(addButton.dataset.pokemonId);
    });

    window.addEventListener(TEAM_EVENT_NAME, (event) => {
      const source = event.detail?.source;
      if (source === "team-builder") return;
      const externalTeam = Array.isArray(event.detail?.team) ? event.detail.team : [];
      this.state.setSlotsFromTeam(externalTeam, { reason: "external-sync", emit: false });
      this.render();
      this.updateCounter();
      this.refreshAdvisor();
    });
  };

  TeamBuilderUI.prototype.addPokemonById = function (pokemonId) {
    const emptyIndex = this.state.getSlots().findIndex((slot) => !slot);
    if (emptyIndex === -1) {
      this.announce("Team is full. Remove a Pokemon first.");
      return;
    }
    this.handleDrop(emptyIndex, pokemonId);
  };

  TeamBuilderUI.prototype.handleDrop = async function (slotIndex, pokemonId) {
    const numericId = Number(pokemonId);
    if (!numericId) return;

    let pokemon = extractPokemonFromCard(numericId);
    if (!pokemon) {
      this.announce("Pokemon data could not be read.");
      return;
    }

    const needsApi =
      !Array.isArray(pokemon.stats) ||
      pokemon.stats.length === 0 ||
      !pokemon.base_experience ||
      pokemon.base_experience === 0;

    if (needsApi) {
      try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${numericId}`);
        if (response.ok) {
          const apiData = await response.json();
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

    if (result.replaced && Number(result.replaced.id) !== Number(result.pokemon.id)) {
      this.announce(`${result.pokemon.name} replaced ${result.replaced.name} in slot ${slotIndex + 1}.`);
      return;
    }

    this.announce(`${result.pokemon.name} placed in slot ${slotIndex + 1}.`);
  };

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
