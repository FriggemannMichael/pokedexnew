/* Pokédex-Raster: filtern, suchen, anzeigen. */

/* ---- Ansichts-Chips (Alle / Favoriten / Mein Pokédex) ---- */
const MODES = ["alle", "favoriten", "pokedex"];
document.querySelectorAll("#viewChips .chip").forEach((c, i) => {
  c.onclick = () => {
    document
      .querySelectorAll("#viewChips .chip")
      .forEach((x) => x.setAttribute("aria-pressed", "false"));
    c.setAttribute("aria-pressed", "true");
    viewMode = MODES[i];
    renderGrid();
  };
});

const grid = $("dexGrid");

function passtZuModus(p) {
  if (viewMode === "favoriten" && !favorites.has(p.id)) return false;
  if (
    viewMode === "pokedex" &&
    !favorites.has(p.id) &&
    !team.some((t) => t.id === p.id)
  )
    return false;
  return true;
}

function visible() {
  // Bei aktivem Typ zeigt das Raster die Liste dieses Typs vom Backend.
  return quelle().filter((p) => {
    if (!passtZuModus(p)) return false;
    if (query) {
      const suchbar = `${anzeigename(p)} ${p.name}`.toLowerCase();
      if (!suchbar.includes(query)) return false;
    }
    return true;
  });
}

function cardHTML(p, fav, inTeam) {
  return `
    <span class="card__no">#${String(p.id).padStart(3, "0")}</span>
    <img class="card__img" src="${p.image || art(p.id)}" alt="${anzeigename(p)}"
         loading="lazy" decoding="async" fetchpriority="low" width="200" height="200"
         onerror="this.onerror=null; this.src='${sprite(p.id)}'; this.classList.add('is-sprite')">
    <span class="card__name">${anzeigename(p)}</span>
    <span class="card__types">${p.types.map((t) => `<span class="t">${TYPE_DE[t] || t}</span>`).join("")}</span>
    <button class="card__fav" data-fav="${p.id}" aria-label="Favorit">${fav ? "❤️" : "🤍"}</button>
    <button class="card__add" data-id="${p.id}" aria-label="${p.name} ins Team">${inTeam ? "✓" : "+"}</button>`;
}

function wireCard(card, p) {
  card.onclick = (e) => {
    if (e.target.closest(".card__add") || e.target.closest(".card__fav"))
      return;
    openSheet(p);
  };
  card.querySelector(".card__add").onclick = () => addToTeam(p);
  card.querySelector(".card__fav").onclick = () => {
    if (favorites.has(p.id)) favorites.delete(p.id);
    else favorites.add(p.id);
    favoritenMerken(); // localStorage + (angemeldet) Server
    renderGrid();
  };
}

function cardElement(p, i) {
  const card = document.createElement("button");
  card.className = "card"; // die schlanke Glas-Fassung, nicht lg-surface
  card.style.setProperty("--type", TYPE_HEX[p.types[0]] || "#a8a878");
  card.style.animationDelay = `${Math.min(i, 12) * 40}ms`;
  const inTeam = team.some((x) => x.id === p.id);
  card.innerHTML = cardHTML(p, favorites.has(p.id), inTeam);
  if (inTeam) card.querySelector(".card__add").setAttribute("data-in", "");
  wireCard(card, p);
  return card;
}

function zaehlerText(list) {
  const liste = aktuelle();
  const gesamt = Number.isFinite(liste.total)
    ? liste.total
    : liste.items.length;
  const was = activeType ? `${TYPE_DE[activeType]}: ` : "";
  return list.length === liste.items.length
    ? `${was}${liste.items.length} von ${gesamt} geladen`
    : `${list.length} Treffer · ${was}${liste.items.length} von ${gesamt} geladen`;
}

function renderGrid() {
  const list = visible();
  grid.innerHTML = "";
  // Während die Liste eines Typs geholt wird, stehen sonst die alten
  // Karten da – und es sieht aus, als tue der Filter nichts.
  if (ladend) {
    grid.innerHTML = Array.from({ length: 6 })
      .map(() => `<div class="card card--skeleton"></div>`)
      .join("");
    return;
  }
  if (!list.length) {
    grid.innerHTML = `<p class="hint" style="grid-column: 1/-1; text-align: center; padding: 2rem 0">
      Kein Pokémon passt. Nimm den Filter zurück oder such nach etwas anderem.</p>`;
  }
  list.forEach((p, i) => grid.append(cardElement(p, i)));
  $("dexCount").textContent = zaehlerText(list);
}

/* Suche über den GANZEN Pokédex, nicht nur über die geladenen Karten.
   Treffer, die noch nicht geladen sind, holt die Suche nach. */
async function sucheAusfuehren() {
  if (query.length >= 2 && INDEX.length) {
    const hits = INDEX.filter((p) => p.name.includes(query)).map((p) => p.id);
    if (hits.length) await ensureLoaded(hits);
  }
  renderGrid();
}

let searchTimer = null;
document.querySelector(".search input").addEventListener("input", (e) => {
  query = e.target.value.trim().toLowerCase();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(sucheAusfuehren, 250);
});
