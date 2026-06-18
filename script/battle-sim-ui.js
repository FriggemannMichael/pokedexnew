BattleSimulator.prototype.renderBattle = function () {
  const body = document.getElementById("battleModalBody");
  if (!body) return;
  const { fighter1, fighter2 } = this.currentBattle;
  body.innerHTML = `
    <div class="battle-arena">
      <div class="text-center mb-3"><span class="round-counter">Round ${this.roundCounter}</span></div>
      <div class="battle-fighters">
        ${this.renderFighter(fighter1, "fighter1")}
        ${this.renderFighter(fighter2, "fighter2")}
      </div>
      <div class="battle-log">
        <div class="battle-log-title">Battle Log
          <button class="battle-log-export-btn" onclick="window.battleSimulator.exportBattleLog()" title="Log exportieren">Export</button>
        </div>
        <div id="battleLogEntries">
          ${this.battleLog.length === 0 ? '<p class="text-muted">Battle hasn\'t started yet...</p>' : this.renderBattleLog()}
        </div>
      </div>
      <div class="battle-controls">
        <button class="battle-btn primary" id="nextRoundBtn" onclick="window.battleSimulator.playRound()" ${this.currentBattle.isFinished ? "disabled" : ""}>Next Round</button>
        <button class="battle-btn secondary" id="autoPlayBtn" onclick="window.battleSimulator.toggleAutoPlay()" ${this.currentBattle.isFinished ? "disabled" : ""}>
          ${this.isAutoPlaying ? "Pause" : "Auto Play"}</button>
        <button class="battle-btn danger" onclick="window.battleSimulator.resetBattle()">Reset</button>
      </div>
    </div>
  `;
};

BattleSimulator.prototype.renderFighter = function (fighter, fighterId) {
  const hpPct = (fighter.currentHp / fighter.maxHp) * 100;
  const hpClass = hpPct <= 20 ? "critical" : hpPct <= 50 ? "low" : "";
  const fClass = this.currentBattle.winner === fighterId ? "winner" : fighter.currentHp <= 0 ? "defeated" : "";
  return `
    <div class="battle-fighter ${fClass}" id="${fighterId}">
      <div class="fighter-image-wrapper">
        <img src="${fighter.image}" alt="${fighter.name}" class="fighter-image">
      </div>
      <div class="fighter-name">${fighter.name}</div>
	      <div class="fighter-types">
	        ${fighter.types.map((t) => `<span class="type-badge type-${t}">${t.toUpperCase()}</span>`).join("")}
	      </div>
	      ${this.renderStatStageBadges(fighter)}
	      ${this.renderMoveList(fighter)}
	      <div class="hp-bar-container">
	        <div class="hp-label"><span>HP</span><span class="hp-current">${Math.max(0, Math.round(fighter.currentHp))} / ${fighter.maxHp}</span></div>
	        <div class="hp-bar"><div class="hp-fill ${hpClass}" style="width: ${Math.max(0, hpPct)}%"></div></div>
	      </div>
	    </div>
	  `;
	};

BattleSimulator.prototype.renderStatStageBadges = function (fighter) {
  const stages = fighter.statStages || {};
  const labels = {
    attack: "ATK",
    defense: "DEF",
    specialAttack: "SPA",
    specialDefense: "SPD",
    speed: "SPE",
  };
  const badges = Object.entries(labels)
    .map(([key, label]) => ({ label, value: stages[key] || 0 }))
    .filter((entry) => entry.value !== 0)
    .map((entry) => {
      const sign = entry.value > 0 ? "+" : "";
      const cls = entry.value > 0 ? "buff" : "debuff";
      return `<span class="stat-stage-badge ${cls}">${entry.label} ${sign}${entry.value}</span>`;
    })
    .join("");

  return badges ? `<div class="stat-stage-badges">${badges}</div>` : "";
};

BattleSimulator.prototype.renderMoveList = function (fighter) {
  const moves = Array.isArray(fighter.moves) ? fighter.moves : [];
  if (!moves.length) return "";

  return `
    <div class="fighter-move-list">
      ${moves.map((move) => this.renderMoveChip(move)).join("")}
    </div>
  `;
};

BattleSimulator.prototype.renderMoveChip = function (move) {
  const name = this.escapeHtml(move.displayName || move.name || "MOVE");
  const type = this.escapeHtml(move.type || "normal");
  const power = Number(move.power) > 0 ? move.power : "-";
  const priority = Number(move.priority) > 0 ? `<span class="move-priority">+${move.priority}</span>` : "";
  return `
    <div class="fighter-move-chip type-${type}">
      <span class="move-name">${name}</span>
      <span class="move-meta">${type.toUpperCase()} · ${power}${priority}</span>
    </div>
  `;
};

BattleSimulator.prototype.renderBattleLog = function () {
  return this.battleLog.map((e) => {
    const safe = this.escapeHtml(e.message);
    return `<div class="log-entry ${e.type}">${safe}</div>`;
  }).join("");
};

BattleSimulator.prototype.showAttackAnimation = function (attackerId, defenderId, damage) {
  const atkEl = document.getElementById(attackerId);
  const defEl = document.getElementById(defenderId);
  if (atkEl) {
    atkEl.classList.add("attacking");
    setTimeout(() => atkEl.classList.remove("attacking"), 500);
  }
  if (defEl) {
    defEl.classList.add("hit");
    setTimeout(() => defEl.classList.remove("hit"), 500);
    this.showFighterPopup(defenderId, `-${damage}`, "damage");
  }
};

BattleSimulator.prototype.showFighterPopup = function (fighterId, text, variant = "damage") {
  const fighterEl = document.getElementById(fighterId);
  const wrapper = fighterEl?.querySelector(".fighter-image-wrapper");
  if (!wrapper) return;

  const popup = document.createElement("div");
  popup.className = `damage-popup ${variant}`;
  popup.textContent = text;
  wrapper.appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
};

BattleSimulator.prototype.exportBattleLog = function () {
  const { fighter1, fighter2 } = this.currentBattle || {};
  const data = {
    metadata: {
      exportDate: new Date().toISOString(),
      fighter1: fighter1 ? { id: fighter1.id, name: fighter1.name, types: fighter1.types } : null,
      fighter2: fighter2 ? { id: fighter2.id, name: fighter2.name, types: fighter2.types } : null,
      rounds: this.roundCounter,
      winner: this.currentBattle?.winner || null,
    },
    battleLog: this.battleLog.map((e) => ({ type: e.type, message: e.message })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `battle-log-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
