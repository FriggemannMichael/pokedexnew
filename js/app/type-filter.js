/* Typ-Filter (Sheet mit allen 18 Typen) und der Kontext-Hintergrund. */

/* Der Hintergrund folgt dem Kontext – body[data-type] färbt den Himmel
   in der Typfarbe, für alle 18 Typen gerechnet statt handgeschrieben. */
function setContext(type) {
  const hex = type ? TYPE_HEX[type] : "#4ecdc4";
  document.documentElement.style.setProperty("--accent", hex);
  if (type) {
    document.body.dataset.type = type;
    document.body.style.setProperty("--sky", hex);
  } else {
    delete document.body.dataset.type;
  }
}

/* ---- Das Typ-Raster im Sheet aufbauen ---- */
const typeGrid = $("typeGrid");
Object.keys(TYPE_HEX).forEach((t) => {
  const b = document.createElement("button");
  b.className = "type-btn";
  b.setAttribute("aria-pressed", "false");
  b.style.setProperty("--type", TYPE_HEX[t]);
  b.innerHTML = `<img src="./assets/icon/${t}.svg" alt=""><span>${TYPE_DE[t]}</span>`;
  b.onclick = () => selectType(t === activeType ? null : t);
  typeGrid.append(b);
});

function markTypeButtons(type) {
  document.querySelectorAll(".type-btn").forEach((b, i) => {
    const t = Object.keys(TYPE_HEX)[i];
    b.setAttribute("aria-pressed", String(t === type));
  });
}

/** Holt die Liste eines Typs frisch vom Backend, mit Platzhaltern solange. */
async function ladeTypListe(type) {
  listen.typ = { items: [], offset: 0, total: Infinity }; // frisch anfangen
  $("dexCount").textContent = `${TYPE_DE[type]} lädt …`;
  ladend = true;
  renderGrid(); // Platzhalter statt der alten Karten
  await loadPage(); // holt die Liste dieses Typs aus dem Backend
  ladend = false;
  renderGrid();
}

async function selectType(type) {
  activeType = type;
  markTypeButtons(type);
  $("filterLabel").textContent = type ? TYPE_DE[type] : "Typ";
  $("filterBtn").toggleAttribute("data-on", Boolean(type));
  setContext(type); // Der Himmel färbt sich – wie im Original.
  $("typeSheet").removeAttribute("data-open");
  if (type) {
    await ladeTypListe(type);
  } else {
    updateLoadMore();
    renderGrid();
  }
}

$("filterBtn").onclick = () => $("typeSheet").setAttribute("data-open", "");
$("typeClose").onclick = () => $("typeSheet").removeAttribute("data-open");
$("typeReset").onclick = () => {
  selectType(null);
  $("typeSheet").removeAttribute("data-open");
};
$("typeSheet").onclick = (e) => {
  if (e.target === $("typeSheet")) $("typeSheet").removeAttribute("data-open");
};
