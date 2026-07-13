(function () {
  /**
   * Client fuer die KI-Endpoints des Backends.
   *
   * Hier steht bewusst kein Prompt mehr: Was die KI gefragt wird, entscheidet
   * das Backend (backend/api/prompts.py). Von hier gehen nur Rohdaten raus -
   * das Team, der Spielzug, der Arenaleiter - und zurueck kommt fertiger Text.
   */
  class PokedexAIService {
    constructor() {
      this.baseEndpoint = `${window.BACKEND_URL || ""}/api/ai`;
      this.useProxy = false;
      this._proxyChecked = false;
      this.timeoutMs = 20000;
      this.cache = new Map();
      this.cacheTtlMs = 5 * 60 * 1000;
      this.maxCacheEntries = 80;
      this._throttleFn = window.createThrottler(2000);
    }

    hasGroqKey() {
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

    async _buildResponseError(response) {
      const body = await response.text();
      return `KI-Endpoint ${response.status}: ${(body || "").slice(0, 240)}`;
    }

    async _post(path, payload, controller) {
      return window.fetchWithRetry(`${this.baseEndpoint}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    }

    async _readText(response) {
      if (!response.ok)
        throw AppError.create(
          AppError.CATEGORY.AI,
          await this._buildResponseError(response),
        );
      const data = await response.json();
      const text = String(data?.text || "").trim();
      if (!text)
        throw AppError.create(AppError.CATEGORY.AI, "Leere Antwort der KI.");
      return text;
    }

    async _fetchText(path, payload) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        return this._readText(await this._post(path, payload, controller));
      } finally {
        clearTimeout(timeoutId);
      }
    }

    async _ask(path, payload, useCache = false) {
      await this._throttle();
      await this.detectProxy();
      if (!this.useProxy)
        throw AppError.create(AppError.CATEGORY.AI, "KI nicht verfügbar.");
      const cacheKey = `${path}::${JSON.stringify(payload)}`;
      if (useCache) {
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
      }
      const text = await this._fetchText(path, payload);
      if (useCache) this.setCached(cacheKey, text);
      return text;
    }

    async _throttle() {
      return this._throttleFn();
    }

    async requestProfessorTeamAdvice({ team = [], staticAnalysis = null } = {}) {
      return this._ask("/team-advice", { team, staticAnalysis });
    }

    async requestBattleCommentary({
      attackerName,
      moveName,
      defenderName,
      effectiveness,
    } = {}) {
      const payload = { attackerName, moveName, defenderName, effectiveness };
      return this._ask("/battle-commentary", payload, true);
    }

    async requestGymLeaderDialogue({
      leaderName,
      leaderType,
      leaderStyle,
      eventText,
    } = {}) {
      const payload = { leaderName, leaderType, leaderStyle, eventText };
      return this._ask("/gym-dialogue", payload);
    }

    _resolveTypewriterSpeed(options) {
      const n = Number(options.speed);
      return Number.isFinite(n) ? n : 18;
    }

    _clearTypewriterTimer(element) {
      if (!element._typewriterTimer) return;
      clearTimeout(element._typewriterTimer);
      element._typewriterTimer = null;
    }

    _typewriterTick(element, text, cursor, speed, resolve) {
      const next = cursor + 1;
      element.textContent = text.slice(0, next);
      if (next >= text.length) {
        element._typewriterTimer = null;
        resolve();
        return;
      }
      element._typewriterTimer = setTimeout(
        () => this._typewriterTick(element, text, next, speed, resolve),
        speed,
      );
    }

    typewriterToElement(element, text, options = {}) {
      if (!element) return Promise.resolve();
      const speed = this._resolveTypewriterSpeed(options);
      const finalText = String(text || "");
      this._clearTypewriterTimer(element);
      element.textContent = "";
      return new Promise((resolve) => {
        if (!finalText.length) {
          resolve();
          return;
        }
        this._typewriterTick(element, finalText, 0, speed, resolve);
      });
    }

    getCached(cacheKey) {
      if (!this.cache.has(cacheKey)) return null;
      const cached = this.cache.get(cacheKey);
      if (!cached || Date.now() > cached.expiresAt) {
        this.cache.delete(cacheKey);
        return null;
      }
      return cached.value;
    }

    setCached(cacheKey, value) {
      if (this.cache.size >= this.maxCacheEntries) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }
      this.cache.set(cacheKey, {
        value,
        expiresAt: Date.now() + this.cacheTtlMs,
      });
    }
  }

  if (!window.aiService) {
    window.aiService = new PokedexAIService();
    window.aiService.detectProxy();
  }
})();
