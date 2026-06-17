(function () {
  const Core = window.PokemonTeamAnalyzerCore;
  if (!Core) {
    console.error('Core not loaded');
    return;
  }

  Core.prototype.createAnalysisHTML = function (team, analysis) {
    return `
  <div class="team-analysis-results">
    ${this.createTeamOverviewHTML(team)}
    ${this.createWeaknessesHTML(analysis.weaknesses)}
    ${this.createStrengthsHTML(analysis.resistances, analysis.immunities)}
    ${this.createCoverageHTML(analysis.coverage)}
    ${this.createRecommendationsHTML(analysis.recommendations)}
  </div>`;
  };

  Core.prototype.createTeamOverviewHTML = function (team) {
    const cards = team
      .map((pokemon, index) => {
        const primaryType = pokemon.types[0] || 'normal';
        const pokemonNumber = pokemon.id ? `#${pokemon.id.toString().padStart(3, '0')}` : '';
        const imageUrl = this.getPokemonImageUrl(pokemon);

        return `
    <div class="team-member type-${primaryType}">
      <div class="team-position">#${index + 1}</div>
      <div class="team-member-image"><img src="${imageUrl}" alt="${pokemon.name}" loading="lazy"></div>
      <div class="team-member-info">
        <div class="team-member-number">${pokemonNumber}</div>
        <div class="team-member-name">${pokemon.name}</div>
        <div class="team-member-types">
          ${pokemon.types.map((type) => `<span class=\"type-badge type-${type}\">${type.toUpperCase()}</span>`).join('')}
        </div>
      </div>
    </div>`;
      })
      .join('');

    return `
  <div class="analysis-section">
    <h6><img src="assets/img/9.png" alt="Team" class="icon-team icon-team--inline"> Team-Uebersicht</h6>
    <div class="team-overview">${cards}</div>
  </div>`;
  };

  Core.prototype.getPokemonImageUrl = function (pokemon) {
    if (pokemon.image) return pokemon.image;
    if (pokemon.id) {
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;
    }
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
  };

  Core.prototype.createWeaknessesHTML = function (weaknesses) {
    if (!Object.keys(weaknesses).length) {
      return `
  <div class="analysis-section">
    <h6><i class="fas fa-shield-alt text-success"></i> Schwächen</h6>
    <p class="text-success">Keine kritischen Schwächen gefunden.</p>
  </div>`;
    }

    const weaknessItems = Object.entries(weaknesses)
      .sort(([, a], [, b]) => b.score - a.score)
      .map(
        ([type, details]) => `
  <div class="weakness-item severity-${details.severity.level}">
    <div class="weakness-header">
      <span class="type-badge type-${type}">${type.toUpperCase()}</span>
      <span class="severity-badge ${details.severity.level}">${details.severity.text}</span>
    </div>
    <div class="affected-pokemon">
      Betroffene Pokemon: ${details.affected.map((pokemon) => `${pokemon.name} (${pokemon.effectiveness}x)`).join(', ')}
    </div>
  </div>`
      )
      .join('');

    return `
  <div class="analysis-section">
    <h6><i class="fas fa-exclamation-triangle text-warning"></i> Team-Schwächen</h6>
    <div class="weaknesses-list">${weaknessItems}</div>
  </div>`;
  };

  Core.prototype.createStrengthsHTML = function (resistances, immunities) {
    const resistanceItems = Object.entries(resistances)
      .map(
        ([type, details]) =>
          `<div class="strength-item"><span class="type-badge type-${type}">${type.toUpperCase()}</span><span class="strength-count">${details.count}x Resistenz</span></div>`
      )
      .join('');

    const immunityItems = Object.entries(immunities)
      .map(
        ([type, details]) =>
          `<div class="strength-item immunity"><span class="type-badge type-${type}">${type.toUpperCase()}</span><span class="strength-count">${details.count}x Immunität</span></div>`
      )
      .join('');

    return `
  <div class="analysis-section">
    <h6><i class="fas fa-shield-alt text-success"></i> Team-Stärken</h6>
    <div class="strengths-list">${resistanceItems}${immunityItems}</div>
  </div>`;
  };

  Core.prototype.createCoverageHTML = function (coverage) {
    const coveredCount = Object.entries(coverage).filter(([, details]) => details.covered).length;
    const totalTypes = Object.keys(coverage).length;
    const coveragePercent = Math.round((coveredCount / totalTypes) * 100);

    const coverageItems = Object.entries(coverage)
      .filter(([, details]) => details.covered)
      .map(
        ([type, details]) =>
          `<div class="coverage-item"><span class="type-badge type-${type}">${type.toUpperCase()}</span><span class="effectiveness">${details.effectiveness}x</span></div>`
      )
      .join('');

    return `
  <div class="analysis-section">
    <h6><i class="fas fa-crosshairs text-info"></i> Offensive Coverage</h6>
    <div class="coverage-stats">
      <div class="coverage-percentage">
        <span class="percentage">${coveragePercent}%</span>
        <span class="coverage-text">Coverage (${coveredCount}/${totalTypes} Typen)</span>
      </div>
      <div class="progress"><div class="progress-bar" data-coverage="${coveragePercent}" style="width:${coveragePercent}%"></div></div>
    </div>
    <div class="coverage-list">${coverageItems}</div>
  </div>`;
  };

  Core.prototype.createRecommendationsHTML = function (recommendations) {
    if (!recommendations.length) {
      return `
  <div class="analysis-section">
    <h6><i class="fas fa-lightbulb text-success"></i> Empfehlungen</h6>
    <p class="text-success">Dein Team ist bereits gut ausbalanciert.</p>
  </div>`;
    }

    const recommendationItems = recommendations
      .map((item) => {
        const icon = item.type === 'weakness' ? '!' : item.type === 'coverage' ? 'TARGET' : 'SYNC';
        return `<div class="recommendation-item priority-${item.priority}"><div class="recommendation-icon">${icon}</div><div class="recommendation-text">${item.message}</div></div>`;
      })
      .join('');

    return `
  <div class="analysis-section">
    <h6><i class="fas fa-lightbulb text-warning"></i> Verbesserungsvorschlaege</h6>
    <div class="recommendations-list">${recommendationItems}</div>
  </div>`;
  };
})();
