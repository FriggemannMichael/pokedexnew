export class ApiService {
  #baseUrl = "https://pokeapi.co/api/v2";
  #cache = new Map();
  #cacheEnabled = true;
  #cacheDuration = 1000 * 60 * 30;

  constructor(config = {}) {
    if (config.baseUrl) this.#baseUrl = config.baseUrl;
    if (config.cacheEnabled !== undefined)
      this.#cacheEnabled = config.cacheEnabled;
    if (config.cacheDuration) this.#cacheDuration = config.cacheDuration;
  }

  async fetch(endpoint) {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.#baseUrl}${endpoint}`;

    if (this.#cacheEnabled) {
      const cached = this.#getFromCache(url);
      if (cached) return cached;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();

      if (this.#cacheEnabled) {
        this.#addToCache(url, data);
      }
      return data;
    } catch (error) {
      console.error("❌ API Fetch Error:", error);
      throw error;
    }
  }

  async fetchPokemonList(offset = 0, limit = 20) {
    const data = await this.fetch(`/pokemon?offset=${offset}&limit=${limit}`);

    const pokemonDetails = await Promise.all(
      data.results.map((pokemon) => this.fetch(pokemon.url)),
    );

    return {
      pokemon: pokemonDetails.map((p) => this.transformPokemonData(p)),
      total: data.count,
      next: data.next,
      previous: data.previous,
    };
  }

  async fetchPokemon(idOrName) {
    const data = await this.fetch(`/pokemon/${idOrName}`);
    return this.transformPokemonData(data);
  }

  async fetchPokemonSpecies(id) {
    return await this.fetch(`/pokemon-species/${id}`);
  }

  async fetchEvolutionChain(id) {
    return await this.fetch(`/evolution-chain/${id}`);
  }

  async searchPokemon(query, limit = 10) {
    const allPokemon = await this.fetch("/pokemon?limit=10000");
    const filtered = allPokemon.results
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);

    const details = await Promise.all(filtered.map((p) => this.fetch(p.url)));
    return details.map((p) => this.transformPokemonData(p));
  }

  transformPokemonData(rawPokemon) {
    return {
      id: rawPokemon.id,
      name: rawPokemon.name,
      image:
        rawPokemon.sprites.other["official-artwork"].front_default ||
        rawPokemon.sprites.front_default,
      types: rawPokemon.types.map((t) => t.type.name),
      sprites: {
        default:
          rawPokemon.sprites.other["official-artwork"].front_default ||
          rawPokemon.sprites.front_default,
        shiny:
          rawPokemon.sprites.other["official-artwork"].front_shiny ||
          rawPokemon.sprites.front_shiny,
        animated:
          rawPokemon.sprites.versions?.["generation-v"]?.["black-white"]
            ?.animated?.front_default,
      },
      stats: rawPokemon.stats.reduce((acc, stat) => {
        acc[stat.stat.name] = stat.base_stat;
        return acc;
      }, {}),
      abilities: rawPokemon.abilities.map((a) => ({
        name: a.ability.name,
        isHidden: a.is_hidden,
      })),
      height: rawPokemon.height,
      weight: rawPokemon.weight,
      baseExperience: rawPokemon.base_experience,
      moves: rawPokemon.moves.map((m) => m.move.name),
    };
  }

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

  #addToCache(url, data) {
    this.#cache.set(url, {
      data,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.#cache.clear();
  }
}
