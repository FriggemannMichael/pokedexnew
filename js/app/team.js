/* Team-Bereich: Slots, Professor-Eich-Hinweis, Toast-Rückmeldung. */

function slotFilled(p) {
  const s = document.createElement("div");
  s.className = "slot slot--filled lg-surface";
  s.style.setProperty("--type", `var(--type-${p.types[0]})`);
  s.innerHTML = `
    <img src="${p.image || art(p.id)}" alt="${anzeigename(p)}">
    <span class="slot__name">${anzeigename(p)}</span>
    <button class="slot__x" aria-label="${anzeigename(p)} entfernen">×</button>`;
  s.querySelector(".slot__x").onclick = () => {
    team = team.filter((x) => x.id !== p.id);
    refresh();
  };
  return s;
}

function slotEmpty() {
  const s = document.createElement("div");
  s.className = "slot slot--empty";
  s.textContent = "+";
  return s;
}

function renderTeam() {
  const slots = $("teamSlots");
  slots.innerHTML = "";
  team.forEach((p) => slots.append(slotFilled(p)));
  for (let i = team.length; i < 6; i++) slots.append(slotEmpty());
}

function dominantType() {
  if (!team.length) return null;
  const counts = {};
  team.forEach((p) => (counts[p.types[0]] = (counts[p.types[0]] || 0) + 1));
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/* Der Team-Bereich trägt die Farbe des Teams. */
function teamTabFaerben() {
  const teamTab = document.querySelector('.tab[data-view="team"]');
  teamTab.dataset.type = dominantType() || "";
  if (teamTab.getAttribute("aria-selected") === "true")
    setContext(dominantType());
}

function teamZahlen() {
  $("teamCount").textContent = `${team.length} / 6`;
  $("fightTeam").textContent = `Dein Team: ${team.length} / 6`;
  const badge = $("teamBadge");
  badge.textContent = team.length;
  badge.hidden = team.length === 0;
}

function refresh() {
  renderTeam();
  teamZahlen();
  renderGrid(); // die Häkchen auf den Karten stimmen wieder
  teamTabFaerben();
  teamMerken(); // localStorage + (angemeldet) Server
  eichAktualisieren(); // erst der lokale Satz, dann die KI
}

function addToTeam(p) {
  if (team.some((x) => x.id === p.id)) {
    toast(`${anzeigename(p)} ist schon in deinem Team.`, false);
    return;
  }
  if (team.length >= 6) {
    toast("Dein Team ist voll. Nimm erst eins heraus.", false);
    return;
  }
  team.push(p);
  lastAdded = p.id;
  refresh();
  toast(`${anzeigename(p)} ist in deinem Team (${team.length}/6).`, true);
}

/* ---- Rückmeldung ---- */
let toastTimer = null;
function toast(text, undoable) {
  $("toastText").textContent = text;
  $("toastUndo").hidden = !undoable;
  const el = $("toast");
  el.setAttribute("data-show", "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.removeAttribute("data-show"), 3200);
}

$("toastUndo").onclick = () => {
  if (lastAdded == null) return;
  team = team.filter((p) => p.id !== lastAdded);
  lastAdded = null;
  refresh();
  $("toast").removeAttribute("data-show");
};
