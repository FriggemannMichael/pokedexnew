/**
 * PokemonService - Business Logic für Pokemon Management
 *
 * Features:
 * - Pokemon Liste verwalten
 * - Filtern & Suchen
 * - Integration mit StateManager
 * - Koordination zwischen API und State
 */

export class PokemonService {
  #stateManager;
  #apiService;
  #storageService;

  constructor(stateManager, apiService, storageService) {
    this.#stateManager = stateManager;
    this.#apiService = apiService;
    this.#storageService = storageService;

    this.#initializeState();
  }

  /**
   * Initialisiert den Pokemon State
   * @private
   */
  #initializeState() {
    this.#stateManager.setState({
      pokemonList: [],
      allPokemonList: [],
      filteredPokemonList: [],
      isLoading: false,
      selectedType: 'all',
      searchQuery: '',
      currentPage: 1,
      pokemonPerPage: 20,
      totalPokemon: 0,
      hasMore: true,
      error: null
    });
  }

  /**
   * Lädt Pokemon von der API
   * @param {number} offset - Start Index
   * @param {number} limit - Anzahl Pokemon
   * @returns {Promise<void>}
   */
  async loadPokemon(offset = 0, limit = 20) {
    this.#stateManager.setState({ isLoading: true, error: null });

    try {
      const data = await this.#apiService.fetchPokemonList(offset, limit);

      const currentList = this.#stateManager.get('pokemonList');
      const allList = this.#stateManager.get('allPokemonList');

      this.#stateManager.setState({
        pokemonList: [...currentList, ...data.pokemon],
        allPokemonList: [...allList, ...data.pokemon],
        filteredPokemonList: [...currentList, ...data.pokemon],
        totalPokemon: data.total,
        hasMore: data.next !== null,
        isLoading: false
      });

      return data.pokemon;
    } catch (error) {
      console.error('❌ Error loading pokemon:', error);
      this.#stateManager.setState({
        isLoading: false,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Lädt ein einzelnes Pokemon
   * @param {number|string} idOrName - Pokemon ID oder Name
   * @returns {Promise<Object>}
   */
  async loadPokemonDetail(idOrName) {
    try {
      return await this.#apiService.fetchPokemon(idOrName);
    } catch (error) {
      console.error('❌ Error loading pokemon detail:', error);
      throw error;
    }
  }

  /**
   * Filtert Pokemon nach Typ
   * @param {string} type - Pokemon Typ ('all' für alle)
   */
  filterByType(type) {
    const allPokemon = this.#stateManager.get('allPokemonList');

    let filtered;
    if (type === 'all') {
      filtered = allPokemon;
    } else {
      filtered = allPokemon.filter(pokemon =>
        pokemon.types.includes(type.toLowerCase())
      );
    }

    this.#stateManager.setState({
      selectedType: type,
      filteredPokemonList: filtered,
      pokemonList: filtered
    });

    return filtered;
  }

  /**
   * Sucht Pokemon nach Name
   * @param {string} query - Suchbegriff
   * @returns {Promise<Object[]>}
   */
  async searchPokemon(query) {
    if (!query || query.length < 2) {
      // Reset zu gefilterter Liste
      const filtered = this.#stateManager.get('filteredPokemonList');
      this.#stateManager.setState({
        pokemonList: filtered,
        searchQuery: ''
      });
      return filtered;
    }

    this.#stateManager.setState({ searchQuery: query });

    // Suche zuerst in bereits geladenen Pokemon
    const allPokemon = this.#stateManager.get('allPokemonList');
    const localResults = allPokemon.filter(pokemon =>
      pokemon.name.toLowerCase().includes(query.toLowerCase())
    );

    if (localResults.length > 0) {
      this.#stateManager.setState({ pokemonList: localResults });
      return localResults;
    }

    // Wenn keine lokalen Ergebnisse, suche in API
    try {
      const results = await this.#apiService.searchPokemon(query);
      this.#stateManager.setState({ pokemonList: results });
      return results;
    } catch (error) {
      console.error('❌ Search error:', error);
      return [];
    }
  }

  /**
   * Gibt Pokemon Liste zurück
   * @returns {Object[]}
   */
  getPokemonList() {
    return this.#stateManager.get('pokemonList');
  }

  /**
   * Gibt ein Pokemon nach ID zurück
   * @param {number} id - Pokemon ID
   * @returns {Object|undefined}
   */
  getPokemonById(id) {
    const allPokemon = this.#stateManager.get('allPokemonList');
    return allPokemon.find(p => p.id === id);
  }

  /**
   * Resettet Filter und Suche
   */
  resetFilters() {
    const allPokemon = this.#stateManager.get('allPokemonList');
    this.#stateManager.setState({
      selectedType: 'all',
      searchQuery: '',
      pokemonList: allPokemon,
      filteredPokemonList: allPokemon
    });
  }

  /**
   * Gibt den aktuellen Loading State zurück
   * @returns {boolean}
   */
  isLoading() {
    return this.#stateManager.get('isLoading');
  }

  /**
   * Gibt an ob mehr Pokemon geladen werden können
   * @returns {boolean}
   */
  hasMore() {
    return this.#stateManager.get('hasMore');
  }

  /**
   * Abonniert Pokemon State Changes
   * @param {Function} listener - Callback Funktion
   * @returns {Function} Unsubscribe Funktion
   */
  subscribe(listener) {
    return this.#stateManager.subscribe(listener);
  }

  /**
   * Gibt den vollständigen State zurück
   * @returns {Object}
   */
  getState() {
    return this.#stateManager.getState();
  }
}
