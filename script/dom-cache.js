class DOMCache {
    constructor() {
        this._cache = new Map();
        this.initializeCache();
    }

    initializeCache() {
        const commonElements = [
            'pokemonContainer',
            'searchInput',
            'searchBtn',
            'searchDropdown',
            'pokemonOverlay',
            'loadMoreBtn',
            'pokedexCount',
            'pageInfo',
            'paginationControls',
            'prevPageBtn',
            'nextPageBtn'
        ];

        commonElements.forEach(id => {
            this.get(id);
        });
    }

    get(elementId) {
        if (this._cache.has(elementId)) {
            const cachedElement = this._cache.get(elementId);
            if (document.contains(cachedElement)) {
                return cachedElement;
            } else {
                this._cache.delete(elementId);
            }
        }

        const element = document.getElementById(elementId);
        if (element) {
            this._cache.set(elementId, element);
        }
        return element;
    }

    getPokemonContainer() { return this.get('pokemonContainer'); }
    getSearchInput() { return this.get('searchInput'); }
    getSearchBtn() { return this.get('searchBtn'); }
    getSearchDropdown() { return this.get('searchDropdown'); }
    getPokemonOverlay() { return this.get('pokemonOverlay'); }
    getLoadMoreBtn() { return this.get('loadMoreBtn'); }

    clearCache() {
        this._cache.clear();
        this.initializeCache();
    }

    getCacheInfo() {
        return {
            size: this._cache.size,
            keys: Array.from(this._cache.keys()),
            validElements: Array.from(this._cache.values()).filter(el => document.contains(el)).length
        };
    }
}

const domCache = new DOMCache();

window.getElementById = (id) => domCache.get(id);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { domCache, DOMCache };
}
