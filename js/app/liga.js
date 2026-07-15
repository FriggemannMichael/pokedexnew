/* Liga-Fortschritt: Orden sammeln, Arenen der Reihe nach freischalten.
   Die Reihenfolge steht in GYM_ORDER (battle-data.js), der Stand im
   Set `orden` (storage.js, angemeldet zusätzlich /api/badges). */

/** Anzahl der Arena-Orden – der Champ zählt extra als Pokal. */
function ordenAnzahl() {
  return GYM_ORDER.filter((k) => k !== "champ" && orden.has(k)).length;
}

/** Frei ist die erste Arena – und jede, deren Vorgänger besiegt ist. */
function arenaFrei(key) {
  const i = GYM_ORDER.indexOf(key);
  return i <= 0 || orden.has(GYM_ORDER[i - 1]);
}

function ordenStandAnzeigen() {
  const pokal = orden.has("champ") ? " · 👑 Champ" : "";
  $("ordenStand").textContent = `🏅 ${ordenAnzahl()} / 8 Orden${pokal}`;
}

/** Nach einem Arena-Sieg: Orden merken und die Liga neu zeichnen. */
function ordenVerleihen(key) {
  if (orden.has(key)) return;
  orden.add(key);
  ordenMerken(); // localStorage + (angemeldet) Server – sync.js
  toast(
    key === "champ"
      ? "👑 Du hast die Liga besiegt – du bist jetzt Champ!"
      : `🏅 ${GYM_LEADERS[key].name} besiegt – Orden erhalten!`,
    false,
  );
  ligaAktualisieren();
}

function ligaAktualisieren() {
  ordenStandAnzeigen();
  arenenRendern();
}

ligaAktualisieren();
