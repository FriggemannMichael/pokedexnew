class BattleSimulator {
  constructor() {
    this.battleModal = null;
    this.modalElement = null;
    this.initialized = false;
    this.currentBattle = null;
    this.battleLog = [];
    this.roundCounter = 0;
    this.isAutoPlaying = false;
    this.pendingCommentaryRequests = 0;
    this.maxPendingCommentaryRequests = 2;
    this.typeRelationsCache = new Map();
  }

  init() {
    if (this.initialized) return;
    if (typeof bootstrap === "undefined") {
      setTimeout(() => this.init(), 500);
      return;
    }
    this.createBattleModal();
    this.initialized = true;
  }

  createBattleModal() {
    this.battleModal = createBootstrapModal("battleModal", "Pokemon Battle", {
      modalClass: "battle-modal glass-modal",
      icon: "⚔️",
    });
    this.modalElement = document.getElementById("battleModal");
  }

  async fetchPokemonDetails(pokemonId) {
    try {
      const resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
      return await resp.json();
    } catch (error) {
      console.error("[Battle] Failed to fetch Pokemon details:", error);
      return null;
    }
  }

  async fetchFromPokeApi(endpoint) {
    if (window.apiService?.fetch) {
      return await window.apiService.fetch(endpoint);
    }

    const url = endpoint.startsWith("http")
      ? endpoint
      : `https://pokeapi.co/api/v2${endpoint}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`PokeAPI Error: ${resp.status}`);
    return await resp.json();
  }

  extractStats(details) {
    if (!details?.stats) return { hp: 100, attack: 50, defense: 50, speed: 50, specialAttack: 50, specialDefense: 50 };
    const stats = {};
    details.stats.forEach((s) => {
      const n = s.stat.name;
      if (n === "hp") stats.hp = s.base_stat;
      if (n === "attack") stats.attack = s.base_stat;
      if (n === "defense") stats.defense = s.base_stat;
      if (n === "speed") stats.speed = s.base_stat;
      if (n === "special-attack") stats.specialAttack = s.base_stat;
      if (n === "special-defense") stats.specialDefense = s.base_stat;
    });
    return stats;
  }

  prepareFighterState(fighter) {
    fighter.statStages = {
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
    };
    fighter.flinched = false;
    return fighter;
  }

  getEffectiveStat(fighter, statName) {
    const base = fighter.stats?.[statName] || 1;
    const stage = Math.max(-6, Math.min(6, fighter.statStages?.[statName] || 0));
    const multiplier = stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
    return Math.max(1, base * multiplier);
  }

  getBattleStatName(apiStatName) {
    const map = {
      attack: "attack",
      defense: "defense",
      "special-attack": "specialAttack",
      "special-defense": "specialDefense",
      speed: "speed",
    };
    return map[apiStatName] || null;
  }

  calculateDamage(attacker, defender, move) {
    const level = attacker.level || 50;
    const power = move.power;
    let attackStat, defenseStat;
    if (move.damageClass === "physical") {
      attackStat = this.getEffectiveStat(attacker, "attack");
      defenseStat = this.getEffectiveStat(defender, "defense");
    } else if (move.damageClass === "special") {
      attackStat = this.getEffectiveStat(attacker, "specialAttack");
      defenseStat = this.getEffectiveStat(defender, "specialDefense");
    } else {
      return { damage: 0, effectiveness: 1, isCritical: false, hasStab: false };
    }
    let damage = (((2 * level) / 5 + 2) * power * (attackStat / defenseStat)) / 50 + 2;
    const criticalChance = Math.min(0.5, 0.0625 + (move.critRate || 0) * 0.0625);
    const isCritical = Math.random() < criticalChance;
    if (isCritical) damage *= 1.5;
    const hasStab = attacker.types.includes(move.type);
    if (hasStab) damage *= 1.5;
    const effectiveness = this.getMoveEffectiveness(move.type, defender.types);
    damage *= effectiveness;
    if (effectiveness === 0) {
      return { damage: 0, effectiveness, isCritical, hasStab };
    }
    damage *= 0.85 + Math.random() * 0.15;
    damage = Math.floor(damage);
    return { damage: Math.max(1, damage), effectiveness, isCritical, hasStab };
  }

  getMoveEffectiveness(moveType, defenderTypes) {
    let effectiveness = 1;
    const attackData =
      this.typeRelationsCache.get(moveType) || this.getTypeChart()[moveType];
    if (!attackData) return effectiveness;
    defenderTypes.forEach((dt) => {
      if (attackData.superEffective?.includes(dt)) effectiveness *= 2;
      else if (attackData.notVeryEffective?.includes(dt)) effectiveness *= 0.5;
      else if (attackData.noEffect?.includes(dt)) effectiveness = 0;
    });
    return effectiveness;
  }

  async preloadTypeRelationsForBattle(fighters) {
    const moveTypes = fighters
      .flatMap((fighter) => fighter?.moves || [])
      .map((move) => move.type)
      .filter(Boolean);
    const fallbackTypes = fighters
      .flatMap((fighter) => fighter?.types || [])
      .filter(Boolean);
    const uniqueTypes = [...new Set([...moveTypes, ...fallbackTypes])];

    await Promise.all(uniqueTypes.map((type) => this.ensureTypeRelations(type)));
  }

  async ensureTypeRelations(type) {
    if (!type || this.typeRelationsCache.has(type)) return;

    try {
      const data = await this.fetchFromPokeApi(`/type/${type}`);
      const relations = data.damage_relations || {};
      this.typeRelationsCache.set(type, {
        superEffective: this.mapNamedResources(relations.double_damage_to),
        notVeryEffective: this.mapNamedResources(relations.half_damage_to),
        noEffect: this.mapNamedResources(relations.no_damage_to),
      });
    } catch (error) {
      console.warn(`[Battle] Falling back to local type chart for ${type}`, error);
    }
  }

  mapNamedResources(resources) {
    return Array.isArray(resources) ? resources.map((item) => item.name) : [];
  }

  getTypeChart() {
    return {
      fire: { superEffective: ["grass", "ice", "bug", "steel"], notVeryEffective: ["fire", "water", "rock", "dragon"] },
      water: { superEffective: ["fire", "ground", "rock"], notVeryEffective: ["water", "grass", "dragon"] },
      grass: { superEffective: ["water", "ground", "rock"], notVeryEffective: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"] },
      electric: { superEffective: ["water", "flying"], notVeryEffective: ["grass", "electric", "dragon"], noEffect: ["ground"] },
      psychic: { superEffective: ["fighting", "poison"], notVeryEffective: ["psychic", "steel"], noEffect: ["dark"] },
      ice: { superEffective: ["grass", "ground", "flying", "dragon"], notVeryEffective: ["fire", "water", "ice", "steel"] },
      dragon: { superEffective: ["dragon"], notVeryEffective: ["steel"], noEffect: ["fairy"] },
      fighting: { superEffective: ["normal", "ice", "rock", "dark", "steel"], notVeryEffective: ["poison", "flying", "psychic", "bug", "fairy"], noEffect: ["ghost"] },
      poison: { superEffective: ["grass", "fairy"], notVeryEffective: ["poison", "ground", "rock", "ghost"], noEffect: ["steel"] },
      ground: { superEffective: ["fire", "electric", "poison", "rock", "steel"], notVeryEffective: ["grass", "bug"], noEffect: ["flying"] },
      flying: { superEffective: ["grass", "fighting", "bug"], notVeryEffective: ["electric", "rock", "steel"] },
      bug: { superEffective: ["grass", "psychic", "dark"], notVeryEffective: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"] },
      rock: { superEffective: ["fire", "ice", "flying", "bug"], notVeryEffective: ["fighting", "ground", "steel"] },
      ghost: { superEffective: ["psychic", "ghost"], notVeryEffective: ["dark"], noEffect: ["normal"] },
      steel: { superEffective: ["ice", "rock", "fairy"], notVeryEffective: ["fire", "water", "electric", "steel"] },
      dark: { superEffective: ["psychic", "ghost"], notVeryEffective: ["fighting", "dark", "fairy"] },
      fairy: { superEffective: ["fighting", "dragon", "dark"], notVeryEffective: ["fire", "poison", "steel"] },
      normal: { notVeryEffective: ["rock", "steel"], noEffect: ["ghost"] },
    };
  }

  addLog(message, type = "info") {
    this.battleLog.push({ message, type });
  }

  checkWinner() {
    const { fighter1, fighter2 } = this.currentBattle;
    const f1Down = fighter1.currentHp <= 0;
    const f2Down = fighter2.currentHp <= 0;
    if (f1Down && f2Down) {
      this.currentBattle.winner = "draw";
      this.currentBattle.isFinished = true;
      this.addLog(`🤝 Unentschieden! Beide Pokemon sind kampfunfähig!`, "winner");
      this.isAutoPlaying = false;
    } else if (f1Down) {
      this.currentBattle.winner = "fighter2";
      this.currentBattle.isFinished = true;
      this.addLog(`🏆 ${fighter2.name} gewinnt den Kampf!`, "winner");
      this.isAutoPlaying = false;
    } else if (f2Down) {
      this.currentBattle.winner = "fighter1";
      this.currentBattle.isFinished = true;
      this.addLog(`🏆 ${fighter1.name} gewinnt den Kampf!`, "winner");
      this.isAutoPlaying = false;
    }
  }

  escapeHtml(value) {
    return window.escapeHtml ? window.escapeHtml(value) : String(value || "");
  }
}

if (!window.battleSimulator) {
  window.battleSimulator = new BattleSimulator();
}
