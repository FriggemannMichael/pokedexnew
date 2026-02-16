// Battle History Module
class BattleHistory {
  constructor() {
    this.storageKey = "pokemonBattleHistory";
    this.maxEntries = 50;
  }

  getHistory() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  addEntry(entry) {
    const history = this.getHistory();
    history.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      playerTeam: (entry.playerTeam || []).map((p) => ({
        id: p.id,
        name: p.name,
        types: p.types,
      })),
      gymLeader: entry.gymLeader
        ? {
            name: entry.gymLeader.name || "Unbekannt",
            type: entry.gymLeader.type || "normal",
          }
        : null,
      result: entry.result || "loss",
      totalDamageDealt: entry.totalDamageDealt || 0,
      totalTurns: entry.totalTurns || 0,
      mvpPokemon: entry.mvpPokemon
        ? {
            id: entry.mvpPokemon.id,
            name: entry.mvpPokemon.name,
            damageDealt: entry.mvpPokemon.damageDealt || 0,
          }
        : null,
      pokemonUsed: entry.pokemonUsed || 0,
    });

    while (history.length > this.maxEntries) {
      history.pop();
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(history));
    } catch (e) {
      console.warn("[BattleHistory] Could not save:", e);
    }
  }

  getStats() {
    const history = this.getHistory();
    const wins = history.filter((e) => e.result === "win").length;
    const losses = history.filter((e) => e.result === "loss").length;
    const total = history.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    const pokemonUsage = {};
    history.forEach((entry) => {
      (entry.playerTeam || []).forEach((p) => {
        if (p.name) pokemonUsage[p.name] = (pokemonUsage[p.name] || 0) + 1;
      });
    });
    const mostUsed = Object.entries(pokemonUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    let highestDamage = 0;
    history.forEach((entry) => {
      if (entry.totalDamageDealt > highestDamage) {
        highestDamage = entry.totalDamageDealt;
      }
    });

    const mvpCounts = {};
    history.forEach((entry) => {
      if (entry.mvpPokemon?.name) {
        mvpCounts[entry.mvpPokemon.name] =
          (mvpCounts[entry.mvpPokemon.name] || 0) + 1;
      }
    });
    const topMvp =
      Object.entries(mvpCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 1)
        .map(([name, count]) => ({ name, count }))[0] || null;

    return {
      totalBattles: total,
      wins,
      losses,
      winRate,
      mostUsed,
      highestDamage,
      topMvp,
    };
  }

  clearHistory() {
    localStorage.removeItem(this.storageKey);
  }
}

if (!window.battleHistory) {
  window.battleHistory = new BattleHistory();
}
