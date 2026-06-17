(function () {
  class PokedexAIService {
    constructor() {
      this.proxyEndpoint = "/api/ai";
      this.useProxy = false;
      this._proxyChecked = false;
      this.model = "llama-3.1-8b-instant";
      this.timeoutMs = 20000;
      this.cache = new Map();
      this.cacheTtlMs = 5 * 60 * 1000;
      this.maxCacheEntries = 80;
      this.fallbackText = "Professor Eich ist gerade nicht erreichbar...";
      this._throttleFn = window.createThrottler(2000);
    }

    hasGroqKey() {
      return this.useProxy;
    }

    async detectProxy() {
      if (this._proxyChecked) return this.useProxy;
      this._proxyChecked = true;
      try {
        const resp = await fetch(this.proxyEndpoint + "/ping");
        this.useProxy = resp.ok;
      } catch {
        this.useProxy = false;
      }
      return this.useProxy;
    }

    async _fetchWithRetry(url, options, maxRetries = 2) {
      return window.fetchWithRetry(url, options, maxRetries);
    }

    async _throttle() {
      return this._throttleFn();
    }

    _resolveOptions(options) {
      return {
        model: String(options.model || this.model).trim(),
        temperature: Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.7,
        maxTokens: Number.isFinite(Number(options.maxTokens)) ? Number(options.maxTokens) : 320,
        useCache: options.useCache !== false,
      };
    }

    _buildMessages(systemPrompt, userPrompt) {
      return [
        { role: "system", content: String(systemPrompt || "").trim() },
        { role: "user", content: String(userPrompt || "").trim() },
      ];
    }

    _extractContent(data, label) {
      const content = String(data?.choices?.[0]?.message?.content || "").trim();
      if (!content) throw AppError.create(AppError.CATEGORY.AI, `${label} returned empty content.`);
      return content;
    }

    async askGroq(systemPrompt, userPrompt, options = {}) {
      await this._throttle();
      await this.detectProxy();
      if (!this.useProxy) throw AppError.create(AppError.CATEGORY.AI, "Proxy nicht verfügbar.");
      return this._askViaProxy(systemPrompt, userPrompt, options);
    }

    _buildProxyBody(systemPrompt, userPrompt, opts) {
      return {
        provider: "groq",
        model: opts.model,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
        messages: this._buildMessages(systemPrompt, userPrompt),
      };
    }

    async _buildResponseError(response, label) {
      const body = await response.text();
      return `${label} API ${response.status}: ${(body || "").slice(0, 240)}`;
    }

    async _makeProxyRequest(controller, systemPrompt, userPrompt, opts) {
      return this._fetchWithRetry(this.proxyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this._buildProxyBody(systemPrompt, userPrompt, opts)),
        signal: controller.signal,
      });
    }

    async _fetchFromProxy(systemPrompt, userPrompt, opts) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this._makeProxyRequest(controller, systemPrompt, userPrompt, opts);
        if (!res.ok) throw AppError.create(AppError.CATEGORY.AI, await this._buildResponseError(res, "Proxy"));
        return this._extractContent(await res.json(), "Proxy");
      } finally {
        clearTimeout(timeoutId);
      }
    }

    async _askViaProxy(systemPrompt, userPrompt, options = {}) {
      const opts = this._resolveOptions(options);
      const cacheKey = this.getCacheKey(opts.model, systemPrompt, userPrompt, opts.temperature, opts.maxTokens);
      if (opts.useCache) {
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
      }
      const content = await this._fetchFromProxy(systemPrompt, userPrompt, opts);
      if (opts.useCache) this.setCached(cacheKey, content);
      return content;
    }

    _buildProfessorSystemPrompt(teamSize) {
      const isComplete = teamSize >= 6;
      const sizeRule = isComplete
        ? "Das Team ist VOLLSTÄNDIG (6/6). Schlage NIEMALS vor, weitere Mitglieder hinzuzufügen."
        : "Beginne mit einer väterlichen Ermutigung, das Team auf 6 Mitglieder zu vervollständigen.";
      return [
        "Du bist Professor Eich, der legendäre Pokémon-Experte.",
        `Das Team hat aktuell ${teamSize} von 6 Mitgliedern.`,
        sizeRule,
        "Wähle GENAU EINEN Schwerpunkt: Typen-Abdeckung ODER Synergie ODER Defensiv-Werte.",
        "Nutze Fachbegriffe (STAB, Coverage, Schwächen).",
        "Antworte als Fließtext in maximal 3 vollständigen Sätzen auf Deutsch. Keine Aufzählungen, kein Markdown. Professionell.",
      ].join("\n");
    }

    async requestProfessorTeamAdvice({ team = [], staticAnalysis = null } = {}) {
      const systemPrompt = this._buildProfessorSystemPrompt(team.length);
      const userPrompt = `Teamdaten: ${JSON.stringify(team)}\nStatische Analyse: ${JSON.stringify(staticAnalysis)}`;
      return this.askGroq(systemPrompt, userPrompt, { temperature: 0.8, maxTokens: 400, useCache: false });
    }

    async requestBattleCommentary({ attackerName, moveName, defenderName, effectiveness } = {}) {
      const userPrompt = `${attackerName} nutzt ${moveName} gegen ${defenderName}. Es ist ${effectiveness}.`;
      return this.askGroq(
        "Du bist ein leidenschaftlicher Kampf-Kommentator. Beschreibe das Ergebnis eines Spielzugs in einem einzigen, actionreichen Satz. Nutze dramatische Worte. Antworte auf Deutsch.",
        userPrompt,
        { temperature: 0.8, maxTokens: 90, useCache: true },
      );
    }

    async requestGymLeaderDialogue({ leaderName, leaderType, leaderStyle, eventText } = {}) {
      const systemPrompt = `Du bist ${leaderName}, der ${leaderType}-Arenaleiter. Dein Stil ist ${leaderStyle}. Antworte dem Spieler basierend auf seinem aktuellen Zug. Max. 12 Woerter.`;
      const result = await this.askGroq(
        systemPrompt,
        String(eventText || "").trim(),
        { temperature: 0.7, maxTokens: 60, useCache: false },
      );
      const words = result.split(/\s+/).filter(Boolean).slice(0, 12);
      return words.join(" ");
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
        if (!finalText.length) { resolve(); return; }
        this._typewriterTick(element, finalText, 0, speed, resolve);
      });
    }

    getCacheKey(model, systemPrompt, userPrompt, temperature, maxTokens) {
      return [
        String(model || ""),
        String(temperature),
        String(maxTokens),
        String(systemPrompt || ""),
        String(userPrompt || ""),
      ].join("::");
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
      this.cache.set(cacheKey, { value, expiresAt: Date.now() + this.cacheTtlMs });
    }
  }

  if (!window.aiService) {
    window.aiService = new PokedexAIService();
    window.aiService.detectProxy();
  }

  if (typeof window.askGroq !== "function") {
    window.askGroq = function askGroq(systemPrompt, userPrompt, options = {}) {
      return window.aiService.askGroq(systemPrompt, userPrompt, options);
    };
  }
})();
