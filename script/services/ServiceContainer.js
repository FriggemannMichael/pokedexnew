import { StateManager } from './StateManager.js';
import { StorageService } from './StorageService.js';
import { ApiService } from './ApiService.js';
import { PokemonService } from './PokemonService.js';
import { TeamService } from './TeamService.js';
import { FavoritesService } from './FavoritesService.js';

export class ServiceContainer {
  #services = {};
  #initialized = false;

  constructor() {
    this.#initializeServices();
  }

  #initializeServices() {
    this.#services.stateManager = new StateManager({
      app: {
        initialized: false,
        debugMode: false
      }
    });

    this.#services.storageService = new StorageService('pokedex_');
    this.#services.apiService = new ApiService({
      cacheEnabled: true,
      cacheDuration: 1000 * 60 * 30
    });

    this.#services.pokemonService = new PokemonService(
      this.#services.stateManager,
      this.#services.apiService,
      this.#services.storageService
    );

    this.#services.teamService = new TeamService(
      this.#services.stateManager,
      this.#services.storageService,
      this.#services.pokemonService
    );

    this.#services.favoritesService = new FavoritesService(
      this.#services.stateManager,
      this.#services.storageService
    );

    this.#initialized = true;
    console.log('✅ Services initialized');
  }

  get(serviceName) {
    if (!this.#initialized) {
      throw new Error('Services not initialized yet');
    }

    const service = this.#services[serviceName];

    if (!service) {
      throw new Error(`Service '${serviceName}' not found`);
    }

    return service;
  }

  has(serviceName) {
    return serviceName in this.#services;
  }

  getServiceNames() {
    return Object.keys(this.#services);
  }

  register(name, service) {
    if (this.#services[name]) {
      console.warn(`⚠️ Service '${name}' already exists, overwriting`);
    }

    this.#services[name] = service;
    console.log(`✅ Registered service: ${name}`);
  }

  getDebugInfo() {
    return {
      initialized: this.#initialized,
      services: this.getServiceNames(),
      state: this.#services.stateManager?.getState(),
      cacheStats: this.#services.apiService?.getCacheStats(),
      storageInfo: this.#services.storageService?.getInfo()
    };
  }

  exposeGlobally() {
    window.__services = this.#services;
    window.__serviceContainer = this;

    console.warn('⚠️ Services exposed globally for legacy compatibility');
  }
}

let instance = null;

export function getServiceContainer() {
  if (!instance) {
    instance = new ServiceContainer();
  }
  return instance;
}

export function initializeServices() {
  const container = getServiceContainer();

  if (window.POKE_DEBUG) {
    container.exposeGlobally();
  }

  return container;
}
