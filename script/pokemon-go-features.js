// Pokemon Go-inspirierte Features
class PokemonGoFeatures {
  constructor() {
    this.favorites = new Set(
      JSON.parse(localStorage.getItem("pokemonFavorites") || "[]")
    );
    this.ratings = JSON.parse(localStorage.getItem("pokemonRatings") || "{}");
    this.personalNotes = JSON.parse(
      localStorage.getItem("pokemonNotes") || "{}"
    );
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.addFilterToggles();
    this.initializePowerLevelUpdates();
    // Initial nachrüsten falls bereits Karten vorhanden
    this.applyTypeClassToPowerLevels();
    this.syncPowerLevelTypes();
  }

  initializePowerLevelUpdates() {
    // Observer für neue Pokemon-Karten
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const pokemonCards = node.querySelectorAll(
              ".pokemon-card[data-pokemon-id]"
            );
            pokemonCards.forEach((card) => {
              const pokemonId = parseInt(card.dataset.pokemonId);
              if (pokemonId && !card.dataset.powerLevelLoaded) {
                card.dataset.powerLevelLoaded = "true";
                // Verzögertes Laden um API-Requests zu throtteln
                setTimeout(() => {
                  this.updatePowerLevelWithStats(pokemonId);
                  this.applyTypeClassToPowerLevels(card);
                  this.syncPowerLevelTypes(card);
                }, Math.random() * 2000 + 500);
              }
            });
            // Falls Power-Level separat eingefügt wurden
            this.applyTypeClassToPowerLevels(node);
            this.syncPowerLevelTypes(node);
          }
        });
      });
    });

    const pokemonContainer = document.getElementById("pokemonContainer");
    if (pokemonContainer) {
      observer.observe(pokemonContainer, { childList: true, subtree: true });
    }
  }

  // Erzwingt Übereinstimmung: jede .power-level übernimmt den Typ der umgebenden Card
  syncPowerLevelTypes(scope = document) {
    const powerElements = scope.querySelectorAll(".power-level");
    powerElements.forEach((el) => {
      const card = el.closest(".pokemon-card");
      let targetType = null;
      if (card) {
        const cardTypeClass = Array.from(card.classList).find((c) =>
          c.startsWith("type-")
        );
        if (cardTypeClass) targetType = cardTypeClass.replace("type-", "");
        if (!targetType) {
          const badge = card.querySelector(".type-badge");
          if (badge) targetType = badge.textContent.toLowerCase();
        }
      }
      if (!targetType)
        targetType = el.getAttribute("data-primary-type") || "normal";
      // Entferne alte type-* Klassen
      Array.from(el.classList)
        .filter((c) => c.startsWith("type-"))
        .forEach((c) => el.classList.remove(c));
      el.classList.add(`type-${targetType}`);
      el.setAttribute("data-primary-type", targetType);
    });
  }

  // Weist allen .power-level Elementen eine type-* Klasse zu falls noch nicht vorhanden
  applyTypeClassToPowerLevels(scope = document) {
    const elements = scope.querySelectorAll(
      ".power-level:not([data-primary-type])"
    );
    elements.forEach((el) => {
      // Versuche Typ aus data-primary-type (falls schon gesetzt) oder aus Karte / Badges
      let primaryType = el.getAttribute("data-primary-type");
      if (!primaryType) {
        const card = el.closest(".pokemon-card");
        if (card) {
          // Typ aus Klassenliste der Karte extrahieren
          const typeClass = Array.from(card.classList).find((c) =>
            c.startsWith("type-")
          );
          if (typeClass) {
            primaryType = typeClass.replace("type-", "");
          }
          // Fallback über Badge
          if (!primaryType) {
            const badge = card.querySelector(".type-badge");
            if (badge) primaryType = badge.textContent.toLowerCase();
          }
        }
      }
      if (!primaryType) primaryType = "normal";
      // Falls noch keine type-* Klasse vorhanden, hinzufügen
      if (!Array.from(el.classList).some((c) => c.startsWith("type-"))) {
        el.classList.add(`type-${primaryType}`);
      }
      el.setAttribute("data-primary-type", primaryType);
    });
  }

  // Favoriten-System
  toggleFavorite(pokemonId) {
    if (this.favorites.has(pokemonId)) {
      this.favorites.delete(pokemonId);
    } else {
      this.favorites.add(pokemonId);
    }
    this.saveFavorites();
    this.updateFavoriteButtons(pokemonId);
    this.dispatchFavoriteEvent(pokemonId);
  }

  isFavorite(pokemonId) {
    return this.favorites.has(pokemonId);
  }

  saveFavorites() {
    localStorage.setItem(
      "pokemonFavorites",
      JSON.stringify([...this.favorites])
    );
  }

  // Bewertungssystem (1-5 Sterne)
  ratePokemon(pokemonId, rating) {
    if (rating < 1 || rating > 5) return;
    this.ratings[pokemonId] = rating;
    this.saveRatings();
    this.updateRatingDisplay(pokemonId, rating);
  }

  getRating(pokemonId) {
    return this.ratings[pokemonId] || 0;
  }

  saveRatings() {
    localStorage.setItem("pokemonRatings", JSON.stringify(this.ratings));
  }

  // Persönliche Notizen
  addNote(pokemonId, note) {
    this.personalNotes[pokemonId] = note;
    this.saveNotes();
  }

  getNote(pokemonId) {
    return this.personalNotes[pokemonId] || "";
  }

  saveNotes() {
    localStorage.setItem("pokemonNotes", JSON.stringify(this.personalNotes));
  }

  // Pokemon Go IV-System Implementation
  calculatePowerLevel(pokemon) {
    if (!pokemon || !pokemon.id) {
      return 15; // Fallback
    }

    const baseStats = this.getBaseStats(pokemon.id);
    const ivs = this.generateIVs(pokemon.id); // Basierend auf ID für Konsistenz
    const level = this.getPokemonLevel(pokemon.id);
    const cpm = this.getCPM(level);

    // Berechne CP nach Pokemon Go Formel
    const attack = baseStats.attack + ivs.attack;
    const defense = baseStats.defense + ivs.defense;
    const stamina = baseStats.stamina + ivs.stamina;

    const cp = Math.floor(
      (attack * Math.sqrt(defense) * Math.sqrt(stamina) * Math.pow(cpm, 2)) / 10
    );

    // Normiere CP zu Prozent (0-100%)
    // Maximal mögliche CP für starke Pokemon ist  4000-5000
    const maxCP = 4500;
    const powerLevel = Math.min(100, (cp / maxCP) * 100);

    // Optionales Debugging: Aktivierbar durch window.POKE_DEBUG = true
    if (window.POKE_DEBUG) {
      console.debug(
        `[PowerLevel] ${pokemon.name} (#${pokemon.id}) Base(${
          baseStats.attack
        }/${baseStats.defense}/${baseStats.stamina}) IVs(${ivs.attack}/${
          ivs.defense
        }/${ivs.stamina}) CP:${cp} → ${Math.round(powerLevel)}%`
      );
    }

    return Math.round(powerLevel);
  }

  // Basis-Stats basierend auf Pokemon-ID (vereinfachte Pokemon Go Daten)
  getBaseStats(pokemonId) {
    // Basis-Stats für verschiedene Pokemon (Attack, Defense, Stamina)
    const baseStatsData = {
      // Starter Pokemon
      1: { attack: 118, defense: 111, stamina: 128 }, // Bulbasaur
      2: { attack: 151, defense: 143, stamina: 155 }, // Ivysaur
      3: { attack: 198, defense: 189, stamina: 190 }, // Venusaur
      4: { attack: 116, defense: 93, stamina: 118 }, // Charmander
      5: { attack: 158, defense: 126, stamina: 151 }, // Charmeleon
      6: { attack: 223, defense: 173, stamina: 186 }, // Charizard
      7: { attack: 94, defense: 121, stamina: 127 }, // Squirtle
      8: { attack: 126, defense: 155, stamina: 151 }, // Wartortle
      9: { attack: 171, defense: 207, stamina: 188 }, // Blastoise

      // Frühe Pokemon
      10: { attack: 55, defense: 55, stamina: 128 }, // Caterpie
      11: { attack: 45, defense: 80, stamina: 137 }, // Metapod
      12: { attack: 167, defense: 106, stamina: 155 }, // Butterfree
      13: { attack: 63, defense: 50, stamina: 120 }, // Weedle
      14: { attack: 46, defense: 75, stamina: 137 }, // Kakuna
      15: { attack: 169, defense: 130, stamina: 163 }, // Beedrill
      16: { attack: 85, defense: 73, stamina: 120 }, // Pidgey
      17: { attack: 117, defense: 105, stamina: 160 }, // Pidgeotto
      18: { attack: 166, defense: 154, stamina: 195 }, // Pidgeot
      19: { attack: 103, defense: 70, stamina: 102 }, // Rattata
      20: { attack: 161, defense: 139, stamina: 146 }, // Raticate

      // Legendäre Pokemon (sehr hohe Stats)
      150: { attack: 300, defense: 182, stamina: 214 }, // Mewtwo
      144: { attack: 192, defense: 236, stamina: 207 }, // Articuno
      145: { attack: 253, defense: 185, stamina: 207 }, // Zapdos
      146: { attack: 251, defense: 181, stamina: 207 }, // Moltres
    };

    // Fallback für unbekannte Pokemon basierend auf ID
    if (baseStatsData[pokemonId]) {
      return baseStatsData[pokemonId];
    }

    // Generiere Stats basierend auf ID für Konsistenz
    const seed = pokemonId * 123456;
    return {
      attack: 80 + (seed % 120), // 80-200 Attack
      defense: 80 + ((seed * 2) % 120), // 80-200 Defense
      stamina: 110 + ((seed * 3) % 90), // 110-200 Stamina
    };
  }

  // Generiere konsistente IVs basierend auf Pokemon-ID
  generateIVs(pokemonId) {
    // Verwende Pokemon-ID als Seed für konsistente "zufällige" IVs
    const seed = pokemonId * 987654321;
    return {
      attack: seed % 16, // 0-15
      defense: (seed * 2) % 16, // 0-15
      stamina: (seed * 3) % 16, // 0-15
    };
  }

  // Pokemon Level basierend auf ID
  getPokemonLevel(pokemonId) {
    // Level zwischen 1-40 basierend auf ID
    return Math.max(1, Math.min(40, (pokemonId % 40) + 1));
  }

  // CP-Multiplikator basierend auf Level
  getCPM(level) {
    // Vereinfachte CPM-Tabelle
    const cpmTable = {
      1: 0.094,
      5: 0.2157,
      10: 0.4225,
      15: 0.5974,
      20: 0.7317,
      25: 0.8408,
      30: 0.9164,
      35: 0.9648,
      40: 0.7903,
    };

    // Finde nächsten bekannten Level
    for (let lvl = level; lvl >= 1; lvl--) {
      if (cpmTable[lvl]) {
        return cpmTable[lvl];
      }
    }

    // Interpoliere zwischen bekannten Werten
    const lowerLevel = Math.floor(level / 5) * 5;
    const upperLevel = lowerLevel + 5;
    const lowerCPM = cpmTable[lowerLevel] || 0.094;
    const upperCPM = cpmTable[upperLevel] || 0.7903;

    const ratio = (level - lowerLevel) / 5;
    return lowerCPM + (upperCPM - lowerCPM) * ratio;
  }

  getPerformanceRating(powerLevel) {
    if (powerLevel >= 25)
      return { rating: "Excellent", class: "excellent", stars: 5 };
    if (powerLevel >= 20) return { rating: "Great", class: "great", stars: 4 };
    if (powerLevel >= 15) return { rating: "Good", class: "good", stars: 3 };
    if (powerLevel >= 10)
      return { rating: "Average", class: "average", stars: 2 };
    return { rating: "Poor", class: "poor", stars: 1 };
  }

  // Erweiterte Filter
  setupEventListeners() {
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("favorite-btn")) {
        e.preventDefault();
        e.stopPropagation(); // Verhindert das Öffnen der Pokemon-Karte
        const pokemonId = parseInt(e.target.dataset.pokemonId);
        this.toggleFavorite(pokemonId);
      }

      // Rating-Sterne sind jetzt automatisch und nicht mehr klickbar
      /* Deaktiviert - automatisches Rating
            if (e.target.classList.contains('rating-star')) {
                const pokemonId = parseInt(e.target.dataset.pokemonId);
                const rating = parseInt(e.target.dataset.rating);
                this.ratePokemon(pokemonId, rating);
            }
            */
    });
  }

  // Delegiert jetzt auf Implementierung in pokemon-go-filters.js (Duplikate entfernt)
  addFilterToggles() {
    if (window.POKE_DEBUG) console.debug("[PGF] addFilterToggles delegiert");
    if (typeof PokemonGoFeatures.prototype.addFilterToggles === "function")
      return;
  }
  filterFavorites(minRating) {
    if (window.POKE_DEBUG) console.debug("[PGF] filterFavorites (stub)");
  }
  filterByRating(minRating) {
    if (window.POKE_DEBUG) console.debug("[PGF] filterByRating (stub)");
  }

  // Hilfsfunktion: Pokemon-Daten aus Karte extrahieren
  getPokemonDataFromCard(card) {
    const pokemonId = parseInt(card.dataset.pokemonId);
    const pokemonName = card
      .querySelector(".pokemon-name")
      ?.textContent?.toLowerCase();
    const typeElements = card.querySelectorAll(".type-badge");
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
    const types = Array.from(typeElements)
      .map((el) => (el.textContent || "").toLowerCase().trim())
      .filter((t) => VALID_TYPES.has(t));

    return {
      id: pokemonId,
      name: pokemonName,
      types: types,
    };
  }

  updateFavoriteButtons(pokemonId) {
    const buttons = document.querySelectorAll(
      `[data-pokemon-id="${pokemonId}"] .favorite-btn`
    );
    buttons.forEach((btn) => {
      btn.classList.toggle("active", this.isFavorite(pokemonId));
      btn.innerHTML = this.isFavorite(pokemonId) ? "❤️" : "🤍";
    });
  }

  updateRatingDisplay(pokemonId, rating) {
    const containers = document.querySelectorAll(
      `[data-pokemon-id="${pokemonId}"] .rating-container`
    );
    containers.forEach((container) => {
      const stars = container.querySelectorAll(".rating-star");
      stars.forEach((star, index) => {
        star.classList.toggle("active", index < rating);
      });
    });
  }

  dispatchFavoriteEvent(pokemonId) {
    document.dispatchEvent(
      new CustomEvent("favoriteToggled", {
        detail: { pokemonId, isFavorite: this.isFavorite(pokemonId) },
      })
    );
  }

  // Hilfsfunktionen für Templates
  getFavoriteButtonHTML(pokemonId) {
    const isFavorite = this.isFavorite(pokemonId);
    return `
            <button class="favorite-btn ${
              isFavorite ? "active" : ""
            }" data-pokemon-id="${pokemonId}">
                ${isFavorite ? "❤️" : "🤍"}
            </button>
        `;
  }

  getRatingStarsHTML(pokemonId, pokemon) {
    // Automatisches Rating basierend auf Pokemon-Stärke berechnen
    const autoRating = this.calculateAutoRating(pokemon);
    let starsHTML = '<div class="rating-container auto-rating">';

    for (let i = 1; i <= 5; i++) {
      const isActive = i <= autoRating;
      starsHTML += `
                <span class="rating-star ${isActive ? "active" : ""} auto" 
                      title="Automatische Bewertung basierend auf Stärke">⭐</span>
            `;
    }

    starsHTML += "</div>";
    return starsHTML;
  }

  // Neue Funktion: Automatisches Rating basierend auf IV-System (Pokemon Go Style)
  calculateAutoRating(pokemon) {
    if (!pokemon) return 1;

    // Hole IVs für dieses Pokemon
    const ivs = this.generateIVs(pokemon.id);
    const totalIV = ivs.attack + ivs.defense + ivs.stamina; // Max 45

    // Konvertiere IV-Total zu 5-Sterne-System
    const starRating = (totalIV / 45) * 5;

    // Runde zu ganzen Sternen
    const finalRating = Math.max(1, Math.min(5, Math.ceil(starRating)));

    if (window.POKE_DEBUG) {
      console.debug(
        `[IV Rating] ${pokemon.name} (#${pokemon.id}) IVs ${ivs.attack}/${ivs.defense}/${ivs.stamina} (${totalIV}/45) => ${finalRating}*`
      );
    }

    return finalRating;
  }

  getPowerLevelHTML(pokemon) {
    const powerLevel = this.calculatePowerLevel(pokemon);
    const performance = this.getPerformanceRating(powerLevel);
    const ivs = this.generateIVs(pokemon.id);
    const ivTotal = ivs.attack + ivs.defense + ivs.stamina;
    const ivPercent = Math.round((ivTotal / 45) * 100);
    // Primary Type für dynamische Farbgebung bestimmen (Fallback normal)
    const primaryType =
      pokemon.types && pokemon.types[0]
        ? pokemon.types[0].toLowerCase()
        : "normal";

    return `
            <div class="power-level type-${primaryType} ${performance.class}" data-pokemon-id="${pokemon.id}" data-primary-type="${primaryType}">
                <div class="power-label">CP Level</div>
                <div class="power-value">${powerLevel}%</div>
                <div class="iv-info">IVs: ${ivPercent}% (${ivTotal}/45)</div>
                <div class="performance-rating">${performance.rating}</div>
            </div>
        `;
  }

  // Asynchrone Power-Level-Aktualisierung mit vollständigen Stats
  async updatePowerLevelWithStats(pokemonId) {
    try {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${pokemonId}`
      );
      const pokemonData = await response.json();

      if (pokemonData.stats) {
        const powerLevel = this.calculatePowerLevel(pokemonData);
        const performance = this.getPerformanceRating(powerLevel);

        // Aktualisiere alle Power-Level-Anzeigen für dieses Pokemon
        const powerElements = document.querySelectorAll(
          `[data-pokemon-id="${pokemonId}"] .power-level`
        );
        powerElements.forEach((element) => {
          const valueElement = element.querySelector(".power-value");
          const ratingElement = element.querySelector(".performance-rating");

          if (valueElement && ratingElement) {
            valueElement.textContent = `${powerLevel}%`;
            ratingElement.textContent = performance.rating;
            // Behalte vorhandene type-* Klasse bei (nicht überschreiben)
            const existingClasses = Array.from(element.classList).filter((c) =>
              c.startsWith("type-")
            );
            const baseClasses = ["power-level"];
            const combined = [
              ...baseClasses,
              ...existingClasses,
              performance.class,
            ];
            element.className = combined.join(" ");
          }
        });
        // Nach Aktualisierung sicherstellen, dass Typen konsistent bleiben
        this.syncPowerLevelTypes();
      }
    } catch (error) {
      console.error(
        "Power-Level Update fehlgeschlagen für Pokemon",
        pokemonId,
        error
      );
    }
  }
}

// Globale Instanz
window.pokemonGoFeatures = new PokemonGoFeatures();
