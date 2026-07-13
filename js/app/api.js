/* Datenzugriff: seitenweise Listen, Namensverzeichnis, Details.
   Alle Daten laufen über das Django-Backend (siehe BACKEND in config.js). */

const aktuelle = () => (activeType ? listen.typ : listen.alle);

function quelle() {
  return activeType ? listen.typ.items : listen.alle.items;
}

function pageUrl(liste) {
  return activeType
    ? `${BACKEND}/api/pokemon/by-type/${activeType}/?offset=${liste.offset}&limit=${PAGE}`
    : `${BACKEND}/api/pokemon/?offset=${liste.offset}&limit=${PAGE}`;
}

async function fetchPage(liste) {
  const res = await fetch(pageUrl(liste));
  if (!res.ok) throw new Error(res.status);
  const data = await res.json();
  liste.total = data.count ?? Infinity;
  liste.items = liste.items.concat(data.results.map(slim));
  liste.offset += PAGE;
}

/** Holt die nächste Seite – vom Typ-Endpoint oder vom normalen. */
async function loadPage() {
  const btn = $("loadMore");
  const liste = aktuelle();
  if (btn) {
    btn.disabled = true;
    btn.textContent = "lädt …";
  }
  try {
    await fetchPage(liste);
  } catch {
    if (!liste.items.length && !activeType) liste.items = FALLBACK.map(slim);
    liste.total = liste.items.length;
  }
  DEX = listen.alle.items; // fuer Team, Suche und Detailkarte
  updateLoadMore();
  renderGrid();
}

function updateLoadMore() {
  const btn = $("loadMore");
  if (!btn) return;
  const liste = aktuelle();
  const done = liste.items.length >= liste.total;
  btn.disabled = done;
  btn.textContent = done ? "Alle geladen" : "Mehr laden";
}

async function loadDex() {
  await loadPage();
  // Die Team-Beispiele liegen nicht alle auf der ersten Seite (Pikachu ist
  // die 25). Also gezielt nachladen, statt sie einfach fehlen zu lassen.
  await ensureLoaded([6, 9, 25, 94]);
  team = [6, 9, 25, 94]
    .map((id) => DEX.find((p) => p.id === id))
    .filter(Boolean);
  refresh();
  $("loadMore").onclick = loadPage;
  loadIndex(); // Namensverzeichnis für die Suche, im Hintergrund
}

function slim(p) {
  const s = (name, i) => {
    const found = (p.stats || []).find((x) => x?.stat?.name === name);
    return found ? found.base_stat : [45, 49, 49, 45][i];
  };
  return {
    id: p.id,
    name: p.name.charAt(0).toUpperCase() + p.name.slice(1),
    types: p.types || [],
    image: p.image,
    stats: [s("hp", 0), s("attack", 1), s("defense", 2), s("speed", 3)],
  };
}

function rawSlim(raw) {
  return {
    id: raw.id,
    name: raw.name.charAt(0).toUpperCase() + raw.name.slice(1),
    types: (raw.types || []).map((t) => t.type.name),
    image:
      raw.sprites?.other?.["official-artwork"]?.front_default || art(raw.id),
    stats: [],
  };
}

/* Das Namensverzeichnis kommt aus dem Backend und enthält die deutschen
   Namen. Damit findet die Suche "Evoli", nicht nur "eevee". */
async function loadIndex() {
  try {
    const res = await fetch(`${BACKEND}/api/pokemon/names/`);
    const data = await res.json();
    INDEX = data.names.map((n) => ({
      id: n.id,
      name: `${n.de} ${n.en}`.toLowerCase(), // beide Sprachen durchsuchbar
    }));
    data.names.forEach((n) => n.de && NAME_DE.set(n.id, n.de));
    renderGrid(); // Karten zeigen jetzt die deutschen Namen
  } catch {
    INDEX = [];
  }
}

async function ensureLoaded(ids) {
  const missing = ids.filter((id) => !DEX.some((p) => p.id === id));
  if (!missing.length) return;
  const raws = await Promise.all(
    missing.slice(0, 24).map((id) =>
      fetch(`${BACKEND}/api/pokeapi/pokemon/${id}`)
        .then((r) => r.json())
        .catch(() => null),
    ),
  );
  listen.alle.items = listen.alle.items.concat(
    raws.filter(Boolean).map(rawSlim),
  );
  DEX = listen.alle.items;
}

/** Der Beschreibungstext der Art: deutsch, sonst englisch. */
function detailText(species) {
  const text =
    species?.flavor_text_entries?.find((e) => e.language.name === "de") ||
    species?.flavor_text_entries?.find((e) => e.language.name === "en");
  return (text?.flavor_text || "").replace(/[\n\f]/g, " ");
}

async function detailData(full, species) {
  return {
    desc: detailText(species),
    height: (full.height / 10).toFixed(1),
    weight: (full.weight / 10).toFixed(1),
    exp: full.base_experience || "?",
    stats: (full.stats || []).map((s) => ({
      name: STAT_DE[s.stat.name] || s.stat.name,
      value: s.base_stat,
    })),
    moves: (full.moves || [])
      .slice(0, 8)
      .map((m) => m.move.name.replace(/-/g, " ")),
    evolution: await fetchEvolution(species),
  };
}

async function fetchDetail(id) {
  if (detailCache.has(id)) return detailCache.get(id);
  const [full, species] = await Promise.all([
    fetch(`${BACKEND}/api/pokeapi/pokemon/${id}`).then((r) => r.json()),
    fetch(`${BACKEND}/api/pokeapi/pokemon-species/${id}`)
      .then((r) => r.json())
      .catch(() => null),
  ]);
  const data = await detailData(full, species);
  detailCache.set(id, data);
  return data;
}

/* Die Entwicklungsreihe: Bisasam -> Bisaknosp -> Bisaflor.
   Steckt hinter species.evolution_chain – eine Kette verschachtelter
   Knoten, die wir zu einer flachen Liste ausrollen. */
async function fetchEvolution(species) {
  const url = species?.evolution_chain?.url;
  if (!url) return [];
  try {
    const pfad = url.split("/api/v2/")[1].replace(/\/$/, "");
    const chain = await fetch(`${BACKEND}/api/pokeapi/${pfad}`).then((r) =>
      r.json(),
    );
    return stufenweise(chain.chain);
  } catch {
    return [];
  }
}

/* Die Kette ebenenweise ausrollen, nicht nur die erste Linie:
   Evoli hat acht Entwicklungen – eine davon zu zeigen wäre gelogen.
   Ergebnis: [[Evoli], [Aquana, Blitza, Flamara, ...]] */
function stufenweise(wurzel) {
  const stufen = [];
  let ebene = [wurzel];
  while (ebene.length) {
    stufen.push(
      ebene.map((n) => ({
        id: Number(n.species.url.split("/").filter(Boolean).pop()),
        name: n.species.name,
      })),
    );
    ebene = ebene.flatMap((n) => n.evolves_to || []);
  }
  return stufen;
}
