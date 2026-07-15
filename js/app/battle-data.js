/* Kampf-Grundlagen: Arenaleiter, Typen-Tabelle, Schadensformel, Effekte.
   Reine Logik ohne DOM – portiert aus script/battle-sim-core.js. */

/* Die Kanto-Liga: acht Arenen in fester Reihenfolge, dann der Champ.
   Jedes Team ist typecht (gegen die PokéAPI geprüft), hat sechs Pokémon
   und endet mit dem Ass. Das Level steigt von Arena zu Arena – der
   Spieler kämpft immer auf Level 50, die Liga wächst ihm entgegen. */
const GYM_LEADERS = {
  rocko: {
    name: "Rocko",
    titel: "Arenaleiter",
    type: "rock",
    badge: "🪨",
    level: 25,
    style: "hart und unnachgiebig",
    // Kleinstein, Georok, Onix, Rihorn, Geowaz, Aerodactyl
    pokemon: [74, 75, 95, 111, 76, 142],
  },
  misty: {
    name: "Misty",
    titel: "Arenaleiterin",
    type: "water",
    badge: "💧",
    level: 30,
    style: "temperamentvoll und direkt",
    // Goldini, Enton, Seeper, Sterndu, Starmie, Garados
    pokemon: [118, 54, 116, 120, 121, 130],
  },
  majorbob: {
    name: "Major Bob",
    titel: "Arenaleiter",
    type: "electric",
    badge: "⚡",
    level: 34,
    style: "laut und aggressiv",
    // Voltobal, Magnetilo, Pikachu, Magneton, Lektrobal, Raichu
    pokemon: [100, 81, 25, 82, 101, 26],
  },
  erika: {
    name: "Erika",
    titel: "Arenaleiterin",
    type: "grass",
    badge: "🌿",
    level: 38,
    style: "ruhig und präzise",
    // Myrapla, Knofensa, Owei, Tangela, Sarzenia, Giflor
    pokemon: [43, 69, 102, 114, 71, 45],
  },
  koga: {
    name: "Koga",
    titel: "Arenaleiter",
    type: "poison",
    badge: "☠️",
    level: 42,
    style: "listig und distanziert",
    // Zubat, Smogon, Sleima, Golbat, Smogmog, Sleimok
    pokemon: [41, 109, 88, 42, 110, 89],
  },
  sabrina: {
    name: "Sabrina",
    titel: "Arenaleiterin",
    type: "psychic",
    badge: "🔮",
    level: 46,
    style: "kalt und kontrolliert",
    // Traumato, Abra, Pantimos, Hypno, Kadabra, Simsala
    pokemon: [96, 63, 122, 97, 64, 65],
  },
  pyro: {
    name: "Pyro",
    titel: "Arenaleiter",
    type: "fire",
    badge: "🔥",
    level: 50,
    style: "dramatisch und stolz",
    // Fukano, Vulpix, Ponita, Gallopa, Vulnona, Arkani
    pokemon: [58, 37, 77, 78, 38, 59],
  },
  giovanni: {
    name: "Giovanni",
    titel: "Arenaleiter",
    type: "ground",
    badge: "⛰️",
    level: 55,
    style: "dominant und einschüchternd",
    // Sandan, Tragosso, Digda, Knogga, Digdri, Rizeros
    pokemon: [27, 104, 50, 105, 51, 112],
  },
  champ: {
    name: "Blau",
    titel: "Champ",
    type: "dragon",
    badge: "👑",
    level: 60,
    finale: true,
    style: "arrogant und brillant",
    // Tauboss, Simsala, Rizeros, Arkani, Kokowei, Turtok
    pokemon: [18, 65, 112, 59, 103, 9],
  },
};

/* Die Liga-Reihenfolge: eine Arena schaltet die nächste frei. */
const GYM_ORDER = Object.keys(GYM_LEADERS);

/* Die lokale Typen-Tabelle: reicht für den Kampf völlig und spart die
   18 Zusatz-Anfragen an /type/, die die alte Version vorab machte. */
const TYPE_CHART = {
  fire: {
    superEffective: ["grass", "ice", "bug", "steel"],
    notVeryEffective: ["fire", "water", "rock", "dragon"],
  },
  water: {
    superEffective: ["fire", "ground", "rock"],
    notVeryEffective: ["water", "grass", "dragon"],
  },
  grass: {
    superEffective: ["water", "ground", "rock"],
    notVeryEffective: [
      "fire",
      "grass",
      "poison",
      "flying",
      "bug",
      "dragon",
      "steel",
    ],
  },
  electric: {
    superEffective: ["water", "flying"],
    notVeryEffective: ["grass", "electric", "dragon"],
    noEffect: ["ground"],
  },
  psychic: {
    superEffective: ["fighting", "poison"],
    notVeryEffective: ["psychic", "steel"],
    noEffect: ["dark"],
  },
  ice: {
    superEffective: ["grass", "ground", "flying", "dragon"],
    notVeryEffective: ["fire", "water", "ice", "steel"],
  },
  dragon: {
    superEffective: ["dragon"],
    notVeryEffective: ["steel"],
    noEffect: ["fairy"],
  },
  fighting: {
    superEffective: ["normal", "ice", "rock", "dark", "steel"],
    notVeryEffective: ["poison", "flying", "psychic", "bug", "fairy"],
    noEffect: ["ghost"],
  },
  poison: {
    superEffective: ["grass", "fairy"],
    notVeryEffective: ["poison", "ground", "rock", "ghost"],
    noEffect: ["steel"],
  },
  ground: {
    superEffective: ["fire", "electric", "poison", "rock", "steel"],
    notVeryEffective: ["grass", "bug"],
    noEffect: ["flying"],
  },
  flying: {
    superEffective: ["grass", "fighting", "bug"],
    notVeryEffective: ["electric", "rock", "steel"],
  },
  bug: {
    superEffective: ["grass", "psychic", "dark"],
    notVeryEffective: [
      "fire",
      "fighting",
      "poison",
      "flying",
      "ghost",
      "steel",
      "fairy",
    ],
  },
  rock: {
    superEffective: ["fire", "ice", "flying", "bug"],
    notVeryEffective: ["fighting", "ground", "steel"],
  },
  ghost: {
    superEffective: ["psychic", "ghost"],
    notVeryEffective: ["dark"],
    noEffect: ["normal"],
  },
  steel: {
    superEffective: ["ice", "rock", "fairy"],
    notVeryEffective: ["fire", "water", "electric", "steel"],
  },
  dark: {
    superEffective: ["psychic", "ghost"],
    notVeryEffective: ["fighting", "dark", "fairy"],
  },
  fairy: {
    superEffective: ["fighting", "dragon", "dark"],
    notVeryEffective: ["fire", "poison", "steel"],
  },
  normal: { notVeryEffective: ["rock", "steel"], noEffect: ["ghost"] },
};

function effektivitaet(moveType, defenderTypes) {
  const data = TYPE_CHART[moveType];
  if (!data) return 1;
  let eff = 1;
  (defenderTypes || []).forEach((dt) => {
    if (data.superEffective?.includes(dt)) eff *= 2;
    else if (data.notVeryEffective?.includes(dt)) eff *= 0.5;
    else if (data.noEffect?.includes(dt)) eff = 0;
  });
  return eff;
}

/** Basiswerte aus den PokéAPI-Details, mit Sicherheitsnetz. */
function kampfStats(details) {
  const stats = {
    hp: 100,
    attack: 50,
    defense: 50,
    speed: 50,
    specialAttack: 50,
    specialDefense: 50,
  };
  const namen = {
    hp: "hp",
    attack: "attack",
    defense: "defense",
    speed: "speed",
    "special-attack": "specialAttack",
    "special-defense": "specialDefense",
  };
  (details?.stats || []).forEach((s) => {
    const ziel = namen[s.stat.name];
    if (ziel) stats[ziel] = s.base_stat;
  });
  return stats;
}

/** Frischer Kampfzustand: volle KP, keine Statusstufen. */
function kampfbereit(p) {
  return {
    ...p,
    level: p.level || 50,
    flinched: false,
    statStages: {
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
    },
  };
}

/** Ein Wert unter Berücksichtigung der Statusstufen (-6 … +6). */
function kampfwert(fighter, statName) {
  const base = fighter.stats?.[statName] || 1;
  const stufe = Math.max(-6, Math.min(6, fighter.statStages?.[statName] || 0));
  const faktor = stufe >= 0 ? (2 + stufe) / 2 : 2 / (2 - stufe);
  return Math.max(1, base * faktor);
}

function angriffsWerte(attacker, defender, move) {
  return move.damageClass === "physical"
    ? {
        atk: kampfwert(attacker, "attack"),
        def: kampfwert(defender, "defense"),
      }
    : {
        atk: kampfwert(attacker, "specialAttack"),
        def: kampfwert(defender, "specialDefense"),
      };
}

/** Die klassische Schadensformel: Level 50, STAB, Volltreffer, Streuung. */
function schadenBerechnen(attacker, defender, move) {
  if (move.damageClass !== "physical" && move.damageClass !== "special")
    return { damage: 0, effectiveness: 1, isCritical: false };
  const { atk, def } = angriffsWerte(attacker, defender, move);
  const level = attacker.level || 50;
  let damage = (((2 * level) / 5 + 2) * move.power * (atk / def)) / 50 + 2;
  const isCritical =
    Math.random() < Math.min(0.5, 0.0625 + (move.critRate || 0) * 0.0625);
  if (isCritical) damage *= 1.5;
  if (attacker.types.includes(move.type)) damage *= 1.5; // STAB
  const eff = effektivitaet(move.type, defender.types);
  if (eff === 0) return { damage: 0, effectiveness: 0, isCritical };
  damage *= eff * (0.85 + Math.random() * 0.15);
  return {
    damage: Math.max(1, Math.floor(damage)),
    effectiveness: eff,
    isCritical,
  };
}

/* ---- Nebenwirkungen einer Attacke ---- */

function heilen(fighter, menge) {
  const vorher = fighter.currentHp;
  fighter.currentHp = Math.min(
    fighter.maxHp,
    fighter.currentHp + Math.max(0, menge),
  );
  return Math.round(fighter.currentHp - vorher);
}

function drainAnwenden(attacker, move, schaden, log) {
  if (move.drain > 0 && schaden > 0) {
    const geheilt = heilen(attacker, Math.floor(schaden * (move.drain / 100)));
    if (geheilt > 0) log(`${attacker.name} regeneriert ${geheilt} KP!`, "heal");
  } else if (move.drain < 0 && schaden > 0) {
    const rueckstoss = Math.floor(schaden * (Math.abs(move.drain) / 100));
    attacker.currentHp = Math.max(0, attacker.currentHp - rueckstoss);
    if (rueckstoss > 0)
      log(`${attacker.name} erleidet ${rueckstoss} Rückstoß!`, "damage");
  }
  if (move.healing > 0) {
    const geheilt = heilen(
      attacker,
      Math.floor(attacker.maxHp * (move.healing / 100)),
    );
    if (geheilt > 0) log(`${attacker.name} heilt ${geheilt} KP!`, "heal");
  }
}

function flinchAnwenden(defender, move, log) {
  if ((move.flinchChance || 0) <= 0 || Math.random() * 100 > move.flinchChance)
    return;
  defender.flinched = true;
  log(`${defender.name} schreckt zurück!`, "flinch");
}

const STAT_KAMPF_DE = {
  attack: "Angriff",
  defense: "Verteidigung",
  specialAttack: "Sp.-Angriff",
  specialDefense: "Sp.-Verteidigung",
  speed: "Initiative",
};
const STAT_API_ZU_KAMPF = {
  attack: "attack",
  defense: "defense",
  "special-attack": "specialAttack",
  "special-defense": "specialDefense",
  speed: "speed",
};

function statStufeAendern(fighter, statName, amount, log) {
  const vorher = fighter.statStages[statName] || 0;
  const nachher = Math.max(-6, Math.min(6, vorher + amount));
  fighter.statStages[statName] = nachher;
  if (nachher !== vorher)
    log(
      `${fighter.name}: ${STAT_KAMPF_DE[statName]} ${amount > 0 ? "steigt" : "fällt"}!`,
      "stat",
    );
}

function statAenderungenAnwenden(attacker, defender, move, log) {
  if (!move.statChanges?.length) return;
  if (Math.random() * 100 > (move.effectChance || 100)) return;
  move.statChanges.forEach((c) => {
    const stat = STAT_API_ZU_KAMPF[c.stat?.name];
    if (!stat || !c.change) return;
    statStufeAendern(c.change > 0 ? attacker : defender, stat, c.change, log);
  });
}
