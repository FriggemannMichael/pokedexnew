(function () {
  /**
   * Haelt das Team zwischen Browser und Konto in Sync.
   *
   * Der localStorage bleibt, wie er ist - er ist weiterhin die schnelle,
   * lokale Ablage. Wer angemeldet ist, bekommt sein Team beim Start zusaetzlich
   * vom Server (Pull) und schickt jede Aenderung dorthin (Push).
   *
   * Beim Anmelden gewinnt der Server - sonst wuerde ein leeres Team auf einem
   * fremden Rechner das gespeicherte ueberschreiben. Ausnahme: Ist auf dem
   * Server noch nichts gespeichert (frisch registriert), wandert das Team aus
   * dem Browser nach oben, statt geloescht zu werden.
   */
  const ENDPOINT = `${window.BACKEND_URL || ""}/api/team`;
  const PUSH_DELAY_MS = 800; // nicht bei jedem Klick sofort speichern
  const PULL_SOURCE = "server-pull";

  let pushTimer = null;

  function auth() {
    return window.authService;
  }

  function teamIds(team) {
    if (!Array.isArray(team)) return [];
    return team
      .map((pokemon) => Number(pokemon?.id))
      .filter((id) => Number.isFinite(id) && id > 0)
      .slice(0, 6);
  }

  function applyTeam(team) {
    if (window.teamOffcanvas?.syncExternalTeam) {
      window.teamOffcanvas.syncExternalTeam(team, PULL_SOURCE);
      return;
    }
    localStorage.setItem("pokemonTeam", JSON.stringify(team));
  }

  async function request(options) {
    const response = await fetch(ENDPOINT, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...auth().authHeaders(),
        ...(options.headers || {}),
      },
    });
    if (!response.ok) throw new Error(`Team-Sync: ${response.status}`);
    return response.json();
  }

  async function pull() {
    const data = await request({ method: "GET" });
    const fromServer = data.team || [];
    const local = currentTeam();
    if (!fromServer.length && local.length) {
      await push(local); // frisches Konto: das Team aus dem Browser uebernehmen
      return;
    }
    applyTeam(fromServer);
  }

  async function push(team) {
    await request({
      method: "PUT",
      body: JSON.stringify({ pokemonIds: teamIds(team) }),
    });
  }

  function currentTeam() {
    if (window.teamOffcanvas?.getTeam) return window.teamOffcanvas.getTeam();
    try {
      return JSON.parse(localStorage.getItem("pokemonTeam") || "[]");
    } catch {
      return [];
    }
  }

  function schedulePush(team) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      push(team).catch((error) =>
        AppError.warn(AppError.CATEGORY.STORAGE, "Team nicht gespeichert", error),
      );
    }, PUSH_DELAY_MS);
  }

  window.addEventListener("pokemon-team-updated", (event) => {
    if (!auth()?.isLoggedIn()) return;
    if (event.detail?.source === PULL_SOURCE) return; // kam gerade vom Server
    schedulePush(event.detail?.team || currentTeam());
  });

  auth()?.onSession(pull);
})();
