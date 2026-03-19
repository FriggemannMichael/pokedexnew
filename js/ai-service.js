(function () {
  class PokedexAIService {
    constructor() {
      this.endpoint = "https://api.groq.com/openai/v1/chat/completions";
      this.proxyEndpoint = "/api/ai";
      this.useProxy = false;
      this._proxyChecked = false;
      this.model = "llama-3.1-8b-instant";
      this.timeoutMs = 20000;
      this.cache = new Map();
      this.cacheTtlMs = 5 * 60 * 1000;
      this.maxCacheEntries = 80;
      this.storageKey = "pokedex_ai_groq_api_key";
      this.fallbackText = "Professor Eich ist gerade nicht erreichbar...";
      this._throttleFn = window.createThrottler(2000);
    }

    getGroqApiKey() {
      const runtimeConfig = window.POKE_AI_CONFIG || {};
      const runtimeKey = String(runtimeConfig.groqApiKey || "").trim();
      if (runtimeKey) return runtimeKey;

      return String(localStorage.getItem(this.storageKey) || "").trim();
    }

    hasGroqKey() {
      if (this.useProxy) return true;
      return Boolean(this.getGroqApiKey());
    }

    setGroqApiKey(apiKey) {
      const safeKey = String(apiKey || "").trim();
      if (!safeKey) {
        localStorage.removeItem(this.storageKey);
        return;
      }
      localStorage.setItem(this.storageKey, safeKey);
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
      if (!content) throw new Error(`${label} returned empty content.`);
      return content;
    }

    async askGroq(systemPrompt, userPrompt, options = {}) {
      await this._throttle();
      await this.detectProxy();

      if (this.useProxy) {
        return this._askViaProxy(systemPrompt, userPrompt, options);
      }

      const apiKey = String(options.apiKey || this.getGroqApiKey()).trim();
      if (!apiKey) throw new Error("Groq API key missing.");

      const opts = this._resolveOptions(options);
      const cacheKey = this.getCacheKey(opts.model, systemPrompt, userPrompt, opts.temperature, opts.maxTokens);

      if (opts.useCache) {
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this._fetchWithRetry(this.endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: opts.model, temperature: opts.temperature, max_tokens: opts.maxTokens, messages: this._buildMessages(systemPrompt, userPrompt) }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Groq API ${response.status}: ${(body || "no-body").slice(0, 240)}`);
        }

        const content = this._extractContent(await response.json(), "Groq");
        if (opts.useCache) this.setCached(cacheKey, content);
        return content;
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this._fetchWithRetry(this.proxyEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "groq", model: opts.model, temperature: opts.temperature, max_tokens: opts.maxTokens, messages: this._buildMessages(systemPrompt, userPrompt) }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Proxy API ${response.status}: ${(body || "").slice(0, 240)}`);
        }

        const content = this._extractContent(await response.json(), "Proxy");
        if (opts.useCache) this.setCached(cacheKey, content);
        return content;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    async requestProfessorTeamAdvice({
      team = [],
      staticAnalysis = null,
    } = {}) {
      const systemPrompt = [
        "Du bist Professor Eich, der legendäre Pokémon-Experte.",
        "Analysiere das Team auf Basis der bereitgestellten Daten.",
        "REGELN FÜR DEINE ANTWORT:",
        "1. Falls das Team < 6 Mitglieder hat, beginne mit einer väterlichen Ermutigung, das Team zu vervollständigen.",
        "2. Variiere deine Analyse: Mal liegt der Fokus auf der Typen-Abdeckung, mal auf der Synergie oder den Defensiv-Werten.",
        "3. Nutze abwechslungsreiche Formulierungen und Fachbegriffe (STAB, Coverage, Schwächen).",
        "4. Antworte in 3-4 Sätzen auf Deutsch. Sei mal lobend, mal kritisch, aber immer professionell.",
      ].join("\n");

      const userPrompt = `Teamdaten: ${JSON.stringify(team)}\nStatische Analyse: ${JSON.stringify(staticAnalysis)}`;

      return this.askGroq(
        systemPrompt,
        userPrompt,
        { temperature: 0.8, maxTokens: 200, useCache: false },
      );
    }

    async requestBattleCommentary({
      attackerName,
      moveName,
      defenderName,
      effectiveness,
    } = {}) {
      const userPrompt = `${attackerName} nutzt ${moveName} gegen ${defenderName}. Es ist ${effectiveness}.`;
      return this.askGroq(
        "Du bist ein leidenschaftlicher Kampf-Kommentator. Beschreibe das Ergebnis eines Spielzugs in einem einzigen, actionreichen Satz. Nutze dramatische Worte. Antworte auf Deutsch.",
        userPrompt,
        { temperature: 0.8, maxTokens: 90, useCache: true },
      );
    }

    async requestGymLeaderDialogue({
      leaderName,
      leaderType,
      leaderStyle,
      eventText,
    } = {}) {
      const systemPrompt = `Du bist ${leaderName}, der ${leaderType}-Arenaleiter. Dein Stil ist ${leaderStyle}. Antworte dem Spieler basierend auf seinem aktuellen Zug. Max. 12 Woerter.`;
      const result = await this.askGroq(
        systemPrompt,
        String(eventText || "").trim(),
        {
          temperature: 0.7,
          maxTokens: 60,
          useCache: false,
        },
      );

      const words = result.split(/\s+/).filter(Boolean).slice(0, 12);
      return words.join(" ");
    }

    typewriterToElement(element, text, options = {}) {
      if (!element) return Promise.resolve();
      const speed = Number.isFinite(Number(options.speed))
        ? Number(options.speed)
        : 18;
      const finalText = String(text || "");

      if (element._typewriterTimer) {
        clearTimeout(element._typewriterTimer);
        element._typewriterTimer = null;
      }

      element.textContent = "";
      let cursor = 0;

      return new Promise((resolve) => {
        const tick = () => {
          cursor += 1;
          element.textContent = finalText.slice(0, cursor);
          if (cursor >= finalText.length) {
            element._typewriterTimer = null;
            resolve();
            return;
          }
          element._typewriterTimer = setTimeout(tick, speed);
        };

        if (!finalText.length) {
          resolve();
          return;
        }

        tick();
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

  if (typeof window.askGroq !== "function") {
    window.askGroq = function askGroq(systemPrompt, userPrompt, options = {}) {
      return window.aiService.askGroq(systemPrompt, userPrompt, options);
    };
  }
})();
