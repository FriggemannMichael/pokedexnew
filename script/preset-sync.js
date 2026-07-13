(function () {
  /**
   * Haelt die gespeicherten Teams zwischen Browser und Konto in Sync.
   *
   * Gleiches Muster wie Favoriten: Das Frontend schickt seine ganze Liste, das
   * Backend ersetzt damit den alten Stand. Beim Anmelden gewinnt der Server -
   * es sei denn, dort ist noch nichts gespeichert.
   */
  const ENDPOINT = `${window.BACKEND_URL || ""}/api/presets`;
  const PUSH_DELAY_MS = 800;

  let applying = false;
  let pushTimer = null;

  function auth() {
    return window.authService;
  }

  function presets() {
    return window.teamPresets;
  }

  async function request(options) {
    const response = await fetch(ENDPOINT, {
      ...options,
      headers: { "Content-Type": "application/json", ...auth().authHeaders() },
    });
    if (!response.ok) throw new Error(`Presets: ${response.status}`);
    return response.json();
  }

  /** Das Backend will nur Namen und Nummern - die Details kennt es selbst. */
  function forServer(list) {
    return list.map((preset) => ({
      name: preset.name,
      created: preset.created,
      pokemonIds: (preset.team || []).map((p) => Number(p.id)).filter(Boolean),
    }));
  }

  function push() {
    return request({
      method: "PUT",
      body: JSON.stringify({ presets: forServer(presets().list()) }),
    });
  }

  async function pull() {
    const data = await request({ method: "GET" });
    const fromServer = data.presets || [];
    const local = presets().list();
    if (!fromServer.length && local.length) {
      await push(); // frisches Konto: die lokalen Presets uebernehmen
      return;
    }
    presets().replaceAll(fromServer);
  }

  document.addEventListener("presetsChanged", () => {
    if (applying || !auth()?.isLoggedIn()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      push().catch((error) =>
        AppError.warn(AppError.CATEGORY.STORAGE, "Presets nicht gespeichert", error),
      );
    }, PUSH_DELAY_MS);
  });

  auth()?.onSession(async () => {
    applying = true;
    try {
      await pull();
    } finally {
      applying = false;
    }
  });
})();
