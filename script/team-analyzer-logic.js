(function () {
  const Core = window.PokemonTeamAnalyzerCore;
  if (!Core) {
    console.error("Core not loaded");
    return;
  }
  const TE = window.TypeEffectiveness;

  Core.prototype.analyzeTeam = function (team) {
    const analysis = { weaknesses: {}, resistances: {}, immunities: {}, coverage: {}, recommendations: [] };
    const teamTypes = new Set();
    team.forEach((p) => p.types.forEach((t) => teamTypes.add(t)));
    this.collectWeaknesses(analysis, team);
    this.collectDefenses(analysis, teamTypes);
    analysis.coverage = this.analyzeCoverage(teamTypes);
    analysis.recommendations = this.generateRecommendations(analysis, teamTypes);
    return analysis;
  };

  Core.prototype.collectWeaknesses = function (analysis, team) {
    TE.getAllTypes().forEach((atk) => {
      let score = 0;
      const affected = [];
      team.forEach((p) => {
        const eff = this.calculateTypeEffectiveness(atk, p.types);
        if (eff > 1) {
          score += eff;
          affected.push({ name: p.name, effectiveness: eff });
        }
      });
      if (score > 0) {
        analysis.weaknesses[atk] = { score, affected, severity: this.getSeverityLevel(score, team.length) };
      }
    });
  };

  Core.prototype.collectDefenses = function (analysis, teamTypes) {
    const chart = TE.getChart();
    teamTypes.forEach((def) => {
      const data = chart[def];
      if (!data) return;
      data.resist.forEach((r) => this.tallyDefense(analysis.resistances, r, def));
      data.immune.forEach((i) => this.tallyDefense(analysis.immunities, i, def));
    });
  };

  Core.prototype.tallyDefense = function (bucket, type, sourceType) {
    if (!bucket[type]) bucket[type] = { count: 0, types: [] };
    bucket[type].count++;
    bucket[type].types.push(sourceType);
  };

  Core.prototype.calculateTypeEffectiveness = function (atk, defendTypes) {
    return TE.defensiveMultiplier(atk, defendTypes);
  };

  Core.prototype.analyzeCoverage = function (teamTypes) {
    const coverage = {};
    TE.getAllTypes().forEach((def) => {
      const best = this.bestCoverageFor(def, teamTypes);
      coverage[def] = { effectiveness: best.value, coveringTypes: best.types, covered: best.value > 1 };
    });
    return coverage;
  };

  Core.prototype.bestCoverageFor = function (def, teamTypes) {
    let value = 0;
    let types = [];
    Array.from(teamTypes).forEach((atk) => {
      const e = this.calculateOffensiveEffectiveness(atk, def);
      if (e > value) {
        value = e;
        types = [atk];
      } else if (e === value && e > 1) {
        types.push(atk);
      }
    });
    return { value, types };
  };

  Core.prototype.calculateOffensiveEffectiveness = function (atk, def) {
    return TE.offensiveEffectiveness(atk, def);
  };

  Core.prototype.getSeverityLevel = function (score, size) {
    const avg = score / size;
    if (avg >= 4) return { level: "critical", text: "Kritische Schwäche" };
    if (avg >= 2) return { level: "high", text: "Hohe Schwäche" };
    if (avg >= 1) return { level: "medium", text: "Moderate Schwäche" };
    return { level: "low", text: "Geringe Schwäche" };
  };

  Core.prototype.generateRecommendations = function (analysis, teamTypes) {
    const rec = [];
    const critical = Object.entries(analysis.weaknesses)
      .filter(([, d]) => d.severity.level === "critical")
      .map(([t]) => t);
    if (critical.length) {
      rec.push({ type: "weakness", priority: "high", message: `Kritische Schwäche gegen: ${critical.join(", ")}. Erwäge Pokemon mit Resistenz.` });
    }
    const uncovered = Object.entries(analysis.coverage).filter(([, d]) => !d.covered).map(([t]) => t);
    if (uncovered.length > 12) {
      rec.push({ type: "coverage", priority: "medium", message: "Schlechte offensive Coverage. Erwäge vielseitigere Angreifer." });
    }
    if (teamTypes.size < 3) {
      rec.push({ type: "diversity", priority: "medium", message: "Team hat wenig Typ-Diversität." });
    }
    if (rec.length === 0) {
      rec.push({ type: "general", priority: "low", message: "Team wirkt solide. Feintuning möglich." });
    }
    return rec;
  };
})();
