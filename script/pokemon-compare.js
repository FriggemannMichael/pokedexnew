// Pokemon Compare System
class PokemonCompare {
  constructor() {
    this.selectedPokemon = [];
    this.maxSelection = 2;
    this.compareModal = null;
    this.isSelectionMode = false;
    this.modalElement = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    // Warte bis Bootstrap verfügbar ist
    if (typeof bootstrap === 'undefined') {
      console.warn('[Compare] Bootstrap not loaded yet, retrying...');
      setTimeout(() => this.init(), 500);
      return;
    }

    this.createCompareModal();
    this.setupEventListeners();
    this.initialized = true;
    console.log('[Compare] Pokemon Compare System initialized');
  }

  createCompareModal() {
    // Prüfe ob Modal bereits existiert
    if (document.getElementById('compareModal')) {
      console.log('[Compare] Modal already exists');
      this.modalElement = document.getElementById('compareModal');
      this.compareModal = bootstrap.Modal.getOrCreateInstance(this.modalElement);
      return;
    }

    const modalHTML = `
      <div class="modal fade compare-modal" id="compareModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <span class="vs-icon">VS</span>
                Pokemon Comparison
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="compareModalBody">
              <!-- Content will be dynamically generated -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modalElement = document.getElementById('compareModal');
    this.compareModal = new bootstrap.Modal(this.modalElement);
  }

  setupEventListeners() {
    // Event Delegation für Compare Buttons
    document.addEventListener('click', (e) => {
      const compareBtn = e.target.closest('.compare-btn');
      if (compareBtn) {
        e.preventDefault();
        e.stopPropagation();
        const pokemonId = parseInt(compareBtn.dataset.pokemonId);
        this.handleCompareButtonClick(pokemonId);
      }
    });

    // Modal Close Event
    if (this.modalElement) {
      this.modalElement.addEventListener('hidden.bs.modal', () => {
        this.exitSelectionMode();
      });
    }
  }

  handleCompareButtonClick(pokemonId) {
    console.log('[Compare] Button clicked for Pokemon ID:', pokemonId);

    if (!this.initialized) {
      console.warn('[Compare] System not initialized yet, initializing now...');
      this.init();
      setTimeout(() => this.handleCompareButtonClick(pokemonId), 500);
      return;
    }

    if (!this.isSelectionMode) {
      this.enterSelectionMode(pokemonId);
    } else {
      this.addPokemonToComparison(pokemonId);
    }
  }

  enterSelectionMode(firstPokemonId) {
    console.log('[Compare] Entering selection mode with Pokemon:', firstPokemonId);
    this.isSelectionMode = true;
    this.selectedPokemon = [];
    this.addPokemonToComparison(firstPokemonId);
    this.showSelectionIndicator();
  }

  exitSelectionMode() {
    this.isSelectionMode = false;
    this.selectedPokemon = [];
    this.hideSelectionIndicator();
    this.clearCardSelections();
  }

  addPokemonToComparison(pokemonId) {
    // Prüfen ob bereits ausgewählt
    if (this.selectedPokemon.some(p => p.id === pokemonId)) {
      this.removePokemonFromComparison(pokemonId);
      return;
    }

    // Maximum erreicht?
    if (this.selectedPokemon.length >= this.maxSelection) {
      this.showMaxSelectionWarning();
      return;
    }

    // Pokemon aus App State holen
    const pokemon = this.findPokemonById(pokemonId);
    if (!pokemon) {
      console.warn('[Compare] Pokemon not found:', pokemonId);
      return;
    }

    this.selectedPokemon.push(pokemon);
    this.markCardAsSelected(pokemonId);
    this.updateSelectionIndicator();

    // Wenn 2 Pokemon ausgewählt, direkt vergleichen
    if (this.selectedPokemon.length === this.maxSelection) {
      this.showComparison();
    }
  }

  removePokemonFromComparison(pokemonId) {
    this.selectedPokemon = this.selectedPokemon.filter(p => p.id !== pokemonId);
    this.unmarkCardAsSelected(pokemonId);
    this.updateSelectionIndicator();
  }

  findPokemonById(pokemonId) {
    console.log('[Compare] Searching for Pokemon ID:', pokemonId);

    // 1. Versuche in aktueller pokemonList
    if (window.appState?.pokemonList && window.appState.pokemonList.length > 0) {
      const found = window.appState.pokemonList.find(p => p.id === pokemonId);
      if (found) {
        console.log('[Compare] Found Pokemon in appState.pokemonList:', found.name);
        return found;
      }
    }

    // 2. Versuche in allPokemonList
    if (window.appState?.allPokemonList && window.appState.allPokemonList.length > 0) {
      const found = window.appState.allPokemonList.find(p => p.id === pokemonId);
      if (found) {
        console.log('[Compare] Found Pokemon in appState.allPokemonList:', found.name);
        return found;
      }
    }

    // 3. Versuche im Team
    if (window.teamOffcanvas?.team && window.teamOffcanvas.team.length > 0) {
      const found = window.teamOffcanvas.team.find(p => p.id === pokemonId);
      if (found) {
        console.log('[Compare] Found Pokemon in team:', found.name);
        return found;
      }
    }

    // 4. Fallback: Suche in allen Pokemon Cards im DOM
    const card = document.querySelector(`.pokemon-card[data-pokemon-id="${pokemonId}"]`);
    if (card) {
      console.log('[Compare] Found Pokemon in DOM, extracting data...');
      const pokemon = this.extractPokemonFromCard(card, pokemonId);
      if (pokemon) {
        console.log('[Compare] Extracted Pokemon from DOM:', pokemon.name);
        return pokemon;
      }
    }

    console.warn('[Compare] Pokemon not found in any source');
    return null;
  }

  extractPokemonFromCard(card, pokemonId) {
    try {
      const nameElement = card.querySelector('.pokemon-name');
      const imageElement = card.querySelector('.pokemon-image');
      const typeElements = card.querySelectorAll('.type-badge');

      if (!nameElement || !imageElement) return null;

      const name = nameElement.textContent.trim();
      const image = imageElement.src;
      const types = Array.from(typeElements).map(el => {
        const classList = Array.from(el.classList);
        const typeClass = classList.find(cls => cls.startsWith('type-') && cls !== 'type-badge');
        return typeClass ? typeClass.replace('type-', '') : '';
      }).filter(Boolean);

      return {
        id: pokemonId,
        name: name,
        image: image,
        types: types.length > 0 ? types : ['normal']
      };
    } catch (error) {
      console.error('[Compare] Failed to extract Pokemon from DOM:', error);
      return null;
    }
  }

  async showComparison() {
    if (this.selectedPokemon.length !== 2) {
      console.warn('[Compare] Need exactly 2 Pokemon to compare');
      return;
    }

    const [pokemon1, pokemon2] = this.selectedPokemon;

    // Detaillierte Daten laden
    const [details1, details2] = await Promise.all([
      this.fetchPokemonDetails(pokemon1.id),
      this.fetchPokemonDetails(pokemon2.id)
    ]);

    // Modal Content generieren
    const modalBody = document.getElementById('compareModalBody');
    if (!modalBody) return;

    modalBody.innerHTML = this.generateComparisonHTML(
      { ...pokemon1, details: details1 },
      { ...pokemon2, details: details2 }
    );

    // Modal öffnen
    this.compareModal.show();
  }

  async fetchPokemonDetails(pokemonId) {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
      return await response.json();
    } catch (error) {
      console.error('[Compare] Failed to fetch Pokemon details:', error);
      return null;
    }
  }

  generateComparisonHTML(pokemon1, pokemon2) {
    const stats1 = this.extractStats(pokemon1.details);
    const stats2 = this.extractStats(pokemon2.details);
    const effectiveness = this.calculateTypeEffectiveness(pokemon1, pokemon2);

    return `
      <div class="compare-container">
        <!-- Pokemon 1 -->
        <div class="pokemon-compare-card" style="--type-color-1: var(--type-${pokemon1.types[0]}); --type-color-2: var(--type-${pokemon1.types[1] || pokemon1.types[0]});">
          ${this.generatePokemonCardHTML(pokemon1, stats1)}
        </div>

        <!-- VS Divider -->
        <div class="vs-divider">
          <div class="vs-circle">VS</div>
        </div>

        <!-- Pokemon 2 -->
        <div class="pokemon-compare-card" style="--type-color-1: var(--type-${pokemon2.types[0]}); --type-color-2: var(--type-${pokemon2.types[1] || pokemon2.types[0]});">
          ${this.generatePokemonCardHTML(pokemon2, stats2)}
        </div>
      </div>

      <!-- Stats Comparison -->
      <div class="compare-stats-section">
        <h3 class="compare-section-title">Base Stats Comparison</h3>
        ${this.generateStatsComparisonHTML(stats1, stats2)}
      </div>

      <!-- Type Effectiveness -->
      <div class="type-effectiveness-section">
        <h3 class="compare-section-title">Type Effectiveness</h3>
        ${this.generateEffectivenessHTML(pokemon1, pokemon2, effectiveness)}
      </div>

      <!-- Battle Button -->
      <button class="battle-trigger-btn" onclick="window.pokemonCompare.triggerBattle()">
        ⚔️ Start Battle Simulation
      </button>
    `;
  }

  generatePokemonCardHTML(pokemon, stats) {
    const typesBadges = pokemon.types.map(type =>
      `<span class="type-badge type-${type}">${type.toUpperCase()}</span>`
    ).join('');

    return `
      <div class="compare-card-header">
        <img src="${pokemon.image}" alt="${pokemon.name}" class="compare-pokemon-image" loading="lazy">
        <h3 class="compare-pokemon-name">${pokemon.name}</h3>
        <p class="compare-pokemon-number">#${pokemon.id.toString().padStart(3, '0')}</p>
        <div class="compare-types">${typesBadges}</div>
      </div>
    `;
  }

  generateStatsComparisonHTML(stats1, stats2) {
    const statNames = ['HP', 'Attack', 'Defense', 'Sp. Attack', 'Sp. Defense', 'Speed'];
    const statKeys = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

    return statKeys.map((key, index) => {
      const value1 = stats1[key] || 0;
      const value2 = stats2[key] || 0;

      const class1 = value1 > value2 ? 'winner' : (value1 === value2 ? 'tie' : 'loser');
      const class2 = value2 > value1 ? 'winner' : (value2 === value1 ? 'tie' : 'loser');

      return `
        <div class="stat-compare-row">
          <div class="stat-value ${class1}">${value1}</div>
          <div class="stat-name">${statNames[index]}</div>
          <div class="stat-value ${class2}">${value2}</div>
        </div>
      `;
    }).join('');
  }

  generateEffectivenessHTML(pokemon1, pokemon2, effectiveness) {
    return `
      <div class="effectiveness-grid">
        <div class="effectiveness-card">
          <div class="effectiveness-label">${pokemon1.name} attacks ${pokemon2.name}</div>
          <div class="effectiveness-pokemon-name">${pokemon1.name}</div>
          <div class="effectiveness-value ${this.getEffectivenessClass(effectiveness.pokemon1ToPokemon2)}">
            ${effectiveness.pokemon1ToPokemon2}x
          </div>
          <div class="effectiveness-text">${this.getEffectivenessText(effectiveness.pokemon1ToPokemon2)}</div>
        </div>

        <div class="effectiveness-card">
          <div class="effectiveness-label">${pokemon2.name} attacks ${pokemon1.name}</div>
          <div class="effectiveness-pokemon-name">${pokemon2.name}</div>
          <div class="effectiveness-value ${this.getEffectivenessClass(effectiveness.pokemon2ToPokemon1)}">
            ${effectiveness.pokemon2ToPokemon1}x
          </div>
          <div class="effectiveness-text">${this.getEffectivenessText(effectiveness.pokemon2ToPokemon1)}</div>
        </div>
      </div>
    `;
  }

  extractStats(pokemonDetails) {
    if (!pokemonDetails?.stats) return {};

    const stats = {};
    pokemonDetails.stats.forEach(stat => {
      stats[stat.stat.name] = stat.base_stat;
    });
    return stats;
  }

  calculateTypeEffectiveness(pokemon1, pokemon2) {
    const eff1to2 = this.calculateAttackEffectiveness(pokemon1.types, pokemon2.types);
    const eff2to1 = this.calculateAttackEffectiveness(pokemon2.types, pokemon1.types);

    return {
      pokemon1ToPokemon2: eff1to2,
      pokemon2ToPokemon1: eff2to1
    };
  }

  calculateAttackEffectiveness(attackTypes, defendTypes) {
    // Nutze die Type Chart Logik aus team-analyzer
    if (!window.PokemonTeamAnalyzerCore?.prototype?.calculateTypeEffectiveness) {
      return 1; // Fallback
    }

    let maxEffectiveness = 0;
    attackTypes.forEach(attackType => {
      const eff = this.getOffensiveTypeEffectiveness(attackType, defendTypes);
      if (eff > maxEffectiveness) {
        maxEffectiveness = eff;
      }
    });

    return maxEffectiveness;
  }

  getOffensiveTypeEffectiveness(attackType, defendTypes) {
    let effectiveness = 1;

    const typeChart = this.getSimplifiedTypeChart();
    const attackData = typeChart[attackType];

    if (!attackData) return effectiveness;

    defendTypes.forEach(defendType => {
      if (attackData.superEffective?.includes(defendType)) {
        effectiveness *= 2;
      } else if (attackData.notVeryEffective?.includes(defendType)) {
        effectiveness *= 0.5;
      } else if (attackData.noEffect?.includes(defendType)) {
        effectiveness = 0;
      }
    });

    return effectiveness;
  }

  getSimplifiedTypeChart() {
    return {
      fire: { superEffective: ['grass', 'ice', 'bug', 'steel'], notVeryEffective: ['fire', 'water', 'rock', 'dragon'] },
      water: { superEffective: ['fire', 'ground', 'rock'], notVeryEffective: ['water', 'grass', 'dragon'] },
      grass: { superEffective: ['water', 'ground', 'rock'], notVeryEffective: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'] },
      electric: { superEffective: ['water', 'flying'], notVeryEffective: ['grass', 'electric', 'dragon'], noEffect: ['ground'] },
      psychic: { superEffective: ['fighting', 'poison'], notVeryEffective: ['psychic', 'steel'], noEffect: ['dark'] },
      ice: { superEffective: ['grass', 'ground', 'flying', 'dragon'], notVeryEffective: ['fire', 'water', 'ice', 'steel'] },
      dragon: { superEffective: ['dragon'], notVeryEffective: ['steel'], noEffect: ['fairy'] },
      fighting: { superEffective: ['normal', 'ice', 'rock', 'dark', 'steel'], notVeryEffective: ['poison', 'flying', 'psychic', 'bug', 'fairy'], noEffect: ['ghost'] },
      poison: { superEffective: ['grass', 'fairy'], notVeryEffective: ['poison', 'ground', 'rock', 'ghost'], noEffect: ['steel'] },
      ground: { superEffective: ['fire', 'electric', 'poison', 'rock', 'steel'], notVeryEffective: ['grass', 'bug'], noEffect: ['flying'] },
      flying: { superEffective: ['grass', 'fighting', 'bug'], notVeryEffective: ['electric', 'rock', 'steel'] },
      bug: { superEffective: ['grass', 'psychic', 'dark'], notVeryEffective: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'] },
      rock: { superEffective: ['fire', 'ice', 'flying', 'bug'], notVeryEffective: ['fighting', 'ground', 'steel'] },
      ghost: { superEffective: ['psychic', 'ghost'], notVeryEffective: ['dark'], noEffect: ['normal'] },
      steel: { superEffective: ['ice', 'rock', 'fairy'], notVeryEffective: ['fire', 'water', 'electric', 'steel'] },
      dark: { superEffective: ['psychic', 'ghost'], notVeryEffective: ['fighting', 'dark', 'fairy'] },
      fairy: { superEffective: ['fighting', 'dragon', 'dark'], notVeryEffective: ['fire', 'poison', 'steel'] },
      normal: { notVeryEffective: ['rock', 'steel'], noEffect: ['ghost'] }
    };
  }

  getEffectivenessClass(value) {
    if (value === 0) return 'immune';
    if (value >= 2) return 'super-effective';
    if (value === 1) return 'effective';
    return 'not-effective';
  }

  getEffectivenessText(value) {
    if (value === 0) return 'No Effect';
    if (value >= 4) return 'Extremely Effective';
    if (value >= 2) return 'Super Effective';
    if (value === 1) return 'Normal Damage';
    if (value >= 0.5) return 'Not Very Effective';
    return 'Barely Effective';
  }

  showSelectionIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'compareSelectionIndicator';
    indicator.className = 'compare-select-mode';
    indicator.innerHTML = `
      <span>Select Pokemon to Compare</span>
      <span class="compare-count">0/${this.maxSelection}</span>
      <button onclick="window.pokemonCompare.exitSelectionMode()" style="background: rgba(255,255,255,0.3); border: none; padding: 0.3rem 0.8rem; border-radius: 20px; color: white; cursor: pointer;">Cancel</button>
    `;
    document.body.appendChild(indicator);
  }

  hideSelectionIndicator() {
    const indicator = document.getElementById('compareSelectionIndicator');
    if (indicator) indicator.remove();
  }

  updateSelectionIndicator() {
    const countElement = document.querySelector('.compare-select-mode .compare-count');
    if (countElement) {
      countElement.textContent = `${this.selectedPokemon.length}/${this.maxSelection}`;
    }
  }

  markCardAsSelected(pokemonId) {
    const card = document.querySelector(`.pokemon-card[data-pokemon-id="${pokemonId}"]`);
    if (card) card.classList.add('compare-selected-card');
  }

  unmarkCardAsSelected(pokemonId) {
    const card = document.querySelector(`.pokemon-card[data-pokemon-id="${pokemonId}"]`);
    if (card) card.classList.remove('compare-selected-card');
  }

  clearCardSelections() {
    document.querySelectorAll('.compare-selected-card').forEach(card => {
      card.classList.remove('compare-selected-card');
    });
  }

  showMaxSelectionWarning() {
    alert('You can only compare 2 Pokemon at a time. Please deselect one first.');
  }

  triggerBattle() {
    if (this.selectedPokemon.length !== 2) return;

    // Schließe Compare Modal
    this.compareModal.hide();

    // Trigger Battle Simulator (wird in Feature 2 implementiert)
    if (window.battleSimulator?.startBattle) {
      setTimeout(() => {
        window.battleSimulator.startBattle(this.selectedPokemon[0], this.selectedPokemon[1]);
      }, 300);
    } else {
      console.log('[Compare] Battle Simulator not yet implemented');
      alert('Battle Simulator coming soon in Feature 2! 🎮');
    }
  }
}

// Globale Instanz erstellen (wird von main.js initialisiert)
if (!window.pokemonCompare) {
  window.pokemonCompare = new PokemonCompare();
}

console.log('[Compare] Pokemon Compare Module loaded');
