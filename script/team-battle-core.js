class TeamBattleSystem {
  constructor() {
    this.initialized = false;
    this.playerTeam = [];
    this.gymTeam = [];
    this.currentPlayerIndex = 0;
    this.currentGymIndex = 0;
    this.battleLog = [];
    this.totalDamageDealt = 0;
    this.totalTurns = 0;
    this.mvpPokemon = null;
    this.aiGymStrategy = null;
    this.aiAutoPilotEnabled = true;
    this.pendingAutoContinue = false;
    this.overviewModal = null;
    this.arenaModal = null;
    this.gymLeader = null;
    this.strongestGymPokemonId = null;
    this.gymLeaderDialogRequestId = 0;
    this.gymLeaders = {
      Rocko: { type: "rock", style: "hart und unnachgiebig", initials: "RO" },
      Misty: { type: "water", style: "temperamentvoll und direkt", initials: "MI" },
      LtSurge: { type: "electric", style: "laut und aggressiv", initials: "LS" },
      Erika: { type: "grass", style: "ruhig und praezise", initials: "ER" },
      Koga: { type: "poison", style: "listig und distanziert", initials: "KO" },
      Sabrina: { type: "psychic", style: "kalt und kontrolliert", initials: "SA" },
      Blaine: { type: "fire", style: "dramatisch und stolz", initials: "BL" },
      Giovanni: { type: "ground", style: "dominant und einschuechternd", initials: "GI" },
    };
  }

  init() {
    if (this.initialized) return;
    if (typeof bootstrap === "undefined") {
      setTimeout(() => this.init(), 500);
      return;
    }
    this.createOverviewModal();
    this.initialized = true;
  }

  createOverviewModal() {
    this.overviewModal = createBootstrapModal("teamBattleOverviewModal", "GYM CHALLENGE", {
      modalClass: "team-battle-overview-modal glass-modal",
      size: "modal-xl",
      icon: "\uD83C\uDFC6",
    });
  }

  createArenaModal() {
    this.arenaModal = createBootstrapModal("teamBattleArenaModal", "TEAM BATTLE", {
      modalClass: "team-battle-overview-modal glass-modal",
      size: "modal-xl",
      icon: "\u2694\uFE0F",
      staticBackdrop: true,
    });
  }

  async startChallenge(playerTeam) {
    if (!playerTeam || playerTeam.length === 0) {
      alert("Du hast kein Team! Erstelle zuerst ein Team mit 6 Pokemon.");
      return;
    }
    if (playerTeam.length < 6) {
      const ok = window.confirm(
        `Dein Team hat nur ${playerTeam.length} Pokemon!\nMoechtest du trotzdem weitermachen?`,
      );
      if (!ok) return;
    }
    const teamModalEl = document.getElementById("teamModal");
    if (teamModalEl) {
      const teamModalInstance = bootstrap.Modal.getInstance(teamModalEl);
      if (teamModalInstance) {
        teamModalInstance.hide();
        await new Promise((r) => teamModalEl.addEventListener("hidden.bs.modal", r, { once: true }));
      }
    }
    this.resetChallengeState(playerTeam);
    this.playerTeam = await this.loadPlayerTeamDetails(playerTeam);
    this.renderOverviewLoading();
    this.overviewModal.show();
    await this.generateGymTeam();
    await this.prepareAIChallengeAssistant();
    this.renderOverview();
    this.requestLeaderDialogue("Der Spieler fordert deine Arena zum Kampf heraus.");
  }

  resetChallengeState(playerTeam) {
    this.playerTeam = playerTeam;
    this.gymTeam = [];
    this.currentPlayerIndex = 0;
    this.currentGymIndex = 0;
    this.battleLog = [];
    this.totalDamageDealt = 0;
    this.totalTurns = 0;
    this.mvpPokemon = null;
    this.aiGymStrategy = null;
    this.pendingAutoContinue = false;
    this.gymLeader = null;
    this.strongestGymPokemonId = null;
    this.gymLeaderDialogRequestId = 0;
  }

  async loadPlayerTeamDetails(team) {
    return Promise.all(
      team.map(async (pokemon) => {
        const details = await this.fetchPokemonDetails(pokemon.id);
        const stats = this.extractStats(details);
        return {
          ...pokemon, details, stats,
          maxHp: stats.hp, currentHp: stats.hp, damageDealt: 0,
        };
      }),
    );
  }

  async generateGymTeam() {
    const randomIds = [];
    while (randomIds.length < 6) {
      const id = Math.floor(Math.random() * 300) + 1;
      if (!randomIds.includes(id)) randomIds.push(id);
    }
    this.gymTeam = await Promise.all(
      randomIds.map(async (id) => {
        const details = await this.fetchPokemonDetails(id);
        const stats = this.extractStats(details);
        return {
          id: details.id, name: details.name,
          image: details.sprites.other["official-artwork"].front_default,
          types: details.types.map((t) => t.type.name),
          details, stats, maxHp: stats.hp, currentHp: stats.hp, damageDealt: 0,
        };
      }),
    );
    this.assignGymLeaderProfile();
    this.strongestGymPokemonId = this.findStrongestPokemonId(this.gymTeam);
  }

  async fetchPokemonDetails(pokemonId) {
    try {
      return await window.PokeApi.fetch(`/pokemon/${pokemonId}`);
    } catch (error) {
      console.error("[TeamBattle] Failed to fetch Pokemon details:", error);
      return null;
    }
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

  assignGymLeaderProfile() {
    const dominantType = this.getDominantGymType();
    const entries = Object.entries(this.gymLeaders);
    const matching = entries.filter(([, p]) => p.type === dominantType);
    const pool = matching.length ? matching : entries;
    const [name, profile] = pool[Math.floor(Math.random() * pool.length)];
    this.gymLeader = { name, type: profile.type, style: profile.style };
  }

  getDominantGymType() {
    const counts = {};
    this.gymTeam.forEach((p) => {
      const t = p?.types?.[0];
      if (t) counts[t] = (counts[t] || 0) + 1;
    });
    let best = null, bestC = -1;
    Object.entries(counts).forEach(([t, c]) => { if (c > bestC) { best = t; bestC = c; } });
    return best || "normal";
  }

  getTypeLabel(type) {
    const map = {
      normal: "Normal", fire: "Feuer", water: "Wasser", grass: "Pflanze",
      electric: "Elektro", ice: "Eis", fighting: "Kampf", poison: "Gift",
      ground: "Boden", flying: "Flug", psychic: "Psycho", bug: "Kaefer",
      rock: "Gestein", ghost: "Geist", dragon: "Drache", dark: "Unlicht",
      steel: "Stahl", fairy: "Fee",
    };
    return map[type] || "Unbekannt";
  }

  findStrongestPokemonId(team) {
    if (!Array.isArray(team) || !team.length) return null;
    const strongest = [...team].sort((a, b) => {
      const ap = (a?.stats?.hp || 0) + (a?.stats?.attack || 0) + (a?.stats?.defense || 0) + (a?.stats?.speed || 0);
      const bp = (b?.stats?.hp || 0) + (b?.stats?.attack || 0) + (b?.stats?.defense || 0) + (b?.stats?.speed || 0);
      return bp - ap;
    })[0];
    return strongest?.id || null;
  }

  calculateAverageStats(team) {
    const sum = team.reduce((a, p) => {
      a.hp += p.stats.hp; a.attack += p.stats.attack;
      a.defense += p.stats.defense; a.speed += p.stats.speed;
      return a;
    }, { hp: 0, attack: 0, defense: 0, speed: 0 });
    const len = team.length;
    return {
      hp: Math.round(sum.hp / len), attack: Math.round(sum.attack / len),
      defense: Math.round(sum.defense / len), speed: Math.round(sum.speed / len),
    };
  }

  async prepareAIChallengeAssistant() {
    const aiService = window.teamAIService;
    const localStrategy = this.buildLocalFallbackStrategy();
    if (aiService && typeof aiService.detectProxy === "function") {
      await aiService.detectProxy();
    }
    if (!aiService || !aiService.hasAnyKey()) {
      this.aiGymStrategy = { provider: "local-fallback", providerLabel: "Local Fallback", parsed: localStrategy };
      this.applyAIChallengeStrategy(localStrategy);
      return;
    }
    try {
      const playerAvg = this.calculateAverageStats(this.playerTeam);
      const gymAvg = this.calculateAverageStats(this.gymTeam);
      this.aiGymStrategy = await aiService.requestGymStrategy({
        playerTeam: this.playerTeam, gymTeam: this.gymTeam,
        playerAvgStats: playerAvg, gymAvgStats: gymAvg,
      });
      this.applyAIChallengeStrategy(this.aiGymStrategy.parsed || {});
    } catch (error) {
      console.warn("[TeamBattle] AI strategy failed, using local fallback", error);
      this.aiGymStrategy = { provider: "local-fallback", providerLabel: "Local Fallback", parsed: localStrategy };
      this.applyAIChallengeStrategy(localStrategy);
    }
  }

  buildLocalFallbackStrategy() {
    const sim = window.battleSimulator;
    const typeChart = typeof sim?.getTypeChart === "function" ? sim.getTypeChart() : {};
    const scoreFor = (atk, defs) => defs.reduce((sum, def) => {
      const pressure = (atk.types || []).reduce((best, aType) => {
        const data = typeChart[aType];
        if (!data) return Math.max(best, 1);
        let eff = 1;
        (def.types || []).forEach((dType) => {
          if (data.superEffective?.includes(dType)) eff *= 2;
          else if (data.notVeryEffective?.includes(dType)) eff *= 0.5;
          else if (data.noEffect?.includes(dType)) eff = 0;
        });
        return Math.max(best, eff);
      }, 1);
      return sum + pressure;
    }, 0);

    const ranked = [...this.playerTeam]
      .map((p) => ({ name: p.name, score: scoreFor(p, this.gymTeam) }))
      .sort((a, b) => b.score - a.score);
    return {
      strategySummary: "Lokale Heuristik aktiv.",
      recommendedLead: ranked[0]?.name || "",
      swapPriorities: ranked.slice(1, 4).map((e) => e.name),
      targetFocus: this.gymTeam.slice(0, 3).map((p) => p.name),
      riskAlerts: [],
    };
  }

  applyAIChallengeStrategy(strategy) {
    const hints = [];
    if (strategy?.recommendedLead) hints.push(strategy.recommendedLead);
    if (Array.isArray(strategy?.swapPriorities)) hints.push(...strategy.swapPriorities);
    const normalized = hints.map((n) => String(n || "").toLowerCase().trim()).filter(Boolean);
    if (!normalized.length) return;
    const prioritized = [];
    const remaining = [...this.playerTeam];
    normalized.forEach((hint) => {
      const idx = remaining.findIndex((p) => p?.name && p.name.toLowerCase().includes(hint));
      if (idx >= 0) prioritized.push(...remaining.splice(idx, 1));
    });
    if (prioritized.length) this.playerTeam = [...prioritized, ...remaining];
  }
}

if (!window.teamBattle) {
  window.teamBattle = new TeamBattleSystem();
}
