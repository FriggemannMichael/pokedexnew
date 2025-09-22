// Filters & event listeners
// Filters & event listeners (Rollback Version)
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
    if (favT) favT.addEventListener("click", () => this.filterFavorites());
    if (rating)
      rating.addEventListener("change", (e) =>
        this.filterByRating(e.target.value)
      );
  };
  PGF.filterFavorites = function () {
    document.querySelectorAll(".pokemon-card").forEach((card) => {
      const id = parseInt(card.dataset.pokemonId);
      const vis = this.isFavorite(id);
      if (card.parentElement)
        card.parentElement.style.display = vis ? "block" : "none";
    });
  };
  PGF.filterByRating = function (min) {
    if (!min) {
      document.querySelectorAll(".pokemon-card").forEach((c) => {
        if (c.parentElement) c.parentElement.style.display = "block";
      });
      return;
    }
    const cards = document.querySelectorAll(".pokemon-card");
    cards.forEach((card) => {
      const id = parseInt(card.dataset.pokemonId);
      const data = this.getPokemonDataFromCard(card);
      const auto = this.calculateAutoRating(data);
      const show = auto >= parseInt(min);
      if (card.parentElement)
        card.parentElement.style.display = show ? "block" : "none";
    });
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
