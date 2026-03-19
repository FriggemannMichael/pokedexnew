BattleSimulator.prototype.fetchPokemonMoves = async function (details) {
  if (!details?.moves || details.moves.length === 0) {
    return this.getDefaultMoves(details);
  }
  try {
    const promises = details.moves.slice(0, 4).map((m) => this.fetchMoveDetails(m.move.url));
    const moves = await Promise.all(promises);
    const valid = moves.filter((m) => m !== null && m.power > 0);
    return valid.length === 0 ? this.getDefaultMoves(details) : valid;
  } catch (error) {
    console.error("[Battle] Error loading moves:", error);
    return this.getDefaultMoves(details);
  }
};

BattleSimulator.prototype.fetchMoveDetails = async function (moveUrl) {
  try {
    const resp = await fetch(moveUrl);
    const data = await resp.json();
    return {
      name: data.name,
      displayName: data.name.replace(/-/g, " ").toUpperCase(),
      power: data.power || 40,
      accuracy: data.accuracy || 100,
      type: data.type.name,
      damageClass: data.damage_class.name,
      pp: data.pp || 10,
    };
  } catch (error) {
    console.error("[Battle] Failed to fetch move details:", error);
    return null;
  }
};

BattleSimulator.prototype.getDefaultMoves = function (details) {
  const types = details?.types?.map((t) => t.type.name) || ["normal"];
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
    fighter1: { ...pokemon1, details: d1, stats: stats1, maxHp: stats1.hp, currentHp: stats1.hp, moves: moves1, level: 50 },
    fighter2: { ...pokemon2, details: d2, stats: stats2, maxHp: stats2.hp, currentHp: stats2.hp, moves: moves2, level: 50 },
    winner: null, isFinished: false,
  };
  this.battleLog = [];
  this.roundCounter = 0;
  this.isAutoPlaying = false;
  this.pendingCommentaryRequests = 0;
  this.renderBattle();
  this.battleModal.show();
};

BattleSimulator.prototype.playRound = function () {
  if (this.currentBattle.isFinished) return;
  this.roundCounter++;
  const { fighter1, fighter2 } = this.currentBattle;
  const first = fighter1.stats.speed >= fighter2.stats.speed
    ? { atk: fighter1, def: fighter2, atkId: "fighter1", defId: "fighter2" }
    : { atk: fighter2, def: fighter1, atkId: "fighter2", defId: "fighter1" };
  const second = first.atkId === "fighter1"
    ? { atk: fighter2, def: fighter1, atkId: "fighter2", defId: "fighter1" }
    : { atk: fighter1, def: fighter2, atkId: "fighter1", defId: "fighter2" };

  this.executeAttack(first.atk, first.def, first.atkId, first.defId);
  if (second.atk.currentHp > 0) {
    setTimeout(() => {
      this.executeAttack(second.atk, second.def, second.atkId, second.defId);
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

BattleSimulator.prototype.executeAttack = function (attacker, defender, attackerId, defenderId) {
  if (!attacker.moves || attacker.moves.length === 0) {
    this.addLog(`${attacker.name} hat keine Attacken!`, "error");
    return;
  }
  const move = attacker.moves[Math.floor(Math.random() * attacker.moves.length)];
  this.addLog(`${attacker.name} setzt ${move.displayName} ein!`, "attack");
  if (Math.random() * 100 > move.accuracy) {
    this.addLog(`Die Attacke von ${attacker.name} verfehlt das Ziel!`, "miss");
    return;
  }
  const result = this.calculateDamage(attacker, defender, move);
  defender.currentHp = Math.max(0, defender.currentHp - result.damage);
  this.addLog(`${defender.name} erleidet ${result.damage} Schaden!`, "damage");
  if (result.isCritical) this.addLog("Ein Volltreffer!", "critical");
  if (result.effectiveness > 1) this.addLog("Es ist sehr effektiv!", "effectiveness");
  else if (result.effectiveness < 1 && result.effectiveness > 0) this.addLog("Es ist nicht sehr effektiv...", "effectiveness");
  else if (result.effectiveness === 0) this.addLog("Es hat keine Wirkung auf den Gegner...", "no-effect");
  this.requestDynamicBattleCommentary({ attacker, defender, move, damageResult: result });
  this.showAttackAnimation(attackerId, defenderId, result.damage);
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
  this.currentBattle.winner = null;
  this.currentBattle.isFinished = false;
  this.battleLog = [];
  this.roundCounter = 0;
  this.isAutoPlaying = false;
  this.pendingCommentaryRequests = 0;
  this.renderBattle();
};
