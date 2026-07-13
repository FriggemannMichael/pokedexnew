/* Kampf-Oberfläche: das Arena-Sheet im Stil des Entwurfs.
   Links der Spieler, rechts der Gegner, darunter Log und klickbare Moves. */

function kampfSheetOeffnen(leader) {
  const card = $("battleCard");
  card.style.setProperty("--type", TYPE_HEX[leader.type]);
  $("battleTitle").textContent =
    `${leader.badge} ${leader.name} · ${TYPE_DE[leader.type]}-Arena`;
  $("battleRound").textContent = "";
  $("battleSay").textContent = "";
  $("battleField").innerHTML =
    `<p class="hint" style="color: rgba(255,255,255,.85)">Die Arena wird vorbereitet …</p>`;
  $("battleLog").innerHTML = "";
  $("battleMoves").innerHTML = "";
  $("battleContinue").hidden = true;
  $("battleClose").textContent = "Aufgeben";
  $("battleSheet").setAttribute("data-open", "");
}

const hpProzent = (f) => Math.round((f.currentHp / f.maxHp) * 100);

/** Beide Teams als Mini-Sprites: K.o. ausgegraut, der Aktive markiert. */
function teamMiniHTML(teamListe, index) {
  return teamListe
    .map((p, i) => {
      const ko = p.currentHp <= 0 ? " mini--ko" : "";
      const aktiv = i === index ? " mini--aktiv" : "";
      return `<img class="mini${ko}${aktiv}" src="${sprite(p.id)}"
        alt="${escHtml(p.name)}" title="${escHtml(p.name)}" width="28" height="28" />`;
    })
    .join("");
}

function hpKlasse(pct) {
  if (pct <= 25) return " is-rot";
  if (pct <= 50) return " is-gelb";
  return "";
}

function kaempferHTML(f, teamListe, index) {
  const pct = hpProzent(f);
  return `
    <div class="fighter${f.currentHp <= 0 ? " fighter--ko" : ""}">
      <img class="fighter__img" src="${sprite(f.id)}" alt="${escHtml(f.name)}" width="96" height="96" />
      <div class="fighter__name">${escHtml(f.name)}</div>
      <div class="fighter__hp"><span class="fighter__hpfill${hpKlasse(pct)}" style="width: ${pct}%"></span></div>
      <div class="fighter__kp">${f.currentHp} / ${f.maxHp} KP</div>
      <div class="fighter__team">${teamMiniHTML(teamListe, index)}</div>
    </div>`;
}

/* Nach dem letzten K.o. zeigt der Index hinter das Array-Ende –
   dann bleibt der zuletzt gezeigte Kämpfer stehen. */
function letzterAktiver(liste, index) {
  return liste[Math.min(index, liste.length - 1)];
}

function kampfFeldRendern() {
  const s = letzterAktiver(kampf.spieler, kampf.spielerIndex);
  const g = letzterAktiver(kampf.gegner, kampf.gegnerIndex);
  $("battleField").innerHTML =
    kaempferHTML(s, kampf.spieler, kampf.spielerIndex) +
    `<span class="vs" aria-hidden="true">VS</span>` +
    kaempferHTML(g, kampf.gegner, kampf.gegnerIndex);
}

function kampfLogRendern() {
  const box = $("battleLog");
  box.innerHTML = kampf.log
    .slice(-9)
    .map(
      (e) =>
        `<div class="logzeile logzeile--${e.art}">${escHtml(e.text)}</div>`,
    )
    .join("");
  box.scrollTop = box.scrollHeight;
}

function moveKnopfHTML(move, i) {
  const gesperrt =
    kampf.rundeLaeuft || kampf.vorbei || kampf.auto ? "disabled" : "";
  return `
    <button class="move-btn" data-move="${i}" ${gesperrt}
            style="--type: ${TYPE_HEX[move.type] || "#a8a878"}">
      <span class="move-btn__name">${escHtml(move.anzeige)}</span>
      <span class="move-btn__meta">${TYPE_DE[move.type] || move.type} · Stärke ${move.power || "–"}</span>
    </button>`;
}

function kampfMovesRendern() {
  const s = aktiverSpieler();
  const box = $("battleMoves");
  if (kampf.vorbei || !s?.moves) {
    box.innerHTML = kampf.vorbei
      ? ""
      : `<p class="hint" style="color: rgba(255,255,255,.85)">Attacken werden geladen …</p>`;
    return;
  }
  box.innerHTML = s.moves.map(moveKnopfHTML).join("");
  box.querySelectorAll("[data-move]").forEach((b) => {
    b.onclick = () => rundeSpielen(Number(b.dataset.move));
  });
}

function kampfAutoRendern() {
  const knopf = $("battleAuto");
  knopf.hidden = kampf.vorbei;
  knopf.textContent = kampf.auto ? "Selbst steuern" : "Auto-Kampf";
}

function kampfEndeRendern() {
  if (kampf.vorbei)
    $("battleRound").textContent = kampf.sieg ? "🏆 Sieg!" : "Niederlage";
  $("battleContinue").hidden = !kampf.vorbei;
  $("battleContinue").textContent = kampf.sieg
    ? "🏆 Sieg! Zurück zur Arena-Wahl"
    : "Zurück zur Arena-Wahl";
  $("battleClose").textContent = kampf.vorbei ? "Schließen" : "Aufgeben";
}

function kampfRendern() {
  if (!kampf.leader || !kampf.spieler.length) return;
  $("battleRound").textContent = kampf.runde ? `Runde ${kampf.runde}` : "";
  kampfFeldRendern();
  kampfLogRendern();
  kampfMovesRendern();
  kampfAutoRendern();
  kampfEndeRendern();
}

function kampfSchliessen() {
  clearTimeout(autoTimer);
  $("battleSheet").removeAttribute("data-open");
  kampf.laeuft = false;
  kampf.leader = null;
}

$("battleAuto").onclick = () => {
  kampf.auto = !kampf.auto;
  if (kampf.auto) autoPlanen();
  kampfRendern();
};

$("battleClose").onclick = kampfSchliessen;
$("battleContinue").onclick = kampfSchliessen;
$("battleSheet").onclick = (e) => {
  if (e.target === $("battleSheet")) kampfSchliessen();
};

/* Die Arenaleiter-Knöpfe starten den echten Kampf. */
document.querySelectorAll("[data-opp]").forEach((b) => {
  b.onclick = () => kampfStarten(b.dataset.opp);
});
