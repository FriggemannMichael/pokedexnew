TeamBattleSystem.prototype.startBattle = function () {
  this.overviewModal.hide();
  this.createArenaModal();
  this.currentPlayerIndex = 0;
  this.currentGymIndex = 0;
  this.totalDamageDealt = 0;
  this.totalTurns = 0;
  this.playerTeam.forEach((p) => { p.currentHp = p.maxHp; p.damageDealt = 0; });
  this.gymTeam.forEach((p) => { p.currentHp = p.maxHp; p.damageDealt = 0; });
  this.renderArena();
  this.arenaModal.show();
  this.requestLeaderDialogue("Der Kampf beginnt jetzt in meiner Arena.");
  this.startNextBattle();
};

TeamBattleSystem.prototype.startNextBattle = function () {
  const playerPokemon = this.playerTeam[this.currentPlayerIndex];
  const gymPokemon = this.gymTeam[this.currentGymIndex];
  this.pendingAutoContinue = false;
  this.updateStatusIcons();

  if (!window.battleSimulator) {
    console.error("[TeamBattle] BattleSimulator not found!");
    return;
  }

  this.patchBattleSimulatorRender(playerPokemon, gymPokemon);
  this.patchBattleSimulatorWinner(playerPokemon, gymPokemon);
  this.startBattleWithMoves(playerPokemon, gymPokemon);
};

TeamBattleSystem.prototype.patchBattleSimulatorRender = function (playerPokemon, gymPokemon) {
  const self = this;
  window.battleSimulator.renderBattle = function () {
    const container = document.getElementById("mainBattleContainer");
    if (!container) return;
    const { fighter1, fighter2 } = this.currentBattle;
    const controlsHtml = self.buildBattleControls(this);

    container.innerHTML = `
      <div class="battle-arena">
        <div class="text-center mb-3"><span class="round-counter">Round ${this.roundCounter}</span></div>
        <div class="battle-fighters">
          ${self.renderBattleFighter(fighter1, "fighter1")}
          ${self.renderBattleFighter(fighter2, "fighter2")}
        </div>
        <div class="battle-log">
          <div class="battle-log-title">Battle Log
            <button class="battle-log-export-btn" onclick="window.teamBattle.exportBattleLog()" title="Log exportieren">Export</button>
          </div>
          <div id="battleLogEntries">
            ${this.battleLog.length === 0 ? '<p class="text-muted">Battle has not started yet...</p>' : this.battleLog.map((e) => `<div class="log-entry ${e.type}">${e.message}</div>`).join("")}
          </div>
        </div>
        <div class="battle-controls">${controlsHtml}</div>
      </div>
    `;
  };
};

TeamBattleSystem.prototype.buildBattleControls = function (sim) {
  const finished = sim.currentBattle.isFinished;
  if (this.aiAutoPilotEnabled) {
    return `<button class="battle-btn secondary" id="autoPlayBtn" onclick="window.battleSimulator.toggleAutoPlay()" ${finished ? "disabled" : ""}>
      ${sim.isAutoPlaying ? "Pause AI" : "Resume AI"}</button>`;
  }
  let html = `
    <button class="battle-btn primary" id="nextRoundBtn" onclick="window.battleSimulator.playRound()" ${finished ? "disabled" : ""}>Next Round</button>
    <button class="battle-btn secondary" id="autoPlayBtn" onclick="window.battleSimulator.toggleAutoPlay()" ${finished ? "disabled" : ""}>
      ${sim.isAutoPlaying ? "Pause" : "Auto Play"}</button>`;
  if (finished) {
    html += `<button class="battle-btn success" onclick="window.teamBattle.handleBattleEnd()">Continue</button>`;
  }
  return html;
};

TeamBattleSystem.prototype.patchBattleSimulatorWinner = function (playerPokemon, gymPokemon) {
  const self = this;
  const originalCheckWinner = window.battleSimulator.checkWinner.bind(window.battleSimulator);
  window.battleSimulator.checkWinner = function () {
    originalCheckWinner();
    if (!this.currentBattle.isFinished) return;
    self.totalTurns += this.roundCounter;
    const { fighter1, fighter2 } = this.currentBattle;
    playerPokemon.currentHp = fighter1.currentHp;
    gymPokemon.currentHp = fighter2.currentHp;
    self.trackDamageDealt(this.currentBattle.winner, playerPokemon, gymPokemon);
    self.updateStatusIcons();
    self.updateProgress();
    if (self.aiAutoPilotEnabled && !self.pendingAutoContinue) {
      self.pendingAutoContinue = true;
      setTimeout(() => { self.pendingAutoContinue = false; self.handleBattleEnd(); }, 900);
    }
  };
};

TeamBattleSystem.prototype.trackDamageDealt = function (winner, playerPokemon, gymPokemon) {
  if (winner === "fighter1") {
    playerPokemon.damageDealt += gymPokemon.maxHp - gymPokemon.currentHp;
    this.totalDamageDealt += gymPokemon.maxHp - gymPokemon.currentHp;
  } else {
    gymPokemon.damageDealt += playerPokemon.maxHp - playerPokemon.currentHp;
    this.totalDamageDealt += playerPokemon.maxHp - playerPokemon.currentHp;
  }
};

TeamBattleSystem.prototype.startBattleWithMoves = async function (playerPokemon, gymPokemon) {
  if (!playerPokemon.moves) {
    playerPokemon.moves = await window.battleSimulator.fetchPokemonMoves(playerPokemon.details);
  }
  if (!gymPokemon.moves) {
    gymPokemon.moves = await window.battleSimulator.fetchPokemonMoves(gymPokemon.details);
  }
  const fighter1 = this.createFighter(playerPokemon);
  const fighter2 = this.createFighter(gymPokemon);

  window.battleSimulator.currentBattle = { fighter1, fighter2, winner: null, isFinished: false };
  window.battleSimulator.battleLog = [];
  window.battleSimulator.roundCounter = 0;
  window.battleSimulator.isAutoPlaying = false;
  window.battleSimulator.renderBattle();

  if (this.aiAutoPilotEnabled && !window.battleSimulator.currentBattle.isFinished) {
    setTimeout(() => {
      if (!window.battleSimulator.isAutoPlaying) window.battleSimulator.toggleAutoPlay();
    }, 250);
  }
};

TeamBattleSystem.prototype.createFighter = function (pokemon) {
  return {
    id: pokemon.id, name: pokemon.name, image: pokemon.image,
    types: pokemon.types, stats: pokemon.stats,
    maxHp: pokemon.maxHp, currentHp: pokemon.currentHp,
    details: pokemon.details, moves: pokemon.moves, level: 50,
  };
};

TeamBattleSystem.prototype.handleBattleEnd = function () {
  const winner = window.battleSimulator.currentBattle.winner;
  if (winner === "fighter2") {
    this.requestLeaderDialogue("Der Spieler hat gerade ein eigenes Pokemon verloren.");
    this.playerTeam[this.currentPlayerIndex].currentHp = 0;
    this.currentPlayerIndex++;
    if (this.currentPlayerIndex >= this.playerTeam.length) {
      this.showDefeatScreen();
      return;
    }
    this.startNextBattle();
  } else {
    const defeated = this.gymTeam[this.currentGymIndex];
    const isStrongest = Number(defeated?.id) === Number(this.strongestGymPokemonId);
    this.requestLeaderDialogue(
      isStrongest ? "Der Spieler hat gerade dein staerkstes Pokemon besiegt." : "Der Spieler hat gerade eines deiner Pokemon besiegt.",
    );
    this.gymTeam[this.currentGymIndex].currentHp = 0;
    this.currentGymIndex++;
    if (this.currentGymIndex >= this.gymTeam.length) {
      this.showVictoryScreen();
      return;
    }
    this.startNextBattle();
  }
};

TeamBattleSystem.prototype.restartChallenge = function () {
  const screen = document.querySelector(".battle-result-screen");
  if (screen) screen.remove();
  if (this.arenaModal) this.arenaModal.hide();
  this.startBattle();
};

TeamBattleSystem.prototype.closeAll = function () {
  const screen = document.querySelector(".battle-result-screen");
  if (screen) screen.remove();
  if (this.arenaModal) this.arenaModal.hide();
  if (this.overviewModal) this.overviewModal.hide();
};
