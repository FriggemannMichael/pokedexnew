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

  async loadPokemonDetail(idOrName) {
    try {
      return await this.#apiService.fetchPokemon(idOrName);
    } catch (error) {
      console.error('❌ Error loading pokemon detail:', error);
      throw error;
    }
  }

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

  async searchPokemon(query) {
    if (!query || query.length < 2) {
      const filtered = this.#stateManager.get('filteredPokemonList');
      this.#stateManager.setState({
        pokemonList: filtered,
        searchQuery: ''
      });
      return filtered;
    }

    this.#stateManager.setState({ searchQuery: query });

    const allPokemon = this.#stateManager.get('allPokemonList');
    const localResults = allPokemon.filter(pokemon =>
      pokemon.name.toLowerCase().includes(query.toLowerCase())
    );

    if (localResults.length > 0) {
      this.#stateManager.setState({ pokemonList: localResults });
      return localResults;
    }

    try {
      const results = await this.#apiService.searchPokemon(query);
      this.#stateManager.setState({ pokemonList: results });
      return results;
    } catch (error) {
      console.error('❌ Search error:', error);
      return [];
    }
  }

  getPokemonList() {
    return this.#stateManager.get('pokemonList');
  }

  getPokemonById(id) {
    const allPokemon = this.#stateManager.get('allPokemonList');
    return allPokemon.find(p => p.id === id);
  }

  resetFilters() {
    const allPokemon = this.#stateManager.get('allPokemonList');
    this.#stateManager.setState({
      selectedType: 'all',
      searchQuery: '',
      pokemonList: allPokemon,
      filteredPokemonList: allPokemon
    });
  }

  isLoading() {
    return this.#stateManager.get('isLoading');
  }

  hasMore() {
    return this.#stateManager.get('hasMore');
  }

  subscribe(listener) {
    return this.#stateManager.subscribe(listener);
  }

  getState() {
    return this.#stateManager.getState();
  }
}
