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

    if (typeof bootstrap === 'undefined') {
      console.warn('[Compare] Bootstrap not loaded yet, retrying...');
      setTimeout(() => this.init(), 500);
      return;
    }

    this.createCompareModal();
    this.setupEventListeners();
    this.initialized = true;
  }

  createCompareModal() {
    this.compareModal = createBootstrapModal("compareModal", '<span class="vs-icon">VS</span> Pokemon Comparison', {
      modalClass: "compare-modal",
    });
    this.modalElement = document.getElementById("compareModal");
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      const compareBtn = e.target.closest('.compare-btn');
      if (compareBtn) {
        e.preventDefault();
        e.stopPropagation();
        const pokemonId = parseInt(compareBtn.dataset.pokemonId);
        this.handleCompareButtonClick(pokemonId);
      }
    });

    if (this.modalElement) {
      this.modalElement.addEventListener('hidden.bs.modal', () => {
        this.exitSelectionMode();
      });
    }
  }

  handleCompareButtonClick(pokemonId) {
    if (!this.initialized) {
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
    if (this.selectedPokemon.some(p => p.id === pokemonId)) {
      this.removePokemonFromComparison(pokemonId);
      return;
    }

    if (this.selectedPokemon.length >= this.maxSelection) {
      this.showMaxSelectionWarning();
      return;
    }

    const pokemon = this.findPokemonById(pokemonId);
    if (!pokemon) return;

    this.selectedPokemon.push(pokemon);
    this.markCardAsSelected(pokemonId);
    this.updateSelectionIndicator();

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
    if (window.appState?.pokemonList?.length > 0) {
      const found = window.appState.pokemonList.find(p => p.id === pokemonId);
      if (found) return found;
    }

    if (window.appState?.allPokemonList?.length > 0) {
      const found = window.appState.allPokemonList.find(p => p.id === pokemonId);
      if (found) return found;
    }

    if (window.teamOffcanvas?.team?.length > 0) {
      const found = window.teamOffcanvas.team.find(p => p.id === pokemonId);
      if (found) return found;
    }

    const card = document.querySelector(`.pokemon-card[data-pokemon-id="${pokemonId}"]`);
    if (card) {
      const pokemon = this.extractPokemonFromCard(card, pokemonId);
      if (pokemon) return pokemon;
    }

    return null;
  }

  extractPokemonFromCard(card, pokemonId) {
    try {
      const nameElement = card.querySelector('.pokemon-name');
      const imageElement = card.querySelector('.pokemon-image');
      const typeElements = card.querySelectorAll('.type-badge');

      if (!nameElement || !imageElement) return null;

      const types = Array.from(typeElements).map(el => {
        const typeClass = Array.from(el.classList).find(cls => cls.startsWith('type-') && cls !== 'type-badge');
        return typeClass ? typeClass.replace('type-', '') : '';
      }).filter(Boolean);

      return {
        id: pokemonId,
        name: nameElement.textContent.trim(),
        image: imageElement.src,
        types: types.length > 0 ? types : ['normal']
      };
    } catch (error) {
      console.error('[Compare] Failed to extract Pokemon from DOM:', error);
      return null;
    }
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

  extractStats(pokemonDetails) {
    if (!pokemonDetails?.stats) return {};
    const stats = {};
    pokemonDetails.stats.forEach(stat => {
      stats[stat.stat.name] = stat.base_stat;
    });
    return stats;
  }

  calculateTypeEffectiveness(pokemon1, pokemon2) {
    return {
      pokemon1ToPokemon2: this.calculateAttackEffectiveness(pokemon1.types, pokemon2.types),
      pokemon2ToPokemon1: this.calculateAttackEffectiveness(pokemon2.types, pokemon1.types)
    };
  }

  calculateAttackEffectiveness(attackTypes, defendTypes) {
    if (!window.PokemonTeamAnalyzerCore?.prototype?.calculateTypeEffectiveness) {
      return 1;
    }

    let maxEffectiveness = 0;
    attackTypes.forEach(attackType => {
      const eff = this.getOffensiveTypeEffectiveness(attackType, defendTypes);
      if (eff > maxEffectiveness) maxEffectiveness = eff;
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

  triggerBattle() {
    if (this.selectedPokemon.length !== 2) return;
    this.compareModal.hide();

    if (window.battleSimulator?.startBattle) {
      setTimeout(() => {
        window.battleSimulator.startBattle(this.selectedPokemon[0], this.selectedPokemon[1]);
      }, 300);
    } else {
      alert('Battle Simulator coming soon!');
    }
  }
}

if (!window.pokemonCompare) {
  window.pokemonCompare = new PokemonCompare();
}
