class PokemonGoFeatures {
  constructor() {
    this.favorites = new Set(JSON.parse(localStorage.getItem('pokemonFavorites')||'[]'));
    this.ratings = JSON.parse(localStorage.getItem('pokemonRatings')||'{}');
    this.personalNotes = JSON.parse(localStorage.getItem('pokemonNotes')||'{}');
    this._initialized = false;
  }
  init(){
    if(this._initialized) return;
    if(typeof this.setupEventListeners !== 'function' || typeof this.addFilterToggles !== 'function'){
      return setTimeout(()=> this.init(), 50);
    }
    this._initialized = true;
    try { if(typeof this.setupEventListeners==='function') this.setupEventListeners(); } catch(e){ console.warn('[PGF] setupEventListeners fehlgeschlagen', e); }
    try { if(typeof this.addFilterToggles==='function') this.addFilterToggles(); } catch(e){ console.warn('[PGF] addFilterToggles fehlgeschlagen', e); }
    try { if(typeof this.initPowerObserver==='function') this.initPowerObserver(); } catch(e){ console.warn('[PGF] initPowerObserver fehlgeschlagen', e); }
    try { if(typeof this.applyTypeClassToPowerLevels==='function') this.applyTypeClassToPowerLevels(); } catch(e){ console.warn('[PGF] applyTypeClassToPowerLevels fehlgeschlagen', e); }
    try { if(typeof this.syncPowerLevelTypes==='function') this.syncPowerLevelTypes(); } catch(e){ console.warn('[PGF] syncPowerLevelTypes fehlgeschlagen', e); }
    document.dispatchEvent(new CustomEvent('pokemonGoFeaturesReady'));
  }
}

window.pokemonGoFeatures = new PokemonGoFeatures();
