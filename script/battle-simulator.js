// Battle Simulator System
class BattleSimulator {
  constructor() {
    this.battleModal = null;
    this.modalElement = null;
    this.initialized = false;
    this.currentBattle = null;
    this.battleLog = [];
    this.roundCounter = 0;
    this.isAutoPlaying = false;
  }

  init() {
    if (this.initialized) return;

    if (typeof bootstrap === 'undefined') {
      console.warn('[Battle] Bootstrap not loaded yet, retrying...');
      setTimeout(() => this.init(), 500);
      return;
    }

    this.createBattleModal();
    this.initialized = true;
    console.log('[Battle] Battle Simulator initialized');
  }

  createBattleModal() {
    if (document.getElementById('battleModal')) {
      this.modalElement = document.getElementById('battleModal');
      this.battleModal = bootstrap.Modal.getOrCreateInstance(this.modalElement);
      return;
    }

    const modalHTML = `
      <div class="modal fade battle-modal" id="battleModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <span class="battle-icon">⚔️</span>
                Pokemon Battle
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="battleModalBody">
              <!-- Battle content will be rendered here -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modalElement = document.getElementById('battleModal');
    this.battleModal = new bootstrap.Modal(this.modalElement);
  }

  async startBattle(pokemon1, pokemon2) {
    console.log('[Battle] Starting battle between', pokemon1.name, 'and', pokemon2.name);

    // Detaillierte Stats von PokeAPI laden
    const [details1, details2] = await Promise.all([
      this.fetchPokemonDetails(pokemon1.id),
      this.fetchPokemonDetails(pokemon2.id)
    ]);

    console.log('[Battle] Pokemon details loaded:', details1?.name, details2?.name);

    // Lade Moves für beide Pokemon
    const moves1 = await this.fetchPokemonMoves(details1);
    const moves2 = await this.fetchPokemonMoves(details2);

    console.log('[Battle] Fighter 1 moves:', moves1);
    console.log('[Battle] Fighter 2 moves:', moves2);

    this.currentBattle = {
      fighter1: {
        ...pokemon1,
        details: details1,
        stats: this.extractStats(details1),
        maxHp: this.extractStats(details1).hp,
        currentHp: this.extractStats(details1).hp,
        moves: moves1,
        level: 50 // Standard Battle Level
      },
      fighter2: {
        ...pokemon2,
        details: details2,
        stats: this.extractStats(details2),
        maxHp: this.extractStats(details2).hp,
        currentHp: this.extractStats(details2).hp,
        moves: moves2,
        level: 50 // Standard Battle Level
      },
      winner: null,
      isFinished: false
    };

    console.log('[Battle] Battle initialized with moves:',
      this.currentBattle.fighter1.moves.length,
      this.currentBattle.fighter2.moves.length);

    this.battleLog = [];
    this.roundCounter = 0;
    this.isAutoPlaying = false;

    this.renderBattle();
    this.battleModal.show();
  }

  async fetchPokemonDetails(pokemonId) {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
      return await response.json();
    } catch (error) {
      console.error('[Battle] Failed to fetch Pokemon details:', error);
      return null;
    }
  }

  async fetchPokemonMoves(pokemonDetails) {
    if (!pokemonDetails?.moves || pokemonDetails.moves.length === 0) {
      console.warn('[Battle] No moves found for Pokemon', pokemonDetails?.name);
      return this.getDefaultMoves(pokemonDetails);
    }

    try {
      // Nimm die ersten 4 Moves (wie im echten Pokemon)
      const movePromises = pokemonDetails.moves
        .slice(0, 4)
        .map(m => this.fetchMoveDetails(m.move.url));

      const moves = await Promise.all(movePromises);
      const validMoves = moves.filter(m => m !== null && m.power > 0);

      console.log('[Battle] Loaded moves for', pokemonDetails.name, ':', validMoves.length);

      // Falls keine gültigen Moves geladen wurden, nutze Defaults
      if (validMoves.length === 0) {
        console.warn('[Battle] No valid moves loaded, using defaults');
        return this.getDefaultMoves(pokemonDetails);
      }

      return validMoves;
    } catch (error) {
      console.error('[Battle] Error loading moves:', error);
      return this.getDefaultMoves(pokemonDetails);
    }
  }

  getDefaultMoves(pokemonDetails) {
    // Fallback Moves basierend auf Pokemon-Typ
    const types = pokemonDetails?.types?.map(t => t.type.name) || ['normal'];
    const primaryType = types[0];

    const defaultMovesByType = {
      fire: { name: 'ember', displayName: 'EMBER', power: 40, accuracy: 100, type: 'fire', damageClass: 'special', pp: 25 },
      water: { name: 'water-gun', displayName: 'WATER GUN', power: 40, accuracy: 100, type: 'water', damageClass: 'special', pp: 25 },
      grass: { name: 'vine-whip', displayName: 'VINE WHIP', power: 45, accuracy: 100, type: 'grass', damageClass: 'physical', pp: 25 },
      electric: { name: 'thunder-shock', displayName: 'THUNDER SHOCK', power: 40, accuracy: 100, type: 'electric', damageClass: 'special', pp: 30 },
      psychic: { name: 'confusion', displayName: 'CONFUSION', power: 50, accuracy: 100, type: 'psychic', damageClass: 'special', pp: 25 },
      fighting: { name: 'karate-chop', displayName: 'KARATE CHOP', power: 50, accuracy: 100, type: 'fighting', damageClass: 'physical', pp: 25 },
      normal: { name: 'tackle', displayName: 'TACKLE', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical', pp: 35 }
    };

    const typeMove = defaultMovesByType[primaryType] || defaultMovesByType['normal'];
    const tackle = { name: 'tackle', displayName: 'TACKLE', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical', pp: 35 };

    return [typeMove, tackle];
  }

  async fetchMoveDetails(moveUrl) {
    try {
      const response = await fetch(moveUrl);
      const moveData = await response.json();

      return {
        name: moveData.name,
        displayName: moveData.name.replace(/-/g, ' ').toUpperCase(),
        power: moveData.power || 40, // Default power falls null
        accuracy: moveData.accuracy || 100,
        type: moveData.type.name,
        damageClass: moveData.damage_class.name, // physical, special, status
        pp: moveData.pp || 10
      };
    } catch (error) {
      console.error('[Battle] Failed to fetch move details:', error);
      return null;
    }
  }

  extractStats(pokemonDetails) {
    if (!pokemonDetails?.stats) return { hp: 100, attack: 50, defense: 50, speed: 50, specialAttack: 50, specialDefense: 50 };

    const stats = {};
    pokemonDetails.stats.forEach(stat => {
      const name = stat.stat.name;
      if (name === 'hp') stats.hp = stat.base_stat;
      if (name === 'attack') stats.attack = stat.base_stat;
      if (name === 'defense') stats.defense = stat.base_stat;
      if (name === 'speed') stats.speed = stat.base_stat;
      if (name === 'special-attack') stats.specialAttack = stat.base_stat;
      if (name === 'special-defense') stats.specialDefense = stat.base_stat;
    });

    return stats;
  }

  renderBattle() {
    const modalBody = document.getElementById('battleModalBody');
    if (!modalBody) return;

    const { fighter1, fighter2 } = this.currentBattle;

    modalBody.innerHTML = `
      <div class="battle-arena">
        <div class="text-center mb-3">
          <span class="round-counter">Round ${this.roundCounter}</span>
        </div>

        <div class="battle-fighters">
          ${this.renderFighter(fighter1, 'fighter1')}
          ${this.renderFighter(fighter2, 'fighter2')}
        </div>

        <div class="battle-log">
          <div class="battle-log-title">
            📜 Battle Log
          </div>
          <div id="battleLogEntries">
            ${this.battleLog.length === 0 ? '<p class="text-muted">Battle hasn\'t started yet...</p>' : this.renderBattleLog()}
          </div>
        </div>

        <div class="battle-controls">
          <button class="battle-btn primary" id="nextRoundBtn" onclick="window.battleSimulator.playRound()" ${this.currentBattle.isFinished ? 'disabled' : ''}>
            ⚡ Next Round
          </button>
          <button class="battle-btn secondary" id="autoPlayBtn" onclick="window.battleSimulator.toggleAutoPlay()" ${this.currentBattle.isFinished ? 'disabled' : ''}>
            ${this.isAutoPlaying ? '⏸️ Pause' : '▶️ Auto Play'}
          </button>
          <button class="battle-btn danger" onclick="window.battleSimulator.resetBattle()">
            🔄 Reset
          </button>
        </div>
      </div>
    `;
  }

  renderFighter(fighter, fighterId) {
    const hpPercentage = (fighter.currentHp / fighter.maxHp) * 100;
    const hpClass = hpPercentage <= 20 ? 'critical' : hpPercentage <= 50 ? 'low' : '';
    const fighterClass = this.currentBattle.winner === fighterId ? 'winner' :
                         fighter.currentHp <= 0 ? 'defeated' : '';

    return `
      <div class="battle-fighter ${fighterClass}" id="${fighterId}">
        <div class="fighter-image-wrapper">
          <img src="${fighter.image}" alt="${fighter.name}" class="fighter-image">
        </div>
        <div class="fighter-name">${fighter.name}</div>
        <div class="fighter-types">
          ${fighter.types.map(type => `<span class="type-badge type-${type}">${type.toUpperCase()}</span>`).join('')}
        </div>

        <div class="hp-bar-container">
          <div class="hp-label">
            <span>HP</span>
            <span class="hp-current">${Math.max(0, Math.round(fighter.currentHp))} / ${fighter.maxHp}</span>
          </div>
          <div class="hp-bar">
            <div class="hp-fill ${hpClass}" style="width: ${Math.max(0, hpPercentage)}%"></div>
          </div>
        </div>
      </div>
    `;
  }

  renderBattleLog() {
    return this.battleLog.map(entry => {
      return `<div class="log-entry ${entry.type}">${entry.message}</div>`;
    }).join('');
  }

  playRound() {
    if (this.currentBattle.isFinished) return;

    this.roundCounter++;

    const { fighter1, fighter2 } = this.currentBattle;

    // Bestimme wer zuerst angreift (basierend auf Speed)
    const firstAttacker = fighter1.stats.speed >= fighter2.stats.speed ?
      { attacker: fighter1, defender: fighter2, attackerId: 'fighter1', defenderId: 'fighter2' } :
      { attacker: fighter2, defender: fighter1, attackerId: 'fighter2', defenderId: 'fighter1' };

    const secondAttacker = firstAttacker.attackerId === 'fighter1' ?
      { attacker: fighter2, defender: fighter1, attackerId: 'fighter2', defenderId: 'fighter1' } :
      { attacker: fighter1, defender: fighter2, attackerId: 'fighter1', defenderId: 'fighter2' };

    // Erste Attacke
    this.executeAttack(firstAttacker.attacker, firstAttacker.defender, firstAttacker.attackerId, firstAttacker.defenderId);

    // Zweite Attacke (nur wenn Verteidiger noch lebt)
    if (secondAttacker.defender.currentHp > 0) {
      setTimeout(() => {
        this.executeAttack(secondAttacker.attacker, secondAttacker.defender, secondAttacker.attackerId, secondAttacker.defenderId);

        // Check for winner
        setTimeout(() => {
          this.checkWinner();
          this.renderBattle();

          // Continue auto play if enabled
          if (this.isAutoPlaying && !this.currentBattle.isFinished) {
            setTimeout(() => this.playRound(), 1500);
          }
        }, 800);
      }, 1000);
    } else {
      setTimeout(() => {
        this.checkWinner();
        this.renderBattle();
      }, 800);
    }

    this.renderBattle();
  }

  executeAttack(attacker, defender, attackerId, defenderId) {
    // Wähle eine zufällige Move
    if (!attacker.moves || attacker.moves.length === 0) {
      this.addLog(`${attacker.name} has no moves!`, 'error');
      return;
    }

    const move = attacker.moves[Math.floor(Math.random() * attacker.moves.length)];

    // Battle Log - Move verwendet
    this.addLog(`${attacker.name} uses ${move.displayName}!`, 'attack');

    // Accuracy Check
    const hitChance = Math.random() * 100;
    if (hitChance > move.accuracy) {
      this.addLog(`${attacker.name}'s attack missed!`, 'miss');
      return;
    }

    // Berechne Schaden mit der echten Pokemon-Formel
    const damageResult = this.calculateDamage(attacker, defender, move);

    // HP reduzieren
    defender.currentHp = Math.max(0, defender.currentHp - damageResult.damage);

    // Battle Log
    this.addLog(`${defender.name} takes ${damageResult.damage} damage!`, 'damage');

    // Critical Hit
    if (damageResult.isCritical) {
      this.addLog("A critical hit!", 'critical');
    }

    // Typ-Effektivität anzeigen
    if (damageResult.effectiveness > 1) {
      this.addLog("It's super effective!", 'effectiveness');
    } else if (damageResult.effectiveness < 1 && damageResult.effectiveness > 0) {
      this.addLog("It's not very effective...", 'effectiveness');
    } else if (damageResult.effectiveness === 0) {
      this.addLog("It doesn't affect the opponent...", 'no-effect');
    }

    // STAB Bonus anzeigen (nur im Log für Debugging)
    if (damageResult.hasStab) {
      console.log('[Battle] STAB bonus applied!');
    }

    // Visual Feedback
    this.showAttackAnimation(attackerId, defenderId, damageResult.damage);
  }

  calculateDamage(attacker, defender, move) {
    // Echte Pokemon Damage Formula (Generation V+):
    // Damage = ((((2 * Level / 5) + 2) * Power * A/D) / 50 + 2) * Modifiers

    const level = attacker.level || 50;
    const power = move.power;

    // Bestimme ob Physical oder Special Attack
    let attackStat, defenseStat;
    if (move.damageClass === 'physical') {
      attackStat = attacker.stats.attack;
      defenseStat = defender.stats.defense;
    } else if (move.damageClass === 'special') {
      attackStat = attacker.stats.specialAttack;
      defenseStat = defender.stats.specialDefense;
    } else {
      // Status moves machen keinen Schaden
      return { damage: 0, effectiveness: 1, isCritical: false, hasStab: false };
    }

    // Basis-Schaden Berechnung
    let damage = ((((2 * level / 5) + 2) * power * (attackStat / defenseStat)) / 50) + 2;

    // Critical Hit (6.25% Chance wie in echten Pokemon)
    const isCritical = Math.random() < 0.0625;
    if (isCritical) {
      damage *= 1.5;
    }

    // STAB (Same Type Attack Bonus) - 1.5x wenn Move-Typ gleich Pokemon-Typ
    const hasStab = attacker.types.includes(move.type);
    if (hasStab) {
      damage *= 1.5;
    }

    // Typ-Effektivität (basiert auf Move-Typ, nicht Pokemon-Typ!)
    const effectiveness = this.getMoveEffectiveness(move.type, defender.types);
    damage *= effectiveness;

    // Random Faktor (0.85 - 1.0)
    damage *= (0.85 + Math.random() * 0.15);

    // Runde auf Integer
    damage = Math.floor(damage);

    return {
      damage: Math.max(1, damage),
      effectiveness: effectiveness,
      isCritical: isCritical,
      hasStab: hasStab
    };
  }

  getMoveEffectiveness(moveType, defenderTypes) {
    let effectiveness = 1;

    const typeChart = this.getTypeChart();
    const attackData = typeChart[moveType];

    if (!attackData) return effectiveness;

    defenderTypes.forEach(defenderType => {
      if (attackData.superEffective?.includes(defenderType)) {
        effectiveness *= 2;
      } else if (attackData.notVeryEffective?.includes(defenderType)) {
        effectiveness *= 0.5;
      } else if (attackData.noEffect?.includes(defenderType)) {
        effectiveness = 0;
      }
    });

    return effectiveness;
  }

  getTypeChart() {
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

  showAttackAnimation(attackerId, defenderId, damage) {
    const attackerEl = document.getElementById(attackerId);
    const defenderEl = document.getElementById(defenderId);

    if (attackerEl) {
      attackerEl.classList.add('attacking');
      setTimeout(() => attackerEl.classList.remove('attacking'), 500);
    }

    if (defenderEl) {
      defenderEl.classList.add('hit');
      setTimeout(() => defenderEl.classList.remove('hit'), 500);

      // Damage Popup
      const popup = document.createElement('div');
      popup.className = 'damage-popup';
      popup.textContent = `-${damage}`;
      defenderEl.querySelector('.fighter-image-wrapper').appendChild(popup);
      setTimeout(() => popup.remove(), 1000);
    }
  }

  checkWinner() {
    const { fighter1, fighter2 } = this.currentBattle;

    if (fighter1.currentHp <= 0) {
      this.currentBattle.winner = 'fighter2';
      this.currentBattle.isFinished = true;
      this.addLog(`🏆 ${fighter2.name} wins the battle!`, 'winner');
      this.isAutoPlaying = false;
    } else if (fighter2.currentHp <= 0) {
      this.currentBattle.winner = 'fighter1';
      this.currentBattle.isFinished = true;
      this.addLog(`🏆 ${fighter1.name} wins the battle!`, 'winner');
      this.isAutoPlaying = false;
    }
  }

  toggleAutoPlay() {
    this.isAutoPlaying = !this.isAutoPlaying;

    if (this.isAutoPlaying && !this.currentBattle.isFinished) {
      this.playRound();
    }

    this.renderBattle();
  }

  resetBattle() {
    const { fighter1, fighter2 } = this.currentBattle;

    fighter1.currentHp = fighter1.maxHp;
    fighter2.currentHp = fighter2.maxHp;

    this.currentBattle.winner = null;
    this.currentBattle.isFinished = false;
    this.battleLog = [];
    this.roundCounter = 0;
    this.isAutoPlaying = false;

    this.renderBattle();
  }

  addLog(message, type = 'info') {
    this.battleLog.push({ message, type });
  }
}

// Globale Instanz erstellen
if (!window.battleSimulator) {
  window.battleSimulator = new BattleSimulator();
}

console.log('[Battle] Battle Simulator Module loaded');
