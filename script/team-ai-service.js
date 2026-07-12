class TeamAIService {
  // Alle Anfragen gehen an den Proxy im Backend (siehe _makeProviderRequest);
  // der Anbieter wird nur ueber "name" mitgeschickt. Deshalb steht hier auch
  // keine Anbieter-URL mehr - die kennt allein das Backend, samt API-Key.
  _createProviders() {
    return {
      gemini: { name: "gemini", label: "Gemini", model: "gemini-2.5-flash" },
      openrouter: {
        name: "openrouter",
        label: "OpenRouter",
        model: "meta-llama/llama-3.1-8b-instruct",
      },
      mistral: {
        name: "mistral",
        label: "Mistral",
        model: "mistral-small-latest",
      },
      groq: { name: "groq", label: "Groq", model: "llama-3.1-8b-instant" },
    };
  }

  constructor() {
    this.providers = this._createProviders();
    this.proxyEndpoint = `${window.BACKEND_URL || ""}/api/ai`;
    this.useProxy = false;
    this._proxyChecked = false;
    this._throttleFn = window.createThrottler(2000);
  }

  hasAnyKey() {
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

  _buildGymStrategyPayload(playerTeam, gymTeam, playerAvgStats, gymAvgStats) {
    return {
      playerTeam: this.sanitizeTeam(playerTeam),
      gymTeam: this.sanitizeTeam(gymTeam),
      playerAvgStats: playerAvgStats || {},
      gymAvgStats: gymAvgStats || {},
    };
  }

  async requestGymStrategy({
    playerTeam,
    gymTeam,
    playerAvgStats,
    gymAvgStats,
  }) {
    const payload = this._buildGymStrategyPayload(
      playerTeam,
      gymTeam,
      playerAvgStats,
      gymAvgStats,
    );
    return this.requestWithFallback({
      prompt: window.getBattleStrategyPrompt(),
      payload,
      temperature: 0.25,
      maxTokens: 700,
    });
  }

  getProviderList() {
    if (!this.useProxy)
      throw AppError.create(AppError.CATEGORY.AI, "Proxy nicht verfügbar.");
    return [
      { ...this.providers.gemini },
      { ...this.providers.openrouter },
      { ...this.providers.mistral },
      { ...this.providers.groq },
    ];
  }

  _buildResult(provider, content) {
    return {
      provider: provider.name,
      providerLabel: provider.label,
      rawContent: content,
      parsed: this.tryParseJSON(content),
    };
  }

  async _tryCallProvider(provider, prompt, payload, temperature, maxTokens) {
    const content = await this.callProvider({
      provider,
      prompt,
      payload,
      temperature,
      maxTokens,
    });
    return this._buildResult(provider, content);
  }

  async requestWithFallback({
    prompt,
    payload,
    temperature = 0.3,
    maxTokens = 700,
  }) {
    await this.detectProxy();
    const providers = this.getProviderList();
    let lastError = null;
    for (const provider of providers) {
      try {
        return await this._tryCallProvider(
          provider,
          prompt,
          payload,
          temperature,
          maxTokens,
        );
      } catch (error) {
        lastError = error;
        AppError.warn(
          AppError.CATEGORY.AI,
          `${provider.label} fehlgeschlagen, versuche Fallback`,
          error,
        );
      }
    }
    throw AppError.create(
      AppError.CATEGORY.AI,
      "Alle Provider fehlgeschlagen.",
      lastError,
    );
  }

  buildRequestBody(provider, prompt, payload, temperature, maxTokens) {
    return {
      provider: provider.name,
      model: provider.model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: window.getCoachSystemPrompt() },
        {
          role: "user",
          content: `${prompt}\n\nInput:\n${JSON.stringify(payload)}`,
        },
      ],
    };
  }

  _buildProxyHeaders() {
    return { "Content-Type": "application/json" };
  }

  async _handleProviderResponse(response, label) {
    if (!response.ok) {
      const body = await response.text();
      throw AppError.create(
        AppError.CATEGORY.AI,
        `${label} API ${response.status}: ${(body || "no-body").slice(0, 280)}`,
      );
    }
    return this.extractProviderContent(await response.json(), label);
  }

  async _makeProviderRequest(
    controller,
    provider,
    prompt,
    payload,
    temperature,
    maxTokens,
  ) {
    return this._fetchWithRetry(this.proxyEndpoint, {
      method: "POST",
      headers: this._buildProxyHeaders(),
      body: JSON.stringify(
        this.buildRequestBody(
          provider,
          prompt,
          payload,
          temperature,
          maxTokens,
        ),
      ),
      signal: controller.signal,
    });
  }

  async callProvider({ provider, prompt, payload, temperature, maxTokens }) {
    await this._throttle();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await this._makeProviderRequest(
        controller,
        provider,
        prompt,
        payload,
        temperature,
        maxTokens,
      );
      return await this._handleProviderResponse(response, provider.label);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  extractProviderContent(data, label) {
    const messageContent = data?.choices?.[0]?.message?.content;
    const content = Array.isArray(messageContent)
      ? messageContent
          .map((part) => part?.text || "")
          .join(" ")
          .trim()
      : messageContent;
    if (!content)
      throw AppError.create(
        AppError.CATEGORY.AI,
        `${label} API returned no content.`,
      );
    return String(content).trim();
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
      /* continue */
    }
    const extracted = this.extractJSONObject(rawContent);
    if (!extracted) return null;
    try {
      return JSON.parse(extracted);
    } catch {
      return null;
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
