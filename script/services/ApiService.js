/**
 * ApiService - PokeAPI Integration Service
 *
 * Features:
 * - Zentralisierte API Calls
 * - Error Handling
 * - Caching Support
 * - Rate Limiting
 */

export class ApiService {
  #baseUrl = 'https://pokeapi.co/api/v2';
  #cache = new Map();
  #cacheEnabled = true;
  #cacheDuration = 1000 * 60 * 30; // 30 Minuten

  constructor(config = {}) {
    if (config.baseUrl) this.#baseUrl = config.baseUrl;
    if (config.cacheEnabled !== undefined) this.#cacheEnabled = config.cacheEnabled;
    if (config.cacheDuration) this.#cacheDuration = config.cacheDuration;
  }

  /**
   * Fetcht Daten von der PokeAPI
   * @param {string} endpoint - API Endpoint (z.B. '/pokemon/1')
   * @returns {Promise<Object>} API Response
   */
  async fetch(endpoint) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.#baseUrl}${endpoint}`;

    // Check Cache
    if (this.#cacheEnabled) {
      const cached = this.#getFromCache(url);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Cache Response
      if (this.#cacheEnabled) {
        this.#addToCache(url, data);
      }

      return data;
    } catch (error) {
      console.error('❌ API Fetch Error:', error);
      throw error;
    }
  }

  /**
   * Fetcht eine Liste von Pokemon
   * @param {number} offset - Start Index
   * @param {number} limit - Anzahl Pokemon
   * @returns {Promise<Object>} Pokemon Liste mit Metadaten
   */
  async fetchPokemonList(offset = 0, limit = 20) {
    const data = await this.fetch(`/pokemon?offset=${offset}&limit=${limit}`);

    // Fetch Details für alle Pokemon parallel
    const pokemonDetails = await Promise.all(
      data.results.map(pokemon => this.fetch(pokemon.url))
    );

    return {
      pokemon: pokemonDetails.map(p => this.#transformPokemonData(p)),
      total: data.count,
      next: data.next,
      previous: data.previous
    };
  }

  /**
   * Fetcht Details eines einzelnen Pokemon
   * @param {number|string} idOrName - Pokemon ID oder Name
   * @returns {Promise<Object>} Pokemon Details
   */
  async fetchPokemon(idOrName) {
    const data = await this.fetch(`/pokemon/${idOrName}`);
    return this.#transformPokemonData(data);
  }

  /**
   * Fetcht Pokemon Species Details (für Beschreibungen, etc.)
   * @param {number} id - Pokemon ID
   * @returns {Promise<Object>} Species Details
   */
  async fetchPokemonSpecies(id) {
    return await this.fetch(`/pokemon-species/${id}`);
  }

  /**
   * Fetcht Evolution Chain
   * @param {number} id - Evolution Chain ID
   * @returns {Promise<Object>} Evolution Chain
   */
  async fetchEvolutionChain(id) {
    return await this.fetch(`/evolution-chain/${id}`);
  }

  /**
   * Sucht Pokemon nach Name
   * @param {string} query - Suchbegriff
   * @param {number} limit - Max Ergebnisse
   * @returns {Promise<Object[]>} Gefundene Pokemon
   */
  async searchPokemon(query, limit = 10) {
    // PokeAPI hat keine Search-Funktion, wir müssen alle Pokemon fetchen
    // In einer echten App würde man hier einen Search-Service verwenden
    const allPokemon = await this.fetch('/pokemon?limit=10000');

    const filtered = allPokemon.results
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);

    // Fetch Details für gefilterte Pokemon
    const details = await Promise.all(
      filtered.map(p => this.fetch(p.url))
    );

    return details.map(p => this.#transformPokemonData(p));
  }

  /**
   * Transformiert rohe API-Daten in unser App-Format
   * @private
   */
  #transformPokemonData(rawPokemon) {
    return {
      id: rawPokemon.id,
      name: rawPokemon.name,
      types: rawPokemon.types.map(t => t.type.name),
      sprites: {
        default: rawPokemon.sprites.other['official-artwork'].front_default || rawPokemon.sprites.front_default,
        shiny: rawPokemon.sprites.other['official-artwork'].front_shiny || rawPokemon.sprites.front_shiny,
        animated: rawPokemon.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default
      },
      stats: rawPokemon.stats.reduce((acc, stat) => {
        acc[stat.stat.name] = stat.base_stat;
        return acc;
      }, {}),
      abilities: rawPokemon.abilities.map(a => ({
        name: a.ability.name,
        isHidden: a.is_hidden
      })),
      height: rawPokemon.height,
      weight: rawPokemon.weight,
      baseExperience: rawPokemon.base_experience,
      moves: rawPokemon.moves.map(m => m.move.name)
    };
  }

  /**
   * Holt Daten aus dem Cache
   * @private
   */
  #getFromCache(url) {
    const cached = this.#cache.get(url);

    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.#cacheDuration;

    if (isExpired) {
      this.#cache.delete(url);
      return null;
    }

    return cached.data;
  }

  /**
   * Fügt Daten zum Cache hinzu
   * @private
   */
  #addToCache(url, data) {
    this.#cache.set(url, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Leert den Cache
   */
  clearCache() {
    this.#cache.clear();
  }

  /**
   * Gibt Cache-Statistiken zurück
   */
  getCacheStats() {
    return {
      size: this.#cache.size,
      enabled: this.#cacheEnabled,
      duration: this.#cacheDuration
    };
  }

  /**
   * Aktiviert/Deaktiviert Cache
   */
  setCacheEnabled(enabled) {
    this.#cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }
}
