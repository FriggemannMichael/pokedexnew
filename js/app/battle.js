/* Der Arena-Kampf: Zustand und Ablauf. Der Spieler klickt seine Attacke,
   der Arenaleiter zieht zufällig. Wer zuerst keine Pokémon mehr hat, verliert. */

const kampf = {
  leader: null,
  spieler: [],
  gegner: [],
  spielerIndex: 0,
  gegnerIndex: 0,
  runde: 0,
  zuege: 0,
  schadenGesamt: 0,
  log: [],
  laeuft: false,
  rundeLaeuft: false,
  vorbei: false,
  sieg: false,
  auto: true, // wie früher: der Kampf läuft von selbst, bis man eingreift
};

const aktiverSpieler = () => kampf.spieler[kampf.spielerIndex];
const aktiverGegner = () => kampf.gegner[kampf.gegnerIndex];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function kampfLog(text, art = "info") {
  kampf.log.push({ text, art });
}

function kampfZuruecksetzen(leader) {
  Object.assign(kampf, {
    leader,
    spieler: [],
    gegner: [],
    spielerIndex: 0,
    gegnerIndex: 0,
    runde: 0,
    zuege: 0,
    schadenGesamt: 0,
    log: [],
    laeuft: false,
    rundeLaeuft: false,
    vorbei: false,
    sieg: false,
    auto: true,
  });
}

/* ---- Auto-Kampf: die nächste Runde von selbst anstoßen ---- */

let autoTimer = null;

/** Der Move mit dem besten erwarteten Schaden gegen den aktuellen Gegner. */
function besterMoveIndex() {
  const s = aktiverSpieler();
  const g = aktiverGegner();
  let bester = 0;
  let bestwert = -1;
  (s?.moves || []).forEach((m, i) => {
    const wert =
      (m.power || 0) * effektivitaet(m.type, g?.types) * (m.accuracy / 100);
    if (wert > bestwert) {
      bestwert = wert;
      bester = i;
    }
  });
  return bester;
}

function autoPlanen() {
  clearTimeout(autoTimer);
  if (!kampf.auto || !kampf.laeuft || kampf.vorbei) return;
  autoTimer = setTimeout(() => {
    if (kampf.auto && kampf.laeuft && !kampf.vorbei && !kampf.rundeLaeuft)
      rundeSpielen(besterMoveIndex());
  }, 1100);
}

/** Ein Pokémon kampffertig machen: Details holen, KP füllen. */
async function kampfPokemon(id, seite, level) {
  const details = await pokeapiHolen(`pokemon/${id}`);
  const stats = kampfStats(details);
  return kampfbereit({
    id: details.id,
    name: NAME_DE.get(details.id) || details.name,
    types: (details.types || []).map((t) => t.type.name),
    seite,
    level,
    details,
    stats,
    maxHp: stats.hp,
    currentHp: stats.hp,
    damageDealt: 0,
    moves: null,
  });
}

/** Der häufigste Ersttyp im Gegner-Team – färbt Trainer-Duelle. */
function dominanterGegnerTyp() {
  const counts = {};
  kampf.gegner.forEach((p) => {
    counts[p.types[0]] = (counts[p.types[0]] || 0) + 1;
  });
  const beste = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return beste ? beste[0] : "normal";
}

function eroeffnungsSpruch(def) {
  if (def.finale)
    return "Du hast alle acht Orden? Dann zeig mir, ob du Champ-Material bist!";
  return def.arena
    ? `Du willst also das ${TYPE_DE[def.type]}-Emblem? Zeig, was du kannst!`
    : "Mein Team ist bereit. Zeig mir deins!";
}

/* Es treten immer 6 gegen 6 an – wer weniger hat, wird gewarnt.
   Die Frage stellt ein eigenes Sheet (kein window.confirm); die
   Antwort kommt als Promise zurück. */
let warnAntwortFn = null;

function teamBereit() {
  if (!team.length) {
    toast("Stell erst ein Team zusammen.", false);
    return Promise.resolve(false);
  }
  if (team.length >= 6) return Promise.resolve(true);
  $("warnText").textContent =
    `Dein Team hat nur ${team.length} von 6 Pokémon – der Gegner tritt mit 6 an.`;
  $("warnSheet").setAttribute("data-open", "");
  return new Promise((entscheide) => (warnAntwortFn = entscheide));
}

function warnSchliessen(weiter) {
  $("warnSheet").removeAttribute("data-open");
  if (warnAntwortFn) warnAntwortFn(weiter);
  warnAntwortFn = null;
}

/** Startet einen Kampf gegen einen beliebigen Gegner (Arena oder Trainer). */
async function kampfBeginnen(gegnerDef) {
  if (kampf.laeuft) return;
  if (!(await teamBereit())) return;
  kampfZuruecksetzen(gegnerDef);
  kampfSheetOeffnen(gegnerDef);
  kampf.spieler = await Promise.all(
    team.map((p) => kampfPokemon(p.id, "spieler", 50)),
  );
  kampf.gegner = await Promise.all(
    gegnerDef.pokemon.map((id) =>
      kampfPokemon(id, "gegner", gegnerDef.level || 50),
    ),
  );
  if (!gegnerDef.type) {
    gegnerDef.type = dominanterGegnerTyp();
    kampfSheetFarbe(gegnerDef);
  }
  kampf.laeuft = true;
  await matchupStarten();
  leaderSpruch(
    "Der Spieler fordert dich zum Kampf heraus.",
    eroeffnungsSpruch(gegnerDef),
  );
}

function kampfStarten(leaderKey) {
  const leader = GYM_LEADERS[leaderKey];
  if (leader) kampfBeginnen({ ...leader, key: leaderKey, arena: true });
}

/** Ein neues Duell: Moves der beiden Aktiven laden, Runde auf null. */
async function matchupStarten() {
  kampf.rundeLaeuft = true;
  kampfRendern();
  const s = aktiverSpieler();
  const g = aktiverGegner();
  if (!s.moves) s.moves = await movesLaden(s.details);
  if (!g.moves) g.moves = await movesLaden(g.details);
  kampf.runde = 0;
  kampfLog(`${s.name} gegen ${g.name}!`, "info");
  kampf.rundeLaeuft = false;
  kampfRendern();
  autoPlanen();
}

function zufallsMove(f) {
  return f.moves[Math.floor(Math.random() * f.moves.length)];
}

/** true, wenn der Spieler zuerst zieht (Priorität, dann Initiative). */
function spielerZuerst(s, moveS, g, moveG) {
  const prio = (moveS.priority || 0) - (moveG.priority || 0);
  if (prio) return prio > 0;
  return kampfwert(s, "speed") >= kampfwert(g, "speed");
}

async function rundeSpielen(moveIndex) {
  if (!kampf.laeuft || kampf.rundeLaeuft || kampf.vorbei) return;
  const s = aktiverSpieler();
  const g = aktiverGegner();
  const moveS = s?.moves?.[moveIndex];
  if (!moveS || !g?.moves) return;
  kampf.rundeLaeuft = true;
  kampf.runde++;
  kampf.zuege++;
  s.flinched = false;
  g.flinched = false;
  const moveG = zufallsMove(g);
  const zuerst = spielerZuerst(s, moveS, g, moveG);
  await angriffsFolge(
    zuerst
      ? [
          [s, g, moveS],
          [g, s, moveG],
        ]
      : [
          [g, s, moveG],
          [s, g, moveS],
        ],
  );
  kampf.rundeLaeuft = false;
  await rundeAbschliessen();
  autoPlanen(); // läuft der Auto-Kampf, folgt die nächste Runde von selbst
}

async function angriffsFolge(zuege) {
  const [erster, zweiter] = zuege;
  angriffAusfuehren(...erster);
  kampfRendern();
  await pause(900);
  if (zweiter[0].currentHp > 0 && zweiter[1].currentHp > 0) {
    if (zweiter[0].flinched)
      kampfLog(
        `${zweiter[0].name} schreckt zurück und kann nicht angreifen!`,
        "flinch",
      );
    else angriffAusfuehren(...zweiter);
    kampfRendern();
    await pause(700);
  }
}

function angriffAusfuehren(atk, def, move) {
  kampfLog(`${atk.name} setzt ${move.anzeige} ein!`, "attack");
  if (Math.random() * 100 > move.accuracy) {
    kampfLog("Die Attacke verfehlt das Ziel!", "miss");
    return;
  }
  const ergebnis = schadenBerechnen(atk, def, move);
  // Gezählt wird, was wirklich an KP verloren geht – Overkill zählt nicht.
  const wirklich = Math.min(ergebnis.damage, def.currentHp);
  def.currentHp -= wirklich;
  atk.damageDealt += wirklich;
  if (atk.seite === "spieler") kampf.schadenGesamt += wirklich;
  kampfLog(`${def.name} erleidet ${wirklich} Schaden!`, "damage");
  drainAnwenden(atk, move, wirklich, kampfLog);
  flinchAnwenden(def, move, kampfLog);
  statAenderungenAnwenden(atk, def, move, kampfLog);
  treffertextLoggen(ergebnis);
}

function treffertextLoggen(e) {
  if (e.isCritical) kampfLog("Ein Volltreffer!", "crit");
  if (e.effectiveness > 1) kampfLog("Es ist sehr effektiv!", "eff");
  else if (e.effectiveness === 0) kampfLog("Es hat keine Wirkung …", "eff");
  else if (e.effectiveness < 1) kampfLog("Es ist nicht sehr effektiv …", "eff");
}

async function rundeAbschliessen() {
  if (aktiverGegner().currentHp <= 0) await gegnerBesiegt();
  else if (aktiverSpieler().currentHp <= 0) await spielerBesiegt();
  kampfRendern();
}

async function gegnerBesiegt() {
  kampfLog(`${aktiverGegner().name} ist kampfunfähig!`, "ko");
  kampf.gegnerIndex++;
  if (kampf.gegnerIndex >= kampf.gegner.length) return kampfEnde(true);
  leaderSpruch(
    "Der Spieler hat gerade eines deiner Pokemon besiegt.",
    "Nicht schlecht! Aber jetzt wird es ernst.",
  );
  await matchupStarten();
}

async function spielerBesiegt() {
  kampfLog(`${aktiverSpieler().name} ist kampfunfähig!`, "ko");
  kampf.spielerIndex++;
  if (kampf.spielerIndex >= kampf.spieler.length) return kampfEnde(false);
  leaderSpruch(
    "Der Spieler hat gerade ein eigenes Pokemon verloren.",
    "Ist das schon alles?",
  );
  await matchupStarten();
}

function kampfEnde(sieg) {
  kampf.vorbei = true;
  kampf.sieg = sieg;
  kampf.laeuft = false;
  kampfLog(
    sieg
      ? `Du hast ${kampf.leader.name} besiegt!`
      : `${kampf.leader.name} hat gewonnen.`,
    "ende",
  );
  leaderSpruch(
    sieg
      ? "Der Spieler hat dich soeben besiegt."
      : "Du hast den Spieler soeben besiegt.",
    sieg
      ? "Stark gekämpft! Das Emblem gehört dir."
      : "Komm wieder, wenn du stärker bist!",
  );
  kampfErgebnisSpeichern(sieg);
  // Ein Arena-Sieg bringt den Orden und schaltet die nächste Arena frei.
  if (sieg && kampf.leader.arena && kampf.leader.key)
    ordenVerleihen(kampf.leader.key);
}

function mvpErmitteln() {
  const beste = [...kampf.spieler].sort(
    (a, b) => b.damageDealt - a.damageDealt,
  )[0];
  if (!beste || beste.damageDealt <= 0) return null;
  return { id: beste.id, name: beste.name, damageDealt: beste.damageDealt };
}

function kampfErgebnisSpeichern(sieg) {
  historieEintragen({
    id: Date.now(),
    date: new Date().toISOString(),
    result: sieg ? "win" : "loss",
    gymLeader: { name: kampf.leader.name, type: kampf.leader.type },
    totalDamageDealt: kampf.schadenGesamt,
    totalTurns: kampf.zuege,
    mvpPokemon: mvpErmitteln(),
    playerTeam: team.map((p) => ({ id: p.id, name: p.name, types: p.types })),
    pokemonUsed: Math.min(kampf.spielerIndex + 1, kampf.spieler.length),
  });
}

/* ---- Der Arenaleiter spricht: lokale Zeile sofort, KI ersetzt sie. ---- */

let spruchNr = 0;

async function kiSpruchHolen(ereignis) {
  try {
    const res = await fetch(`${BACKEND}/api/ai/gym-dialogue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leaderName: kampf.leader.name,
        leaderType: kampf.leader.finale
          ? "alle Typen"
          : TYPE_DE[kampf.leader.type],
        leaderStyle: kampf.leader.style,
        eventText: ereignis,
      }),
    });
    if (!res.ok) return null;
    return String((await res.json())?.text || "").trim() || null;
  } catch {
    return null;
  }
}

function leaderSpruch(ereignis, fallback) {
  if (!kampf.leader) return;
  const nr = ++spruchNr;
  const name = kampf.leader.name;
  $("battleSay").textContent = `${name}: „${fallback}“`;
  kiSpruchHolen(ereignis).then((text) => {
    if (text && nr === spruchNr && kampf.leader)
      $("battleSay").textContent = `${name}: „${text}“`;
  });
}
