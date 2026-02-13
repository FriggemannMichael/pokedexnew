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
  // Neuer Offcanvas My Pokedex Button Counter
  this.pokedexCounterOffcanvas = document.getElementById('pokedexCountOffcanvas');
    // Precompute gradients (re-usable)
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
    
    this.initializeOffcanvas();
    this.setupEventListeners();
    this.loadTeamFromStorage();
    this.setupDynamicModalHeader();

    // Edge Activation Konfiguration (Ã¶ffnen bei MausnÃ¤he rechter Rand)
    this._edgeListener = null;
    this._edgeOpenTimer = null;
    this._edgeCloseTimer = null;
    this.edgeRem = 4;          // Abstand vom rechten Rand
    this.edgeOpenDelay = 120;  // ms VerzÃ¶gerung bevor geÃ¶ffnet wird
    this.edgeCloseDelay = 280; // ms VerzÃ¶gerung bevor geschlossen wird
    this._rootFontSize = null;
    if (!this.useCentralTeamBuilder) {
      this.enableEdgeActivation();
    }
  }
  
  initializeOffcanvas() {
    if (this.offcanvasElement && typeof bootstrap !== 'undefined') {
      this.offcanvas = new bootstrap.Offcanvas(this.offcanvasElement);
    }
  }
  
  setupEventListeners() {
    if (this.dropZone && !this.useCentralTeamBuilder) {
      // Drop-Zone Events
      this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
      this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
      this.dropZone.addEventListener('drop', this.handleDrop.bind(this));
    }

    if (this.dropZone && this.useCentralTeamBuilder) {
      this.dropZone.classList.add('central-team-builder-active');
      const placeholder = this.dropZone.querySelector('.drop-placeholder');
      if (placeholder) {
        placeholder.innerHTML = `
          <i class="fas fa-compass"></i>
          <p>Drag-and-Drop wurde in den zentralen Bereich verschoben.</p>
          <small>Nutze das "Active Team" Grid Ã¼ber den Pokemon-Karten.</small>
        `;
      }
    }
    
    // Offcanvas Events
    if (this.offcanvasElement) {
      this.offcanvasElement.addEventListener('hidden.bs.offcanvas', () => {
        this.saveTeamToStorage();
      });
    }
  }
  
  showOffcanvas() {
    if (this.offcanvas) {
      this.offcanvas.show();
    }
  }
  
  hideOffcanvas() {
    if (this.offcanvas) {
      this.offcanvas.hide();
    }
  }

  // --- Edge Activation Logic ---
  enableEdgeActivation() {
    if (this._edgeListener) return; // schon aktiv
    this._edgeListener = (ev) => {
      // Root font-size (fÃ¼r rem -> px) nur einmal berechnen
      if (!this._rootFontSize) {
        const fs = parseFloat(getComputedStyle(document.documentElement).fontSize);
        this._rootFontSize = isNaN(fs) ? 16 : fs;
      }
      const thresholdPx = this.edgeRem * this._rootFontSize;
      const distanceFromRight = window.innerWidth - ev.clientX;
      if (distanceFromRight <= thresholdPx) {
        this._scheduleEdgeOpen();
      } else if (!this.isOpen()) {
        // Maus wieder weg bevor geÃ¶ffnet => Ã–ffnen abbrechen
        this._cancelEdgeOpen();
      } else {
        // Falls bereits offen & Maus weit weg + nicht Ã¼ber Offcanvas => SchlieÃŸen planen
        if (this.offcanvasElement && !this.offcanvasElement.matches(':hover')) {
          this._scheduleEdgeClose();
        }
      }
    };
    document.addEventListener('mousemove', this._edgeListener, { passive: true });

    // Mausverlassen des Offcanvas gezielt behandeln
    if (this.offcanvasElement) {
      this.offcanvasElement.addEventListener('mouseleave', () => {
        this._scheduleEdgeClose();
      });
      this.offcanvasElement.addEventListener('mouseenter', () => {
        this._cancelEdgeClose();
      });
    }
  }

  isOpen() {
    return this.offcanvasElement && this.offcanvasElement.classList.contains('show');
  }

  _scheduleEdgeOpen() {
    if (this.isOpen()) return;
    if (this._edgeOpenTimer) return;
    this._edgeOpenTimer = setTimeout(() => {
      this._edgeOpenTimer = null;
      this.showOffcanvas();
    }, this.edgeOpenDelay);
  }

  _cancelEdgeOpen() {
    if (this._edgeOpenTimer) {
      clearTimeout(this._edgeOpenTimer);
      this._edgeOpenTimer = null;
    }
  }

  _scheduleEdgeClose() {
    if (!this.isOpen()) return;
    if (this._edgeCloseTimer) clearTimeout(this._edgeCloseTimer);
    this._edgeCloseTimer = setTimeout(() => {
      // Sicherheit: nur schlieÃŸen wenn Maus nicht Ã¼ber Offcanvas liegt
      if (this.offcanvasElement && !this.offcanvasElement.matches(':hover')) {
        this.hideOffcanvas();
      }
      this._edgeCloseTimer = null;
    }, this.edgeCloseDelay);
  }

  _cancelEdgeClose() {
    if (this._edgeCloseTimer) {
      clearTimeout(this._edgeCloseTimer);
      this._edgeCloseTimer = null;
    }
  }

  /**
   * WÃ¤hlt einen zufÃ¤lligen Typ-Gradient aus der Liste.
   * Fallback: var(--gradient)
   */
  getRandomTypeGradient() {
    if (!this.typeGradients || !this.typeGradients.length) return 'var(--gradient)';
    const idx = Math.floor(Math.random() * this.typeGradients.length);
    return this.typeGradients[idx];
  }

  /**
   * Initialisiert den dynamischen Modal Header (Bootstrap Modal/Ersatz)
   * Sucht alle .modal-header innerhalb von .modal-content im Offcanvas-Kontext
   * und fÃ¤rbt beim Ã–ffnen neu ein.
   */
  setupDynamicModalHeader() {
    // UnterstÃ¼tzt Modal oder Offcanvas? Hier: wenn separate Modals (#teamModal) existieren, dort auch anwenden.
    const applyGradient = (header) => {
      if (!header) return;
      const g = this.getRandomTypeGradient();
      header.classList.add('dynamic-gradient');
      header.style.setProperty('--_prev-gradient', getComputedStyle(header).backgroundImage || 'none');
      header.style.backgroundImage = g;
      // kleine Fade Animation triggern
      header.animate([
        { opacity: 0.4 },
        { opacity: 1 }
      ], { duration: 480, easing: 'ease' });
    };

    // Falls Bootstrap Modal Events existieren
    document.addEventListener('show.bs.modal', (ev) => {
      const modal = ev.target;
      const header = modal.querySelector('.modal-header');
      applyGradient(header);
    });

    // Direkt initial auf bereits gerendertes Team Modal anwenden (falls sichtbar)
    const existingTeamModal = document.getElementById('teamModal');
    if (existingTeamModal && existingTeamModal.classList.contains('show')) {
      applyGradient(existingTeamModal.querySelector('.modal-header'));
    }

    // Optional: Offcanvas spezifischer Header (falls vorhanden)
    if (this.offcanvasElement) {
      this.offcanvasElement.addEventListener('shown.bs.offcanvas', () => {
        const header = this.offcanvasElement.querySelector('.modal-header');
        if (header) applyGradient(header);
      });
    }
  }
  
  handleDragOver(e) {
    if (this.useCentralTeamBuilder) return;
    e.preventDefault();
    this.dropZone.classList.add('drag-over');
  }
  
  handleDragLeave(e) {
    if (this.useCentralTeamBuilder) return;
    if (!this.dropZone.contains(e.relatedTarget)) {
      this.dropZone.classList.remove('drag-over');
    }
  }
  
  handleDrop(e) {
    if (this.useCentralTeamBuilder) return;
    e.preventDefault();
    this.dropZone.classList.remove('drag-over');
    
    const pokemonId = e.dataTransfer.getData('pokedex-card-id');
    if (pokemonId) {
      this.addPokemonToTeam(pokemonId);
    }
  }
  
  addPokemonToTeam(pokemonId) {
    // Validierungen
    if (this.team.length >= this.maxTeamSize) {
      this.showToast('Team ist bereits voll! (6/6)', 'warning');
      return false;
    }
    
    if (this.isPokemonInTeam(pokemonId)) {
      this.showToast('Dieses Pokemon ist bereits in deinem Team!', 'warning');
      return false;
    }
    
    // Pokemon-Daten abrufen
    const pokemonData = this.getPokemonData(pokemonId);
    if (!pokemonData) {
      this.showToast('Pokemon-Daten konnten nicht geladen werden.', 'error');
      return false;
    }
    
    // Zum Team hinzufÃ¼gen
    const normalizedPokemon = this.normalizeTeamPokemon(pokemonData);
    if (!normalizedPokemon) {
      this.showToast('Pokemon-Daten konnten nicht verarbeitet werden.', 'error');
      return false;
    }
    this.team.push(normalizedPokemon);
    this.renderMiniCard(normalizedPokemon);
    this.updateCounters();
    this.updateDropPlaceholder();
    this.saveTeamToStorage();
    this.notifyTeamChanged('offcanvas-drop');
    
    this.showToast(`${normalizedPokemon.name} wurde zum Team hinzugefuegt!`, 'success');
    return true;
  }
  
  renderMiniCard(pokemon) {
    const miniCard = document.createElement('div');
    const primaryType = (pokemon.types && pokemon.types[0]) ? pokemon.types[0].toLowerCase() : 'normal';
    miniCard.className = `mini-pokemon-card new-card type-${primaryType}`;
    miniCard.dataset.pokemonId = pokemon.id;
    
    // Type badges erstellen
    const typeBadges = pokemon.types.map(type => 
      `<span class="type-badge type-${type}">${type}</span>`
    ).join('');
    
    miniCard.innerHTML = `
      <button class="remove-btn" onclick="teamOffcanvas.removePokemonFromTeam('${pokemon.id}')">
        <i class="fas fa-times"></i>
      </button>
      <img src="${pokemon.image}" alt="${pokemon.name}" loading="lazy">
      <div class="pokemon-name">${pokemon.name}</div>
      <div class="pokemon-types">${typeBadges}</div>
    `;
    
    this.cardsContainer.appendChild(miniCard);
    
    // Animation-Klasse nach Animation entfernen
    setTimeout(() => {
      miniCard.classList.remove('new-card');
    }, 500);
  }
  
  removePokemonFromTeam(pokemonId) {
    // UnterstÃ¼tze sowohl String-IDs als auch Objekt-IDs
    const pokemonIndex = this.team.findIndex(p => {
      if (typeof p === 'object' && p.id) {
        return p.id == pokemonId; // Verwende == fÃ¼r flexible Typvergleich
      }
      return p == pokemonId; // Fall fÃ¼r String-Arrays
    });
    // Detail-Logs nur im Debug-Modus
    if (window.POKE_DEBUG) {
      console.debug(`Searching for pokemon ${pokemonId} in team:`, this.team);
      console.debug(`Found at index: ${pokemonIndex}`);
    }
    
    if (pokemonIndex === -1) {
      console.warn(`Pokemon ${pokemonId} not found in team`);
      return false;
    }
    
    const removedPokemon = this.team[pokemonIndex];
    const pokemonName = typeof removedPokemon === 'object' ? removedPokemon.name : `Pokemon #${pokemonId}`;
    this.team.splice(pokemonIndex, 1);
    
    if (window.POKE_DEBUG) {
      console.debug(`Successfully removed ${pokemonName} from team`);
      console.debug(`Team after removal:`, this.team);
    }
    
    const miniCard = this.cardsContainer.querySelector(`[data-pokemon-id="${pokemonId}"]`);
    if (miniCard) {
      miniCard.style.animation = 'fadeInUp 0.3s ease reverse';
      setTimeout(() => {
        miniCard.remove();
      }, 300);
    }
    
    this.updateCounters();
    this.updateDropPlaceholder();
    this.saveTeamToStorage();
    this.notifyTeamChanged('offcanvas-remove');
    
    // Team Modal auch aktualisieren falls es offen ist
    try {
      const teamModal = document.getElementById('teamModal');
      if (teamModal && teamModal.classList.contains('show')) {
  if (window.POKE_DEBUG) console.debug('Team Modal ist offen - aktualisiere Ansicht');
        // ÃœberprÃ¼fe ob die globale Funktion existiert
        if (typeof window.showDetailedTeamView === 'function') {
          window.showDetailedTeamView();
        } else if (typeof showDetailedTeamView === 'function') {
          showDetailedTeamView();
        }
      }
      
      // Normale Team-Ãœbersicht auch aktualisieren
      if (typeof window.renderTeamOverview === 'function') {
        window.renderTeamOverview();
      } else if (typeof renderTeamOverview === 'function') {
        renderTeamOverview();
      }
    } catch (error) {
      console.warn('Fehler beim Aktualisieren des Team Modals:', error);
    }
    
    this.showToast(`${pokemonName} wurde aus dem Team entfernt.`, 'info');
    return true; // Erfolgreiches Entfernen bestÃ¤tigen
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
  
  updateCounters() {
    const count = this.team.length;
    
    // Team Counter (Offcanvas)
    if (this.teamCounter) {
      this.teamCounter.textContent = `${count}/6`;
      this.teamCounter.classList.toggle('full', count >= this.maxTeamSize);
    }
    
    // Pokedex Counter (Button)
    if (this.pokedexCounter) {
      this.pokedexCounter.textContent = count;
    }
    // Offcanvas Pokedex Counter
    if (this.pokedexCounterOffcanvas) {
      this.pokedexCounterOffcanvas.textContent = count;
    }
  }
  
  updateDropPlaceholder() {
    const placeholder = this.dropZone?.querySelector('.drop-placeholder');
    if (placeholder) {
      placeholder.style.display = this.team.length > 0 ? 'none' : 'block';
    }
  }
  
  isPokemonInTeam(pokemonId) {
    const numericId = Number(pokemonId);
    return this.team.some(p => Number(p.id) === numericId);
  }
  
  getPokemonData(pokemonId) {
    // Versuche Pokemon-Daten aus verschiedenen Quellen zu holen
    let pokemonCard = document.querySelector(`[data-pokemon-id="${pokemonId}"]`);
    if (!pokemonCard) {
      pokemonCard = document.querySelector(`[data-id="${pokemonId}"]`);
    }
    
    if (!pokemonCard) {
      console.warn('Pokemon card not found for ID:', pokemonId);
      return null;
    }
    
    // Name extrahieren
    const nameElement = pokemonCard.querySelector('.pokemon-name, .card-title');
    const name = nameElement ? nameElement.textContent.trim() : 'Unknown';
    
    // Bild extrahieren
    const imgElement = pokemonCard.querySelector('img');
    const image = imgElement ? imgElement.src : '';
    const sourcePokemon = this.findPokemonSourceById(pokemonId);
    
  // Typen extrahieren (bewusst restriktiv: kein generisches [class*="type-"] mehr,
  // da dies auch Elemente wie power-level Container mit type-${primaryType} greifen kann
  // und dadurch zusammengesetzte Texte (cp level / ivs) als Typ fÃ¤lschlich erscheinen kÃ¶nnten)
  const typeElements = pokemonCard.querySelectorAll('.type-badge, .detail-type-badge, .type-badge-inline');
    const VALID_TYPES = new Set([
      'normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'
    ]);
    const types = Array.from(typeElements)
      .map(t => (t.textContent||'').trim().toLowerCase())
      .map(t => t.replace(/[^a-z]/g,'')) // harte SÃ¤uberung (entfernt Zahlen/Prozent)
      .filter(t => VALID_TYPES.has(t));
    
    return {
      id: Number(pokemonId),
      name: name,
      image: image,
      spriteUrl: image,
      types: (window.sanitizeTypes ? window.sanitizeTypes(types) : (types.length > 0 ? types : ['normal'])),
      stats: Array.isArray(sourcePokemon?.stats) ? sourcePokemon.stats : [],
      base_experience: Number(sourcePokemon?.base_experience || 0),
    };
  }

  findPokemonSourceById(pokemonId) {
    const numericId = Number(pokemonId);
    if (!numericId) return null;

    const pools = [];
    if (typeof appState !== 'undefined') {
      if (Array.isArray(appState.pokemonList)) pools.push(appState.pokemonList);
      if (Array.isArray(appState.allPokemonList)) pools.push(appState.allPokemonList);
    }
    if (window.appState) {
      if (Array.isArray(window.appState.pokemonList)) pools.push(window.appState.pokemonList);
      if (Array.isArray(window.appState.allPokemonList)) pools.push(window.appState.allPokemonList);
    }

    for (const pool of pools) {
      const found = pool.find((pokemon) => Number(pokemon.id) === numericId);
      if (found) return found;
    }

    if (window.services?.pokemon?.getPokemonById) {
      try {
        return window.services.pokemon.getPokemonById(numericId) || null;
      } catch (error) {
        console.warn('Could not resolve pokemon source data:', error);
      }
    }

    return null;
  }

  normalizeTeamPokemon(pokemon) {
    if (!pokemon) return null;

    const normalizedId = Number(pokemon.id);
    if (!normalizedId) return null;

    const sourcePokemon = this.findPokemonSourceById(normalizedId);
    const sourceTypes = Array.isArray(sourcePokemon?.types) ? sourcePokemon.types : [];
    const rawTypes = Array.isArray(pokemon.types) && pokemon.types.length
      ? pokemon.types
      : sourceTypes;
    const safeTypes = window.sanitizeTypes
      ? window.sanitizeTypes(rawTypes)
      : (rawTypes.length ? rawTypes : ['normal']);

    return {
      ...pokemon,
      id: normalizedId,
      image: pokemon.image || pokemon.spriteUrl || sourcePokemon?.image || sourcePokemon?.spriteUrl || '',
      spriteUrl: pokemon.spriteUrl || pokemon.image || sourcePokemon?.spriteUrl || sourcePokemon?.image || '',
      types: safeTypes,
      stats: Array.isArray(pokemon.stats) && pokemon.stats.length
        ? pokemon.stats
        : (Array.isArray(sourcePokemon?.stats) ? sourcePokemon.stats : []),
      base_experience: Number(
        Number.isFinite(Number(pokemon.base_experience))
          ? Number(pokemon.base_experience)
          : Number(sourcePokemon?.base_experience || 0)
      ),
    };
  }
  
  getTeam() {
    return this.team
      .map((pokemon) => this.normalizeTeamPokemon(pokemon))
      .filter(Boolean);
  }
  
  getTeamSize() {
    return this.team.length;
  }
  
  isTeamFull() {
    return this.team.length >= this.maxTeamSize;
  }
  
  // Local Storage Funktionen
  saveTeamToStorage() {
    try {
      localStorage.setItem('pokemonTeam', JSON.stringify(this.team));
    } catch (e) {
      console.warn('Could not save team to localStorage:', e);
    }
  }
  
  loadTeamFromStorage() {
    try {
      const savedTeam = localStorage.getItem('pokemonTeam');
      if (savedTeam) {
        const parsed = JSON.parse(savedTeam);
        this.team = Array.isArray(parsed)
          ? parsed.map((pokemon) => this.normalizeTeamPokemon(pokemon)).filter(Boolean)
          : [];
        this.renderAllMiniCards();
        this.updateCounters();
        this.updateDropPlaceholder();
        this.notifyTeamChanged('offcanvas-storage-load');
      }
    } catch (e) {
      console.warn('Could not load team from localStorage:', e);
      this.team = [];
    }
  }

  notifyTeamChanged(source = 'offcanvas') {
    window.dispatchEvent(
      new CustomEvent('pokemon-team-updated', {
        detail: {
          source,
          team: this.getTeam(),
        },
      })
    );
  }

  syncExternalTeam(team, source = 'external-sync') {
    if (!Array.isArray(team)) return;

    this.team = team.slice(0, this.maxTeamSize).map((pokemon) => {
      const safeTypes = window.sanitizeTypes
        ? window.sanitizeTypes(pokemon.types)
        : (Array.isArray(pokemon.types) && pokemon.types.length
            ? pokemon.types
            : ['normal']);

      return this.normalizeTeamPokemon({
        ...pokemon,
        types: safeTypes,
      });
    }).filter(Boolean);

    this.renderAllMiniCards();
    this.updateCounters();
    this.updateDropPlaceholder();
    this.saveTeamToStorage();
    this.notifyTeamChanged(source);
  }
  
  renderAllMiniCards() {
    this.cardsContainer.innerHTML = '';
    this.team.forEach(pokemon => {
      this.renderMiniCard(pokemon);
    });
  }
  
  // Toast-Benachrichtigungen
  showToast(message, type = 'info') {
    // ÃœberprÃ¼fe ob Bootstrap Toast verfÃ¼gbar ist
    if (typeof bootstrap === 'undefined') {
      if (type === 'error') {
        console.error(`${type.toUpperCase()}: ${message}`);
      } else if (type === 'warning') {
        console.warn(`${type.toUpperCase()}: ${message}`);
      } else if (window.POKE_DEBUG) {
        console.debug(`${type.toUpperCase()}: ${message}`);
      }
      return;
    }
    
    // Erstelle Toast Container falls nicht vorhanden
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Toast Element erstellen
    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type}`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
      <div class="toast-header">
        <strong class="me-auto">
          ${type === 'success' ? 'âœ…' : type === 'warning' ? 'âš ï¸' : type === 'error' ? 'âŒ' : 'â„¹ï¸'} 
          Pokemon Team
        </strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    `;
    
    toastContainer.appendChild(toastEl);
    
    // Toast anzeigen
    const toast = new bootstrap.Toast(toastEl, {
      autohide: true,
      delay: type === 'error' ? 5000 : 3000
    });
    
    toast.show();
    
    // Toast nach dem Ausblenden entfernen
    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  }
}

// Globale Instanz erstellen (nach DOM geladen)
let teamOffcanvas;

document.addEventListener('DOMContentLoaded', () => {
  teamOffcanvas = new TeamOffcanvas();
  
  // Global verfÃ¼gbar machen fÃ¼r onclick Handler
  window.teamOffcanvas = teamOffcanvas;
});

// FÃ¼r den Fall, dass das Skript nach DOM-Load eingebunden wird
if (document.readyState === 'loading') {
  // Do nothing, DOMContentLoaded will fire
} else {
  // DOM is already loaded
  if (!teamOffcanvas) {
    teamOffcanvas = new TeamOffcanvas();
    window.teamOffcanvas = teamOffcanvas;
  }
}


