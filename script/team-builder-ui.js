(function () {
  const TeamBuilderUI = window._TeamBuilderUI;
  const escapeHtml = window._teamBuilderEscapeHtml;
  const MIN_ADVICE_TEAM_SIZE = window._MIN_ADVICE_TEAM_SIZE;

  TeamBuilderUI.prototype.render = function () {
    const slots = this.state.getSlots();
    this.grid.innerHTML = slots
      .map((pokemon, index) => this.renderSlot(pokemon, index))
      .join("");
  };

  TeamBuilderUI.prototype.renderSlot = function (pokemon, index) {
    if (!pokemon) {
      return `
        <div class="team-slot" data-slot-index="${index}" role="listitem" tabindex="0" aria-label="Slot ${index + 1}, empty">
          <span class="team-slot-index">${index + 1}</span>
          <div class="team-slot-placeholder">
            <span class="team-slot-plus" aria-hidden="true">+</span>
            <span class="team-slot-placeholder-text">Drop Pokemon</span>
          </div>
        </div>
      `;
    }

    const primaryType = pokemon.types[0] || "normal";
    const accent = window.TYPE_COLORS[primaryType] || "#4ecdc4";
    const safeName = escapeHtml(pokemon.name);
    const safeImage = escapeHtml(pokemon.image || pokemon.spriteUrl || "");

    return `
      <div class="team-slot is-filled" data-slot-index="${index}" data-type="${primaryType}" role="listitem" tabindex="0" style="--slot-accent:${accent}" aria-label="Slot ${index + 1}, ${safeName}">
        <span class="team-slot-index">${index + 1}</span>
        <button type="button" class="team-slot-remove" data-action="remove-slot" data-slot-index="${index}" aria-label="Remove ${safeName} from slot ${index + 1}">x</button>
        <img src="${safeImage}" alt="${safeName}" class="team-slot-sprite" loading="lazy" />
        <p class="team-slot-name">${safeName}</p>
      </div>
    `;
  };

  TeamBuilderUI.prototype.refreshAdvisor = async function () {
    if (!this.advisor) return;

    const team = this.state.getTeam();
    if (team.length < MIN_ADVICE_TEAM_SIZE) {
      this.lastAdvisorSignature = "";
      this.cachedAdvisorAssessment = null;
      this.renderAdvisorWaiting(team.length);
      return;
    }

    const signature = this.getTeamSignature(team);
    if (signature && signature === this.lastAdvisorSignature && this.cachedAdvisorAssessment) {
      this.renderAdvisorResult(this.cachedAdvisorAssessment);
      return;
    }

    const requestId = ++this.advisorRequestId;
    this.renderAdvisorLoading();

    const assessment = await this.generateTeamAssessment(team);
    if (requestId !== this.advisorRequestId) return;

    if (!assessment) {
      this.renderAdvisorError();
      return;
    }

    this.lastAdvisorSignature = signature;
    this.cachedAdvisorAssessment = assessment;
    this.renderAdvisorResult(assessment);
  };

  TeamBuilderUI.prototype.generateTeamAssessment = async function (team) {
    const staticAnalysis = this.getStaticTeamAnalysis(team);
    const aiService = window.aiService;
    const localFallback = this.createLocalProfessorAdvice(team, staticAnalysis);

    if (aiService && typeof aiService.detectProxy === "function") {
      await aiService.detectProxy();
    }

    if (
      aiService &&
      typeof aiService.requestProfessorTeamAdvice === "function" &&
      typeof aiService.hasGroqKey === "function" &&
      aiService.hasGroqKey()
    ) {
      try {
        const aiAdvice = await aiService.requestProfessorTeamAdvice({ team, staticAnalysis });
        return {
          providerLabel: "Professor Eich (KI-Proxy)",
          adviceText: this.normalizeProfessorAdvice(aiAdvice, localFallback, team.length),
        };
      } catch (error) {
        console.warn("Professor advisor AI failed, fallback to local", error);
      }
    }

    return { providerLabel: "Professor Eich (lokal)", adviceText: localFallback };
  };

  TeamBuilderUI.prototype.getStaticTeamAnalysis = function (team) {
    if (window.pokemonTeamAnalyzer && typeof window.pokemonTeamAnalyzer.analyzeTeam === "function") {
      try { return window.pokemonTeamAnalyzer.analyzeTeam(team); } catch (error) {}
    }
    return null;
  };

  TeamBuilderUI.prototype.createLocalProfessorAdvice = function (team, staticAnalysis) {
    const teamTypes = new Set();
    team.forEach((pokemon) => {
      (pokemon.types || []).forEach((type) => teamTypes.add(type));
    });

    const weaknessEntries = Object.entries(staticAnalysis?.weaknesses || {});
    const weaknessRanking = weaknessEntries
      .map(([type, data]) => ({ type, weight: this.getWeaknessWeight(data?.severity?.level) }))
      .sort((left, right) => right.weight - left.weight);
    const weakestType = weaknessRanking[0]?.type;

    const coverage = staticAnalysis?.coverage || {};
    const coveredCount = Object.values(coverage).filter((entry) => entry?.covered).length;
    const totalCoverageTypes = Object.keys(coverage).length || 18;

    const weaknessSentence = weakestType
      ? `Größte Schwäche: Gegen ${weakestType} fehlt dir aktuell die beste Absicherung.`
      : "Größte Schwäche: Dein Team hat noch keine klare Defensiv-Achse.";
    const strengthSentence =
      coveredCount >= Math.max(8, Math.round(totalCoverageTypes * 0.45))
        ? `Stärke: Deine Coverage trifft bereits ${coveredCount} von ${totalCoverageTypes} Typen.`
        : `Stärke: Du nutzt schon ${teamTypes.size} verschiedene Typen für flexible Matchups.`;

    return `${weaknessSentence} ${strengthSentence}`;
  };

  TeamBuilderUI.prototype.getWeaknessWeight = function (level) {
    if (level === "critical") return 3;
    if (level === "high") return 2;
    if (level === "medium") return 1;
    return 0;
  };

  TeamBuilderUI.prototype.normalizeProfessorAdvice = function (text, fallbackText, teamSize = 0) {
    const raw = String(text || "").replace(/\s+/g, " ").trim();
    const fallback = String(fallbackText || "").trim();
    if (teamSize >= 6 && this.containsIncompleteTeamClaim(raw)) {
      return fallback;
    }
    const fallbackParts = this.splitSentences(fallback);
    const parts = this.splitSentences(raw);

    const first = parts[0] || fallbackParts[0] || "Größte Schwäche: Analyse unvollständig.";
    const second = parts[1] || fallbackParts[1] || "Stärke: Dein Team zeigt trotzdem offensive Optionen.";

    return `${first} ${second}`.trim();
  };

  TeamBuilderUI.prototype.containsIncompleteTeamClaim = function (text) {
    return /\b(vervollstaend|vervollst[aä]nd|unvollst[aä]nd|zu wenig|fehlen|fehlt|nur\s+[0-5]\b|nur\s+(eins|zwei|drei|vier|fuenf|fünf)\b|weniger als 6|nicht komplett|aus\s+(eins|zwei|drei|vier|fuenf|fünf)\s+mitglied)/i.test(
      String(text || ""),
    );
  };

  TeamBuilderUI.prototype.splitSentences = function (text) {
    return String(text || "")
      .split(/(?<=[.!?])\s+/)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .slice(0, 2);
  };

  TeamBuilderUI.prototype.renderAdvisorWaiting = function (count) {
    if (!this.advisor) return;
    this.advisor.className = "team-builder-advisor is-waiting";
    this.advisor.innerHTML = `
      <div class="advisor-head">
        <div class="advisor-avatar" aria-hidden="true">Prof</div>
        <div class="advisor-title-wrap">
          <div class="advisor-title">Professor Eich</div>
          <div class="advisor-provider">Team-Analyse</div>
        </div>
      </div>
      <p class="advisor-text">Noch ${MIN_ADVICE_TEAM_SIZE - count} Slot(s) bis zur Analyse.</p>
    `;
  };

  TeamBuilderUI.prototype.renderAdvisorLoading = function () {
    if (!this.advisor) return;
    this.advisor.className = "team-builder-advisor is-loading";
    this.advisor.innerHTML = `
      <div class="advisor-head">
        <div class="advisor-avatar is-thinking" aria-hidden="true">Prof</div>
        <div class="advisor-title-wrap">
          <div class="advisor-title">Professor Eich</div>
          <div class="advisor-provider">Analysiert Team</div>
        </div>
      </div>
      <p class="advisor-text">
        Professor Eich denkt
        <span class="advisor-dots" aria-hidden="true"><span></span><span></span><span></span></span>
      </p>
    `;
  };

  TeamBuilderUI.prototype.renderAdvisorError = function () {
    if (!this.advisor) return;
    this.advisor.className = "team-builder-advisor is-error";
    this.advisor.innerHTML = `
      <div class="advisor-head">
        <div class="advisor-avatar" aria-hidden="true">Prof</div>
        <div class="advisor-title-wrap">
          <div class="advisor-title">Professor Eich</div>
          <div class="advisor-provider">Offline</div>
        </div>
      </div>
      <p class="advisor-text">Analyse nicht verfügbar. Team kurz ändern und erneut prüfen.</p>
    `;
  };

  TeamBuilderUI.prototype.renderAdvisorResult = function (assessment) {
    if (!this.advisor) return;

    const safeProvider = escapeHtml(assessment.providerLabel || "Professor Eich");
    const adviceText = String(assessment.adviceText || "").trim();

    this.advisor.className = "team-builder-advisor is-ready";
    this.advisor.innerHTML = `
      <div class="advisor-head">
        <div class="advisor-avatar" aria-hidden="true">Prof</div>
        <div class="advisor-title-wrap">
          <div class="advisor-title">Professor Eich</div>
          <div class="advisor-provider">${safeProvider}</div>
        </div>
      </div>
      <p class="advisor-text advisor-typewriter" data-role="advisor-output"></p>
    `;

    const output = this.advisor.querySelector('[data-role="advisor-output"]');
    if (!output) return;

    if (window.aiService && typeof window.aiService.typewriterToElement === "function") {
      window.aiService.typewriterToElement(output, adviceText, { speed: 17 });
    } else {
      output.textContent = adviceText;
    }
  };
})();
