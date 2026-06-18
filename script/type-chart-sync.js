// Hybrid-Quelle fuer die Typen-Tabelle:
// 1) Cache aus localStorage sofort anwenden (oder eingebauter Default),
// 2) hoechstens einmal pro Woche autoritativ aus der PokeAPI auffrischen.
(function () {
  const KEY = "pokemonTypeChart";
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const TE = window.TypeEffectiveness;

  function loadCached() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveCached(chart) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ chart, fetchedAt: Date.now() }));
    } catch {
      /* localStorage nicht verfuegbar -> Default/Speicher reicht */
    }
  }

  async function fetchType(name) {
    const res = await fetch(`https://pokeapi.co/api/v2/type/${name}`);
    if (!res.ok) throw new Error(`type ${name}: HTTP ${res.status}`);
    return res.json();
  }

  async function syncFromApi() {
    const responses = await Promise.all(TE.getAllTypes().map(fetchType));
    const next = TE.buildChartFromApi(responses);
    if (TE.setChart(next)) saveCached(next);
  }

  function isStale(cached) {
    return !cached || !cached.fetchedAt || Date.now() - cached.fetchedAt > MAX_AGE_MS;
  }

  function init() {
    const cached = loadCached();
    if (cached && cached.chart) TE.setChart(cached.chart);
    if (isStale(cached)) {
      syncFromApi().catch((e) =>
        console.warn("[TypeChart] Sync fehlgeschlagen, nutze Default/Cache", e),
      );
    }
  }

  if (TE) init();
})();
