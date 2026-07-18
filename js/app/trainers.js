/* Andere Trainer: echte Teams als Gegner und die Rangliste.
   Die Daten kommen aus /api/trainers – alle Nutzer mit gespeichertem
   Team, samt Kampfbilanz. Nur mit Konto sichtbar. */

let trainerListe = [];

async function trainerLaden() {
  try {
    trainerListe = (await apiAbruf("/trainers")).trainers || [];
  } catch {
    trainerListe = [];
  }
  ranglisteRendern();
}

function ranglisteLeeren() {
  trainerListe = [];
  ranglisteRendern();
}

const siegquote = (t) =>
  t.battles ? Math.round((t.wins / t.battles) * 100) : 0;

/* ---- Die Tabelle ---- */

function rangZeileHTML(t, platz) {
  const selbst = t.username === authUser ? " rang--selbst" : "";
  return `
    <div class="rang${selbst}">
      <span class="rang__platz">${platz}.</span>
      <span class="rang__name">${escHtml(t.username)}</span>
      <span class="rang__wert">${t.wins}</span>
      <span class="rang__wert">${t.battles}</span>
      <span class="rang__wert">${t.battles ? siegquote(t) + " %" : "–"}</span>
    </div>`;
}

function rangSortiert() {
  return [...trainerListe].sort(
    (a, b) =>
      b.wins - a.wins ||
      siegquote(b) - siegquote(a) ||
      a.username.localeCompare(b.username),
  );
}

function ranglisteRendern() {
  const box = $("rangListe");
  if (!istAngemeldet()) {
    box.innerHTML = `<p class="hint">Melde dich an, um die Rangliste und andere Trainer zu sehen.</p>`;
    return;
  }
  if (!trainerListe.length) {
    box.innerHTML = `<p class="hint">Noch kein Trainer hat ein Team gespeichert.</p>`;
    return;
  }
  box.innerHTML =
    `<div class="rang rang--kopf"><span></span><span>Trainer</span>
      <span class="rang__wert">Siege</span><span class="rang__wert">Kämpfe</span>
      <span class="rang__wert">Quote</span></div>` +
    rangSortiert()
      .map((t, i) => rangZeileHTML(t, i + 1))
      .join("");
}

/* ---- Trainer als Gegner wählen ---- */

function trainerMinisHTML(ids) {
  return ids
    .slice(0, 6)
    .map(
      (id) =>
        `<img class="mini" src="${sprite(id)}" alt="" width="26" height="26" />`,
    )
    .join("");
}

function trainerZeile(t) {
  const zeile = document.createElement("button");
  zeile.className = "trainer-row frost";
  zeile.innerHTML = `
    <span class="trainer-row__kopf">
      <span class="trainer-row__name">${escHtml(t.username)}</span>
      <span class="trainer-row__meta">${t.wins} Siege · ${t.battles} Kämpfe</span>
    </span>
    <span class="trainer-row__team">${trainerMinisHTML(t.pokemonIds)}</span>`;
  zeile.onclick = () => trainerKampf(t);
  return zeile;
}

/** Als Gegner taugen alle anderen mit mindestens einem Pokémon. */
function gegnerAuswahl() {
  return trainerListe.filter(
    (t) => t.username !== authUser && t.pokemonIds.length,
  );
}

function trainerSheetFuellen() {
  const box = $("trainerListe");
  const liste = gegnerAuswahl();
  box.innerHTML = liste.length
    ? ""
    : `<p class="hint" style="color: rgba(255,255,255,.85)">
        Noch kein anderer Trainer hat ein Team gespeichert.</p>`;
  liste.forEach((t) => box.append(trainerZeile(t)));
}

async function trainerSheetOeffnen() {
  if (!istAngemeldet()) {
    toast("Melde dich an, um gegen echte Trainer zu kämpfen.", false);
    return;
  }
  $("trainerListe").innerHTML =
    `<p class="hint" style="color: rgba(255,255,255,.85)">lädt …</p>`;
  $("trainerSheet").setAttribute("data-open", "");
  await trainerLaden();
  trainerSheetFuellen();
}

function trainerKampf(t) {
  $("trainerSheet").removeAttribute("data-open");
  kampfBeginnen({
    name: t.username,
    style: "ehrgeizig und selbstbewusst",
    type: null, // wird nach dem Laden aus dem Team bestimmt
    pokemon: t.pokemonIds.slice(0, 6),
  });
}

$("oppTrainer").onclick = trainerSheetOeffnen;
$("trainerClose").onclick = () =>
  $("trainerSheet").removeAttribute("data-open");
$("trainerSheet").onclick = (e) => {
  if (e.target === $("trainerSheet"))
    $("trainerSheet").removeAttribute("data-open");
};

ranglisteRendern();
