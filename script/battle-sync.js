(function () {
  /**
   * Haelt die Kampfhistorie zwischen Browser und Konto in Sync.
   *
   * Anders als Team, Favoriten und Notizen ist die Historie eine wachsende
   * Liste. Ein neuer Kampf wird darum **angehaengt** (POST), nicht die ganze
   * Liste ueberschrieben - sonst koennte ein zweiter offener Browser einen
   * gerade ausgefochtenen Kampf wieder wegraeumen.
   *
   * Die Oberflaeche liest die Historie weiterhin direkt aus dem localStorage;
   * hier wird er nur zusaetzlich mit dem Server abgeglichen.
   */
  const ENDPOINT = `${window.BACKEND_URL || ""}/api/battles`;
  const STORAGE_KEY = "pokemonBattleHistory";

  let applying = false; // waehrend wir den Server-Stand einspielen: nichts zurueckschicken

  function auth() {
    return window.authService;
  }

  function localHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function store(battles) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(battles));
  }

  async function request(options) {
    const response = await fetch(ENDPOINT, {
      ...options,
      headers: { "Content-Type": "application/json", ...auth().authHeaders() },
    });
    if (!response.ok) throw new Error(`Kampfhistorie: ${response.status}`);
    return response.json();
  }

  function warn(error) {
    AppError.warn(AppError.CATEGORY.STORAGE, "Kampfhistorie nicht gespeichert", error);
  }

  async function pull() {
    const data = await request({ method: "GET" });
    const fromServer = data.battles || [];
    const local = localHistory();
    if (!fromServer.length && local.length) {
      // Frisches Konto: die im Browser gesammelten Kaempfe uebernehmen.
      const pushed = await request({
        method: "PUT",
        body: JSON.stringify({ battles: local }),
      });
      store(pushed.battles || []);
      return;
    }
    store(fromServer);
  }

  document.addEventListener("battleRecorded", (event) => {
    if (applying || !auth()?.isLoggedIn()) return;
    request({
      method: "POST",
      body: JSON.stringify({ battle: event.detail?.battle }),
    }).catch(warn);
  });

  document.addEventListener("battleHistoryCleared", () => {
    if (applying || !auth()?.isLoggedIn()) return;
    request({ method: "DELETE" }).catch(warn);
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
