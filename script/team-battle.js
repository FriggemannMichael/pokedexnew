// Team Battle System (Gym Challenge)
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
      Misty: {
        type: "water",
        style: "temperamentvoll und direkt",
        initials: "MI",
      },
      LtSurge: {
        type: "electric",
        style: "laut und aggressiv",
        initials: "LS",
      },
      Erika: { type: "grass", style: "ruhig und praezise", initials: "ER" },
      Koga: { type: "poison", style: "listig und distanziert", initials: "KO" },
      Sabrina: {
        type: "psychic",
        style: "kalt und kontrolliert",
        initials: "SA",
      },
      Blaine: { type: "fire", style: "dramatisch und stolz", initials: "BL" },
      Giovanni: {
        type: "ground",
        style: "dominant und einschuechternd",
        initials: "GI",
      },
    };
  }

  init() {
    if (this.initialized) return;

    if (typeof bootstrap === "undefined") {
      console.warn("[TeamBattle] Bootstrap not loaded yet, retrying...");
      setTimeout(() => this.init(), 500);
      return;
    }

    this.createOverviewModal();
    this.initialized = true;
    console.log("[TeamBattle] Team Battle System initialized");
  }

  // ===== MODAL CREATION =====
  createOverviewModal() {
    if (document.getElementById("teamBattleOverviewModal")) {
      this.overviewModal = bootstrap.Modal.getOrCreateInstance(
        document.getElementById("teamBattleOverviewModal"),
      );
      return;
    }

    const modalHTML = `
      <div class="modal fade team-battle-overview-modal" id="teamBattleOverviewModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <span>🏆</span>
                GYM CHALLENGE
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="teamBattleOverviewBody">
              <!-- Team Overview will be rendered here -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    this.overviewModal = new bootstrap.Modal(
      document.getElementById("teamBattleOverviewModal"),
    );
  }

  createArenaModal() {
    if (document.getElementById("teamBattleArenaModal")) {
      this.arenaModal = bootstrap.Modal.getOrCreateInstance(
        document.getElementById("teamBattleArenaModal"),
      );
      return;
    }

    const modalHTML = `
      <div class="modal fade team-battle-overview-modal" id="teamBattleArenaModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <span>⚔️</span>
                TEAM BATTLE
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="teamBattleArenaBody">
              <!-- Battle Arena will be rendered here -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    this.arenaModal = new bootstrap.Modal(
      document.getElementById("teamBattleArenaModal"),
    );
  }

  // ===== START CHALLENGE =====
  async startChallenge(playerTeam) {
    console.log("[TeamBattle] startChallenge called with team:", playerTeam);

    if (!playerTeam || playerTeam.length === 0) {
      alert("❌ Du hast kein Team! Erstelle zuerst ein Team mit 6 Pokemon.");
      return;
    }

    if (playerTeam.length < 6) {
      const confirm = window.confirm(
        `⚠️ Dein Team hat nur ${playerTeam.length} Pokemon!\n\n` +
          `Für eine faire Challenge brauchst du 6 Pokemon.\n\n` +
          `Möchtest du trotzdem weitermachen? (Du wirst wahrscheinlich verlieren)`,
      );

      if (!confirm) {
        return;
      }
    }

    console.log("[TeamBattle] Starting Gym Challenge with team:", playerTeam);

    // Reset state
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

    // Load detailed stats for player team
    this.playerTeam = await Promise.all(
      this.playerTeam.map(async (pokemon) => {
        const details = await this.fetchPokemonDetails(pokemon.id);
        return {
          ...pokemon,
          details,
          stats: this.extractStats(details),
          maxHp: this.extractStats(details).hp,
          currentHp: this.extractStats(details).hp,
          damageDealt: 0,
        };
      }),
    );

    // Show loading
    this.renderOverviewLoading();
    this.overviewModal.show();

    // Generate gym team
    await this.generateGymTeam();
    await this.prepareAIChallengeAssistant();

    // Show overview (Kampf NICHT automatisch starten!)
    this.renderOverview();
    this.requestLeaderDialogue(
      "Der Spieler fordert deine Arena zum Kampf heraus.",
    );
    // Hinweis: KEIN automatischer Start des Kampfes!
  }

  // ===== GYM TEAM GENERATOR =====
  async generateGymTeam() {
    console.log("[TeamBattle] Generating random gym team...");

    // Generate 6 random Pokemon IDs (1-151 for Gen 1)
    const randomIds = [];
    while (randomIds.length < 6) {
      const randomId = Math.floor(Math.random() * 300) + 1;
      if (!randomIds.includes(randomId)) {
        randomIds.push(randomId);
      }
    }

    // Fetch details for each Pokemon
    this.gymTeam = await Promise.all(
      randomIds.map(async (id) => {
        const details = await this.fetchPokemonDetails(id);
        const stats = this.extractStats(details);

        return {
          id: details.id,
          name: details.name,
          image: details.sprites.other["official-artwork"].front_default,
          types: details.types.map((t) => t.type.name),
          details,
          stats,
          maxHp: stats.hp,
          currentHp: stats.hp,
          damageDealt: 0,
        };
      }),
    );

    this.assignGymLeaderProfile();
    this.strongestGymPokemonId = this.findStrongestPokemonId(this.gymTeam);

    console.log("[TeamBattle] Gym team generated:", this.gymTeam);
  }

  async fetchPokemonDetails(pokemonId) {
    try {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${pokemonId}`,
      );
      return await response.json();
    } catch (error) {
      console.error("[TeamBattle] Failed to fetch Pokemon details:", error);
      return null;
    }
  }

  extractStats(pokemonDetails) {
    if (!pokemonDetails?.stats)
      return { hp: 100, attack: 50, defense: 50, speed: 50 };

    const stats = {};
    pokemonDetails.stats.forEach((stat) => {
      const name = stat.stat.name;
      if (name === "hp") stats.hp = stat.base_stat;
      if (name === "attack") stats.attack = stat.base_stat;
      if (name === "defense") stats.defense = stat.base_stat;
      if (name === "speed") stats.speed = stat.base_stat;
    });

    return stats;
  }

  assignGymLeaderProfile() {
    const dominantType = this.getDominantGymType();
    const entries = Object.entries(this.gymLeaders);
    const matching = entries.filter(
      ([, profile]) => profile.type === dominantType,
    );
    const pool = matching.length ? matching : entries;
    const [leaderName, profile] = pool[Math.floor(Math.random() * pool.length)];

    this.gymLeader = {
      name: leaderName,
      type: profile.type,
      style: profile.style,
    };
  }

  getDominantGymType() {
    const counts = {};
    this.gymTeam.forEach((pokemon) => {
      const primaryType = pokemon?.types?.[0];
      if (!primaryType) return;
      counts[primaryType] = (counts[primaryType] || 0) + 1;
    });

    let bestType = null;
    let bestCount = -1;
    Object.entries(counts).forEach(([type, count]) => {
      if (count > bestCount) {
        bestType = type;
        bestCount = count;
      }
    });

    return bestType || "normal";
  }

  getTypeLabel(type) {
    const map = {
      normal: "Normal",
      fire: "Feuer",
      water: "Wasser",
      grass: "Pflanze",
      electric: "Elektro",
      ice: "Eis",
      fighting: "Kampf",
      poison: "Gift",
      ground: "Boden",
      flying: "Flug",
      psychic: "Psycho",
      bug: "Kaefer",
      rock: "Gestein",
      ghost: "Geist",
      dragon: "Drache",
      dark: "Unlicht",
      steel: "Stahl",
      fairy: "Fee",
    };
    return map[type] || "Unbekannt";
  }

  findStrongestPokemonId(team) {
    if (!Array.isArray(team) || !team.length) return null;
    const strongest = [...team].sort((left, right) => {
      const leftPower =
        Number(left?.stats?.hp || 0) +
        Number(left?.stats?.attack || 0) +
        Number(left?.stats?.defense || 0) +
        Number(left?.stats?.speed || 0);
      const rightPower =
        Number(right?.stats?.hp || 0) +
        Number(right?.stats?.attack || 0) +
        Number(right?.stats?.defense || 0) +
        Number(right?.stats?.speed || 0);
      return rightPower - leftPower;
    })[0];
    return strongest?.id || null;
  }

  renderLeaderDialogueCard() {
    const leaderName = this.gymLeader?.name || "Gym Leader";
    const leaderType = this.getTypeLabel(this.gymLeader?.type || "normal");
    const leaderTypeEng = this.gymLeader?.type || "normal";
    const initials =
      this.gymLeaders[leaderName]?.initials ||
      leaderName.slice(0, 2).toUpperCase();
    return `
      <div class="gym-leader-dialog-card" data-gym-leader-dialog>
        <div class="gym-leader-dialog-head">
          <div class="gym-leader-avatar type-gradient-${leaderTypeEng}">
            <span class="gym-leader-initials">${initials}</span>
          </div>
          <div class="gym-leader-head-text">
            <div class="gym-leader-name">${leaderName}</div>
            <div class="gym-leader-type">${leaderType}-Arena</div>
          </div>
        </div>
        <p class="gym-leader-line" data-gym-leader-line>Die Arena ist bereit. Zeig, was dein Team kann.</p>
      </div>
    `;
  }

  setGymLeaderDialogue(text, { typewriter = true } = {}) {
    const lines = document.querySelectorAll("[data-gym-leader-line]");
    if (!lines.length) return;

    const safeText = String(text || "").trim();
    lines.forEach((line) => {
      if (
        !typewriter ||
        !window.aiService ||
        typeof window.aiService.typewriterToElement !== "function"
      ) {
        line.textContent = safeText;
        return;
      }
      window.aiService.typewriterToElement(line, safeText, { speed: 16 });
    });
  }

  renderLeaderThinkingState() {
    document.querySelectorAll("[data-gym-leader-dialog]").forEach((card) => {
      card.classList.add("is-thinking");
    });
    this.setGymLeaderDialogue("...");
  }

  clearLeaderThinkingState() {
    document.querySelectorAll("[data-gym-leader-dialog]").forEach((card) => {
      card.classList.remove("is-thinking");
    });
  }

  async requestLeaderDialogue(eventText) {
    const requestId = ++this.gymLeaderDialogRequestId;
    const fallback = this.createLocalLeaderLine(eventText);
    const aiService = window.aiService;

    this.renderLeaderThinkingState();

    // Ensure proxy detection has completed
    if (aiService && typeof aiService.detectProxy === "function") {
      await aiService.detectProxy();
    }

    // Helper für KI-Provider-Dialog
    const tryProvider = async (provider) => {
      if (
        !aiService ||
        typeof aiService.requestGymLeaderDialogue !== "function"
      )
        return null;
      try {
        const line = await aiService.requestGymLeaderDialogue({
          leaderName: this.gymLeader?.name || "Gym Leader",
          leaderType: this.getTypeLabel(this.gymLeader?.type || "normal"),
          leaderStyle: this.gymLeader?.style || "fokussiert",
          eventText,
          provider, // explizit Provider angeben
        });
        return line;
      } catch (e) {
        return null;
      }
    };

    // 1. Groq versuchen
    let line = null;
    if (
      aiService &&
      typeof aiService.hasGroqKey === "function" &&
      aiService.hasGroqKey()
    ) {
      line = await tryProvider("groq");
    }
    // 2. Mistral versuchen, falls Groq fehlschlägt
    if (
      !line &&
      aiService &&
      typeof aiService.hasMistralKey === "function" &&
      aiService.hasMistralKey()
    ) {
      line = await tryProvider("mistral");
    }

    // 3. Fallback lokal
    if (!line) {
      line = fallback;
    }

    if (requestId !== this.gymLeaderDialogRequestId) return;
    this.clearLeaderThinkingState();
    this.setGymLeaderDialogue(line);
  }

  createLocalLeaderLine(eventText) {
    const text = String(eventText || "").toLowerCase();
    const leaderName = this.gymLeader?.name || "Gym Leader";

    if (text.includes("staerkstes")) {
      return `${leaderName}: Das war nur der Anfang, ich habe noch Reserven!`;
    }
    if (text.includes("besiegt")) {
      return `${leaderName}: Du triffst hart, aber meine Arena faellt nicht!`;
    }
    if (text.includes("spieler")) {
      return `${leaderName}: Deine Offensive stockt, jetzt uebernehme ich!`;
    }
    return `${leaderName}: Willkommen in meiner Arena. Kaempfe entschlossen!`;
  }

  // ===== RENDER OVERVIEW =====
  renderOverviewLoading() {
    const body = document.getElementById("teamBattleOverviewBody");
    if (!body) return;

    body.innerHTML = `
      <div class="team-battle-loading">
        <div class="spinner"></div>
        <div class="team-battle-loading-text">Generating Gym Leader Team...</div>
      </div>
    `;
  }

  renderOverview() {
    const body = document.getElementById("teamBattleOverviewBody");
    if (!body) return;

    // Calculate average stats
    const playerAvgStats = this.calculateAverageStats(this.playerTeam);
    const gymAvgStats = this.calculateAverageStats(this.gymTeam);
    const leaderName = this.gymLeader?.name || "Gym Leader";
    const leaderTypeLabel = this.getTypeLabel(this.gymLeader?.type || "normal");

    body.innerHTML = `
      <div class="team-battle-preview">
        <!-- Player Team -->
        <div class="team-side player-side">
          <div class="team-side-header">
            <div class="gym-leader-avatar-lg type-gradient-normal">
              <span class="gym-leader-initials">YT</span>
            </div>
            <div class="team-side-title">YOUR TEAM</div>
            <div class="team-side-subtitle">
              <span>Average Stats</span>
            </div>
          </div>
          ${this.playerTeam.map((pokemon) => this.renderMiniCard(pokemon)).join("")}
        </div>

        <!-- VS Divider -->
        <div class="team-vs-divider">
          <div class="vs-badge">VS</div>
          <div class="vs-icon">BATTLE</div>

          <div class="team-stats-comparison">
            <h6>Team Stats</h6>
            <div class="team-stat-row">
              <span class="team-stat-label">HP</span>
              <div class="team-stat-values">
                <span class="player">${playerAvgStats.hp}</span>
                <span>-</span>
                <span class="gym">${gymAvgStats.hp}</span>
              </div>
            </div>
            <div class="team-stat-row">
              <span class="team-stat-label">ATK</span>
              <div class="team-stat-values">
                <span class="player">${playerAvgStats.attack}</span>
                <span>-</span>
                <span class="gym">${gymAvgStats.attack}</span>
              </div>
            </div>
            <div class="team-stat-row">
              <span class="team-stat-label">DEF</span>
              <div class="team-stat-values">
                <span class="player">${playerAvgStats.defense}</span>
                <span>-</span>
                <span class="gym">${gymAvgStats.defense}</span>
              </div>
            </div>
            <div class="team-stat-row">
              <span class="team-stat-label">SPD</span>
              <div class="team-stat-values">
                <span class="player">${playerAvgStats.speed}</span>
                <span>-</span>
                <span class="gym">${gymAvgStats.speed}</span>
              </div>
            </div>
          </div>

          ${this.renderLeaderDialogueCard()}
        </div>

        <!-- Gym Team -->
        <div class="team-side gym-side">
          <div class="team-side-header">
            <div class="gym-leader-avatar-lg type-gradient-${this.gymLeader?.type || "normal"}">
              <span class="gym-leader-initials">${this.gymLeaders[leaderName]?.initials || leaderName.slice(0, 2).toUpperCase()}</span>
            </div>
            <div class="team-side-title">${leaderName}</div>
            <div class="team-side-subtitle">
              <span>${leaderTypeLabel}-Arena</span>
            </div>
          </div>
          ${this.gymTeam.map((pokemon) => this.renderMiniCard(pokemon)).join("")}
        </div>

        <!-- Start Battle Button -->
        <button class="start-battle-btn" onclick="window.teamBattle.startBattle()">
          <span>START BATTLE</span>
        </button>
      </div>
    `;
  }

  async prepareAIChallengeAssistant() {
    const aiService = window.teamAIService;
    const localStrategy = this.buildLocalFallbackStrategy();

    // Ensure proxy detection has completed
    if (aiService && typeof aiService.detectProxy === "function") {
      await aiService.detectProxy();
    }

    if (!aiService || !aiService.hasAnyKey()) {
      this.aiGymStrategy = {
        provider: "local-fallback",
        providerLabel: "Local Fallback",
        parsed: localStrategy,
      };
      this.applyAIChallengeStrategy(localStrategy);
      return;
    }

    try {
      const playerAvgStats = this.calculateAverageStats(this.playerTeam);
      const gymAvgStats = this.calculateAverageStats(this.gymTeam);

      this.aiGymStrategy = await aiService.requestGymStrategy({
        playerTeam: this.playerTeam,
        gymTeam: this.gymTeam,
        playerAvgStats,
        gymAvgStats,
      });
      this.applyAIChallengeStrategy(this.aiGymStrategy.parsed || {});
    } catch (error) {
      console.warn(
        "[TeamBattle] AI strategy failed, using local fallback",
        error,
      );
      this.aiGymStrategy = {
        provider: "local-fallback",
        providerLabel: "Local Fallback",
        parsed: localStrategy,
      };
      this.applyAIChallengeStrategy(localStrategy);
    }
  }

  buildLocalFallbackStrategy() {
    const battleSimulator = window.battleSimulator;
    const typeChart =
      typeof battleSimulator?.getTypeChart === "function"
        ? battleSimulator.getTypeChart()
        : {};

    const scoreForPokemon = (attacker, defenders) => {
      return defenders.reduce((sum, defender) => {
        const pressure = (attacker.types || []).reduce((best, attackType) => {
          const attackData = typeChart[attackType];
          if (!attackData) return Math.max(best, 1);
          let effectiveness = 1;
          (defender.types || []).forEach((defType) => {
            if (attackData.superEffective?.includes(defType))
              effectiveness *= 2;
            else if (attackData.notVeryEffective?.includes(defType))
              effectiveness *= 0.5;
            else if (attackData.noEffect?.includes(defType)) effectiveness = 0;
          });
          return Math.max(best, effectiveness);
        }, 1);

        return sum + pressure;
      }, 0);
    };

    const rankedTeam = [...this.playerTeam]
      .map((pokemon) => ({
        name: pokemon.name,
        score: scoreForPokemon(pokemon, this.gymTeam),
      }))
      .sort((a, b) => b.score - a.score);

    return {
      strategySummary:
        "Lokale Heuristik aktiv: Team nach offensiver Typen-Pressure gegen das Gym sortiert.",
      recommendedLead: rankedTeam[0]?.name || "",
      swapPriorities: rankedTeam.slice(1, 4).map((entry) => entry.name),
      targetFocus: this.gymTeam.slice(0, 3).map((pokemon) => pokemon.name),
      riskAlerts: [],
    };
  }

  applyAIChallengeStrategy(strategy) {
    const orderHints = [];
    if (strategy?.recommendedLead) orderHints.push(strategy.recommendedLead);
    if (Array.isArray(strategy?.swapPriorities)) {
      orderHints.push(...strategy.swapPriorities);
    }

    const normalizedHints = orderHints
      .map((name) =>
        String(name || "")
          .toLowerCase()
          .trim(),
      )
      .filter(Boolean);

    if (!normalizedHints.length) return;

    const prioritized = [];
    const remaining = [...this.playerTeam];

    normalizedHints.forEach((hint) => {
      const index = remaining.findIndex(
        (pokemon) => pokemon?.name && pokemon.name.toLowerCase().includes(hint),
      );
      if (index >= 0) prioritized.push(...remaining.splice(index, 1));
    });

    if (prioritized.length) {
      this.playerTeam = [...prioritized, ...remaining];
      console.log(
        "[TeamBattle] AI strategy order applied:",
        this.playerTeam.map((p) => p.name),
      );
    }
  }

  renderMiniCard(pokemon) {
    return `
      <div class="mini-pokemon-card">
        <img src="${pokemon.image}" alt="${pokemon.name}" class="mini-pokemon-image">
        <div class="mini-pokemon-name">${pokemon.name}</div>
        <div class="mini-pokemon-types">
          ${pokemon.types.map((type) => `<span class="type-badge type-${type}">${type}</span>`).join("")}
        </div>
        <div class="mini-pokemon-stats">
          <div class="mini-stat">
            <span class="mini-stat-label">HP</span>
            <span class="mini-stat-value">${pokemon.stats.hp}</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-label">ATK</span>
            <span class="mini-stat-value">${pokemon.stats.attack}</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-label">DEF</span>
            <span class="mini-stat-value">${pokemon.stats.defense}</span>
          </div>
        </div>
      </div>
    `;
  }

  calculateAverageStats(team) {
    const sum = team.reduce(
      (acc, pokemon) => {
        acc.hp += pokemon.stats.hp;
        acc.attack += pokemon.stats.attack;
        acc.defense += pokemon.stats.defense;
        acc.speed += pokemon.stats.speed;
        return acc;
      },
      { hp: 0, attack: 0, defense: 0, speed: 0 },
    );

    return {
      hp: Math.round(sum.hp / team.length),
      attack: Math.round(sum.attack / team.length),
      defense: Math.round(sum.defense / team.length),
      speed: Math.round(sum.speed / team.length),
    };
  }

  // ===== START BATTLE =====
  startBattle() {
    console.log("[TeamBattle] Starting battle...");

    // Close overview modal
    this.overviewModal.hide();

    // Create arena modal
    this.createArenaModal();

    // Reset battle state
    this.currentPlayerIndex = 0;
    this.currentGymIndex = 0;
    this.totalDamageDealt = 0;
    this.totalTurns = 0;

    // Reset all HP
    this.playerTeam.forEach((p) => {
      p.currentHp = p.maxHp;
      p.damageDealt = 0;
    });
    this.gymTeam.forEach((p) => {
      p.currentHp = p.maxHp;
      p.damageDealt = 0;
    });

    // Show arena
    this.renderArena();
    this.arenaModal.show();
    this.requestLeaderDialogue("Der Kampf beginnt jetzt in meiner Arena.");

    // Start first 1v1
    this.startNextBattle();
  }

  // ===== RENDER ARENA =====
  renderArena() {
    const body = document.getElementById("teamBattleArenaBody");
    if (!body) return;
    const leaderName = this.gymLeader?.name || "Gym Leader";

    body.innerHTML = `
      <div class="team-battle-arena">
        <!-- Team Status Bar -->
        <div class="team-status-bar">
          <div class="team-status-side player">
            <div class="team-status-name">YOUR TEAM</div>
            <div class="team-status-icons" id="playerStatusIcons">
              ${this.renderStatusIcons(this.playerTeam, "player")}
            </div>
          </div>

          <div class="team-status-divider">VS</div>

          <div class="team-status-side gym">
            <div class="team-status-name">${leaderName}</div>
            <div class="team-status-icons" id="gymStatusIcons">
              ${this.renderStatusIcons(this.gymTeam, "gym")}
            </div>
          </div>
        </div>

        ${this.renderLeaderDialogueCard()}

        <!-- Progress Bar -->
        <div class="battle-progress">
          <div class="progress-label">
            <span>Battle Progress</span>
            <span id="progressText">0/6 Pokemon Defeated</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" id="progressBarFill" style="width: 0%">0%</div>
          </div>
        </div>

        <!-- Main Battle Container -->
        <div class="main-battle-container" id="mainBattleContainer">
          <!-- Battle will be injected here by BattleSimulator -->
        </div>
      </div>
    `;
  }

  renderStatusIcons(team, side) {
    return team
      .map((pokemon, index) => {
        const isActive =
          (side === "player" && index === this.currentPlayerIndex) ||
          (side === "gym" && index === this.currentGymIndex);
        const isFainted = pokemon.currentHp <= 0;
        const classes = `team-pokemon-icon ${isActive ? "active" : ""} ${isFainted ? "fainted" : ""}`;

        return `
        <div class="${classes}" data-index="${index}">
          <img src="${pokemon.image}" alt="${pokemon.name}">
        </div>
      `;
      })
      .join("");
  }

  updateStatusIcons() {
    const playerIcons = document.getElementById("playerStatusIcons");
    const gymIcons = document.getElementById("gymStatusIcons");

    if (playerIcons) {
      playerIcons.innerHTML = this.renderStatusIcons(this.playerTeam, "player");
    }

    if (gymIcons) {
      gymIcons.innerHTML = this.renderStatusIcons(this.gymTeam, "gym");
    }
  }

  updateProgress() {
    const defeatedCount = this.gymTeam.filter((p) => p.currentHp <= 0).length;
    const totalGymPokemon = this.gymTeam.length;
    const progressText = document.getElementById("progressText");
    const progressBarFill = document.getElementById("progressBarFill");

    if (progressText) {
      progressText.textContent = `${defeatedCount}/${totalGymPokemon} Gym Pokemon Defeated`;
    }

    if (progressBarFill) {
      const percentage = (defeatedCount / totalGymPokemon) * 100;
      progressBarFill.style.width = `${percentage}%`;
      progressBarFill.textContent = `${Math.round(percentage)}%`;
    }
  }

  // ===== BATTLE LOGIC =====
  startNextBattle() {
    const playerPokemon = this.playerTeam[this.currentPlayerIndex];
    const gymPokemon = this.gymTeam[this.currentGymIndex];
    this.pendingAutoContinue = false;

    console.log(
      "[TeamBattle] Starting battle:",
      playerPokemon.name,
      "vs",
      gymPokemon.name,
    );

    // Update status icons
    this.updateStatusIcons();

    // Use existing BattleSimulator
    if (!window.battleSimulator) {
      console.error("[TeamBattle] BattleSimulator not found!");
      return;
    }

    // Override the battle simulator's modal to render in our container
    const originalRender = window.battleSimulator.renderBattle.bind(
      window.battleSimulator,
    );
    window.battleSimulator.renderBattle = () => {
      const container = document.getElementById("mainBattleContainer");
      if (!container) return;

      const { fighter1, fighter2 } = window.battleSimulator.currentBattle;
      const controlsHtml = this.aiAutoPilotEnabled
        ? `
            <button class="battle-btn secondary" id="autoPlayBtn" onclick="window.battleSimulator.toggleAutoPlay()" ${window.battleSimulator.currentBattle.isFinished ? "disabled" : ""}>
              ${window.battleSimulator.isAutoPlaying ? "Pause AI" : "Resume AI"}
            </button>
          `
        : `
            <button class="battle-btn primary" id="nextRoundBtn" onclick="window.battleSimulator.playRound()" ${window.battleSimulator.currentBattle.isFinished ? "disabled" : ""}>
              Next Round
            </button>
            <button class="battle-btn secondary" id="autoPlayBtn" onclick="window.battleSimulator.toggleAutoPlay()" ${window.battleSimulator.currentBattle.isFinished ? "disabled" : ""}>
              ${window.battleSimulator.isAutoPlaying ? "Pause" : "Auto Play"}
            </button>
            ${
              window.battleSimulator.currentBattle.isFinished
                ? `
              <button class="battle-btn success" onclick="window.teamBattle.handleBattleEnd()">
                Continue
              </button>
            `
                : ""
            }
          `;

      container.innerHTML = `
        <div class="battle-arena">
          <div class="text-center mb-3">
            <span class="round-counter">Round ${window.battleSimulator.roundCounter}</span>
          </div>

          <div class="battle-fighters">
            ${this.renderBattleFighter(fighter1, "fighter1")}
            ${this.renderBattleFighter(fighter2, "fighter2")}
          </div>

          <div class="battle-log">
            <div class="battle-log-title">
              Battle Log
              <button class="battle-log-export-btn" onclick="window.teamBattle.exportBattleLog()" title="Log exportieren">Export</button>
            </div>
            <div id="battleLogEntries">
              ${window.battleSimulator.battleLog.length === 0 ? '<p class="text-muted">Battle has not started yet...</p>' : window.battleSimulator.battleLog.map((entry) => `<div class="log-entry ${entry.type}">${entry.message}</div>`).join("")}
            </div>
          </div>

          <div class="battle-controls">
            ${controlsHtml}
          </div>
        </div>
      `;
    };

    // Patch checkWinner to call our handler
    const originalCheckWinner = window.battleSimulator.checkWinner.bind(
      window.battleSimulator,
    );
    window.battleSimulator.checkWinner = () => {
      originalCheckWinner();

      if (window.battleSimulator.currentBattle.isFinished) {
        // Track stats
        this.totalTurns += window.battleSimulator.roundCounter;

        // Update HP values in our team arrays
        const { fighter1, fighter2 } = window.battleSimulator.currentBattle;
        playerPokemon.currentHp = fighter1.currentHp;
        gymPokemon.currentHp = fighter2.currentHp;

        // Update damage dealt
        const winner = window.battleSimulator.currentBattle.winner;
        if (winner === "fighter1") {
          playerPokemon.damageDealt += gymPokemon.maxHp - gymPokemon.currentHp;
          this.totalDamageDealt += gymPokemon.maxHp - gymPokemon.currentHp;
        } else {
          gymPokemon.damageDealt +=
            playerPokemon.maxHp - playerPokemon.currentHp;
          this.totalDamageDealt +=
            playerPokemon.maxHp - playerPokemon.currentHp;
        }

        // Update status
        this.updateStatusIcons();
        this.updateProgress();

        if (this.aiAutoPilotEnabled && !this.pendingAutoContinue) {
          this.pendingAutoContinue = true;
          setTimeout(() => {
            this.pendingAutoContinue = false;
            this.handleBattleEnd();
          }, 900);
        }
      }
    };

    // Start the battle properly with move loading
    this.startBattleWithMoves(playerPokemon, gymPokemon);
  }

  async startBattleWithMoves(playerPokemon, gymPokemon) {
    // Load moves if not already loaded
    if (!playerPokemon.moves) {
      playerPokemon.moves = await window.battleSimulator.fetchPokemonMoves(
        playerPokemon.details,
      );
    }
    if (!gymPokemon.moves) {
      gymPokemon.moves = await window.battleSimulator.fetchPokemonMoves(
        gymPokemon.details,
      );
    }

    // Create deep copies with all necessary properties including moves
    const fighter1 = {
      id: playerPokemon.id,
      name: playerPokemon.name,
      image: playerPokemon.image,
      types: playerPokemon.types,
      stats: playerPokemon.stats,
      maxHp: playerPokemon.maxHp,
      currentHp: playerPokemon.currentHp,
      details: playerPokemon.details,
      moves: playerPokemon.moves,
      level: 50,
    };

    const fighter2 = {
      id: gymPokemon.id,
      name: gymPokemon.name,
      image: gymPokemon.image,
      types: gymPokemon.types,
      stats: gymPokemon.stats,
      maxHp: gymPokemon.maxHp,
      currentHp: gymPokemon.currentHp,
      details: gymPokemon.details,
      moves: gymPokemon.moves,
      level: 50,
    };

    // Start the battle (without showing modal)
    window.battleSimulator.currentBattle = {
      fighter1: fighter1,
      fighter2: fighter2,
      winner: null,
      isFinished: false,
    };
    window.battleSimulator.battleLog = [];
    window.battleSimulator.roundCounter = 0;
    window.battleSimulator.isAutoPlaying = false;
    window.battleSimulator.renderBattle();

    if (
      this.aiAutoPilotEnabled &&
      !window.battleSimulator.currentBattle.isFinished
    ) {
      setTimeout(() => {
        if (!window.battleSimulator.isAutoPlaying) {
          window.battleSimulator.toggleAutoPlay();
        }
      }, 250);
    }
  }

  renderBattleFighter(fighter, fighterId) {
    const hpPercentage = (fighter.currentHp / fighter.maxHp) * 100;
    const hpClass =
      hpPercentage <= 20 ? "critical" : hpPercentage <= 50 ? "low" : "";
    const fighterClass =
      window.battleSimulator.currentBattle.winner === fighterId
        ? "winner"
        : fighter.currentHp <= 0
          ? "defeated"
          : "";

    return `
      <div class="battle-fighter ${fighterClass}" id="${fighterId}">
        <div class="fighter-image-wrapper">
          <img src="${fighter.image}" alt="${fighter.name}" class="fighter-image">
        </div>
        <div class="fighter-name">${fighter.name}</div>
        <div class="fighter-types">
          ${fighter.types.map((type) => `<span class="type-badge type-${type}">${type.toUpperCase()}</span>`).join("")}
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

  handleBattleEnd() {
    const winner = window.battleSimulator.currentBattle.winner;
    console.log("[TeamBattle] Battle ended, winner:", winner);

    if (winner === "fighter2") {
      // Gym Pokemon won - Player Pokemon fainted
      this.requestLeaderDialogue(
        "Der Spieler hat gerade ein eigenes Pokemon verloren.",
      );
      this.playerTeam[this.currentPlayerIndex].currentHp = 0;
      this.currentPlayerIndex++;

      if (this.currentPlayerIndex >= this.playerTeam.length) {
        // Player lost all Pokemon
        this.showDefeatScreen();
        return;
      }

      // Next player Pokemon
      this.startNextBattle();
    } else {
      // Player Pokemon won - Gym Pokemon fainted
      const defeatedGymPokemon = this.gymTeam[this.currentGymIndex];
      const strongestDefeated =
        Number(defeatedGymPokemon?.id) === Number(this.strongestGymPokemonId);

      if (strongestDefeated) {
        this.requestLeaderDialogue(
          "Der Spieler hat gerade dein staerkstes Pokemon besiegt.",
        );
      } else {
        this.requestLeaderDialogue(
          "Der Spieler hat gerade eines deiner Pokemon besiegt.",
        );
      }

      this.gymTeam[this.currentGymIndex].currentHp = 0;
      this.currentGymIndex++;

      if (this.currentGymIndex >= this.gymTeam.length) {
        // Player won!
        this.showVictoryScreen();
        return;
      }

      // Next gym Pokemon
      this.startNextBattle();
    }
  }

  // ===== VICTORY/DEFEAT SCREENS =====
  showVictoryScreen() {
    console.log("[TeamBattle] Player victory!");
    this.requestLeaderDialogue("Der Spieler hat die Arena besiegt.");

    // Calculate MVP
    this.mvpPokemon = this.playerTeam.reduce(
      (max, p) => ((p.damageDealt || 0) > (max.damageDealt || 0) ? p : max),
      this.playerTeam[0],
    );

    this.showResultScreen(true);
  }

  showDefeatScreen() {
    console.log("[TeamBattle] Player defeat!");
    this.requestLeaderDialogue(
      "Der Spieler ist geschlagen und die Arena bleibt bestehen.",
    );

    // Calculate MVP (Gym Team)
    this.mvpPokemon = this.gymTeam.reduce(
      (max, p) => ((p.damageDealt || 0) > (max.damageDealt || 0) ? p : max),
      this.gymTeam[0],
    );

    this.showResultScreen(false);
  }

  showResultScreen(isVictory) {
    if (window.battleHistory) {
      window.battleHistory.addEntry({
        playerTeam: this.playerTeam,
        gymLeader: this.gymLeader,
        result: isVictory ? "win" : "loss",
        totalDamageDealt: this.totalDamageDealt,
        totalTurns: this.totalTurns,
        mvpPokemon: this.mvpPokemon,
        pokemonUsed: this.currentPlayerIndex + 1,
      });
    }

    const resultHTML = `
      <div class="battle-result-screen">
        ${isVictory ? this.createConfetti() : ""}
        <div class="battle-result-content">
          <div class="result-title ${isVictory ? "victory" : "defeat"}">
            ${isVictory ? "🏆 VICTORY!" : "💀 DEFEAT"}
          </div>
          <div class="result-subtitle">
            ${isVictory ? "You defeated the Gym Leader!" : "The Gym Leader defeated you!"}
          </div>

          <div class="result-stats">
            <div class="result-stat">
              <div class="result-stat-label">Total Turns</div>
              <div class="result-stat-value">${this.totalTurns}</div>
            </div>
            <div class="result-stat">
              <div class="result-stat-label">Damage Dealt</div>
              <div class="result-stat-value">${this.totalDamageDealt}</div>
            </div>
            <div class="result-stat">
              <div class="result-stat-label">Pokemon Used</div>
              <div class="result-stat-value">${this.currentPlayerIndex + 1}/6</div>
            </div>
          </div>

          <div class="result-mvp">
            <div class="result-mvp-title">⭐ MVP Pokemon</div>
            <div class="result-mvp-pokemon">
              <img src="${this.mvpPokemon.image}" alt="${this.mvpPokemon.name}">
              <div class="result-mvp-pokemon-name">${this.mvpPokemon.name}</div>
            </div>
          </div>

          <div class="result-actions">
            <button class="result-btn primary" onclick="window.teamBattle.restartChallenge()">
              Nochmal
            </button>
            <button class="result-btn secondary" onclick="window.teamBattle.showBattleHistory()">
              Kampfhistorie
            </button>
            <button class="result-btn secondary" onclick="window.teamBattle.closeAll()">
              Schliessen
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", resultHTML);
  }

  createConfetti() {
    let confettiHTML = '<div class="confetti-container">';
    const colors = [
      "#ff6b6b",
      "#4ecdc4",
      "#ffd93d",
      "#2ecc71",
      "#3498db",
      "#9b59b6",
    ];

    for (let i = 0; i < 50; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 3;
      const duration = 2 + Math.random() * 2;

      confettiHTML += `
        <div class="confetti" style="
          left: ${left}%;
          background: ${color};
          animation-delay: ${delay}s;
          animation-duration: ${duration}s;
        "></div>
      `;
    }

    confettiHTML += "</div>";
    return confettiHTML;
  }

  exportBattleLog() {
    const log = window.battleSimulator?.battleLog || [];
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        gymLeader: this.gymLeader,
        playerTeam: this.playerTeam.map((p) => ({
          id: p.id,
          name: p.name,
          types: p.types,
        })),
        gymTeam: this.gymTeam.map((p) => ({
          id: p.id,
          name: p.name,
          types: p.types,
        })),
        totalTurns: this.totalTurns,
        totalDamageDealt: this.totalDamageDealt,
        mvpPokemon: this.mvpPokemon
          ? { id: this.mvpPokemon.id, name: this.mvpPokemon.name }
          : null,
      },
      battleLog: log.map((entry) => ({
        type: entry.type,
        message: entry.message,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `battle-log-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  showBattleHistory() {
    this.closeAll();

    if (!window.battleHistory) return;

    const history = window.battleHistory.getHistory();
    const stats = window.battleHistory.getStats();

    const modalId = "battleHistoryModal";
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const historyRows = history
      .slice(0, 20)
      .map((entry) => {
        const date = new Date(entry.date).toLocaleDateString("de-DE");
        const resultClass =
          entry.result === "win" ? "history-win" : "history-loss";
        const resultText = entry.result === "win" ? "Sieg" : "Niederlage";
        const leader = entry.gymLeader?.name || "Unbekannt";
        const mvp = entry.mvpPokemon?.name || "-";
        return `
        <tr class="${resultClass}">
          <td>${date}</td>
          <td>${leader}</td>
          <td>${resultText}</td>
          <td>${entry.totalDamageDealt}</td>
          <td>${entry.totalTurns}</td>
          <td style="text-transform:capitalize">${mvp}</td>
        </tr>
      `;
      })
      .join("");

    const modalHTML = `
      <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl">
          <div class="modal-content" style="background:var(--glass-95,#f8f9fa);border-radius:var(--radius-xxl);">
            <div class="modal-header" style="border-bottom:1px solid rgba(0,0,0,0.08);">
              <h5 class="modal-title" style="font-family:var(--font-title);font-weight:700;">Kampfhistorie</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="battle-history-stats">
                <div class="history-stat-card">
                  <div class="history-stat-value">${stats.totalBattles}</div>
                  <div class="history-stat-label">Kaempfe</div>
                </div>
                <div class="history-stat-card">
                  <div class="history-stat-value">${stats.wins}</div>
                  <div class="history-stat-label">Siege</div>
                </div>
                <div class="history-stat-card">
                  <div class="history-stat-value">${stats.losses}</div>
                  <div class="history-stat-label">Niederlagen</div>
                </div>
                <div class="history-stat-card">
                  <div class="history-stat-value">${stats.winRate}%</div>
                  <div class="history-stat-label">Siegrate</div>
                </div>
                <div class="history-stat-card">
                  <div class="history-stat-value">${stats.highestDamage}</div>
                  <div class="history-stat-label">Max. Schaden</div>
                </div>
                <div class="history-stat-card">
                  <div class="history-stat-value" style="text-transform:capitalize">${stats.topMvp?.name || "-"}</div>
                  <div class="history-stat-label">Top MVP</div>
                </div>
              </div>

              ${
                stats.mostUsed.length
                  ? `
                <div class="history-most-used">
                  <h6>Meistgenutzte Pokemon</h6>
                  <div class="most-used-list">
                    ${stats.mostUsed.map((p) => `<span class="most-used-badge" style="text-transform:capitalize">${p.name} (${p.count}x)</span>`).join("")}
                  </div>
                </div>
              `
                  : ""
              }

              <div class="battle-history-table-wrapper">
                <table class="battle-history-table">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Arenaleiter</th>
                      <th>Ergebnis</th>
                      <th>Schaden</th>
                      <th>Runden</th>
                      <th>MVP</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${historyRows || '<tr><td colspan="6">Keine Kaempfe bisher.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    const bsModal = new bootstrap.Modal(document.getElementById(modalId));
    bsModal.show();
  }

  restartChallenge() {
    // Remove result screen
    const resultScreen = document.querySelector(".battle-result-screen");
    if (resultScreen) resultScreen.remove();

    // Close arena modal
    if (this.arenaModal) this.arenaModal.hide();

    // Restart with same teams
    this.startBattle();
  }

  closeAll() {
    // Remove result screen
    const resultScreen = document.querySelector(".battle-result-screen");
    if (resultScreen) resultScreen.remove();

    // Close modals
    if (this.arenaModal) this.arenaModal.hide();
    if (this.overviewModal) this.overviewModal.hide();
  }
}

// Create global instance
if (!window.teamBattle) {
  window.teamBattle = new TeamBattleSystem();
}

console.log("[TeamBattle] Team Battle Module loaded");
