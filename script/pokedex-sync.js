(function () {
  /**
   * Haelt Favoriten und Notizen zwischen Browser und Konto in Sync.
   *
   * Gleiches Muster wie script/team-sync.js: Der localStorage bleibt die
   * lokale Ablage, wer angemeldet ist bekommt seinen Stand beim Anmelden vom
   * Server (Pull) und schickt jede Aenderung dorthin (Push). Ist auf dem Server
   * noch nichts gespeichert, wandert der lokale Stand nach oben.
   *
   * Nicht dabei: die Sterne. Die rechnet die App aus den IVs aus
   * (pokemon-go-favorites.js), sie sind keine Eingabe des Nutzers.
   */
  const BASE = `${window.BACKEND_URL || ""}/api`;
  const PUSH_DELAY_MS = 800;

  let applying = false; // waehrend wir den Server-Stand einspielen: nicht zurueckschicken
  const timers = {};

  function auth() {
    return window.authService;
  }

  function features() {
    return window.pokemonGoFeatures;
  }

  async function request(path, options) {
    const response = await fetch(`${BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...auth().authHeaders() },
    });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  }

  function schedule(key, task) {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => {
      task().catch((error) =>
        AppError.warn(AppError.CATEGORY.STORAGE, `${key} nicht gespeichert`, error),
      );
    }, PUSH_DELAY_MS);
  }

  // --- Favoriten -----------------------------------------------------------

  function fromStorage(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function localFavorites() {
    // Der localStorage ist die Rueckfallebene: PokemonGoFeatures gibt es beim
    // Anmelden vielleicht noch nicht, und dann waere der lokale Stand
    // faelschlich "leer" - und der leere Server wuerde ihn ueberschreiben.
    const ids = features()?.favorites
      ? [...features().favorites]
      : fromStorage("pokemonFavorites", []);
    return ids.map(Number).filter(Boolean);
  }

  function pushFavorites() {
    return request("/favorites", {
      method: "PUT",
      body: JSON.stringify({ pokemonIds: localFavorites() }),
    });
  }

  function applyFavorites(ids) {
    // Immer zuerst in den localStorage: Ist PokemonGoFeatures noch nicht da,
    // liest es die Favoriten beim Erzeugen von dort. Sonst kaeme der Stand vom
    // Server zu frueh und wuerde gleich wieder ueberschrieben.
    localStorage.setItem("pokemonFavorites", JSON.stringify(ids));
    const pgf = features();
    if (!pgf) return;
    const before = new Set(pgf.favorites);
    pgf.favorites = new Set(ids);
    const touched = new Set([...before, ...ids]);
    touched.forEach((id) => pgf.updateFavoriteButtons?.(id));
    pgf.applyCombinedFilters?.();
  }

  async function pullFavorites() {
    const data = await request("/favorites", { method: "GET" });
    const fromServer = data.pokemonIds || [];
    if (!fromServer.length && localFavorites().length) {
      await pushFavorites();
      return;
    }
    applyFavorites(fromServer);
  }

  // --- Notizen -------------------------------------------------------------

  function localNotes() {
    return features()?.personalNotes || fromStorage("pokemonNotes", {});
  }

  function pushNotes() {
    return request("/notes", {
      method: "PUT",
      body: JSON.stringify({ notes: localNotes() }),
    });
  }

  function applyNotes(notes) {
    localStorage.setItem("pokemonNotes", JSON.stringify(notes));
    const pgf = features();
    if (pgf) pgf.personalNotes = notes;
  }

  async function pullNotes() {
    const data = await request("/notes", { method: "GET" });
    const fromServer = data.notes || {};
    if (!Object.keys(fromServer).length && Object.keys(localNotes()).length) {
      await pushNotes();
      return;
    }
    applyNotes(fromServer);
  }

  // --- Ausloeser -----------------------------------------------------------

  async function pullAll() {
    applying = true;
    try {
      await pullFavorites();
      await pullNotes();
    } finally {
      applying = false;
    }
  }

  document.addEventListener("favoriteToggled", () => {
    if (applying || !auth()?.isLoggedIn()) return;
    schedule("Favoriten", pushFavorites);
  });

  document.addEventListener("noteChanged", () => {
    if (applying || !auth()?.isLoggedIn()) return;
    schedule("Notizen", pushNotes);
  });

  auth()?.onSession(pullAll);
})();
