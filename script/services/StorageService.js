/**
 * StorageService - Abstraction Layer für Browser Storage
 *
 * Features:
 * - localStorage Abstraktion
 * - Automatisches JSON Parsing
 * - Error Handling
 * - Type Safety Support
 * - Quota Management
 */

export class StorageService {
  #prefix = '';
  #storage = null;

  constructor(prefix = 'pokedex_', storage = localStorage) {
    this.#prefix = prefix;
    this.#storage = storage;
  }

  /**
   * Gibt den vollständigen Key mit Prefix zurück
   * @private
   */
  #getKey(key) {
    return `${this.#prefix}${key}`;
  }

  /**
   * Speichert einen Wert im Storage
   * @param {string} key - Storage Key
   * @param {*} value - Wert zum Speichern (wird automatisch zu JSON)
   * @returns {boolean} Erfolg
   */
  set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      this.#storage.setItem(this.#getKey(key), serialized);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('❌ Storage quota exceeded:', key);
        this.#handleQuotaExceeded();
      } else {
        console.error('❌ Error saving to storage:', error);
      }
      return false;
    }
  }

  /**
   * Liest einen Wert aus dem Storage
   * @param {string} key - Storage Key
   * @param {*} defaultValue - Fallback Wert falls Key nicht existiert
   * @returns {*} Gespeicherter Wert oder defaultValue
   */
  get(key, defaultValue = null) {
    try {
      const item = this.#storage.getItem(this.#getKey(key));

      if (item === null) {
        return defaultValue;
      }

      return JSON.parse(item);
    } catch (error) {
      console.error('❌ Error reading from storage:', error);
      return defaultValue;
    }
  }

  /**
   * Entfernt einen Wert aus dem Storage
   * @param {string} key - Storage Key
   * @returns {boolean} Erfolg
   */
  remove(key) {
    try {
      this.#storage.removeItem(this.#getKey(key));
      return true;
    } catch (error) {
      console.error('❌ Error removing from storage:', error);
      return false;
    }
  }

  /**
   * Prüft ob ein Key existiert
   * @param {string} key - Storage Key
   * @returns {boolean} Existiert
   */
  has(key) {
    return this.#storage.getItem(this.#getKey(key)) !== null;
  }

  /**
   * Löscht alle Keys mit dem aktuellen Prefix
   */
  clear() {
    try {
      const keys = this.keys();
      keys.forEach(key => this.remove(key));
      return true;
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
      return false;
    }
  }

  /**
   * Gibt alle Keys mit dem aktuellen Prefix zurück
   * @returns {string[]} Array von Keys (ohne Prefix)
   */
  keys() {
    const allKeys = Object.keys(this.#storage);
    return allKeys
      .filter(key => key.startsWith(this.#prefix))
      .map(key => key.substring(this.#prefix.length));
  }

  /**
   * Gibt die Anzahl der gespeicherten Items zurück
   * @returns {number} Anzahl Items
   */
  size() {
    return this.keys().length;
  }

  /**
   * Gibt die ungefähre Größe des verwendeten Storage zurück (in Bytes)
   * @returns {number} Größe in Bytes
   */
  getUsedSpace() {
    let total = 0;
    this.keys().forEach(key => {
      const value = this.#storage.getItem(this.#getKey(key));
      total += value ? value.length : 0;
    });
    return total;
  }

  /**
   * Gibt Storage Info zurück
   * @returns {Object} Storage Informationen
   */
  getInfo() {
    const usedSpace = this.getUsedSpace();
    return {
      keys: this.keys(),
      count: this.size(),
      usedSpace: usedSpace,
      usedSpaceFormatted: this.#formatBytes(usedSpace),
      prefix: this.#prefix
    };
  }

  /**
   * Formatiert Bytes zu lesbarem String
   * @private
   */
  #formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  /**
   * Behandelt Quota Exceeded Error
   * @private
   */
  #handleQuotaExceeded() {
    console.warn('⚠️ Storage quota exceeded. Consider clearing old data.');
    // Hier könnte man automatisch alte Daten löschen
  }

  /**
   * Migriert Daten von alten Keys zu neuen Keys
   * @param {Object} migrations - Objekt mit old -> new Key Mappings
   */
  migrate(migrations) {
    Object.entries(migrations).forEach(([oldKey, newKey]) => {
      if (this.has(oldKey)) {
        const value = this.get(oldKey);
        this.set(newKey, value);
        this.remove(oldKey);
        console.log(`✅ Migrated: ${oldKey} -> ${newKey}`);
      }
    });
  }
}

/**
 * Legacy Storage Keys (für Migration)
 */
export const LEGACY_KEYS = {
  TEAM: 'pokemonTeam',
  FAVORITES: 'pokemonFavorites',
  RATINGS: 'pokemonRatings',
  NOTES: 'pokemonNotes'
};

/**
 * Neue Storage Keys
 */
export const STORAGE_KEYS = {
  TEAM: 'team',
  FAVORITES: 'favorites',
  RATINGS: 'ratings',
  NOTES: 'notes',
  SETTINGS: 'settings',
  CACHE: 'cache'
};
