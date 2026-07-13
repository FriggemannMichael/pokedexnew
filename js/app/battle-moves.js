/* Move-Auswahl für den Kampf: die vier besten Attacken eines Pokémon,
   geladen über den Backend-Cache. Portiert aus script/battle-sim-moves.js. */

function pokeapiPfad(url) {
  const teil = String(url).split("/api/v2/")[1];
  return (teil || String(url).replace(/^\//, "")).replace(/\/$/, "");
}

async function pokeapiHolen(urlOderPfad) {
  const res = await fetch(`${BACKEND}/api/pokeapi/${pokeapiPfad(urlOderPfad)}`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/** Wie "gut gelernt" ist ein Move? Level-up schlägt TM schlägt Ei. */
function moveLernwert(entry) {
  const details = entry.version_group_details || [];
  if (!details.length) return 0;
  return Math.max(
    ...details.map((d) => {
      const bonus =
        { "level-up": 80, machine: 55, tutor: 45, egg: 25 }[
          d.move_learn_method?.name
        ] || 0;
      return (d.level_learned_at || 0) + bonus;
    }),
  );
}

/** Die 16 aussichtsreichsten Kandidaten – mehr Anfragen lohnen nicht. */
function moveKandidaten(details) {
  const bewertet = (details.moves || [])
    .map((entry, index) => ({ entry, index, score: moveLernwert(entry) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const gewaehlt = [];
  const gesehen = new Set();
  for (const item of bewertet) {
    const name = item.entry?.move?.name;
    if (!name || gesehen.has(name)) continue;
    gesehen.add(name);
    gewaehlt.push(item.entry);
    if (gewaehlt.length >= 16) break;
  }
  return gewaehlt;
}

async function moveDetails(url) {
  try {
    const d = await pokeapiHolen(url);
    return {
      name: d.name,
      anzeige: d.name.replace(/-/g, " "),
      power: d.power ?? 0,
      accuracy: d.accuracy || 100,
      type: d.type.name,
      damageClass: d.damage_class.name,
      priority: d.priority || 0,
      effectChance: d.effect_chance || 0,
      drain: d.meta?.drain || 0,
      healing: d.meta?.healing || 0,
      critRate: d.meta?.crit_rate || 0,
      flinchChance: d.meta?.flinch_chance || 0,
      statChanges: d.stat_changes || [],
    };
  } catch {
    return null;
  }
}

function moveWert(move, typen, stats) {
  let score = (move.power || 0) * (Math.max(30, move.accuracy) / 100);
  if (typen.includes(move.type)) score += 30; // STAB
  if (move.damageClass === "physical" && stats.attack >= stats.specialAttack)
    score += 12;
  if (move.damageClass === "special" && stats.specialAttack >= stats.attack)
    score += 12;
  score += Math.max(0, move.priority) * 8 + Math.max(0, move.critRate) * 4;
  return score;
}

function auffuellen(auswahl, sortiert) {
  for (const move of sortiert) {
    if (auswahl.length >= 4) break;
    if (!auswahl.includes(move)) auswahl.push(move);
  }
  return auswahl;
}

/** Vier Moves: stark, treffsicher, möglichst verschiedene Typen. */
function besteMoves(moves, typen, stats) {
  const sortiert = moves
    .map((move) => ({ move, score: moveWert(move, typen, stats) }))
    .sort((a, b) => b.score - a.score)
    .map((e) => e.move);
  const auswahl = [];
  const typenBenutzt = new Set();
  for (const move of sortiert) {
    if (auswahl.length >= 4) break;
    if (typenBenutzt.has(move.type) && auswahl.length >= 2) continue;
    auswahl.push(move);
    typenBenutzt.add(move.type);
  }
  return auffuellen(auswahl, sortiert);
}

/** Rückfallebene, wenn kein Move geladen werden konnte. */
function standardMoves(typen) {
  const tabelle = {
    fire: { name: "ember", anzeige: "Glut", power: 40, damageClass: "special" },
    water: {
      name: "water-gun",
      anzeige: "Aquaknarre",
      power: 40,
      damageClass: "special",
    },
    grass: {
      name: "vine-whip",
      anzeige: "Rankenhieb",
      power: 45,
      damageClass: "physical",
    },
    electric: {
      name: "thunder-shock",
      anzeige: "Donnerschock",
      power: 40,
      damageClass: "special",
    },
    psychic: {
      name: "confusion",
      anzeige: "Konfusion",
      power: 50,
      damageClass: "special",
    },
    fighting: {
      name: "karate-chop",
      anzeige: "Karateschlag",
      power: 50,
      damageClass: "physical",
    },
    rock: {
      name: "rock-throw",
      anzeige: "Steinwurf",
      power: 50,
      damageClass: "physical",
    },
  };
  const basis = { accuracy: 100, priority: 0, statChanges: [] };
  const tackle = {
    ...basis,
    name: "tackle",
    anzeige: "Tackle",
    power: 40,
    type: "normal",
    damageClass: "physical",
  };
  const eintrag = tabelle[typen[0]];
  return eintrag
    ? [{ ...basis, ...eintrag, type: typen[0] }, tackle]
    : [tackle];
}

async function movesLaden(details) {
  try {
    const kandidaten = moveKandidaten(details);
    const alle = await Promise.all(
      kandidaten.map((k) => moveDetails(k.move.url)),
    );
    const brauchbar = alle.filter((m) => m && m.power > 0);
    const typen = (details.types || []).map((t) => t.type.name);
    const auswahl = besteMoves(brauchbar, typen, kampfStats(details));
    return auswahl.length ? auswahl : standardMoves(typen);
  } catch {
    return standardMoves((details?.types || []).map((t) => t.type.name));
  }
}
