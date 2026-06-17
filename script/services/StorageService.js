export class StorageService {
  #prefix = '';
  #storage = null;

  constructor(prefix = 'pokedex_', storage = localStorage) {
    this.#prefix = prefix;
    this.#storage = storage;
  }

  #getKey(key) {
    return `${this.#prefix}${key}`;
  }

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

  remove(key) {
    try {
      this.#storage.removeItem(this.#getKey(key));
      return true;
    } catch (error) {
      console.error('❌ Error removing from storage:', error);
      return false;
    }
  }

  has(key) {
    return this.#storage.getItem(this.#getKey(key)) !== null;
  }

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

  keys() {
    const allKeys = Object.keys(this.#storage);
    return allKeys
      .filter(key => key.startsWith(this.#prefix))
      .map(key => key.substring(this.#prefix.length));
  }

  size() {
    return this.keys().length;
  }

  getUsedSpace() {
    let total = 0;
    this.keys().forEach(key => {
      const value = this.#storage.getItem(this.#getKey(key));
      total += value ? value.length : 0;
    });
    return total;
  }

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

  #formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  #handleQuotaExceeded() {
    console.warn('⚠️ Storage quota exceeded. Consider clearing old data.');
  }

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

export const LEGACY_KEYS = {
  TEAM: 'pokemonTeam',
  FAVORITES: 'pokemonFavorites',
  RATINGS: 'pokemonRatings',
  NOTES: 'pokemonNotes'
};

export const STORAGE_KEYS = {
  TEAM: 'team',
  FAVORITES: 'favorites',
  RATINGS: 'ratings',
  NOTES: 'notes',
  SETTINGS: 'settings',
  CACHE: 'cache'
};
