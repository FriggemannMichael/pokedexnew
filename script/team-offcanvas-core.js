class TeamOffcanvas {
  constructor() {
    this.maxTeamSize = 6;
    this.team = [];
    this.useCentralTeamBuilder = Boolean(document.getElementById('activeTeamGrid'));
    this.offcanvasElement = document.getElementById('teamOffcanvas');
    this.dropZone = document.getElementById('teamDropZone');
    this.cardsContainer = document.getElementById('teamCardsContainer');
    this.teamCounter = document.getElementById('teamCounter');
    this.pokedexCounter = document.getElementById('pokedexCount');
    this.pokedexCounterOffcanvas = document.getElementById('pokedexCountOffcanvas');
    this.typeGradients = [
      'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 70%, #ff6b47 100%)',
      'linear-gradient(135deg, #3498db 0%, #5dade2 70%, #2e86c1 100%)',
      'linear-gradient(135deg, #2ecc71 0%, #58d68d 70%, #27ae60 100%)',
      'linear-gradient(135deg, #f1c40f 0%, #f7dc6f 70%, #d4ac0d 100%)',
      'linear-gradient(135deg, #e74c3c 0%, #ec7063 70%, #cb4335 100%)',
      'linear-gradient(135deg, #85c1e9 0%, #aed6f1 70%, #5dade2 100%)',
      'linear-gradient(135deg, #8e44ad 0%, #a569bd 70%, #7d3c98 100%)',
      'linear-gradient(135deg, #34495e 0%, #5d6d7e 70%, #2c3e50 100%)',
      'linear-gradient(135deg, #e67e22 0%, #f0b27a 70%, #d35400 100%)',
      'linear-gradient(135deg, #9b59b6 0%, #bb8fce 70%, #8e44ad 100%)',
      'linear-gradient(135deg, #a8a878 0%, #c5c5a0 70%, #8a8a5e 100%)',
      'linear-gradient(135deg, #a890f0 0%, #c8b5f7 70%, #9373e8 100%)',
      'linear-gradient(135deg, #e0c068 0%, #e8d084 70%, #c9a352 100%)',
      'linear-gradient(135deg, #b8a038 0%, #c9b65a 70%, #9e8a31 100%)',
      'linear-gradient(135deg, #a8b820 0%, #b8c842 70%, #8fa31a 100%)',
      'linear-gradient(135deg, #705898 0%, #8a7aad 70%, #5e4a82 100%)',
      'linear-gradient(135deg, #b8b8d0 0%, #d0d0e0 70%, #a0a0b8 100%)',
      'linear-gradient(135deg, #ee99ac 0%, #f4b5c4 70%, #e67e95 100%)'
    ];
    this._edgeListener = null;
    this._edgeOpenTimer = null;
    this._edgeCloseTimer = null;
    this.edgeRem = 4;
    this.edgeOpenDelay = 120;
    this.edgeCloseDelay = 280;
    this._rootFontSize = null;

    this.initializeOffcanvas();
    this.setupEventListeners();
    this.loadTeamFromStorage();
    this.setupDynamicModalHeader();
    if (!this.useCentralTeamBuilder) this.enableEdgeActivation();
  }

  initializeOffcanvas() {
    if (this.offcanvasElement && typeof bootstrap !== 'undefined') {
      this.offcanvas = new bootstrap.Offcanvas(this.offcanvasElement);
    }
  }

  setupEventListeners() {
    if (this.dropZone && !this.useCentralTeamBuilder) {
      this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
      this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
      this.dropZone.addEventListener('drop', this.handleDrop.bind(this));
    }
    if (this.dropZone && this.useCentralTeamBuilder) {
      this.dropZone.classList.add('central-team-builder-active');
      const ph = this.dropZone.querySelector('.drop-placeholder');
      if (ph) ph.innerHTML = '<i class="fas fa-compass"></i><p>Drag-and-Drop wurde in den zentralen Bereich verschoben.</p><small>Nutze das "Active Team" Grid.</small>';
    }
    if (this.offcanvasElement) {
      this.offcanvasElement.addEventListener('hidden.bs.offcanvas', () => this.saveTeamToStorage());
    }
  }

  showOffcanvas() { if (this.offcanvas) this.offcanvas.show(); }
  hideOffcanvas() { if (this.offcanvas) this.offcanvas.hide(); }
  isOpen() { return this.offcanvasElement && this.offcanvasElement.classList.contains('show'); }

  enableEdgeActivation() {
    if (this._edgeListener) return;
    this._edgeListener = (ev) => {
      if (!this._rootFontSize) {
        this._rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      }
      const threshold = this.edgeRem * this._rootFontSize;
      if (window.innerWidth - ev.clientX <= threshold) {
        this._scheduleEdgeOpen();
      } else if (!this.isOpen()) {
        this._cancelEdgeOpen();
      } else if (this.offcanvasElement && !this.offcanvasElement.matches(':hover')) {
        this._scheduleEdgeClose();
      }
    };
    document.addEventListener('mousemove', this._edgeListener, { passive: true });
    if (this.offcanvasElement) {
      this.offcanvasElement.addEventListener('mouseleave', () => this._scheduleEdgeClose());
      this.offcanvasElement.addEventListener('mouseenter', () => this._cancelEdgeClose());
    }
  }

  _scheduleEdgeOpen() {
    if (this.isOpen() || this._edgeOpenTimer) return;
    this._edgeOpenTimer = setTimeout(() => { this._edgeOpenTimer = null; this.showOffcanvas(); }, this.edgeOpenDelay);
  }
  _cancelEdgeOpen() { if (this._edgeOpenTimer) { clearTimeout(this._edgeOpenTimer); this._edgeOpenTimer = null; } }
  _scheduleEdgeClose() {
    if (!this.isOpen()) return;
    if (this._edgeCloseTimer) clearTimeout(this._edgeCloseTimer);
    this._edgeCloseTimer = setTimeout(() => {
      if (this.offcanvasElement && !this.offcanvasElement.matches(':hover')) this.hideOffcanvas();
      this._edgeCloseTimer = null;
    }, this.edgeCloseDelay);
  }
  _cancelEdgeClose() { if (this._edgeCloseTimer) { clearTimeout(this._edgeCloseTimer); this._edgeCloseTimer = null; } }

  handleDragOver(e) { if (this.useCentralTeamBuilder) return; e.preventDefault(); this.dropZone.classList.add('drag-over'); }
  handleDragLeave(e) { if (this.useCentralTeamBuilder) return; if (!this.dropZone.contains(e.relatedTarget)) this.dropZone.classList.remove('drag-over'); }
  handleDrop(e) {
    if (this.useCentralTeamBuilder) return;
    e.preventDefault();
    this.dropZone.classList.remove('drag-over');
    const id = e.dataTransfer.getData('pokedex-card-id');
    if (id) this.addPokemonToTeam(id);
  }

  addPokemonToTeam(pokemonId) {
    if (this.team.length >= this.maxTeamSize) { this.showToast('Team ist bereits voll! (6/6)', 'warning'); return false; }
    if (this.isPokemonInTeam(pokemonId)) { this.showToast('Dieses Pokemon ist bereits in deinem Team!', 'warning'); return false; }
    const data = this.getPokemonData(pokemonId);
    if (!data) { this.showToast('Pokemon-Daten konnten nicht geladen werden.', 'error'); return false; }
    const normalized = this.normalizeTeamPokemon(data);
    if (!normalized) { this.showToast('Pokemon-Daten konnten nicht verarbeitet werden.', 'error'); return false; }
    this.team.push(normalized);
    this.renderMiniCard(normalized);
    this.updateCounters();
    this.updateDropPlaceholder();
    this.saveTeamToStorage();
    this.notifyTeamChanged('offcanvas-drop');
    this.showToast(`${normalized.name} wurde zum Team hinzugefuegt!`, 'success');
    return true;
  }

  removePokemonFromTeam(pokemonId) {
    const idx = this.team.findIndex(p => (typeof p === 'object' && p.id) ? p.id == pokemonId : p == pokemonId);
    if (idx === -1) return false;
    const removed = this.team[idx];
    const name = typeof removed === 'object' ? removed.name : `Pokemon #${pokemonId}`;
    this.team.splice(idx, 1);
    this.animateRemoveMiniCard(pokemonId);
    this.updateCounters();
    this.updateDropPlaceholder();
    this.saveTeamToStorage();
    this.notifyTeamChanged('offcanvas-remove');
    this.refreshTeamModalIfOpen();
    this.showToast(`${name} wurde aus dem Team entfernt.`, 'info');
    return true;
  }

  clearTeam() {
    this.team = [];
    this.cardsContainer.innerHTML = '';
    this.updateCounters();
    this.updateDropPlaceholder();
    this.saveTeamToStorage();
    this.notifyTeamChanged('offcanvas-clear');
    this.showToast('Team wurde geleert.', 'info');
  }

  isPokemonInTeam(pokemonId) { return this.team.some(p => Number(p.id) === Number(pokemonId)); }
  getTeam() { return this.team.map((p) => this.normalizeTeamPokemon(p)).filter(Boolean); }
  getTeamSize() { return this.team.length; }
  isTeamFull() { return this.team.length >= this.maxTeamSize; }

  getPokemonData(pokemonId) {
    let card = document.querySelector(`[data-pokemon-id="${pokemonId}"]`) || document.querySelector(`[data-id="${pokemonId}"]`);
    if (!card) return null;
    const nameEl = card.querySelector('.pokemon-name, .card-title');
    const imgEl = card.querySelector('img');
    const source = this.findPokemonSourceById(pokemonId);
    const typeEls = card.querySelectorAll('.type-badge, .detail-type-badge, .type-badge-inline');
    const types = Array.from(typeEls).map(t => (t.textContent || '').trim().toLowerCase().replace(/[^a-z]/g, '')).filter(t => VALID_POKEMON_TYPES.has(t));
    return {
      id: Number(pokemonId), name: nameEl ? nameEl.textContent.trim() : 'Unknown',
      image: imgEl ? imgEl.src : '', spriteUrl: imgEl ? imgEl.src : '',
      types: window.sanitizeTypes ? window.sanitizeTypes(types) : (types.length > 0 ? types : ['normal']),
      stats: Array.isArray(source?.stats) ? source.stats : [],
      base_experience: Number(source?.base_experience || 0),
    };
  }

  findPokemonSourceById(pokemonId) {
    const num = Number(pokemonId);
    if (!num) return null;
    const pools = [];
    if (typeof appState !== 'undefined') {
      if (Array.isArray(appState.pokemonList)) pools.push(appState.pokemonList);
      if (Array.isArray(appState.allPokemonList)) pools.push(appState.allPokemonList);
    }
    for (const pool of pools) { const f = pool.find((p) => Number(p.id) === num); if (f) return f; }
    if (window.services?.pokemon?.getPokemonById) { try { return window.services.pokemon.getPokemonById(num) || null; } catch {} }
    return null;
  }

  normalizeTeamPokemon(pokemon) {
    if (!pokemon) return null;
    const id = Number(pokemon.id);
    if (!id) return null;
    const source = this.findPokemonSourceById(id);
    const rawTypes = Array.isArray(pokemon.types) && pokemon.types.length ? pokemon.types : (Array.isArray(source?.types) ? source.types : []);
    const types = window.sanitizeTypes ? window.sanitizeTypes(rawTypes) : (rawTypes.length ? rawTypes : ['normal']);
    return {
      ...pokemon, id, types,
      image: pokemon.image || pokemon.spriteUrl || source?.image || '',
      spriteUrl: pokemon.spriteUrl || pokemon.image || source?.spriteUrl || '',
      stats: Array.isArray(pokemon.stats) && pokemon.stats.length ? pokemon.stats : (Array.isArray(source?.stats) ? source.stats : []),
      base_experience: Number(Number.isFinite(Number(pokemon.base_experience)) ? Number(pokemon.base_experience) : Number(source?.base_experience || 0)),
    };
  }

  saveTeamToStorage() { try { localStorage.setItem('pokemonTeam', JSON.stringify(this.team)); } catch {} }
  loadTeamFromStorage() {
    try {
      const raw = localStorage.getItem('pokemonTeam');
      if (raw) {
        this.team = JSON.parse(raw);
        if (!Array.isArray(this.team)) this.team = [];
        this.team = this.team.map((p) => this.normalizeTeamPokemon(p)).filter(Boolean);
        this.renderAllMiniCards();
        this.updateCounters();
        this.updateDropPlaceholder();
        this.notifyTeamChanged('offcanvas-storage-load');
      }
    } catch { this.team = []; }
  }

  notifyTeamChanged(source = 'offcanvas') {
    window.dispatchEvent(new CustomEvent('pokemon-team-updated', { detail: { source, team: this.getTeam() } }));
  }

  syncExternalTeam(team, source = 'external-sync') {
    if (!Array.isArray(team)) return;
    this.team = team.slice(0, this.maxTeamSize).map((p) => {
      const types = window.sanitizeTypes ? window.sanitizeTypes(p.types) : (Array.isArray(p.types) && p.types.length ? p.types : ['normal']);
      return this.normalizeTeamPokemon({ ...p, types });
    }).filter(Boolean);
    this.renderAllMiniCards();
    this.updateCounters();
    this.updateDropPlaceholder();
    this.saveTeamToStorage();
    this.notifyTeamChanged(source);
  }
}
