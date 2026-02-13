// Team Analyzer Modal - modal setup and actions
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
  <div id="teamAnalysisModal" class="modal fade" tabindex="-1" aria-labelledby="teamAnalysisModalLabel" aria-describedby="teamAnalysisContent">
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

    // Order: 1. Pokemon Overview  2. Professor AI  3. Offensive Coverage
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

    // Request AI analysis asynchronously
    this.requestAIAnalysis(team, analysis);
  };

  Core.prototype.requestAIAnalysis = async function (team, staticAnalysis) {
    const container = document.getElementById('aiAdvisorContent');
    if (!container) return;

    // Try teamAIService first (structured JSON analysis)
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

    // Fallback to basic aiService (Professor Eich)
    const aiService = window.aiService;
    if (aiService && typeof aiService.detectProxy === 'function') {
      await aiService.detectProxy();
    }

    if (aiService && aiService.hasGroqKey()) {
      try {
        const advice = await aiService.requestProfessorTeamAdvice({ team, staticAnalysis });
        container.innerHTML = `
          <div class="ai-advisor-result">
            <div class="ai-advisor-provider">Professor Eich (Groq)</div>
            <p class="ai-advisor-text">${advice}</p>
          </div>`;
        return;
      } catch (err) {
        console.warn('[Analyzer] aiService failed', err);
      }
    }

    // No AI available
    container.innerHTML = `
      <div class="ai-advisor-result">
        <div class="ai-advisor-provider">Professor Eich (lokal)</div>
        <p class="ai-advisor-text">Keine KI-Verbindung. Die statische Analyse oben zeigt deine Team-Schwaechen und Staerken.</p>
      </div>`;
  };

  Core.prototype.renderAIAnalysis = function (parsed, providerLabel) {
    const summary = parsed.summary || '';
    const risks = (parsed.criticalRisks || []).filter(Boolean);
    const suggestedTypes = (parsed.suggestedPokemonTypes || []).filter(Boolean);
    const actions = (parsed.nextActions || []).filter(Boolean);

    let html = `<div class="ai-advisor-result">`;
    html += `<div class="ai-advisor-provider">Professor Eich (${providerLabel || 'KI'})</div>`;

    if (summary) {
      html += `<p class="ai-advisor-text">${summary}</p>`;
    }

    if (risks.length) {
      html += `<div class="ai-advisor-section"><strong>Risiken:</strong><ul>${risks.map(r => `<li>${r}</li>`).join('')}</ul></div>`;
    }

    if (suggestedTypes.length) {
      html += `<div class="ai-advisor-section"><strong>Empfohlene Typen:</strong> <span class="ai-advisor-types">${suggestedTypes.map(t => `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`).join(' ')}</span></div>`;
    }

    if (actions.length) {
      html += `<div class="ai-advisor-section"><strong>Naechste Schritte:</strong><ul>${actions.map(a => `<li>${a}</li>`).join('')}</ul></div>`;
    }

    html += `</div>`;
    return html;
  };
})();
