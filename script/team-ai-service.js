/**
 * Client fuer die beiden KI-Endpoints, die JSON liefern: Team-Analyse und
 * Gym-Strategie.
 *
 * Prompt, Anbieterwahl und Fallback-Kette liegen im Backend (backend/api/).
 * Frueher stand das alles hier - inklusive der Reihenfolge Gemini, OpenRouter,
 * Mistral, Groq. Von hier gehen jetzt nur noch die Teamdaten raus.
 */
class TeamAIService {
  constructor() {
    this.baseEndpoint = `${window.BACKEND_URL || ""}/api/ai`;
    this.useProxy = false;
    this._proxyChecked = false;
    // Grosszuegig, weil hinter EINER Anfrage die ganze Anbieter-Kette des
    // Backends steckt (Zeitbudget dort: 45s). Frueher lief die Kette hier, da
    // bekam jeder Anbieter seine eigenen 25s.
    this.timeoutMs = 60000;
    this._throttleFn = window.createThrottler(2000);
  }

  hasAnyKey() {
    return this.useProxy;
  }

  async detectProxy() {
    if (this._proxyChecked) return this.useProxy;
    this._proxyChecked = true;
    try {
      const resp = await fetch(`${this.baseEndpoint}/ping`);
      this.useProxy = resp.ok;
    } catch {
      this.useProxy = false;
    }
    return this.useProxy;
  }

  async _throttle() {
    return this._throttleFn();
  }

  sanitizeTeam(team) {
    if (!Array.isArray(team)) return [];
    return team.map((pokemon) => ({
      id: pokemon?.id || null,
      name: pokemon?.name || "",
      types: Array.isArray(pokemon?.types) ? pokemon.types : [],
      stats: pokemon?.stats || null,
    }));
  }

  async _post(path, payload, controller) {
    return window.fetchWithRetry(`${this.baseEndpoint}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  }

  async _readResult(response) {
    if (!response.ok) {
      const body = await response.text();
      throw AppError.create(
        AppError.CATEGORY.AI,
        `KI-Endpoint ${response.status}: ${(body || "no-body").slice(0, 280)}`,
      );
    }
    const data = await response.json();
    if (!data?.parsed && !data?.rawContent)
      throw AppError.create(AppError.CATEGORY.AI, "Leere Antwort der KI.");
    return data;
  }

  async _ask(path, payload) {
    await this._throttle();
    await this.detectProxy();
    if (!this.useProxy)
      throw AppError.create(AppError.CATEGORY.AI, "KI nicht verfügbar.");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return this._readResult(await this._post(path, payload, controller));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async requestTeamAnalysis({ team, staticAnalysis }) {
    return this._ask("/team-analysis", {
      team: this.sanitizeTeam(team),
      staticAnalysis: staticAnalysis || {},
    });
  }

  async requestGymStrategy({
    playerTeam,
    gymTeam,
    playerAvgStats,
    gymAvgStats,
  }) {
    return this._ask("/gym-strategy", {
      playerTeam: this.sanitizeTeam(playerTeam),
      gymTeam: this.sanitizeTeam(gymTeam),
      playerAvgStats: playerAvgStats || {},
      gymAvgStats: gymAvgStats || {},
    });
  }
}

if (!window.teamAIService) {
  window.teamAIService = new TeamAIService();
  window.teamAIService.detectProxy();
}
