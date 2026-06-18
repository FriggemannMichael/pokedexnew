BattleSimulator.prototype.fetchPokemonMoves = async function (details) {
  if (!details?.moves || details.moves.length === 0) {
    return this.getDefaultMoves(details);
  }
  try {
    const candidates = this.selectMoveCandidates(details);
    const promises = candidates.map((m) => this.fetchMoveDetails(m.move.url));
    const moves = await Promise.all(promises);
    const valid = moves.filter((m) => m !== null && m.power > 0);
    const selected = this.selectBestMoves(valid, details);
    return selected.length === 0 ? this.getDefaultMoves(details) : selected;
  } catch (error) {
    console.error("[Battle] Error loading moves:", error);
    return this.getDefaultMoves(details);
  }
};

BattleSimulator.prototype.selectMoveCandidates = function (details) {
  const moves = Array.isArray(details.moves) ? details.moves : [];
  const scored = moves
    .map((entry, index) => ({
      entry: this.normalizeMoveEntry(entry),
      index,
      score: this.scoreMoveLearnData(entry),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const unique = [];
  const seen = new Set();
  for (const item of scored) {
    const name = item.entry?.move?.name;
    const url = item.entry?.move?.url;
    if (!name || !url || seen.has(name)) continue;
    seen.add(name);
    unique.push(item.entry);
    if (unique.length >= 32) break;
  }

  return unique.length > 0 ? unique : moves.slice(0, 8);
};

BattleSimulator.prototype.normalizeMoveEntry = function (entry) {
  if (typeof entry === "string") {
    return {
      move: {
        name: entry,
        url: `https://pokeapi.co/api/v2/move/${entry}`,
      },
    };
  }

  return entry;
};

BattleSimulator.prototype.scoreMoveLearnData = function (entry) {
  const details = Array.isArray(entry.version_group_details)
    ? entry.version_group_details
    : [];
  if (details.length === 0) return 0;

  return Math.max(
    ...details.map((detail) => {
      const method = detail.move_learn_method?.name;
      const level = detail.level_learned_at || 0;
      let score = level;
      if (method === "level-up") score += 80;
      if (method === "machine") score += 55;
      if (method === "tutor") score += 45;
      if (method === "egg") score += 25;
      return score;
    })
  );
};

BattleSimulator.prototype.fetchMoveDetails = async function (moveUrl) {
  try {
    const data = await this.fetchFromPokeApi(moveUrl);
    return {
      name: data.name,
      displayName: data.name.replace(/-/g, " ").toUpperCase(),
      power: data.power ?? 0,
      accuracy: data.accuracy || 100,
      type: data.type.name,
      damageClass: data.damage_class.name,
      pp: data.pp || 10,
      priority: data.priority || 0,
      effectChance: data.effect_chance || 0,
      drain: data.meta?.drain || 0,
      healing: data.meta?.healing || 0,
      critRate: data.meta?.crit_rate || 0,
      flinchChance: data.meta?.flinch_chance || 0,
      statChanges: Array.isArray(data.stat_changes) ? data.stat_changes : [],
    };
  } catch (error) {
    console.error("[Battle] Failed to fetch move details:", error);
    return null;
  }
};

BattleSimulator.prototype.selectBestMoves = function (moves, details) {
  const pokemonTypes = this.getPokemonTypesFromDetails(details);
  const stats = this.extractStats(details);
  const ranked = moves
    .map((move) => ({
      move,
      score: this.scoreMoveForPokemon(move, pokemonTypes, stats),
    }))
    .sort((a, b) => b.score - a.score);

  const selected = [];
  const usedTypes = new Set();

  for (const item of ranked) {
    if (selected.length >= 4) break;
    const duplicateType = usedTypes.has(item.move.type);
    if (duplicateType && selected.length >= 2) continue;
    selected.push(item.move);
    usedTypes.add(item.move.type);
  }

  for (const item of ranked) {
    if (selected.length >= 4) break;
    if (!selected.some((move) => move.name === item.move.name)) {
      selected.push(item.move);
    }
  }

  return selected;
};

BattleSimulator.prototype.scoreMoveForPokemon = function (move, pokemonTypes, stats) {
  const accuracy = Math.max(30, move.accuracy || 100) / 100;
  let score = (move.power || 0) * accuracy;

  if (pokemonTypes.includes(move.type)) score += 30;
  if (move.damageClass === "physical" && stats.attack >= stats.specialAttack) {
    score += 12;
  }
  if (move.damageClass === "special" && stats.specialAttack >= stats.attack) {
    score += 12;
  }
  score += Math.max(0, move.priority || 0) * 8;
  score += Math.max(0, move.critRate || 0) * 4;
  score += Math.max(0, move.drain || 0) * 0.1;
  score += Math.max(0, move.healing || 0) * 0.1;
  score += Math.min(10, Math.max(0, move.effectChance || 0) * 0.1);

  return score;
};

BattleSimulator.prototype.getPokemonTypesFromDetails = function (details) {
  if (!Array.isArray(details?.types)) return ["normal"];
  return details.types
    .map((typeEntry) =>
      typeof typeEntry === "string" ? typeEntry : typeEntry.type?.name
    )
    .filter(Boolean);
};

BattleSimulator.prototype.getDefaultMoves = function (details) {
  const types = this.getPokemonTypesFromDetails(details);
  const primaryType = types[0];
  const defaults = {
    fire: { name: "ember", displayName: "EMBER", power: 40, accuracy: 100, type: "fire", damageClass: "special", pp: 25 },
    water: { name: "water-gun", displayName: "WATER GUN", power: 40, accuracy: 100, type: "water", damageClass: "special", pp: 25 },
    grass: { name: "vine-whip", displayName: "VINE WHIP", power: 45, accuracy: 100, type: "grass", damageClass: "physical", pp: 25 },
    electric: { name: "thunder-shock", displayName: "THUNDER SHOCK", power: 40, accuracy: 100, type: "electric", damageClass: "special", pp: 30 },
    psychic: { name: "confusion", displayName: "CONFUSION", power: 50, accuracy: 100, type: "psychic", damageClass: "special", pp: 25 },
    fighting: { name: "karate-chop", displayName: "KARATE CHOP", power: 50, accuracy: 100, type: "fighting", damageClass: "physical", pp: 25 },
    normal: { name: "tackle", displayName: "TACKLE", power: 40, accuracy: 100, type: "normal", damageClass: "physical", pp: 35 },
  };
  const typeMove = defaults[primaryType] || defaults["normal"];
  const tackle = { name: "tackle", displayName: "TACKLE", power: 40, accuracy: 100, type: "normal", damageClass: "physical", pp: 35 };
  return [typeMove, tackle];
};

BattleSimulator.prototype.startBattle = async function (pokemon1, pokemon2) {
  const [d1, d2] = await Promise.all([
    this.fetchPokemonDetails(pokemon1.id),
    this.fetchPokemonDetails(pokemon2.id),
  ]);
  const [moves1, moves2] = await Promise.all([
    this.fetchPokemonMoves(d1),
    this.fetchPokemonMoves(d2),
  ]);
  const stats1 = this.extractStats(d1);
  const stats2 = this.extractStats(d2);
  this.currentBattle = {
    fighter1: this.prepareFighterState({ ...pokemon1, details: d1, stats: stats1, maxHp: stats1.hp, currentHp: stats1.hp, moves: moves1, level: 50 }),
    fighter2: this.prepareFighterState({ ...pokemon2, details: d2, stats: stats2, maxHp: stats2.hp, currentHp: stats2.hp, moves: moves2, level: 50 }),
    winner: null, isFinished: false,
  };
  await this.preloadTypeRelationsForBattle([
    this.currentBattle.fighter1,
    this.currentBattle.fighter2,
  ]);
  this.battleLog = [];
  this.roundCounter = 0;
  this.isAutoPlaying = false;
  this.pendingCommentaryRequests = 0;
  const accentType = (pokemon1.types && pokemon1.types[0]) || "normal";
  if (this.modalElement) this.modalElement.style.setProperty("--type-accent", `var(--type-${accentType})`);
  this.renderBattle();
  this.battleModal.show();
};

BattleSimulator.prototype.playRound = function () {
  if (this.currentBattle.isFinished) return;
  this.roundCounter++;
  const { fighter1, fighter2 } = this.currentBattle;
  fighter1.flinched = false;
  fighter2.flinched = false;
  const move1 = this.chooseMove(fighter1);
  const move2 = this.chooseMove(fighter2);
  const first = this.compareTurnOrder(fighter1, move1, fighter2, move2) >= 0
    ? { atk: fighter1, def: fighter2, atkId: "fighter1", defId: "fighter2", move: move1 }
    : { atk: fighter2, def: fighter1, atkId: "fighter2", defId: "fighter1", move: move2 };
  const second = first.atkId === "fighter1"
    ? { atk: fighter2, def: fighter1, atkId: "fighter2", defId: "fighter1", move: move2 }
    : { atk: fighter1, def: fighter2, atkId: "fighter1", defId: "fighter2", move: move1 };

  this.executeAttack(first.atk, first.def, first.atkId, first.defId, first.move);
  if (second.atk.currentHp > 0 && first.atk.currentHp > 0) {
    setTimeout(() => {
      if (second.atk.flinched) {
        this.addLog(`${second.atk.name} schreckt zurueck und kann nicht angreifen!`, "flinch");
      } else {
        this.executeAttack(second.atk, second.def, second.atkId, second.defId, second.move);
      }
      setTimeout(() => {
        this.checkWinner();
        this.renderBattle();
        if (this.isAutoPlaying && !this.currentBattle.isFinished) {
          setTimeout(() => this.playRound(), 1500);
        }
      }, 800);
    }, 1000);
  } else {
    setTimeout(() => { this.checkWinner(); this.renderBattle(); }, 800);
  }
  this.renderBattle();
};

BattleSimulator.prototype.chooseMove = function (attacker) {
  if (!attacker.moves || attacker.moves.length === 0) return null;
  return attacker.moves[Math.floor(Math.random() * attacker.moves.length)];
};

BattleSimulator.prototype.compareTurnOrder = function (fighter1, move1, fighter2, move2) {
  const priority1 = move1?.priority || 0;
  const priority2 = move2?.priority || 0;
  if (priority1 !== priority2) return priority1 - priority2;
  return this.getEffectiveStat(fighter1, "speed") - this.getEffectiveStat(fighter2, "speed");
};

BattleSimulator.prototype.executeAttack = function (attacker, defender, attackerId, defenderId, selectedMove = null) {
  if (!attacker.moves || attacker.moves.length === 0) {
    this.addLog(`${attacker.name} hat keine Attacken!`, "error");
    return;
  }
  const move = selectedMove || this.chooseMove(attacker);
  if (!move) return;
  this.addLog(`${attacker.name} setzt ${move.displayName} ein!`, "attack");
  if (Math.random() * 100 > move.accuracy) {
    this.addLog(`Die Attacke von ${attacker.name} verfehlt das Ziel!`, "miss");
    return;
  }
  const result = this.calculateDamage(attacker, defender, move);
  defender.currentHp = Math.max(0, defender.currentHp - result.damage);
  this.addLog(`${defender.name} erleidet ${result.damage} Schaden!`, "damage");
  this.applyMoveAfterEffects(attacker, defender, move, result, attackerId);
  if (result.isCritical) this.addLog("Ein Volltreffer!", "critical");
  if (result.effectiveness > 1) this.addLog("Es ist sehr effektiv!", "effectiveness");
  else if (result.effectiveness < 1 && result.effectiveness > 0) this.addLog("Es ist nicht sehr effektiv...", "effectiveness");
  else if (result.effectiveness === 0) this.addLog("Es hat keine Wirkung auf den Gegner...", "no-effect");
  this.requestDynamicBattleCommentary({ attacker, defender, move, damageResult: result });
  this.showAttackAnimation(attackerId, defenderId, result.damage);
};

BattleSimulator.prototype.applyMoveAfterEffects = function (attacker, defender, move, damageResult, attackerId) {
  this.applyDrainAndHealing(attacker, move, damageResult.damage, attackerId);
  this.applyFlinch(defender, move);
  this.applyStatChanges(attacker, defender, move);
};

BattleSimulator.prototype.applyDrainAndHealing = function (attacker, move, damage, attackerId) {
  if (move.drain > 0 && damage > 0) {
    const healed = this.healFighter(attacker, Math.floor(damage * (move.drain / 100)));
    if (healed > 0) this.addLog(`${attacker.name} regeneriert ${healed} HP!`, "heal");
    if (healed > 0) this.showFighterPopup(attackerId, `+${healed}`, "heal");
  } else if (move.drain < 0 && damage > 0) {
    const recoil = Math.floor(damage * (Math.abs(move.drain) / 100));
    attacker.currentHp = Math.max(0, attacker.currentHp - recoil);
    if (recoil > 0) this.addLog(`${attacker.name} erleidet ${recoil} Rueckstoss-Schaden!`, "recoil");
    if (recoil > 0) this.showFighterPopup(attackerId, `-${recoil}`, "recoil");
  }

  if (move.healing > 0) {
    const healed = this.healFighter(attacker, Math.floor(attacker.maxHp * (move.healing / 100)));
    if (healed > 0) this.addLog(`${attacker.name} heilt ${healed} HP!`, "heal");
    if (healed > 0) this.showFighterPopup(attackerId, `+${healed}`, "heal");
  }
};

BattleSimulator.prototype.healFighter = function (fighter, amount) {
  const before = fighter.currentHp;
  fighter.currentHp = Math.min(fighter.maxHp, fighter.currentHp + Math.max(0, amount));
  return Math.round(fighter.currentHp - before);
};

BattleSimulator.prototype.applyFlinch = function (defender, move) {
  const chance = move.flinchChance || 0;
  if (chance <= 0 || Math.random() * 100 > chance) return;
  defender.flinched = true;
  this.addLog(`${defender.name} schreckt zurueck!`, "flinch");
};

BattleSimulator.prototype.applyStatChanges = function (attacker, defender, move) {
  if (!Array.isArray(move.statChanges) || move.statChanges.length === 0) return;
  const chance = move.effectChance || 100;
  if (Math.random() * 100 > chance) return;

  move.statChanges.forEach((change) => {
    const statName = this.getBattleStatName(change.stat?.name);
    if (!statName || change.change === 0) return;
    const target = change.change > 0 ? attacker : defender;
    this.changeStatStage(target, statName, change.change);
  });
};

BattleSimulator.prototype.changeStatStage = function (fighter, statName, amount) {
  if (!fighter.statStages) this.prepareFighterState(fighter);
  const before = fighter.statStages[statName] || 0;
  const after = Math.max(-6, Math.min(6, before + amount));
  fighter.statStages[statName] = after;
  if (after === before) return;

  const direction = amount > 0 ? "steigt" : "faellt";
  const label = this.getBattleStatLabel(statName);
  this.addLog(`${fighter.name}: ${label} ${direction}!`, "stat-change");
};

BattleSimulator.prototype.getBattleStatLabel = function (statName) {
  const labels = {
    attack: "Angriff",
    defense: "Verteidigung",
    specialAttack: "Spezial-Angriff",
    specialDefense: "Spezial-Verteidigung",
    speed: "Initiative",
  };
  return labels[statName] || statName;
};

BattleSimulator.prototype.requestDynamicBattleCommentary = async function ({ attacker, defender, move, damageResult }) {
  const fallback = this.buildLocalBattleCommentary({ attacker, defender, move, damageResult });
  const ai = window.aiService;
  if (ai && typeof ai.detectProxy === "function") await ai.detectProxy();
  if (!ai?.requestBattleCommentary || !ai?.hasGroqKey?.()) { this.addLog(fallback, "commentary"); return; }
  if (this.pendingCommentaryRequests >= this.maxPendingCommentaryRequests) { this.addLog(fallback, "commentary"); return; }
  this.pendingCommentaryRequests += 1;
  try {
    const comment = await ai.requestBattleCommentary({
      attackerName: attacker.name, moveName: move.displayName || move.name,
      defenderName: defender.name, effectiveness: this.describeEffectiveness(damageResult.effectiveness),
    });
    this.addLog(comment || fallback, "commentary");
  } catch { this.addLog(fallback, "commentary"); }
  finally {
    this.pendingCommentaryRequests = Math.max(0, this.pendingCommentaryRequests - 1);
    if (this.currentBattle) this.renderBattle();
  }
};

BattleSimulator.prototype.buildLocalBattleCommentary = function ({ attacker, defender, move, damageResult }) {
  const name = move.displayName || move.name || "Attack";
  const eff = this.describeEffectiveness(damageResult.effectiveness);
  if (damageResult.isCritical) return `${attacker.name} landet mit ${name} einen brutalen Volltreffer gegen ${defender.name}!`;
  if (damageResult.effectiveness > 1) return `${name} trifft ${defender.name} mit voller Wucht, das war ${eff}!`;
  if (damageResult.effectiveness === 0) return `${attacker.name} feuert ${name} ab, doch ${defender.name} bleibt unbeeindruckt!`;
  if (damageResult.damage <= 12) return `${defender.name} steckt ${name} weg und bleibt kampfbereit!`;
  return `${attacker.name} setzt ${name} ein und zwingt ${defender.name} in die Defensive!`;
};

BattleSimulator.prototype.describeEffectiveness = function (eff) {
  if (eff === 0) return "wirkungslos";
  if (eff > 1) return "sehr effektiv";
  if (eff < 1) return "nicht sehr effektiv";
  return "neutral effektiv";
};

BattleSimulator.prototype.toggleAutoPlay = function () {
  this.isAutoPlaying = !this.isAutoPlaying;
  if (this.isAutoPlaying && !this.currentBattle.isFinished) this.playRound();
  this.renderBattle();
};

BattleSimulator.prototype.resetBattle = function () {
  const { fighter1, fighter2 } = this.currentBattle;
  fighter1.currentHp = fighter1.maxHp;
  fighter2.currentHp = fighter2.maxHp;
  this.prepareFighterState(fighter1);
  this.prepareFighterState(fighter2);
  this.currentBattle.winner = null;
  this.currentBattle.isFinished = false;
  this.battleLog = [];
  this.roundCounter = 0;
  this.isAutoPlaying = false;
  this.pendingCommentaryRequests = 0;
  this.renderBattle();
};
