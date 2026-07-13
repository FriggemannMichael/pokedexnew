/* Gespeicherte Teams (Presets): lokal im Browser, angemeldet zusätzlich
   auf dem Server (/api/presets – die ganze Liste wird ersetzt). */

function presetZeile(eintrag, i) {
  const zeile = document.createElement("div");
  zeile.className = "row";
  zeile.innerHTML = `
    <div>
      <strong style="font-family: var(--font-ui)">${escHtml(eintrag.name)}</strong>
      <span class="hint"> · ${(eintrag.pokemonIds || []).length} Pokémon</span>
    </div>
    <div style="display: flex; gap: 0.4rem">
      <button class="btn" style="padding: 0.5rem 0.9rem; font-size: 0.8rem">Laden</button>
      <button class="btn btn--ghost">Löschen</button>
    </div>`;
  zeile.querySelector(".btn").onclick = () => presetLaden(eintrag);
  zeile.querySelector(".btn--ghost").onclick = () => presetLoeschen(i);
  return zeile;
}

function renderPresets() {
  const box = $("presetListe");
  const liste = presetsLokal();
  box.innerHTML = liste.length
    ? ""
    : `<p class="hint">Noch kein Team gespeichert.</p>`;
  liste.forEach((eintrag, i) => box.append(presetZeile(eintrag, i)));
}

function presetsMerken(liste) {
  presetsLokalSpeichern(liste);
  renderPresets();
  presetsPushPlanen();
}

function presetSpeichernAktuell() {
  if (!team.length) {
    toast("Dein Team ist leer – nichts zu speichern.", false);
    return;
  }
  const name = (window.prompt("Wie soll das Team heißen?") || "").trim();
  if (!name) return;
  const liste = presetsLokal();
  liste.unshift({
    name: name.slice(0, 60),
    created: new Date().toISOString(),
    pokemonIds: team.map((p) => p.id),
  });
  presetsMerken(liste);
  toast(`»${name.slice(0, 60)}« gespeichert.`, false);
}

async function presetLaden(eintrag) {
  const ids = (eintrag.pokemonIds || []).slice(0, 6);
  await ensureLoaded(ids);
  team = ids.map((id) => DEX.find((p) => p.id === id)).filter(Boolean);
  refresh();
  toast(`»${eintrag.name}« geladen (${team.length}/6).`, false);
}

function presetLoeschen(i) {
  const liste = presetsLokal();
  const [weg] = liste.splice(i, 1);
  presetsMerken(liste);
  toast(`»${weg?.name}« gelöscht.`, false);
}

$("teamSpeichern").onclick = presetSpeichernAktuell;
renderPresets();
