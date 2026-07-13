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

  _snapshotTeam(team) {
    return (team || []).map((p) => ({ id: p.id, name: p.name, types: p.types }));
  }

  _snapshotLeader(leader) {
    if (!leader) return null;
    return { name: leader.name || "Unbekannt", type: leader.type || "normal" };
  }

  _snapshotMvp(mvp) {
    if (!mvp) return null;
    return { id: mvp.id, name: mvp.name, damageDealt: mvp.damageDealt || 0 };
  }

  buildEntry(entry) {
    return {
      id: Date.now(),
      date: new Date().toISOString(),
      playerTeam: this._snapshotTeam(entry.playerTeam),
      gymLeader: this._snapshotLeader(entry.gymLeader),
      result: entry.result || "loss",
      totalDamageDealt: entry.totalDamageDealt || 0,
      totalTurns: entry.totalTurns || 0,
      mvpPokemon: this._snapshotMvp(entry.mvpPokemon),
      pokemonUsed: entry.pokemonUsed || 0,
    };
  }

  save(history) {
    while (history.length > this.maxEntries) {
      history.pop();
    }
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(history));
    } catch (e) {
      console.warn("[BattleHistory] Could not save:", e);
    }
  }

  addEntry(entry) {
    const record = this.buildEntry(entry);
    const history = this.getHistory();
    history.unshift(record);
    this.save(history);
    // Damit script/battle-sync.js den Kampf auch ins Konto schreiben kann.
    document.dispatchEvent(
      new CustomEvent("battleRecorded", { detail: { battle: record } }),
    );
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
    document.dispatchEvent(new CustomEvent("battleHistoryCleared"));
  }
}

if (!window.battleHistory) {
  window.battleHistory = new BattleHistory();
}
