(function () {
  /**
   * Konto-Verwaltung im Frontend.
   *
   * Nach dem Login schickt das Backend einen Token. Den legen wir ab und
   * haengen ihn an jede Anfrage, die etwas Persoenliches betrifft
   * (Header "Authorization: Token ..."). Ohne Login laeuft die App weiter wie
   * bisher - dann bleiben die Daten nur im localStorage.
   */
  const TOKEN_KEY = "pokedexToken";
  const AUTH_EVENT = "pokedex-auth-changed";

  class AuthService {
    constructor() {
      this.base = `${window.BACKEND_URL || ""}/api/auth`;
      this.token = localStorage.getItem(TOKEN_KEY) || "";
      this.username = "";
    }

    isLoggedIn() {
      return Boolean(this.token && this.username);
    }

    /** Header fuer alle Anfragen, die einen angemeldeten Nutzer brauchen. */
    authHeaders() {
      return this.token ? { Authorization: `Token ${this.token}` } : {};
    }

    async _readError(response) {
      try {
        const data = await response.json();
        return data?.detail || `Fehler ${response.status}`;
      } catch {
        return `Fehler ${response.status}`;
      }
    }

    async _post(path, body) {
      const response = await fetch(`${this.base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.authHeaders() },
        body: JSON.stringify(body || {}),
      });
      if (!response.ok)
        throw AppError.create(
          AppError.CATEGORY.APP,
          await this._readError(response),
        );
      return response.status === 204 ? null : response.json();
    }

    _startSession(data) {
      this.token = data.token;
      this.username = data.username;
      localStorage.setItem(TOKEN_KEY, this.token);
      this._announce();
    }

    _endSession() {
      this.token = "";
      this.username = "";
      localStorage.removeItem(TOKEN_KEY);
      this._announce();
    }

    _announce() {
      document.dispatchEvent(
        new CustomEvent(AUTH_EVENT, {
          detail: { loggedIn: this.isLoggedIn(), username: this.username },
        }),
      );
    }

    async register(username, password) {
      this._startSession(await this._post("/register", { username, password }));
    }

    async login(username, password) {
      this._startSession(await this._post("/login", { username, password }));
    }

    async logout() {
      try {
        await this._post("/logout");
      } catch (error) {
        AppError.warn(AppError.CATEGORY.APP, "Logout im Backend fehlgeschlagen", error);
      }
      this._endSession();
    }

    /** Beim Seitenstart: Gilt der gespeicherte Token noch? */
    async restore() {
      if (!this.token) return false;
      try {
        const response = await fetch(`${this.base}/me`, {
          headers: this.authHeaders(),
        });
        if (!response.ok) throw new Error(String(response.status));
        this.username = (await response.json()).username;
        this._announce();
        return true;
      } catch {
        this._endSession(); // Token abgelaufen oder Backend aus
        return false;
      }
    }
  }

  if (!window.authService) {
    window.authService = new AuthService();
    window.authService.restore();
  }
})();
