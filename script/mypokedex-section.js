// Team Modal Funktionalität
// Neue Modal-basierte Pokedex-Sektion

// Globale Funktion für Team Modal anzeigen
window.showTeamModal = function () {
  const teamModal = document.getElementById("teamModal");
  if (!teamModal || typeof bootstrap === "undefined") {
    console.warn("Team Modal oder Bootstrap nicht verfügbar");
    return;
  }

  // Team-Übersicht rendern
  renderTeamOverview();

  // Modal anzeigen
  const modal = new bootstrap.Modal(teamModal);
  modal.show();
};

// Globale onclick-Funktion für "Team anzeigen" Button
window.showDetailedTeamView = function () {
  if (window.POKE_DEBUG)
    console.debug("[Team] showDetailedTeamView via onclick");
  showDetailedTeamViewInternal();
};

// Globale Funktion für Pokemon entfernen
window.removePokemonFromTeam = function (pokemonId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (window.POKE_DEBUG)
    console.debug("[Team] removePokemonFromTeam", pokemonId);

  if (!window.teamOffcanvas) {
    console.error("window.teamOffcanvas not available");
    alert(
      "Team-System wird noch geladen. Bitte warte einen Moment und versuche es erneut."
    );
    return false;
  }

  if (typeof window.teamOffcanvas.removePokemonFromTeam !== "function") {
    console.error("removePokemonFromTeam function not found in teamOffcanvas");
    if (window.POKE_DEBUG)
      console.debug(
        "[Team] Available functions:",
        Object.getOwnPropertyNames(window.teamOffcanvas)
      );
    return false;
  }

  try {
    // Debug: Team vor dem Entfernen
    if (window.POKE_DEBUG)
      console.debug(
        "[Team] before removal:",
        window.teamOffcanvas.getTeam().map((p) => p.id)
      );

    const result = window.teamOffcanvas.removePokemonFromTeam(
      parseInt(pokemonId)
    );
    if (window.POKE_DEBUG) console.debug("[Team] removed result:", result);

    // Debug: Team nach dem Entfernen
    if (window.POKE_DEBUG)
      console.debug(
        "[Team] after removal:",
        window.teamOffcanvas.getTeam().map((p) => p.id)
      );

    // Warte kurz und aktualisiere dann das Modal
    setTimeout(() => {
      const currentTeam = window.teamOffcanvas.getTeam();
      if (window.POKE_DEBUG)
        console.debug("[Team] current size after removal:", currentTeam.length);
      renderTeamOverview();
    }, 200);

    return false;
  } catch (error) {
    console.error("Error removing pokemon:", error);
    return false;
  }
};

// Globale Funktion für Team-Analyse öffnen
window.openTeamAnalysis = function () {
  if (window.POKE_DEBUG) console.debug("[Team] openTeamAnalysis");

  if (
    window.pokemonTeamAnalyzer &&
    typeof window.pokemonTeamAnalyzer.openTeamAnalysis === "function"
  ) {
    window.pokemonTeamAnalyzer.openTeamAnalysis();
  } else {
    console.warn("Team Analyzer not available");
    alert(
      "Team Analyzer wird noch geladen. Bitte warte einen Moment und versuche es erneut."
    );
  }
};

// Team-Übersicht rendern (vereinfacht)
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

  // Berechne Team-Statistiken korrekt
  const totalPower = team.reduce((sum, pokemon) => {
    // Berechne Stärke aus allen Stats
    const baseStats = pokemon.stats || [];
    const totalStats = baseStats.reduce(
      (statSum, stat) => statSum + stat.base_stat,
      0
    );
    return sum + totalStats;
  }, 0);
  const uniqueTypes = [...new Set(team.flatMap((p) => p.types))].length;

  // Team Stats Overview
  const teamStatsHTML = `
    <div class="team-stats-overview">
      <div class="stat-card">
        <div class="stat-number">${team.length}</div>
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

  // Team Pokemon Grid mit korrekten Pokemon-Card Styles
  const teamCardsHTML = team
    .map((pokemon, index) => {
      const primaryType = pokemon.types[0];
      return `
  <div class="pokemon-card type-${primaryType} u-rel">
        <button class="pokemon-remove-btn" data-pokemon-id="${
          pokemon.id
        }" title="Pokemon entfernen" onclick="removePokemonFromTeam(${
        pokemon.id
      }, event); return false;">
          ✕
        </button>
  <div class="team-position-badge">#${index + 1}</div>
    <img src="${pokemon.image}" alt="${
        pokemon.name
      }" loading="lazy" class="pokemon-image team-card-image team-card-image--sm">
  <div class="pokemon-info pokemon-info-block">
          <h6 class="pokemon-name pokemon-name--team">${pokemon.name}</h6>
          <div class="pokemon-types types-row">
            ${(() => {
              const VALID_TYPES = new Set([
                "normal",
                "fire",
                "water",
                "grass",
                "electric",
                "ice",
                "fighting",
                "poison",
                "ground",
                "flying",
                "psychic",
                "bug",
                "rock",
                "ghost",
                "dragon",
                "dark",
                "steel",
                "fairy",
              ]);
              const safeTypes = window.sanitizeTypes
                ? window.sanitizeTypes(pokemon.types)
                : pokemon.types;
              return safeTypes
                .map(
                  (type) =>
                    `<span class="type-badge type-${type}">${type}</span>`
                )
                .join("");
            })()}
          </div>
          <button class="btn btn-sm btn-outline-light strength-toggle-btn strength-toggle-btn--mini" type="button" aria-expanded="false">
            <span class="st-icon">⚡</span>
            <span class="st-label">Stärke</span>
          </button>
          <div class="pokemon-stats team-strength team-strength--compact team-strength--mini-card is-hidden" role="group" aria-label="Team Stärke" aria-hidden="true">
            ${(() => {
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
                      <div class="ts-row">
                        <span class="ts-label">Gesamt</span>
                        <span class="ts-value">${baseSum}</span>
                      </div>
                      <div class="ts-row">
                        <span class="ts-label">IV</span>
                        <span class="ts-meta">${ivPercent}%</span>
                      </div>
                      <div class="ts-row">
                        <span class="ts-label">ATK</span>
                        <span class="ts-value">${atk}</span>
                      </div>
                      <div class="ts-row">
                        <span class="ts-label">DEF</span>
                        <span class="ts-value">${def}</span>
                      </div>
                      <div class="ts-row">
                        <span class="ts-label">STA</span>
                        <span class="ts-value">${sta}</span>
                      </div>
                      <span class="ts-sub">Basiswerte + IV Analyse</span>
                    `;
                  }
                }
                // Fallback alte Logik
                const fallback = pokemon.stats
                  ? pokemon.stats.reduce((sum, stat) => sum + stat.base_stat, 0)
                  : pokemon.base_experience || 0;
                return `
                  <div class="ts-row">
                    <span class="ts-label">Stärke</span>
                    <span class="ts-value">${fallback}</span>
                  </div>
                  <span class="ts-sub">Basis (Fallback)</span>
                `;
              } catch (e) {
                return `
                  <div class="ts-row">
                    <span class="ts-label">Stärke</span>
                    <span class="ts-value">?</span>
                  </div>
                `;
              }
            })()}
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  overview.innerHTML = `
    ${teamStatsHTML}
    <div class="team-grid">
      ${teamCardsHTML}
    </div>
  `;

  // Delegierter Listener für per-Card Toggle
  overview.addEventListener("click", (e) => {
    const btn = e.target.closest(".strength-toggle-btn");
    if (!btn) return;
    const card = btn.closest(".pokemon-card");
    if (!card) return;
    const block = card.querySelector(".team-strength");
    if (!block) return;
    // Sichtbarkeit robust ermitteln (Klasse oder computed style)
    const isCurrentlyHidden = block.classList.contains("is-hidden");
    if (isCurrentlyHidden) {
      block.classList.remove("is-hidden");
      // Animation nur wenn nicht bereits sichtbar
      block.classList.add("fade-in");
      block.removeAttribute("style"); // Entferne evtl. alte inline styles
      block.setAttribute("aria-hidden", "false");
      btn.setAttribute("aria-expanded", "true");
      setTimeout(() => block.classList.remove("fade-in"), 260);
    } else {
      block.classList.add("is-hidden");
      block.removeAttribute("style");
      block.setAttribute("aria-hidden", "true");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

// Erweiterte Team-Ansicht für detaillierte Informationen (interne Funktion)
function showDetailedTeamViewInternal() {
  if (window.POKE_DEBUG) console.debug("[Team] showDetailedTeamViewInternal");
  const overview = document.getElementById("teamOverview");
  if (!overview) {
    console.error("teamOverview element not found");
    return;
  }

  overview.innerHTML = "";

  if (!window.teamOffcanvas) {
    console.warn("teamOffcanvas not available yet, retrying...");
    overview.innerHTML = `<div class="alert alert-warning">Team-System wird geladen...</div>`;

    // Retry after a short delay
    setTimeout(() => {
      if (window.teamOffcanvas) {
        if (window.POKE_DEBUG)
          console.debug("[Team] teamOffcanvas available after retry");
        showDetailedTeamViewInternal();
      }
    }, 500);
    return;
  }

  if (window.POKE_DEBUG) console.debug("[Team] fetching team data");
  const team = window.teamOffcanvas.getTeam();
  if (window.POKE_DEBUG) console.debug("[Team] team data:", team);

  if (team.length === 0) {
    overview.innerHTML = `
      <div class="alert alert-info text-center">
        <i class="fas fa-info-circle me-2"></i>
        Dein Team ist noch leer. Ziehe Pokemon-Karten in das Offcanvas, um dein Team zusammenzustellen!
      </div>
    `;
    return;
  }

  // Berechne korrekte Team-Statistiken
  const totalPower = team.reduce((sum, pokemon) => {
    const baseStats = pokemon.stats || [];
    const totalStats = baseStats.reduce(
      (statSum, stat) => statSum + stat.base_stat,
      0
    );
    return sum + totalStats;
  }, 0);
  const averagePower = Math.round(totalPower / team.length);
  const uniqueTypes = [...new Set(team.flatMap((p) => p.types))].length;
  const coverage = Math.round((uniqueTypes / 18) * 100);

  overview.innerHTML = `
    <div class="team-modal-container">
      <!-- Erweiterte Team-Statistiken -->
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
      
      <!-- Team Pokemon Grid mit korrekten Pokemon-Card Styles -->
      <div class="team-grid team-grid--wide">
        ${team
          .map((pokemon, index) => {
            const primaryType = pokemon.types[0];
            // Robuste Gesamtstärke (Base Stats Summe). Preferiere getBaseStats falls verfügbar.
            let pokemonStats = 0;
            try {
              if (
                window.pokemonGoFeatures &&
                typeof window.pokemonGoFeatures.getBaseStats === "function"
              ) {
                const base = window.pokemonGoFeatures.getBaseStats(pokemon.id);
                if (base) {
                  pokemonStats =
                    (base.attack || 0) +
                    (base.defense || 0) +
                    (base.stamina || 0);
                }
              }
              if (!pokemonStats && Array.isArray(pokemon.stats)) {
                pokemonStats = pokemon.stats.reduce(
                  (sum, stat) => sum + (stat.base_stat || 0),
                  0
                );
              }
            } catch (e) {
              pokemonStats = 0;
            }
            return `
          <div class="pokemon-card type-${primaryType} u-rel min-h-300">
            <button class="pokemon-remove-btn" data-pokemon-id="${
              pokemon.id
            }" title="Pokemon entfernen" onclick="removePokemonFromTeam(${
              pokemon.id
            }, event); return false;">
              ✕
            </button>
            <div class="team-position-badge team-position-badge--large team-position-badge--primary">#${
              index + 1
            }</div>
            ${pokemon.favorite ? '<div class="star-indicator">⭐</div>' : ""}
            <img src="${pokemon.image}" alt="${
              pokemon.name
            }" loading="lazy" class="pokemon-image team-card-image team-card-image--spaced">
            <div class="pokemon-info-block pokemon-info-block--wide white-text">
              <h6 class="pokemon-name-heading pokemon-name-heading--large">${
                pokemon.name
              }</h6>
              <div class="pokemon-subinfo">#${pokemon.id}</div>
              <div class="mini-meta">
                ${(() => {
                  const VALID_TYPES = new Set([
                    "normal",
                    "fire",
                    "water",
                    "grass",
                    "electric",
                    "ice",
                    "fighting",
                    "poison",
                    "ground",
                    "flying",
                    "psychic",
                    "bug",
                    "rock",
                    "ghost",
                    "dragon",
                    "dark",
                    "steel",
                    "fairy",
                  ]);
                  const safeTypes = window.sanitizeTypes
                    ? window.sanitizeTypes(pokemon.types)
                    : pokemon.types;
                  return safeTypes
                    .map(
                      (type) =>
                        `<span class=\"type-badge-inline type-${type}\">${type}</span>`
                    )
                    .join("");
                })()}
              </div>
              <div class="pokemon-subinfo mb-12">
                Gesamtstärke: ${pokemonStats}
              </div>
              <button class="btn btn-filter btn--xs" data-action="show-detail" data-pokemon-id="${
                pokemon.id
              }">
                Details anzeigen
              </button>
            </div>
          </div>
          `;
          })
          .join("")}
      </div>
    </div>
  `;
}

// Hilfsfunktion für Team-Statistiken
function generateTeamStats(team) {
  const typeCounts = {};

  team.forEach((pokemon) => {
    pokemon.types.forEach((type) => {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
  });

  const uniqueTypes = Object.keys(typeCounts).length;
  const totalTypes = 18; // Anzahl aller Pokemon-Typen
  const coverage = Math.round((uniqueTypes / totalTypes) * 100);

  return {
    uniqueTypes,
    coverage,
    typeBreakdown: Object.entries(typeCounts).sort((a, b) => b[1] - a[1]),
  };
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  if (window.POKE_DEBUG)
    console.debug("[Team] DOMContentLoaded for MyPokedex Section");

  // Modal Event Listeners
  const teamModal = document.getElementById("teamModal");
  if (teamModal) {
    teamModal.addEventListener("show.bs.modal", () => {
      if (window.POKE_DEBUG)
        console.debug("[Team] Team Modal show -> render overview");
      renderTeamOverview();
    });

    teamModal.addEventListener("hidden.bs.modal", () => {
      if (window.POKE_DEBUG) console.debug("[Team] Team Modal hidden");
    });
  }

  // Action Button Event Listeners
  document.addEventListener("click", (event) => {
    // Team anzeigen Button
    if (event.target.id === "showTeamBtn") {
      if (window.POKE_DEBUG) console.debug("[Team] Show Team Button click");
      event.preventDefault();
      showDetailedTeamViewInternal();
    }

    // Team analysieren Button
    if (event.target.id === "analyzeTeamBtn") {
      if (window.POKE_DEBUG) console.debug("[Team] Analyze Team Button click");
      event.preventDefault();
      openTeamAnalysis();
    }

    // Pokemon entfernen Button
    if (event.target.classList.contains("pokemon-remove-btn")) {
      if (window.POKE_DEBUG)
        console.debug("[Team] Remove Pokemon Button click");
      event.preventDefault();
      const pokemonId = event.target.getAttribute("data-pokemon-id");
      if (pokemonId) {
        window.removePokemonFromTeam(parseInt(pokemonId));
      }
    }
  });
});

// Initialisierung nach dem Laden
function initializeMyPokedexSection() {
  if (window.POKE_DEBUG) console.debug("[Team] init MyPokedex Section");

  // Prüfen ob alle Dependencies verfügbar sind
  if (!window.teamOffcanvas) {
    console.warn("teamOffcanvas not available, waiting...");
    setTimeout(initializeMyPokedexSection, 100);
    return;
  }

  if (window.POKE_DEBUG) console.debug("[Team] MyPokedex Section ready");
}

// Initialisierung starten
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeMyPokedexSection);
} else {
  initializeMyPokedexSection();
}

// Für Backwards-Kompatibilität
window.toggleDropdown = function (dropdownId) {
  console.warn("toggleDropdown is deprecated. Use showTeamModal() instead.");
  showTeamModal();
};

// Legacy Counter Update
function updatePokedexCount() {
  const countElement = document.getElementById("pokedexCount");
  if (countElement && window.teamOffcanvas) {
    countElement.textContent = window.teamOffcanvas.getTeamSize();
  }
}
