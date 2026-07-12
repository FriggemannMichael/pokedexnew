import { PokeApi } from "../utils/pokeapi-client.js";

export class ApiService {
  #cache = new Map();
  #cacheEnabled = true;
  #cacheDuration = 1000 * 60 * 30;

  constructor(config = {}) {
    if (config.cacheEnabled !== undefined)
      this.#cacheEnabled = config.cacheEnabled;
    if (config.cacheDuration) this.#cacheDuration = config.cacheDuration;
  }

  // Das Holen (und Cachen ueber das Backend) uebernimmt PokeApi. Der Cache
  // hier drin spart zusaetzlich die HTTP-Anfrage innerhalb einer Sitzung.
  async fetch(endpoint) {
    if (this.#cacheEnabled) {
      const cached = this.#getFromCache(endpoint);
      if (cached) return cached;
    }

    try {
      const data = await PokeApi.fetch(endpoint);
      if (this.#cacheEnabled) this.#addToCache(endpoint, data);
      return data;
    } catch (error) {
      console.error("❌ API Fetch Error:", error);
      throw error;
    }
  }

  async fetchPokemonList(offset = 0, limit = 20) {
    const { results, count } = await PokeApi.list(offset, limit);
    return {
      pokemon: results,
      total: count,
      next: offset + limit < count ? offset + limit : null,
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

  #extraSprites(rawPokemon) {
    const sprites = rawPokemon.sprites || {};
    const artwork = sprites.other?.["official-artwork"] || {};
    const animated =
      sprites.versions?.["generation-v"]?.["black-white"]?.animated;
    return {
      default: artwork.front_default || sprites.front_default,
      shiny: artwork.front_shiny || sprites.front_shiny,
      animated: animated?.front_default,
    };
  }

  // Baut auf dem schlanken Format des Backends auf (stats als Liste,
  // base_experience) und ergaenzt nur die Felder der Detailansicht.
  transformPokemonData(rawPokemon) {
    return {
      ...PokeApi.slimPokemon(rawPokemon),
      sprites: this.#extraSprites(rawPokemon),
      abilities: (rawPokemon.abilities || []).map((a) => ({
        name: a.ability.name,
        isHidden: a.is_hidden,
      })),
      height: rawPokemon.height,
      weight: rawPokemon.weight,
      moves: (rawPokemon.moves || []).map((m) => m.move.name),
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
