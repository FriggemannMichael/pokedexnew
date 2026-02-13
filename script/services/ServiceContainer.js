/**
 * ServiceContainer - Dependency Injection Container
 *
 * Zentraler Container für alle Services
 * Vereinfacht Dependency Management und Testing
 */

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

  /**
   * Initialisiert alle Services in der richtigen Reihenfolge
   * @private
   */
  #initializeServices() {
    // 1. Foundation Services (keine Dependencies)
    this.#services.stateManager = new StateManager({
      // Initial State
      app: {
        initialized: false,
        debugMode: false
      }
    });

    this.#services.storageService = new StorageService('pokedex_');
    this.#services.apiService = new ApiService({
      cacheEnabled: true,
      cacheDuration: 1000 * 60 * 30 // 30 Minuten
    });

    // 2. Business Logic Services (mit Dependencies)
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

  /**
   * Gibt einen Service zurück
   * @param {string} serviceName - Name des Services
   * @returns {*} Service Instance
   */
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

  /**
   * Prüft ob ein Service existiert
   * @param {string} serviceName - Name des Services
   * @returns {boolean}
   */
  has(serviceName) {
    return serviceName in this.#services;
  }

  /**
   * Gibt alle Service Namen zurück
   * @returns {string[]}
   */
  getServiceNames() {
    return Object.keys(this.#services);
  }

  /**
   * Registriert einen zusätzlichen Service
   * @param {string} name - Service Name
   * @param {*} service - Service Instance
   */
  register(name, service) {
    if (this.#services[name]) {
      console.warn(`⚠️ Service '${name}' already exists, overwriting`);
    }

    this.#services[name] = service;
    console.log(`✅ Registered service: ${name}`);
  }

  /**
   * Gibt Debug Informationen zurück
   * @returns {Object}
   */
  getDebugInfo() {
    return {
      initialized: this.#initialized,
      services: this.getServiceNames(),
      state: this.#services.stateManager?.getState(),
      cacheStats: this.#services.apiService?.getCacheStats(),
      storageInfo: this.#services.storageService?.getInfo()
    };
  }

  /**
   * Macht Services global verfügbar (für Legacy Code Kompatibilität)
   * @deprecated Sollte nur für Migration verwendet werden
   */
  exposeGlobally() {
    window.__services = this.#services;
    window.__serviceContainer = this;

    console.warn('⚠️ Services exposed globally for legacy compatibility');
  }
}

/**
 * Singleton Instance
 */
let instance = null;

/**
 * Gibt die Singleton Instance zurück
 * @returns {ServiceContainer}
 */
export function getServiceContainer() {
  if (!instance) {
    instance = new ServiceContainer();
  }
  return instance;
}

/**
 * Initialisiert Services und gibt Container zurück
 * @returns {ServiceContainer}
 */
export function initializeServices() {
  const container = getServiceContainer();

  // Für Legacy Code Kompatibilität (temporär)
  if (window.POKE_DEBUG) {
    container.exposeGlobally();
  }

  return container;
}
