function renderTeamOverview() {
  const overview = document.getElementById("teamOverview");
  if (!overview) return;

  overview.innerHTML = "";

  if (!window.teamOffcanvas) {
    overview.innerHTML = `<div class="alert alert-warning">Team-System wird geladen...</div>`;
    return;
  }

  const team = window.teamOffcanvas.getTeam();

  if (team.length === 0) {
    overview.innerHTML = `
      <div class="alert alert-info text-center">
        <i class="fas fa-info-circle me-2"></i>
        Dein Team ist noch leer. Ziehe Pokemon-Karten in das Offcanvas, um dein Team zusammenzustellen!
      </div>
    `;
    return;
  }

  const totalPower = team.reduce(
    (sum, pokemon) => sum + calculatePokemonStrengthValue(pokemon),
    0,
  );
  const uniqueTypes = [...new Set(team.flatMap((p) => p.types))].length;

  const teamStatsHTML = renderTeamStatsBar(team.length, totalPower, uniqueTypes);
  const teamCardsHTML = team.map((pokemon, index) => renderTeamOverviewCard(pokemon, index)).join("");

  overview.innerHTML = `
    ${teamStatsHTML}
    <div class="team-grid">
      ${teamCardsHTML}
    </div>
  `;

  setupStrengthToggle(overview, { exclusive: true });
}

function renderTeamStatsBar(count, totalPower, uniqueTypes) {
  return `
    <div class="team-stats-overview">
      <div class="stat-card">
        <div class="stat-number">${count}</div>
        <div class="stat-label">Pokemon</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${totalPower}</div>
        <div class="stat-label">Gesamtstärke</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${uniqueTypes}</div>
        <div class="stat-label">Typen</div>
      </div>
    </div>
  `;
}

function renderTeamOverviewCard(pokemon, index) {
  const primaryType = pokemon.types[0];
  const panelId = `team-strength-${pokemon.id}`;
  const safeTypes = window.sanitizeTypes
    ? window.sanitizeTypes(pokemon.types)
    : pokemon.types;
  const typeBadges = safeTypes
    .map((type) => `<span class="type-badge type-${type}">${type}</span>`)
    .join("");

  return `
    <div class="pokemon-card type-${primaryType} u-rel">
      <button class="pokemon-remove-btn" data-pokemon-id="${pokemon.id}" title="Pokemon entfernen" onclick="removePokemonFromTeam(${pokemon.id}, event); return false;">
        ✕
      </button>
      <div class="team-position-badge">#${index + 1}</div>
      <img src="${pokemon.image}" alt="${pokemon.name}" loading="lazy" class="pokemon-image team-card-image team-card-image--sm">
      <div class="pokemon-info pokemon-info-block">
        <h6 class="pokemon-name pokemon-name--team">${pokemon.name}</h6>
        <div class="pokemon-types types-row">${typeBadges}</div>
        <button class="btn btn-sm btn-outline-light strength-toggle-btn strength-toggle-btn--mini" type="button" aria-expanded="false" aria-controls="${panelId}">
          <span class="st-icon">⚡</span>
          <span class="st-label">Stärke</span>
        </button>
        <div id="${panelId}" class="pokemon-stats team-strength team-strength--compact team-strength--mini-card is-hidden" role="group" aria-label="Team Stärke" aria-hidden="true">
          ${renderStrengthPanel(pokemon)}
        </div>
      </div>
    </div>
  `;
}

function renderStrengthPanel(pokemon) {
  try {
    if (
      window.pokemonGoFeatures &&
      typeof window.pokemonGoFeatures.getBaseStats === "function" &&
      typeof window.pokemonGoFeatures.generateIVs === "function"
    ) {
      const base = window.pokemonGoFeatures.getBaseStats(pokemon.id);
      const ivs = window.pokemonGoFeatures.generateIVs(pokemon.id);
      if (base && ivs) {
        const atk = base.attack || 0;
        const def = base.defense || 0;
        const sta = base.stamina || 0;
        const baseSum = atk + def + sta;
        const ivSum = (ivs.attack || 0) + (ivs.defense || 0) + (ivs.stamina || 0);
        const ivPercent = ((ivSum / 45) * 100).toFixed(0);
        return `
          <div class="ts-row"><span class="ts-label">Gesamt</span><span class="ts-value">${baseSum}</span></div>
          <div class="ts-row"><span class="ts-label">IV</span><span class="ts-meta">${ivPercent}%</span></div>
          <div class="ts-row"><span class="ts-label">ATK</span><span class="ts-value">${atk}</span></div>
          <div class="ts-row"><span class="ts-label">DEF</span><span class="ts-value">${def}</span></div>
          <div class="ts-row"><span class="ts-label">STA</span><span class="ts-value">${sta}</span></div>
          <span class="ts-sub">Basiswerte + IV Analyse</span>
        `;
      }
    }
    const fallback = pokemon.stats
      ? pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)
      : pokemon.base_experience || 0;
    return `
      <div class="ts-row"><span class="ts-label">Stärke</span><span class="ts-value">${fallback}</span></div>
      <span class="ts-sub">Basis (Fallback)</span>
    `;
  } catch (e) {
    return `
      <div class="ts-row"><span class="ts-label">Stärke</span><span class="ts-value">?</span></div>
    `;
  }
}

function showDetailedTeamViewInternal() {
  const overview = document.getElementById("teamOverview");
  if (!overview) return;

  overview.innerHTML = "";

  if (!window.teamOffcanvas) {
    overview.innerHTML = `<div class="alert alert-warning">Team-System wird geladen...</div>`;
    setTimeout(() => {
      if (window.teamOffcanvas) showDetailedTeamViewInternal();
    }, 500);
    return;
  }

  const team = window.teamOffcanvas.getTeam();

  if (team.length === 0) {
    overview.innerHTML = `
      <div class="alert alert-info text-center">
        <i class="fas fa-info-circle me-2"></i>
        Dein Team ist noch leer. Ziehe Pokemon-Karten in das Offcanvas, um dein Team zusammenzustellen!
      </div>
    `;
    return;
  }

  const totalPower = team.reduce(
    (sum, pokemon) => sum + calculatePokemonStrengthValue(pokemon),
    0,
  );
  const averagePower = Math.round(totalPower / team.length);
  const uniqueTypes = [...new Set(team.flatMap((p) => p.types))].length;
  const coverage = Math.round((uniqueTypes / 18) * 100);

  const teamCardsHTML = team.map((pokemon, index) => renderDetailedTeamCard(pokemon, index)).join("");

  overview.innerHTML = `
    <div class="team-modal-container">
      <div class="team-stats-overview">
        <div class="stat-card">
          <div class="stat-number">${team.length}</div>
          <div class="stat-label">Team-Mitglieder</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${totalPower}</div>
          <div class="stat-label">Gesamtstärke</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${averagePower}</div>
          <div class="stat-label">Ø Stärke</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${uniqueTypes}</div>
          <div class="stat-label">Verschiedene Typen</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${coverage}%</div>
          <div class="stat-label">Typ-Abdeckung</div>
        </div>
      </div>
      <div class="team-grid team-grid--wide">
        ${teamCardsHTML}
      </div>
    </div>
  `;
}

function renderDetailedTeamCard(pokemon, index) {
  const primaryType = pokemon.types[0];
  const pokemonStats = calculatePokemonStrengthValue(pokemon);
  const safeTypes = window.sanitizeTypes
    ? window.sanitizeTypes(pokemon.types)
    : pokemon.types;
  const typeBadges = safeTypes
    .map((type) => `<span class="type-badge-inline type-${type}">${type}</span>`)
    .join("");

  return `
    <div class="pokemon-card type-${primaryType} u-rel min-h-300">
      <button class="pokemon-remove-btn" data-pokemon-id="${pokemon.id}" title="Pokemon entfernen" onclick="removePokemonFromTeam(${pokemon.id}, event); return false;">
        ✕
      </button>
      <div class="team-position-badge team-position-badge--large team-position-badge--primary">#${index + 1}</div>
      ${pokemon.favorite ? '<div class="star-indicator">⭐</div>' : ""}
      <img src="${pokemon.image}" alt="${pokemon.name}" loading="lazy" class="pokemon-image team-card-image team-card-image--spaced">
      <div class="pokemon-info-block pokemon-info-block--wide white-text">
        <h6 class="pokemon-name-heading pokemon-name-heading--large">${pokemon.name}</h6>
        <div class="pokemon-subinfo">#${pokemon.id}</div>
        <div class="mini-meta">${typeBadges}</div>
        <div class="pokemon-subinfo mb-12">
          Gesamtstärke: ${pokemonStats}
        </div>
        <button class="btn btn-filter btn--xs" data-action="show-detail" data-pokemon-id="${pokemon.id}">
          Details anzeigen
        </button>
      </div>
    </div>
  `;
}
