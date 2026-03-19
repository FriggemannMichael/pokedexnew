export class FavoritesService {
  #stateManager;
  #storageService;

  constructor(stateManager, storageService) {
    this.#stateManager = stateManager;
    this.#storageService = storageService;

    this.#initializeState();
    this.#loadFromStorage();
  }

  #initializeState() {
    this.#stateManager.setState({
      favorites: new Set(),
      ratings: {},
      notes: {},
      favoritesCount: 0
    });
  }

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

  isFavorite(pokemonId) {
    return this.getFavorites().has(pokemonId);
  }

  getFavorites() {
    return this.#stateManager.get('favorites') || new Set();
  }

  getFavoritesArray() {
    return Array.from(this.getFavorites());
  }

  getFavoritesCount() {
    return this.#stateManager.get('favoritesCount') || 0;
  }

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

  removeRating(pokemonId) {
    const ratings = this.getRatings();
    delete ratings[pokemonId];

    this.#updateRatingsState(ratings);
    this.#saveRatingsToStorage(ratings);
  }

  getRating(pokemonId) {
    const ratings = this.getRatings();
    return ratings[pokemonId] || null;
  }

  getRatings() {
    return this.#stateManager.get('ratings') || {};
  }

  setNote(pokemonId, note) {
    const notes = this.getNotes();
    notes[pokemonId] = note;

    this.#updateNotesState(notes);
    this.#saveNotesToStorage(notes);

    console.log(`📝 Set note for Pokemon #${pokemonId}`);
    return true;
  }

  removeNote(pokemonId) {
    const notes = this.getNotes();
    delete notes[pokemonId];

    this.#updateNotesState(notes);
    this.#saveNotesToStorage(notes);
  }

  getNote(pokemonId) {
    const notes = this.getNotes();
    return notes[pokemonId] || null;
  }

  getNotes() {
    return this.#stateManager.get('notes') || {};
  }

  clearFavorites() {
    this.#updateFavoritesState(new Set());
    this.#saveFavoritesToStorage(new Set());
    console.log('✅ Favorites cleared');
  }

  clearRatings() {
    this.#updateRatingsState({});
    this.#saveRatingsToStorage({});
    console.log('✅ Ratings cleared');
  }

  clearNotes() {
    this.#updateNotesState({});
    this.#saveNotesToStorage({});
    console.log('✅ Notes cleared');
  }

  clearAll() {
    this.clearFavorites();
    this.clearRatings();
    this.clearNotes();
  }

  #updateFavoritesState(favorites) {
    this.#stateManager.setState({
      favorites: favorites,
      favoritesCount: favorites.size
    });
  }

  #saveFavoritesToStorage(favorites) {
    this.#storageService.set('favorites', Array.from(favorites));
  }

  #updateRatingsState(ratings) {
    this.#stateManager.setState({ ratings: ratings });
  }

  #saveRatingsToStorage(ratings) {
    this.#storageService.set('ratings', ratings);
  }

  #updateNotesState(notes) {
    this.#stateManager.setState({ notes: notes });
  }

  #saveNotesToStorage(notes) {
    this.#storageService.set('notes', notes);
  }

  subscribe(listener) {
    return this.#stateManager.subscribe((state, changes) => {
      if (changes.favorites !== undefined ||
          changes.ratings !== undefined ||
          changes.notes !== undefined) {
        listener(state);
      }
    });
  }

  exportData() {
    const data = {
      favorites: this.getFavoritesArray(),
      ratings: this.getRatings(),
      notes: this.getNotes()
    };
    return JSON.stringify(data, null, 2);
  }

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
