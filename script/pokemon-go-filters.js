(function () {
  const PGF = PokemonGoFeatures.prototype;
  PGF.setupEventListeners = function () {
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("favorite-btn")) {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(e.target.dataset.pokemonId);
        this.toggleFavorite(id);
      }
    });
  };
  PGF.addFilterToggles = function () {
    const favT = document.getElementById("favoritesToggle");
    const rating = document.getElementById("ratingFilter");
    this.favoritesOnlyActive = !!this.favoritesOnlyActive;
    if (favT) favT.addEventListener("click", () => this.filterFavorites());
    if (rating)
      rating.addEventListener("change", (e) =>
        this.filterByRating(e.target.value)
      );
    this.updateFavoritesToggleUI();
  };
  PGF.filterFavorites = function () {
    this.favoritesOnlyActive = !this.favoritesOnlyActive;
    this.updateFavoritesToggleUI();
    this.applyCombinedFilters();
  };
  PGF.filterByRating = function (min) {
    this.activeRatingFilter = min;
    this.applyCombinedFilters();
  };
  PGF.applyCombinedFilters = async function () {
    const selected = parseInt(this.activeRatingFilter, 10);
    const hasRatingFilter = !Number.isNaN(selected);
    const canRenderFromData =
      hasRatingFilter &&
      typeof clearPokemonContainer === "function" &&
      typeof renderPokemon === "function";

    if (canRenderFromData) {
      await this.renderFilteredPokemonList(selected);
      this.updateRatingFilterNavigationUI(true);
      return;
    }

    if (!hasRatingFilter && this.isRatingResultMode) {
      this.restoreRatingFilterBaseView();
    }

    this.updateRatingFilterNavigationUI(false);
    this.applyCardVisibilityFilters(hasRatingFilter, selected);
  };
  PGF.renderFilteredPokemonList = async function (selectedRating) {
    const baseList = await this.getRatingFilterBaseList(selectedRating);
    let filtered = this.filterPokemonByActiveRating(baseList, selectedRating);

    if (
      filtered.length === 0 &&
      !this.favoritesOnlyActive &&
      this.getAppState()?.selectedType !== "all"
    ) {
      const globalList = await this.loadPokemonDetailsByIds(
        this.getKnownPokemonIdsForRating(selectedRating)
      );
      filtered = this.filterPokemonByActiveRating(globalList, selectedRating);
    }

    clearPokemonContainer();

    if (filtered.length > 0) {
      renderPokemon(filtered);
      return;
    }

    if (typeof showNoPokemonMessage === "function") {
      showNoPokemonMessage();
    }
  };
  PGF.filterPokemonByActiveRating = function (pokemonList, selectedRating) {
    return pokemonList.filter((pokemon) => {
      const id = Number(pokemon && pokemon.id);
      return (
        Number.isInteger(id) &&
        (!this.favoritesOnlyActive || this.isFavorite(id)) &&
        this.getRating(id) === selectedRating
      );
    });
  };
  PGF.getRatingFilterBaseList = async function (selectedRating) {
    if (this.favoritesOnlyActive) {
      return await this.loadPokemonDetailsByIds(
        [...this.favorites].filter((id) => this.getRating(id) === selectedRating)
      );
    }

    const state = this.getAppState();

    if (state?.selectedType === "all") {
      return await this.loadPokemonDetailsByIds(
        this.getKnownPokemonIdsForRating(selectedRating)
      );
    }

    return Array.isArray(state?.pokemonList) ? state.pokemonList : [];
  };
  PGF.getAppState = function () {
    return typeof appState !== "undefined" ? appState : window.appState;
  };
  PGF.getKnownPokemonIdsForRating = function (selectedRating) {
    const totalKnownPokemon = 1000;
    const ids = [];

    for (let id = 1; id <= totalKnownPokemon; id++) {
      if (this.getRating(id) === selectedRating) ids.push(id);
    }

    return ids;
  };
  PGF.loadPokemonDetailsByIds = async function (ids) {
    const state = this.getAppState();
    const cached = new Map(
      [
        ...(Array.isArray(state?.allPokemonList) ? state.allPokemonList : []),
        ...(Array.isArray(state?.pokemonList) ? state.pokemonList : []),
      ].map((pokemon) => [Number(pokemon.id), pokemon])
    );

    const results = [];
    const idsToLoad = [];

    for (const id of ids) {
      if (cached.has(id)) {
        results.push(cached.get(id));
        continue;
      }

      idsToLoad.push(id);
    }

    const batchSize = 12;
    for (let i = 0; i < idsToLoad.length; i += batchSize) {
      const batch = idsToLoad.slice(i, i + batchSize);
      const loadedBatch = await Promise.all(
        batch.map(async (id) => {
          try {
            return await this.loadPokemonDetailById(id);
          } catch (error) {
            console.warn(`[RatingFilter] Pokemon #${id} konnte nicht geladen werden`, error);
            return null;
          }
        })
      );

      for (const pokemon of loadedBatch) {
        if (pokemon) results.push(pokemon);
      }
    }

    return results;
  };
  PGF.loadPokemonDetailById = async function (id) {
    if (
      window.apiService &&
      typeof window.apiService.fetch === "function" &&
      typeof window.apiService.transformPokemonData === "function"
    ) {
      const rawPokemon = await window.apiService.fetch(`/pokemon/${id}`);
      return window.apiService.transformPokemonData(rawPokemon);
    }

    if (typeof loadPokemonDetails === "function") {
      return await loadPokemonDetails(`${POKEMON_API_CONFIG.baseUrl}/${id}`);
    }

    return null;
  };
  PGF.applyCardVisibilityFilters = function (hasRatingFilter, selected) {
    const cards = document.querySelectorAll(".pokemon-card");

    cards.forEach((card) => {
      const id = parseInt(card.dataset.pokemonId);
      const matchesFavorite = !this.favoritesOnlyActive || this.isFavorite(id);
      const matchesRating = !hasRatingFilter || this.getRating(id) === selected;
      const show = matchesFavorite && matchesRating;

      if (card.parentElement) {
        card.parentElement.style.display = show ? "block" : "none";
      }
    });
  };
  PGF.updateRatingFilterNavigationUI = function (isRatingResultMode) {
    this.isRatingResultMode = isRatingResultMode;
    const paginationControls = document.getElementById("paginationControls");
    const loadMoreButton = document.getElementById("loadMoreBtn");

    if (paginationControls) {
      paginationControls.style.display = isRatingResultMode ? "none" : "flex";
    }

    if (loadMoreButton) {
      loadMoreButton.style.display = isRatingResultMode ? "none" : "";
    }

    if (!isRatingResultMode && typeof updatePaginationControls === "function") {
      updatePaginationControls();
    }
  };
  PGF.restoreRatingFilterBaseView = function () {
    if (
      typeof clearPokemonContainer !== "function" ||
      typeof renderPokemon !== "function"
    ) {
      return;
    }

    const state = this.getAppState();
    const baseList = Array.isArray(state?.pokemonList) ? state.pokemonList : [];

    clearPokemonContainer();

    if (baseList.length > 0) {
      renderPokemon(baseList);
    } else if (typeof showNoPokemonMessage === "function") {
      showNoPokemonMessage();
    }
  };
  PGF.updateFavoritesToggleUI = function () {
    const favT = document.getElementById("favoritesToggle");
    if (!favT) return;
    favT.classList.toggle("active", !!this.favoritesOnlyActive);
    favT.textContent = this.favoritesOnlyActive ? "Nur Favoriten (An)" : "Nur Favoriten";
  };
  PGF.getPokemonDataFromCard = function (card) {
    const id = parseInt(card.dataset.pokemonId);
    const name = (
      card.querySelector(".pokemon-name")?.textContent || ""
    ).toLowerCase();
    const types = [...card.querySelectorAll(".type-badge")]
      .map((el) => el.textContent.toLowerCase().trim())
      .filter((t) =>
        [
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
        ].includes(t)
      );
    return { id, name, types };
  };
})();
