// Single Source of Truth fuer Typen-Effektivitaet.
// Default-Tabelle (defensiv: wogegen ein Typ schwach/resistent/immun ist) ist
// gegen die PokeAPI /type damage_relations verifiziert. Der Hybrid-Sync
// (type-chart-sync.js) kann die Tabelle zur Laufzeit aus der API auffrischen.
(function (factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.TypeEffectiveness = api;
})(function () {
  const ALL_TYPES = [
    "normal", "fire", "water", "electric", "grass", "ice",
    "fighting", "poison", "ground", "flying", "psychic", "bug",
    "rock", "ghost", "dragon", "dark", "steel", "fairy",
  ];

  const DEFAULT_CHART = {
    normal: { weak: ["fighting"], resist: [], immune: ["ghost"] },
    fire: { weak: ["water", "ground", "rock"], resist: ["fire", "grass", "ice", "bug", "steel", "fairy"], immune: [] },
    water: { weak: ["electric", "grass"], resist: ["fire", "water", "ice", "steel"], immune: [] },
    electric: { weak: ["ground"], resist: ["electric", "flying", "steel"], immune: [] },
    grass: { weak: ["fire", "ice", "poison", "flying", "bug"], resist: ["water", "electric", "grass", "ground"], immune: [] },
    ice: { weak: ["fire", "fighting", "rock", "steel"], resist: ["ice"], immune: [] },
    fighting: { weak: ["flying", "psychic", "fairy"], resist: ["bug", "rock", "dark"], immune: [] },
    poison: { weak: ["ground", "psychic"], resist: ["grass", "fighting", "poison", "bug", "fairy"], immune: [] },
    ground: { weak: ["water", "grass", "ice"], resist: ["poison", "rock"], immune: ["electric"] },
    flying: { weak: ["electric", "ice", "rock"], resist: ["grass", "fighting", "bug"], immune: ["ground"] },
    psychic: { weak: ["bug", "ghost", "dark"], resist: ["fighting", "psychic"], immune: [] },
    bug: { weak: ["fire", "flying", "rock"], resist: ["grass", "fighting", "ground"], immune: [] },
    rock: { weak: ["water", "grass", "fighting", "ground", "steel"], resist: ["normal", "fire", "poison", "flying"], immune: [] },
    ghost: { weak: ["ghost", "dark"], resist: ["poison", "bug"], immune: ["normal", "fighting"] },
    dragon: { weak: ["ice", "dragon", "fairy"], resist: ["fire", "water", "electric", "grass"], immune: [] },
    dark: { weak: ["fighting", "bug", "fairy"], resist: ["ghost", "dark"], immune: ["psychic"] },
    steel: { weak: ["fire", "fighting", "ground"], resist: ["normal", "grass", "ice", "flying", "psychic", "bug", "rock", "dragon", "steel", "fairy"], immune: ["poison"] },
    fairy: { weak: ["poison", "steel"], resist: ["fighting", "bug", "dark"], immune: ["dragon"] },
  };

  let chart = DEFAULT_CHART;

  function getAllTypes() {
    return ALL_TYPES.slice();
  }

  function getChart() {
    return chart;
  }

  function isValidChart(next) {
    return Boolean(next) && ALL_TYPES.every((t) => next[t] && Array.isArray(next[t].weak));
  }

  function setChart(next) {
    if (isValidChart(next)) chart = next;
    return chart === next;
  }

  // Schaden-Multiplikator eines Angriffstyps gegen einen Verteidiger (1-2 Typen).
  function defensiveMultiplier(attackType, defenderTypes) {
    let eff = 1;
    (defenderTypes || []).forEach((def) => {
      const d = chart[def];
      if (!d) return;
      if (d.immune.includes(attackType)) eff = 0;
      else if (d.resist.includes(attackType)) eff *= 0.5;
      else if (d.weak.includes(attackType)) eff *= 2;
    });
    return eff;
  }

  // Offensive Effektivitaet = defensive Beziehung des Zieltyps gegen den Angriff.
  function offensiveEffectiveness(attackType, defenderType) {
    return defensiveMultiplier(attackType, [defenderType]);
  }

  // Baut eine Tabelle aus PokeAPI /type-Antworten (Array von type-Responses).
  function buildChartFromApi(typeResponses) {
    const next = {};
    (typeResponses || []).forEach((res) => {
      const rel = (res && res.damage_relations) || {};
      next[res.name] = {
        weak: (rel.double_damage_from || []).map((t) => t.name),
        resist: (rel.half_damage_from || []).map((t) => t.name),
        immune: (rel.no_damage_from || []).map((t) => t.name),
      };
    });
    return next;
  }

  return {
    getAllTypes,
    getChart,
    setChart,
    isValidChart,
    defensiveMultiplier,
    offensiveEffectiveness,
    buildChartFromApi,
  };
});
