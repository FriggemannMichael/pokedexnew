class TeamAIService {
  constructor() {
    this.providers = {
      mistral: {
        name: 'mistral',
        label: 'Mistral',
        endpoint: 'https://api.mistral.ai/v1/chat/completions',
        model: 'mistral-small-latest'
      },
      groq: {
        name: 'groq',
        label: 'Groq',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.1-8b-instant'
      }
    };

    this.storageKeys = {
      mistralApiKey: 'pokedex_ai_mistral_api_key',
      groqApiKey: 'pokedex_ai_groq_api_key'
    };

    this.proxyEndpoint = '/api/ai';
    this.useProxy = false;
    this._proxyChecked = false;
    this._lastRequestTime = 0;
    this._minRequestIntervalMs = 2000;
  }

  getConfig() {
    const runtimeConfig = window.POKE_AI_CONFIG || {};
    const runtimeMistral = String(runtimeConfig.mistralApiKey || '').trim();
    const runtimeGroq = String(runtimeConfig.groqApiKey || '').trim();

    if (runtimeMistral || runtimeGroq) {
      return {
        mistralApiKey: runtimeMistral,
        groqApiKey: runtimeGroq
      };
    }

    return {
      mistralApiKey: localStorage.getItem(this.storageKeys.mistralApiKey) || '',
      groqApiKey: localStorage.getItem(this.storageKeys.groqApiKey) || ''
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
      groqConfigured: Boolean(cfg.groqApiKey)
    };
  }

  async detectProxy() {
    if (this._proxyChecked) return this.useProxy;
    this._proxyChecked = true;
    try {
      const resp = await fetch(this.proxyEndpoint + '/ping');
      this.useProxy = resp.ok;
    } catch {
      this.useProxy = false;
    }
    return this.useProxy;
  }

  async _fetchWithRetry(url, options, maxRetries = 2) {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (response.status >= 500 && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[AI] Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return response;
      } catch (error) {
        lastError = error;
        if (error.name === 'AbortError') throw error;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[AI] Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }
    throw lastError || new Error('Request failed after retries');
  }

  async _throttle() {
    const now = Date.now();
    const elapsed = now - this._lastRequestTime;
    if (elapsed < this._minRequestIntervalMs) {
      await new Promise(resolve => setTimeout(resolve, this._minRequestIntervalMs - elapsed));
    }
    this._lastRequestTime = Date.now();
  }

  async requestTeamAnalysis({ team, staticAnalysis }) {
    const payload = {
      team: this.sanitizeTeam(team),
      staticAnalysis: staticAnalysis || {}
    };

    const prompt = [
      'Du bist ein Pokemon Team Coach.',
      'Erstelle eine konkrete Optimierung fuer Team-Analyse.',
      'Antworte im JSON-Format mit folgenden Feldern:',
      '{"summary":"string","criticalRisks":["string"],"suggestedPokemonTypes":["string"],"suggestedRoles":["string"],"nextActions":["string"]}',
      'Regeln:',
      '- Maximal 5 Eintraege je Liste.',
      '- Nur praktische Empfehlungen, kein Fluff.',
      '- Sprache: Deutsch.'
    ].join('\n');

    return this.requestWithFallback({ prompt, payload, temperature: 0.3, maxTokens: 700 });
  }

  async requestTeamBuilderAssessment({ team, staticAnalysis }) {
    const payload = {
      team: this.sanitizeTeam(team),
      staticAnalysis: staticAnalysis || {}
    };

    const prompt = [
      'Du bist ein Pokemon Team Advisor fuer ein 6er Team.',
      'Bewerte nur den aktuellen Team-Zustand und gib klare, kurze Empfehlungen.',
      'Nenne konkrete Team-Luecken gegen Trainer- oder Typen-Matchups.',
      'Antworte im JSON-Format mit folgenden Feldern:',
      '{"shortAssessment":"string","winningChancePercent":number,"keyRisks":["string"],"priorityFixes":["string"]}',
      'Regeln:',
      '- winningChancePercent muss zwischen 1 und 99 liegen.',
      '- Maximal 3 Punkte fuer keyRisks und priorityFixes.',
      '- Sprache: Deutsch.'
    ].join('\n');

    return this.requestWithFallback({ prompt, payload, temperature: 0.2, maxTokens: 450 });
  }

  async requestGymStrategy({ playerTeam, gymTeam, playerAvgStats, gymAvgStats }) {
    const payload = {
      playerTeam: this.sanitizeTeam(playerTeam),
      gymTeam: this.sanitizeTeam(gymTeam),
      playerAvgStats: playerAvgStats || {},
      gymAvgStats: gymAvgStats || {}
    };

    const prompt = [
      'Du bist ein Gym-Battle Strategist.',
      'Erstelle einen Battleplan fuer ein Team-vs-Team Matchup.',
      'Antworte im JSON-Format mit folgenden Feldern:',
      '{"strategySummary":"string","recommendedLead":"string","swapPriorities":["string"],"targetFocus":["string"],"riskAlerts":["string"]}',
      'Regeln:',
      '- Maximal 5 Eintraege je Liste.',
      '- Beruecksichtige Typen und Basiswerte.',
      '- Sprache: Deutsch.'
    ].join('\n');

    return this.requestWithFallback({ prompt, payload, temperature: 0.25, maxTokens: 700 });
  }

  async requestWithFallback({ prompt, payload, temperature = 0.3, maxTokens = 700 }) {
    await this.detectProxy();

    if (this.useProxy) {
      // When proxy is available, use it directly with both providers
      const providers = [
        { ...this.providers.mistral },
        { ...this.providers.groq }
      ];

      let lastError = null;
      for (const provider of providers) {
        try {
          const content = await this.callProvider({
            provider,
            prompt,
            payload,
            temperature,
            maxTokens
          });

          return {
            provider: provider.name,
            providerLabel: provider.label,
            rawContent: content,
            parsed: this.tryParseJSON(content)
          };
        } catch (error) {
          lastError = error;
          console.warn(`[AI] ${provider.label} via proxy failed, trying fallback`, error);
        }
      }
      throw new Error(lastError?.message || 'AI request failed on all providers.');
    }

    const config = this.getConfig();

    const providers = [
      { ...this.providers.mistral, apiKey: config.mistralApiKey },
      { ...this.providers.groq, apiKey: config.groqApiKey }
    ].filter((provider) => Boolean(provider.apiKey));

    if (!providers.length) {
      throw new Error('Bitte API-Key fuer Mistral oder Groq speichern.');
    }

    let lastError = null;

    for (const provider of providers) {
      try {
        const content = await this.callProvider({
          provider,
          prompt,
          payload,
          temperature,
          maxTokens
        });

        return {
          provider: provider.name,
          providerLabel: provider.label,
          rawContent: content,
          parsed: this.tryParseJSON(content)
        };
      } catch (error) {
        lastError = error;
        console.warn(`[AI] ${provider.label} failed, trying fallback if available`, error);
      }
    }

    throw new Error(lastError?.message || 'AI request failed on all providers.');
  }

  async callProvider({ provider, prompt, payload, temperature, maxTokens }) {
    await this._throttle();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const useProxy = this.useProxy;
    const url = useProxy ? this.proxyEndpoint : provider.endpoint;
    const headers = { 'Content-Type': 'application/json' };
    if (!useProxy) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }

    const bodyObj = {
      model: provider.model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content: 'Du bist ein praeziser Pokemon-Coach. Antworte nur mit gueltigem JSON ohne Markdown.'
        },
        {
          role: 'user',
          content: `${prompt}\n\nInput:\n${JSON.stringify(payload)}`
        }
      ]
    };

    if (useProxy) {
      bodyObj.provider = provider.name;
    }

    try {
      const response = await this._fetchWithRetry(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyObj),
        signal: controller.signal
      });

      if (!response.ok) {
        const body = await response.text();
        const compactBody = body ? body.slice(0, 280) : 'no-body';
        throw new Error(`${provider.label} API ${response.status}: ${compactBody}`);
      }

      const data = await response.json();
      const messageContent = data?.choices?.[0]?.message?.content;
      const content = Array.isArray(messageContent)
        ? messageContent.map((part) => part?.text || '').join(' ').trim()
        : messageContent;
      if (!content) {
        throw new Error(`${provider.label} API returned no content.`);
      }

      return String(content).trim();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  sanitizeTeam(team) {
    if (!Array.isArray(team)) return [];

    return team.map((pokemon) => ({
      id: pokemon?.id || null,
      name: pokemon?.name || '',
      types: Array.isArray(pokemon?.types) ? pokemon.types : [],
      stats: pokemon?.stats || null
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
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    return text.slice(start, end + 1);
  }
}

if (!window.teamAIService) {
  window.teamAIService = new TeamAIService();
  // Eagerly detect proxy so hasAnyKey() works synchronously later
  window.teamAIService.detectProxy();
}
