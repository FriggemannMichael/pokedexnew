/* Detailkarte (Sheet): derselbe Umfang wie die Original-Detailkarte. */

function sheetKopf(p) {
  const card = $("sheetCard");
  card.style.setProperty("--type", TYPE_HEX[p.types[0]] || "#a8a878");
  $("sheetImg").src = p.image || art(p.id);
  $("sheetImg").alt = p.name;
  $("sheetNo").textContent = `#${String(p.id).padStart(3, "0")}`;
  $("sheetName").textContent = anzeigename(p);
  $("sheetTypes").innerHTML = p.types
    .map((t) => `<span class="t">${TYPE_DE[t] || t}</span>`)
    .join("");
}

function sheetLeeren() {
  $("sheetDesc").textContent = "lädt …";
  $("sheetFacts").innerHTML = "";
  $("sheetStats").innerHTML = "";
  $("sheetMoves").innerHTML = "";
}

function openSheet(p) {
  sheetKopf(p);
  sheetLeeren();
  $("sheetAdd").onclick = () => {
    addToTeam(p);
    closeSheet();
  };
  $("sheet").setAttribute("data-open", "");
  fetchDetail(p.id)
    .then((d) => fillSheet(d))
    .catch(
      () =>
        ($("sheetDesc").textContent =
          "Details nicht erreichbar. Läuft das Backend?"),
    );
}

function factsHTML(d) {
  return `
    <div class="fact"><div class="fact__v">${d.height} m</div><div class="fact__l">Größe</div></div>
    <div class="fact"><div class="fact__v">${d.weight} kg</div><div class="fact__l">Gewicht</div></div>
    <div class="fact"><div class="fact__v">${d.exp}</div><div class="fact__l">Erfahrung</div></div>`;
}

function barHTML(s) {
  return `
    <div class="bar">
      <span>${s.name}</span>
      <span class="bar__track"><span class="bar__fill" data-w="${Math.min(100, (s.value / 200) * 100)}"></span></span>
      <span style="text-align:right">${s.value}</span>
    </div>`;
}

/* Erst im nächsten Frame füllen, sonst springt der Balken ohne Animation. */
function balkenFuellen() {
  requestAnimationFrame(() => {
    document.querySelectorAll("#sheetStats .bar__fill").forEach((el, i) => {
      el.style.transitionDelay = `${i * 70}ms`;
      el.style.width = `${el.dataset.w}%`;
    });
  });
}

function fillSheet(d) {
  $("sheetDesc").textContent = d.desc || "Keine Beschreibung vorhanden.";
  $("sheetFacts").innerHTML = factsHTML(d);
  $("sheetStats").innerHTML = d.stats.map(barHTML).join("");
  balkenFuellen();
  $("sheetMoves").innerHTML = d.moves
    .map((m) => `<span class="move">${m}</span>`)
    .join("");
  renderEvolution(d.evolution);
}

function evoKnopf(s) {
  return `
    <button class="evo" data-evo="${s.id}">
      <img src="${sprite(s.id)}" alt="" width="56" height="56">
      <span class="evo__name">${NAME_DE.get(s.id) || s.name}</span>
    </button>`;
}

/* Eine Stufe kann mehrere Pokémon haben (Evoli: acht). */
function evoStufeHTML(ebene, i) {
  return `
    ${i ? '<span class="evo__arrow" aria-hidden="true">→</span>' : ""}
    <div class="evo__stufe">
      ${ebene.map(evoKnopf).join("")}
    </div>`;
}

function wireEvo(box) {
  box.querySelectorAll("[data-evo]").forEach((b) => {
    b.onclick = async () => {
      const id = Number(b.dataset.evo);
      await ensureLoaded([id]);
      const p = DEX.find((x) => x.id === id);
      if (p) openSheet(p); // dieselbe Karte, neues Pokémon
    };
  });
}

function renderEvolution(stufen) {
  const box = $("sheetEvo");
  const title = $("sheetEvoTitle");
  const zeigen = Boolean(stufen && stufen.length >= 2);
  box.hidden = !zeigen;
  title.hidden = !zeigen;
  box.innerHTML = zeigen ? stufen.map(evoStufeHTML).join("") : "";
  if (zeigen) wireEvo(box);
}

const closeSheet = () => $("sheet").removeAttribute("data-open");
$("sheetClose").onclick = closeSheet;
$("sheet").onclick = (e) => {
  if (e.target === $("sheet")) closeSheet();
};
document.addEventListener("keydown", (e) => e.key === "Escape" && closeSheet());
