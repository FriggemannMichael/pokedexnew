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
  PGF.applyCombinedFilters = function () {
    const selected = parseInt(this.activeRatingFilter, 10);
    const hasRatingFilter = !Number.isNaN(selected);
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
