(function () {
  const Core = window.PokemonTeamAnalyzerCore;
  if (!Core) {
    console.error('Core not loaded');
    return;
  }

  Core.prototype.setupTeamAnalysisModal = function () {
    const html = this.createTeamAnalysisModalHTML();
    document.body.insertAdjacentHTML('beforeend', html);
    this.attachModalEventListeners();
  };

  Core.prototype.attachModalEventListeners = function () {
    const modal = document.getElementById('teamAnalysisModal');
    if (!modal) return;

    modal.addEventListener('shown.bs.modal', () => {
      const closeButton = modal.querySelector('.btn-close');
      if (closeButton) closeButton.focus();
      modal.removeAttribute('aria-hidden');
    });

    modal.addEventListener('hide.bs.modal', () => {
      if (modal.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    });

    modal.addEventListener('hidden.bs.modal', () => {
      const analysisButton = document.querySelector('.drop-point button.btn-info');
      if (analysisButton) analysisButton.focus();
    });
  };

  Core.prototype.createTeamAnalysisModalHTML = function () {
    return `
  <div id="teamAnalysisModal" class="modal fade glass-modal" tabindex="-1" aria-labelledby="teamAnalysisModalLabel" aria-describedby="teamAnalysisContent">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="teamAnalysisModalLabel">Team-Analyse</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schliessen"></button>
        </div>
        <div class="modal-body">
          <div id="teamAnalysisContent">
            <div class="analysis-loading">
              <div class="spinner-border text-primary" role="status" aria-label="Analysiere Team"></div>
              <p>Analysiere Team...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  };

  Core.prototype.addAnalysisButtonToDroppoint = function () {
    const dropPoint = document.querySelector('.drop-point');
    if (!dropPoint) return;
    if (dropPoint.querySelector('.btn-info[data-analyze]')) return;

    const button = document.createElement('button');
    button.className = 'btn btn-info mt-3 w-100';
    button.setAttribute('data-analyze', '1');
    button.textContent = 'Team analysieren';
    button.addEventListener('click', () => this.openTeamAnalysis());
    dropPoint.appendChild(button);
  };

  Core.prototype.displayTeamAnalysis = function (team) {
    const analysis = this.analyzeTeam(team);
    const content = document.getElementById('teamAnalysisContent');
    if (!content) return;

    const teamOverviewHTML = this.createTeamOverviewHTML(team);
    const aiAdvisorHTML = `
      <div class="analysis-section analysis-ai-advisor" id="analysisAiAdvisor">
        <h6>Professor Eich</h6>
        <div class="ai-advisor-content" id="aiAdvisorContent">
          <div class="ai-advisor-loading">Analysiere...</div>
        </div>
      </div>`;
    const coverageHTML = this.createCoverageHTML(analysis.coverage);

    content.innerHTML = `
      <div class="team-analysis-results">
        ${teamOverviewHTML}
        ${aiAdvisorHTML}
        ${coverageHTML}
      </div>`;

    if (typeof initDynamicBars === 'function') {
      initDynamicBars();
    }

    this.requestAIAnalysis(team, analysis);
  };

  Core.prototype.requestAIAnalysis = async function (team, staticAnalysis) {
    const container = document.getElementById('aiAdvisorContent');
    if (!container) return;

    const teamAI = window.teamAIService;
    if (teamAI && typeof teamAI.detectProxy === 'function') {
      await teamAI.detectProxy();
    }

    if (teamAI && teamAI.hasAnyKey()) {
      try {
        const result = await teamAI.requestTeamAnalysis({ team, staticAnalysis });
        const parsed = result.parsed;
        if (parsed) {
          container.innerHTML = this.renderAIAnalysis(parsed, result.providerLabel);
          return;
        }
      } catch (err) {
        console.warn('[Analyzer] teamAIService failed, trying aiService', err);
      }
    }

    const aiService = window.aiService;
    if (aiService && typeof aiService.detectProxy === 'function') {
      await aiService.detectProxy();
    }

    if (aiService && aiService.hasGroqKey()) {
      try {
        const advice = await aiService.requestProfessorTeamAdvice({ team, staticAnalysis });
        const normalizedAdvice =
          team.length >= 6 &&
          /\b(vervollstaend|vervollst[aä]nd|unvollst[aä]nd|zu wenig|fehlen|fehlt|nur\s+[0-5]\b|nur\s+(eins|zwei|drei|vier|fuenf|fünf)\b|weniger als 6|nicht komplett|aus\s+(eins|zwei|drei|vier|fuenf|fünf)\s+mitglied)/i.test(
            String(advice || ""),
          )
            ? "Dein Team ist vollständig besetzt. Die statische Analyse oben zeigt dir die wichtigsten Stärken und Schwächen."
            : advice;
        container.innerHTML = `
          <div class="ai-advisor-result">
            <div class="ai-advisor-provider">Professor Eich (KI-Proxy)</div>
            <p class="ai-advisor-text">${normalizedAdvice}</p>
          </div>`;
        return;
      } catch (err) {
        console.warn('[Analyzer] aiService failed', err);
      }
    }

    container.innerHTML = `
      <div class="ai-advisor-result">
        <div class="ai-advisor-provider">Professor Eich (lokal)</div>
        <p class="ai-advisor-text">Keine KI-Verbindung. Die statische Analyse oben zeigt deine Team-Schwächen und Stärken.</p>
      </div>`;
  };

  Core.prototype.renderAIAnalysis = function (parsed, providerLabel) {
    const summary = parsed.summary || parsed.team_synergy || '';
    const criticalRisks = Array.isArray(parsed.criticalRisks)
      ? parsed.criticalRisks
      : Array.isArray(parsed.cumulative_weaknesses?.critical)
        ? parsed.cumulative_weaknesses.critical
        : [];
    const moderateRisks = Array.isArray(parsed.cumulative_weaknesses?.moderate)
      ? parsed.cumulative_weaknesses.moderate
      : [];
    const risks = [...criticalRisks, ...moderateRisks].filter(Boolean);
    const suggestedTypes = Array.isArray(parsed.suggestedPokemonTypes)
      ? parsed.suggestedPokemonTypes
      : Array.isArray(parsed.offensive_gaps)
        ? parsed.offensive_gaps
        : [];
    const actions = Array.isArray(parsed.nextActions)
      ? parsed.nextActions
      : Array.isArray(parsed.next_moves)
        ? parsed.next_moves
        : [];
    const rating = Number.isFinite(Number(parsed.overall_rating))
      ? Number(parsed.overall_rating)
      : null;
    const redundancies = Array.isArray(parsed.type_redundancies)
      ? parsed.type_redundancies.filter(Boolean)
      : [];

    let html = `<div class="ai-advisor-result">`;
    html += `<div class="ai-advisor-provider">Professor Eich (${providerLabel || 'KI'})</div>`;
    if (rating !== null) {
      html += `<div class="ai-advisor-section"><strong>Gesamtwertung:</strong> ${rating}/100</div>`;
    }

    if (summary) {
      html += `<p class="ai-advisor-text">${summary}</p>`;
    }

    if (risks.length) {
      html += `<div class="ai-advisor-section"><strong>Risiken:</strong><ul>${risks.map(r => `<li>${r}</li>`).join('')}</ul></div>`;
    }

    if (suggestedTypes.length) {
      html += `<div class="ai-advisor-section"><strong>Offensive Lücken:</strong> <span class="ai-advisor-types">${suggestedTypes.map(t => `<span class="type-badge type-${String(t).toLowerCase()}">${t}</span>`).join(' ')}</span></div>`;
    }

    if (redundancies.length) {
      html += `<div class="ai-advisor-section"><strong>Typ-Dopplungen:</strong><ul>${redundancies.map((entry) => {
        const type = entry?.type || 'Unbekannt';
        const count = entry?.count || '?';
        const impact = entry?.impact ? `: ${entry.impact}` : '';
        return `<li>${type} (${count}x)${impact}</li>`;
      }).join('')}</ul></div>`;
    }

    if (actions.length) {
      html += `<div class="ai-advisor-section"><strong>Naechste Schritte:</strong><ul>${actions.map(a => `<li>${a}</li>`).join('')}</ul></div>`;
    }

    html += `</div>`;
    return html;
  };
})();
