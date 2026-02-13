/**
 * FavoritesService - Favorites & Ratings Management
 *
 * Features:
 * - Pokemon als Favoriten markieren
 * - Rating System (1-5 Sterne)
 * - Notizen für Pokemon
 * - Persistierung in Storage
 */

export class FavoritesService {
  #stateManager;
  #storageService;

  constructor(stateManager, storageService) {
    this.#stateManager = stateManager;
    this.#storageService = storageService;

    this.#initializeState();
    this.#loadFromStorage();
  }

  /**
   * Initialisiert den Favorites State
   * @private
   */
  #initializeState() {
    this.#stateManager.setState({
      favorites: new Set(),
      ratings: {},
      notes: {},
      favoritesCount: 0
    });
  }

  /**
   * Lädt Favorites aus Storage
   * @private
   */
  #loadFromStorage() {
    const favorites = this.#storageService.get('favorites', []);
    const ratings = this.#storageService.get('ratings', {});
    const notes = this.#storageService.get('notes', {});

    this.#stateManager.setState({
      favorites: new Set(favorites),
      ratings: ratings,
      notes: notes,
      favoritesCount: favorites.length
    });
  }

  /**
   * Fügt Pokemon zu Favoriten hinzu
   * @param {number} pokemonId - Pokemon ID
   * @returns {boolean} Erfolg
   */
  addFavorite(pokemonId) {
    const favorites = this.getFavorites();

    if (favorites.has(pokemonId)) {
      return false;
    }

    favorites.add(pokemonId);
    this.#updateFavoritesState(favorites);
    this.#saveFavoritesToStorage(favorites);

    console.log(`❤️ Added Pokemon #${pokemonId} to favorites`);
    return true;
  }

  /**
   * Entfernt Pokemon aus Favoriten
   * @param {number} pokemonId - Pokemon ID
   * @returns {boolean} Erfolg
   */
  removeFavorite(pokemonId) {
    const favorites = this.getFavorites();

    if (!favorites.has(pokemonId)) {
      return false;
    }

    favorites.delete(pokemonId);
    this.#updateFavoritesState(favorites);
    this.#saveFavoritesToStorage(favorites);

    console.log(`💔 Removed Pokemon #${pokemonId} from favorites`);
    return true;
  }

  /**
   * Togglet Favorite Status
   * @param {number} pokemonId - Pokemon ID
   * @returns {boolean} Neuer Status (true = favorite)
   */
  toggleFavorite(pokemonId) {
    const isFavorite = this.isFavorite(pokemonId);

    if (isFavorite) {
      this.removeFavorite(pokemonId);
      return false;
    } else {
      this.addFavorite(pokemonId);
      return true;
    }
  }

  /**
   * Prüft ob Pokemon ein Favorit ist
   * @param {number} pokemonId - Pokemon ID
   * @returns {boolean}
   */
  isFavorite(pokemonId) {
    return this.getFavorites().has(pokemonId);
  }

  /**
   * Gibt alle Favoriten zurück
   * @returns {Set<number>} Set von Pokemon IDs
   */
  getFavorites() {
    return this.#stateManager.get('favorites') || new Set();
  }

  /**
   * Gibt Favoriten als Array zurück
   * @returns {number[]} Array von Pokemon IDs
   */
  getFavoritesArray() {
    return Array.from(this.getFavorites());
  }

  /**
   * Gibt die Anzahl der Favoriten zurück
   * @returns {number}
   */
  getFavoritesCount() {
    return this.#stateManager.get('favoritesCount') || 0;
  }

  /**
   * Setzt Rating für Pokemon
   * @param {number} pokemonId - Pokemon ID
   * @param {number} rating - Rating (1-5)
   * @returns {boolean} Erfolg
   */
  setRating(pokemonId, rating) {
    if (rating < 1 || rating > 5) {
      console.warn('⚠️ Rating must be between 1 and 5');
      return false;
    }

    const ratings = this.getRatings();
    ratings[pokemonId] = rating;

    this.#updateRatingsState(ratings);
    this.#saveRatingsToStorage(ratings);

    console.log(`⭐ Set rating ${rating} for Pokemon #${pokemonId}`);
    return true;
  }

  /**
   * Entfernt Rating für Pokemon
   * @param {number} pokemonId - Pokemon ID
   */
  removeRating(pokemonId) {
    const ratings = this.getRatings();
    delete ratings[pokemonId];

    this.#updateRatingsState(ratings);
    this.#saveRatingsToStorage(ratings);
  }

  /**
   * Gibt Rating für Pokemon zurück
   * @param {number} pokemonId - Pokemon ID
   * @returns {number|null} Rating oder null
   */
  getRating(pokemonId) {
    const ratings = this.getRatings();
    return ratings[pokemonId] || null;
  }

  /**
   * Gibt alle Ratings zurück
   * @returns {Object} Objekt mit pokemonId -> rating Mappings
   */
  getRatings() {
    return this.#stateManager.get('ratings') || {};
  }

  /**
   * Setzt Notiz für Pokemon
   * @param {number} pokemonId - Pokemon ID
   * @param {string} note - Notiz Text
   * @returns {boolean} Erfolg
   */
  setNote(pokemonId, note) {
    const notes = this.getNotes();
    notes[pokemonId] = note;

    this.#updateNotesState(notes);
    this.#saveNotesToStorage(notes);

    console.log(`📝 Set note for Pokemon #${pokemonId}`);
    return true;
  }

  /**
   * Entfernt Notiz für Pokemon
   * @param {number} pokemonId - Pokemon ID
   */
  removeNote(pokemonId) {
    const notes = this.getNotes();
    delete notes[pokemonId];

    this.#updateNotesState(notes);
    this.#saveNotesToStorage(notes);
  }

  /**
   * Gibt Notiz für Pokemon zurück
   * @param {number} pokemonId - Pokemon ID
   * @returns {string|null} Notiz oder null
   */
  getNote(pokemonId) {
    const notes = this.getNotes();
    return notes[pokemonId] || null;
  }

  /**
   * Gibt alle Notizen zurück
   * @returns {Object} Objekt mit pokemonId -> note Mappings
   */
  getNotes() {
    return this.#stateManager.get('notes') || {};
  }

  /**
   * Leert alle Favoriten
   */
  clearFavorites() {
    this.#updateFavoritesState(new Set());
    this.#saveFavoritesToStorage(new Set());
    console.log('✅ Favorites cleared');
  }

  /**
   * Leert alle Ratings
   */
  clearRatings() {
    this.#updateRatingsState({});
    this.#saveRatingsToStorage({});
    console.log('✅ Ratings cleared');
  }

  /**
   * Leert alle Notizen
   */
  clearNotes() {
    this.#updateNotesState({});
    this.#saveNotesToStorage({});
    console.log('✅ Notes cleared');
  }

  /**
   * Leert alles (Favorites, Ratings, Notes)
   */
  clearAll() {
    this.clearFavorites();
    this.clearRatings();
    this.clearNotes();
  }

  /**
   * Updated Favorites State
   * @private
   */
  #updateFavoritesState(favorites) {
    this.#stateManager.setState({
      favorites: favorites,
      favoritesCount: favorites.size
    });
  }

  /**
   * Speichert Favorites in Storage
   * @private
   */
  #saveFavoritesToStorage(favorites) {
    this.#storageService.set('favorites', Array.from(favorites));
  }

  /**
   * Updated Ratings State
   * @private
   */
  #updateRatingsState(ratings) {
    this.#stateManager.setState({ ratings: ratings });
  }

  /**
   * Speichert Ratings in Storage
   * @private
   */
  #saveRatingsToStorage(ratings) {
    this.#storageService.set('ratings', ratings);
  }

  /**
   * Updated Notes State
   * @private
   */
  #updateNotesState(notes) {
    this.#stateManager.setState({ notes: notes });
  }

  /**
   * Speichert Notes in Storage
   * @private
   */
  #saveNotesToStorage(notes) {
    this.#storageService.set('notes', notes);
  }

  /**
   * Abonniert Changes
   * @param {Function} listener - Callback Funktion
   * @returns {Function} Unsubscribe Funktion
   */
  subscribe(listener) {
    return this.#stateManager.subscribe((state, changes) => {
      if (changes.favorites !== undefined ||
          changes.ratings !== undefined ||
          changes.notes !== undefined) {
        listener(state);
      }
    });
  }

  /**
   * Exportiert alle Daten als JSON
   * @returns {string} JSON String
   */
  exportData() {
    const data = {
      favorites: this.getFavoritesArray(),
      ratings: this.getRatings(),
      notes: this.getNotes()
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Importiert Daten aus JSON
   * @param {string} json - JSON String
   * @returns {boolean} Erfolg
   */
  importData(json) {
    try {
      const data = JSON.parse(json);

      if (data.favorites) {
        this.#updateFavoritesState(new Set(data.favorites));
        this.#saveFavoritesToStorage(new Set(data.favorites));
      }

      if (data.ratings) {
        this.#updateRatingsState(data.ratings);
        this.#saveRatingsToStorage(data.ratings);
      }

      if (data.notes) {
        this.#updateNotesState(data.notes);
        this.#saveNotesToStorage(data.notes);
      }

      console.log('✅ Data imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Error importing data:', error);
      return false;
    }
  }
}
