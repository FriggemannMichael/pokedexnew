TeamBattleSystem.prototype.renderOverviewLoading = function () {
  const body = document.getElementById("teamBattleOverviewModalBody");
  if (!body) return;
  body.innerHTML = `
    <div class="team-battle-loading">
      <div class="spinner"></div>
      <div class="team-battle-loading-text">Generating Gym Leader Team...</div>
    </div>
  `;
};

TeamBattleSystem.prototype.renderOverview = function () {
  const body = document.getElementById("teamBattleOverviewModalBody");
  if (!body) return;
  const playerAvg = this.calculateAverageStats(this.playerTeam);
  const gymAvg = this.calculateAverageStats(this.gymTeam);
  const leaderName = this.gymLeader?.name || "Gym Leader";
  const leaderType = this.getTypeLabel(this.gymLeader?.type || "normal");
  const initials = this.gymLeaders[leaderName]?.initials || leaderName.slice(0, 2).toUpperCase();

  body.innerHTML = `
    <div class="team-battle-preview">
      <div class="team-side player-side">
        <div class="team-side-header">
          <div class="gym-leader-avatar-lg type-gradient-normal"><span class="gym-leader-initials">YT</span></div>
          <div class="team-side-title">YOUR TEAM</div>
          <div class="team-side-subtitle"><span>Average Stats</span></div>
        </div>
        ${this.playerTeam.map((p) => this.renderMiniCard(p)).join("")}
      </div>
      <div class="team-vs-divider">
        <div class="vs-badge">VS</div>
        ${this.renderStatsComparison(playerAvg, gymAvg)}
        ${this.renderLeaderDialogueCard()}
      </div>
      <div class="team-side gym-side">
        <div class="team-side-header">
          <div class="gym-leader-avatar-lg type-gradient-${this.gymLeader?.type || "normal"}"><span class="gym-leader-initials">${initials}</span></div>
          <div class="team-side-title">${leaderName}</div>
          <div class="team-side-subtitle"><span>${leaderType}-Arena</span></div>
        </div>
        ${this.gymTeam.map((p) => this.renderMiniCard(p)).join("")}
      </div>
      <button class="start-battle-btn" onclick="window.teamBattle.startBattle()"><span>START BATTLE</span></button>
    </div>
  `;
};

TeamBattleSystem.prototype.renderStatsComparison = function (playerAvg, gymAvg) {
  const row = (label, pVal, gVal) => `
    <div class="team-stat-row">
      <span class="team-stat-label">${label}</span>
      <div class="team-stat-values"><span class="player">${pVal}</span><span>-</span><span class="gym">${gVal}</span></div>
    </div>`;
  return `
    <div class="team-stats-comparison">
      <h6>Team Stats</h6>
      ${row("HP", playerAvg.hp, gymAvg.hp)}
      ${row("ATK", playerAvg.attack, gymAvg.attack)}
      ${row("DEF", playerAvg.defense, gymAvg.defense)}
      ${row("SPD", playerAvg.speed, gymAvg.speed)}
    </div>`;
};

TeamBattleSystem.prototype.renderMiniCard = function (pokemon) {
  return `
    <div class="mini-pokemon-card">
      <img src="${pokemon.image}" alt="${pokemon.name}" class="mini-pokemon-image">
      <div class="mini-pokemon-name">${pokemon.name}</div>
      <div class="mini-pokemon-types">
        ${pokemon.types.map((t) => `<span class="type-badge type-${t}">${t}</span>`).join("")}
      </div>
      <div class="mini-pokemon-stats">
        <div class="mini-stat"><span class="mini-stat-label">HP</span><span class="mini-stat-value">${pokemon.stats.hp}</span></div>
        <div class="mini-stat"><span class="mini-stat-label">ATK</span><span class="mini-stat-value">${pokemon.stats.attack}</span></div>
        <div class="mini-stat"><span class="mini-stat-label">DEF</span><span class="mini-stat-value">${pokemon.stats.defense}</span></div>
      </div>
    </div>
  `;
};

TeamBattleSystem.prototype.renderArena = function () {
  const body = document.getElementById("teamBattleArenaModalBody");
  if (!body) return;
  const leaderName = this.gymLeader?.name || "Gym Leader";
  body.innerHTML = `
    <div class="team-battle-arena">
      <div class="team-status-bar">
        <div class="team-status-side player">
          <div class="team-status-name">YOUR TEAM</div>
          <div class="team-status-icons" id="playerStatusIcons">${this.renderStatusIcons(this.playerTeam, "player")}</div>
        </div>
        <div class="team-status-divider">VS</div>
        <div class="team-status-side gym">
          <div class="team-status-name">${leaderName}</div>
          <div class="team-status-icons" id="gymStatusIcons">${this.renderStatusIcons(this.gymTeam, "gym")}</div>
        </div>
      </div>
      ${this.renderLeaderDialogueCard()}
      <div class="battle-progress">
        <div class="progress-label"><span>Battle Status</span><span id="progressText">Gym: 0/6 defeated · Your losses: 0/6</span></div>
        <div class="progress-bar-container battle-status-track" aria-hidden="true">
          <div class="progress-bar-fill progress-bar-fill--gym" id="progressGymFill" style="width: 0%"></div>
          <div class="progress-bar-fill progress-bar-fill--player" id="progressPlayerLossFill" style="width: 0%"></div>
        </div>
      </div>
      <div class="main-battle-container" id="mainBattleContainer"></div>
    </div>
  `;
};

TeamBattleSystem.prototype.renderStatusIcons = function (team, side) {
  return team.map((p, i) => {
    const isActive = (side === "player" && i === this.currentPlayerIndex) || (side === "gym" && i === this.currentGymIndex);
    const isFainted = p.currentHp <= 0;
    const cls = `team-pokemon-icon ${isActive ? "active" : ""} ${isFainted ? "fainted" : ""}`;
    return `<div class="${cls}" data-index="${i}"><img src="${p.image}" alt="${p.name}"></div>`;
  }).join("");
};

TeamBattleSystem.prototype.updateStatusIcons = function () {
  const pi = document.getElementById("playerStatusIcons");
  const gi = document.getElementById("gymStatusIcons");
  if (pi) pi.innerHTML = this.renderStatusIcons(this.playerTeam, "player");
  if (gi) gi.innerHTML = this.renderStatusIcons(this.gymTeam, "gym");
};

TeamBattleSystem.prototype.updateProgress = function () {
  const gymDefeated = this.gymTeam.filter((p) => p.currentHp <= 0).length;
  const gymTotal = this.gymTeam.length;
  const playerDefeated = this.playerTeam.filter((p) => p.currentHp <= 0).length;
  const playerTotal = this.playerTeam.length;
  const text = document.getElementById("progressText");
  const gymBar = document.getElementById("progressGymFill");
  const playerBar = document.getElementById("progressPlayerLossFill");
  if (text) {
    text.textContent = `Gym: ${gymDefeated}/${gymTotal} defeated · Your losses: ${playerDefeated}/${playerTotal}`;
  }
  if (gymBar) {
    const gymPct = gymTotal > 0 ? (gymDefeated / gymTotal) * 100 : 0;
    gymBar.style.width = `${gymPct}%`;
    gymBar.setAttribute("aria-label", `${gymDefeated} of ${gymTotal} Gym Pokemon defeated`);
  }
  if (playerBar) {
    const playerPct = playerTotal > 0 ? (playerDefeated / playerTotal) * 100 : 0;
    playerBar.style.width = `${playerPct}%`;
    playerBar.setAttribute("aria-label", `${playerDefeated} of ${playerTotal} player Pokemon defeated`);
  }
};

TeamBattleSystem.prototype.renderLeaderDialogueCard = function () {
  const name = this.gymLeader?.name || "Gym Leader";
  const typeLabel = this.getTypeLabel(this.gymLeader?.type || "normal");
  const typeEng = this.gymLeader?.type || "normal";
  const initials = this.gymLeaders[name]?.initials || name.slice(0, 2).toUpperCase();
  return `
    <div class="gym-leader-dialog-card" data-gym-leader-dialog>
      <div class="gym-leader-dialog-head">
        <div class="gym-leader-avatar type-gradient-${typeEng}"><span class="gym-leader-initials">${initials}</span></div>
        <div class="gym-leader-head-text">
          <div class="gym-leader-name">${name}</div>
          <div class="gym-leader-type">${typeLabel}-Arena</div>
        </div>
      </div>
      <p class="gym-leader-line" data-gym-leader-line>Die Arena ist bereit. Zeig, was dein Team kann.</p>
    </div>
  `;
};

TeamBattleSystem.prototype.setGymLeaderDialogue = function (text, opts = {}) {
  const lines = document.querySelectorAll("[data-gym-leader-line]");
  if (!lines.length) return;
  const safe = String(text || "").trim();
  lines.forEach((line) => {
    if (!opts.typewriter || !window.aiService?.typewriterToElement) {
      line.textContent = safe;
      return;
    }
    window.aiService.typewriterToElement(line, safe, { speed: 16 });
  });
};

TeamBattleSystem.prototype.renderLeaderThinkingState = function () {
  document.querySelectorAll("[data-gym-leader-dialog]").forEach((c) => c.classList.add("is-thinking"));
  this.setGymLeaderDialogue("...");
};

TeamBattleSystem.prototype.clearLeaderThinkingState = function () {
  document.querySelectorAll("[data-gym-leader-dialog]").forEach((c) => c.classList.remove("is-thinking"));
};

TeamBattleSystem.prototype.requestLeaderDialogue = async function (eventText) {
  const requestId = ++this.gymLeaderDialogRequestId;
  const fallback = this.createLocalLeaderLine(eventText);
  const ai = window.aiService;
  this.renderLeaderThinkingState();
  if (ai && typeof ai.detectProxy === "function") await ai.detectProxy();

  const tryProvider = async () => {
    if (!ai || typeof ai.requestGymLeaderDialogue !== "function") return null;
    try {
      return await ai.requestGymLeaderDialogue({
        leaderName: this.gymLeader?.name || "Gym Leader",
        leaderType: this.getTypeLabel(this.gymLeader?.type || "normal"),
        leaderStyle: this.gymLeader?.style || "fokussiert",
        eventText,
      });
    } catch { return null; }
  };

  let line = null;
  if (ai?.hasGroqKey?.()) line = await tryProvider();
  if (!line) line = fallback;
  if (requestId !== this.gymLeaderDialogRequestId) return;
  this.clearLeaderThinkingState();
  this.setGymLeaderDialogue(line);
};

TeamBattleSystem.prototype.createLocalLeaderLine = function (eventText) {
  const text = String(eventText || "").toLowerCase();
  const name = this.gymLeader?.name || "Gym Leader";
  if (text.includes("stärkstes")) return `${name}: Das war nur der Anfang, ich habe noch Reserven!`;
  if (text.includes("besiegt")) return `${name}: Du triffst hart, aber meine Arena fällt nicht!`;
  if (text.includes("spieler")) return `${name}: Deine Offensive stockt, jetzt übernehme ich!`;
  return `${name}: Willkommen in meiner Arena. Kämpfe entschlossen!`;
};

TeamBattleSystem.prototype.renderBattleFighter = function (fighter, fighterId) {
  const hpPct = (fighter.currentHp / fighter.maxHp) * 100;
  const hpClass = hpPct <= 20 ? "critical" : hpPct <= 50 ? "low" : "";
  const fClass = window.battleSimulator.currentBattle.winner === fighterId ? "winner" : fighter.currentHp <= 0 ? "defeated" : "";
  return `
    <div class="battle-fighter ${fClass}" id="${fighterId}">
      <div class="fighter-image-wrapper"><img src="${fighter.image}" alt="${fighter.name}" class="fighter-image"></div>
      <div class="fighter-name">${fighter.name}</div>
      <div class="fighter-types">${fighter.types.map((t) => `<span class="type-badge type-${t}">${t.toUpperCase()}</span>`).join("")}</div>
      ${window.battleSimulator.renderStatStageBadges(fighter)}
      ${window.battleSimulator.renderMoveList(fighter, fighterId)}
      <div class="hp-bar-container">
        <div class="hp-label"><span>HP</span><span class="hp-current">${Math.max(0, Math.round(fighter.currentHp))} / ${fighter.maxHp}</span></div>
        <div class="hp-bar"><div class="hp-fill ${hpClass}" style="width: ${Math.max(0, hpPct)}%"></div></div>
      </div>
    </div>
  `;
};

TeamBattleSystem.prototype.showVictoryScreen = function () {
  this.requestLeaderDialogue("Der Spieler hat die Arena besiegt.");
  this.mvpPokemon = this.playerTeam.reduce((max, p) => ((p.damageDealt || 0) > (max.damageDealt || 0) ? p : max), this.playerTeam[0]);
  this.showResultScreen(true);
};

TeamBattleSystem.prototype.showDefeatScreen = function () {
  this.requestLeaderDialogue("Der Spieler ist geschlagen und die Arena bleibt bestehen.");
  this.mvpPokemon = this.gymTeam.reduce((max, p) => ((p.damageDealt || 0) > (max.damageDealt || 0) ? p : max), this.gymTeam[0]);
  this.showResultScreen(false);
};

TeamBattleSystem.prototype.showResultScreen = function (isVictory) {
  if (window.battleHistory) {
    window.battleHistory.addEntry({
      playerTeam: this.playerTeam, gymLeader: this.gymLeader,
      result: isVictory ? "win" : "loss", totalDamageDealt: this.totalDamageDealt,
      totalTurns: this.totalTurns, mvpPokemon: this.mvpPokemon,
      pokemonUsed: this.currentPlayerIndex + 1,
    });
  }
  const primaryType = this.playerTeam?.[0]?.types?.[0] || "normal";
  const html = `
    <div class="battle-result-screen">
      ${isVictory ? this.createConfetti() : ""}
      <div class="battle-result-content lg-type-surface" style="--type-accent: var(--type-${primaryType});">
        <div class="result-title ${isVictory ? "victory" : "defeat"}">${isVictory ? "\uD83C\uDFC6 VICTORY!" : "\uD83D\uDC80 DEFEAT"}</div>
        <div class="result-subtitle">${isVictory ? "You defeated the Gym Leader!" : "The Gym Leader defeated you!"}</div>
        <div class="result-stats">
          <div class="result-stat"><div class="result-stat-label">Total Turns</div><div class="result-stat-value">${this.totalTurns}</div></div>
          <div class="result-stat"><div class="result-stat-label">Damage Dealt</div><div class="result-stat-value">${this.totalDamageDealt}</div></div>
          <div class="result-stat"><div class="result-stat-label">Pokemon Used</div><div class="result-stat-value">${this.currentPlayerIndex + 1}/6</div></div>
        </div>
        <div class="result-mvp">
          <div class="result-mvp-title">\u2B50 MVP Pokemon</div>
          <div class="result-mvp-pokemon"><img src="${this.mvpPokemon.image}" alt="${this.mvpPokemon.name}"><div class="result-mvp-pokemon-name">${this.mvpPokemon.name}</div></div>
        </div>
        <div class="result-actions">
          <button class="result-btn primary" onclick="window.teamBattle.restartChallenge()">Nochmal</button>
          <button class="result-btn secondary" onclick="window.teamBattle.showBattleHistory()">Kampfhistorie</button>
          <button class="result-btn secondary" onclick="window.teamBattle.closeAll()">Schliessen</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
};

TeamBattleSystem.prototype.createConfetti = function () {
  const colors = ["#ff6b6b", "#4ecdc4", "#ffd93d", "#2ecc71", "#3498db", "#9b59b6"];
  let html = '<div class="confetti-container">';
  for (let i = 0; i < 50; i++) {
    const c = colors[Math.floor(Math.random() * colors.length)];
    html += `<div class="confetti" style="left:${Math.random() * 100}%;background:${c};animation-delay:${Math.random() * 3}s;animation-duration:${2 + Math.random() * 2}s;"></div>`;
  }
  return html + "</div>";
};

TeamBattleSystem.prototype.exportBattleLog = function () {
  const log = window.battleSimulator?.battleLog || [];
  const data = {
    metadata: {
      exportDate: new Date().toISOString(), gymLeader: this.gymLeader,
      playerTeam: this.playerTeam.map((p) => ({ id: p.id, name: p.name, types: p.types })),
      gymTeam: this.gymTeam.map((p) => ({ id: p.id, name: p.name, types: p.types })),
      totalTurns: this.totalTurns, totalDamageDealt: this.totalDamageDealt,
      mvpPokemon: this.mvpPokemon ? { id: this.mvpPokemon.id, name: this.mvpPokemon.name } : null,
    },
    battleLog: log.map((e) => ({ type: e.type, message: e.message })),
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

TeamBattleSystem.prototype.showBattleHistory = function () {
  this.closeAll();
  if (!window.battleHistory) return;
  const history = window.battleHistory.getHistory();
  const stats = window.battleHistory.getStats();
  const modalId = "battleHistoryModal";
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const rows = history.slice(0, 20).map((e) => {
    const date = new Date(e.date).toLocaleDateString("de-DE");
    const cls = e.result === "win" ? "history-win" : "history-loss";
    const txt = e.result === "win" ? "Sieg" : "Niederlage";
    return `<tr class="${cls}"><td>${date}</td><td>${e.gymLeader?.name || "?"}</td><td>${txt}</td><td>${e.totalDamageDealt}</td><td>${e.totalTurns}</td><td style="text-transform:capitalize">${e.mvpPokemon?.name || "-"}</td></tr>`;
  }).join("");

  const mostUsed = stats.mostUsed.length
    ? `<div class="history-most-used"><h6>Meistgenutzte Pokemon</h6><div class="most-used-list">${stats.mostUsed.map((p) => `<span class="most-used-badge" style="text-transform:capitalize">${p.name} (${p.count}x)</span>`).join("")}</div></div>`
    : "";

  const modalHTML = `
    <div class="modal fade glass-modal" id="${modalId}" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Kampfhistorie</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="battle-history-stats">
              <div class="history-stat-card"><div class="history-stat-value">${stats.totalBattles}</div><div class="history-stat-label">Kämpfe</div></div>
              <div class="history-stat-card"><div class="history-stat-value">${stats.wins}</div><div class="history-stat-label">Siege</div></div>
              <div class="history-stat-card"><div class="history-stat-value">${stats.losses}</div><div class="history-stat-label">Niederlagen</div></div>
              <div class="history-stat-card"><div class="history-stat-value">${stats.winRate}%</div><div class="history-stat-label">Siegrate</div></div>
              <div class="history-stat-card"><div class="history-stat-value">${stats.highestDamage}</div><div class="history-stat-label">Max. Schaden</div></div>
              <div class="history-stat-card"><div class="history-stat-value" style="text-transform:capitalize">${stats.topMvp?.name || "-"}</div><div class="history-stat-label">Top MVP</div></div>
            </div>
            ${mostUsed}
            <div class="battle-history-table-wrapper">
              <table class="battle-history-table">
                <thead><tr><th>Datum</th><th>Arenaleiter</th><th>Ergebnis</th><th>Schaden</th><th>Runden</th><th>MVP</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="6">Keine Kämpfe bisher.</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  new bootstrap.Modal(document.getElementById(modalId)).show();
};
