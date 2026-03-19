class TeamAIService {
  constructor() {
    this.providers = {
      mistral: {
        name: "mistral",
        label: "Mistral",
        endpoint: "https://api.mistral.ai/v1/chat/completions",
        model: "mistral-small-latest",
      },
      groq: {
        name: "groq",
        label: "Groq",
        endpoint: "https://api.groq.com/openai/v1/chat/completions",
        model: "llama-3.1-8b-instant",
      },
    };

    this.storageKeys = {
      mistralApiKey: "pokedex_ai_mistral_api_key",
      groqApiKey: "pokedex_ai_groq_api_key",
    };

    this.proxyEndpoint = "/api/ai";
    this.useProxy = false;
    this._proxyChecked = false;
    this._throttleFn = window.createThrottler(2000);
  }

  getConfig() {
    const runtimeConfig = window.POKE_AI_CONFIG || {};
    const runtimeMistral = String(runtimeConfig.mistralApiKey || "").trim();
    const runtimeGroq = String(runtimeConfig.groqApiKey || "").trim();

    if (runtimeMistral || runtimeGroq) {
      return {
        mistralApiKey: runtimeMistral,
        groqApiKey: runtimeGroq,
      };
    }

    return {
      mistralApiKey: localStorage.getItem(this.storageKeys.mistralApiKey) || "",
      groqApiKey: localStorage.getItem(this.storageKeys.groqApiKey) || "",
    };
  }

  saveConfig({ mistralApiKey, groqApiKey }) {
    this.persistValue(this.storageKeys.mistralApiKey, mistralApiKey);
    this.persistValue(this.storageKeys.groqApiKey, groqApiKey);
  }

  persistValue(key, value) {
    if (!value || !String(value).trim()) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, String(value).trim());
  }

  hasAnyKey() {
    if (this.useProxy) return true;
    const cfg = this.getConfig();
    return Boolean(cfg.mistralApiKey || cfg.groqApiKey);
  }

  getSafeConfigStatus() {
    const cfg = this.getConfig();
    return {
      mistralConfigured: Boolean(cfg.mistralApiKey),
      groqConfigured: Boolean(cfg.groqApiKey),
    };
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

  async requestTeamAnalysis({ team, staticAnalysis }) {
    const payload = {
      team: this.sanitizeTeam(team),
      staticAnalysis: staticAnalysis || {},
    };
    const prompt = window.getTeamAnalysisPrompt(payload);

    return this.requestWithFallback({
      prompt,
      payload,
      temperature: 0.3,
      maxTokens: 700,
    });
  }

  async requestTeamBuilderAssessment({ team, staticAnalysis }) {
    const payload = {
      team: this.sanitizeTeam(team),
      staticAnalysis: staticAnalysis || {},
    };
    const prompt = window.getTeamAdvicePrompt();

    return this.requestWithFallback({
      prompt,
      payload,
      temperature: 0.2,
      maxTokens: 450,
    });
  }

  async requestGymStrategy({ playerTeam, gymTeam, playerAvgStats, gymAvgStats }) {
    const payload = {
      playerTeam: this.sanitizeTeam(playerTeam),
      gymTeam: this.sanitizeTeam(gymTeam),
      playerAvgStats: playerAvgStats || {},
      gymAvgStats: gymAvgStats || {},
    };
    const prompt = window.getBattleStrategyPrompt();

    return this.requestWithFallback({
      prompt,
      payload,
      temperature: 0.25,
      maxTokens: 700,
    });
  }

  getProviderList() {
    if (this.useProxy) {
      return [{ ...this.providers.mistral }, { ...this.providers.groq }];
    }
    const config = this.getConfig();
    const providers = [
      { ...this.providers.mistral, apiKey: config.mistralApiKey },
      { ...this.providers.groq, apiKey: config.groqApiKey },
    ].filter((provider) => Boolean(provider.apiKey));
    if (!providers.length) {
      throw new Error("Bitte API-Key fuer Mistral oder Groq speichern.");
    }
    return providers;
  }

  async requestWithFallback({ prompt, payload, temperature = 0.3, maxTokens = 700 }) {
    await this.detectProxy();
    const providers = this.getProviderList();

    let lastError = null;
    for (const provider of providers) {
      try {
        const content = await this.callProvider({ provider, prompt, payload, temperature, maxTokens });
        return {
          provider: provider.name,
          providerLabel: provider.label,
          rawContent: content,
          parsed: this.tryParseJSON(content),
        };
      } catch (error) {
        lastError = error;
        console.warn(`[AI] ${provider.label} failed, trying fallback`, error);
      }
    }
    throw new Error(lastError?.message || "AI request failed on all providers.");
  }

  buildRequestBody(provider, prompt, payload, temperature, maxTokens) {
    const body = {
      model: provider.model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: window.getCoachSystemPrompt() },
        { role: "user", content: `${prompt}\n\nInput:\n${JSON.stringify(payload)}` },
      ],
    };
    if (this.useProxy) body.provider = provider.name;
    return body;
  }

  extractProviderContent(data, label) {
    const messageContent = data?.choices?.[0]?.message?.content;
    const content = Array.isArray(messageContent)
      ? messageContent.map((part) => part?.text || "").join(" ").trim()
      : messageContent;
    if (!content) throw new Error(`${label} API returned no content.`);
    return String(content).trim();
  }

  async callProvider({ provider, prompt, payload, temperature, maxTokens }) {
    await this._throttle();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const url = this.useProxy ? this.proxyEndpoint : provider.endpoint;
    const headers = { "Content-Type": "application/json" };
    if (!this.useProxy) headers["Authorization"] = `Bearer ${provider.apiKey}`;

    try {
      const response = await this._fetchWithRetry(url, {
        method: "POST",
        headers,
        body: JSON.stringify(this.buildRequestBody(provider, prompt, payload, temperature, maxTokens)),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`${provider.label} API ${response.status}: ${(body || "no-body").slice(0, 280)}`);
      }

      return this.extractProviderContent(await response.json(), provider.label);
    } finally {
      clearTimeout(timeoutId);
    }
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

  tryParseJSON(rawContent) {
    if (!rawContent) return null;

    try {
      return JSON.parse(rawContent);
    } catch {
      const extracted = this.extractJSONObject(rawContent);
      if (!extracted) return null;

      try {
        return JSON.parse(extracted);
      } catch {
        return null;
      }
    }
  }

  extractJSONObject(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    return text.slice(start, end + 1);
  }
}

if (!window.teamAIService) {
  window.teamAIService = new TeamAIService();
  window.teamAIService.detectProxy();
}
