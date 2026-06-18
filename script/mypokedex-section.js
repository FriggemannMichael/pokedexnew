window.showTeamModal = function () {
  const teamModal = document.getElementById("teamModal");
  if (!teamModal || typeof bootstrap === "undefined") {
    console.warn("Team Modal oder Bootstrap nicht verfügbar");
    return;
  }
  renderTeamOverview();
  const modal = new bootstrap.Modal(teamModal);
  modal.show();
};

window.showDetailedTeamView = function () {
  if (window.POKE_DEBUG)
    console.debug("[Team] showDetailedTeamView via onclick");
  showDetailedTeamViewInternal();
};

window.removePokemonFromTeam = function (pokemonId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!window.teamOffcanvas) {
    alert(
      "Team-System wird noch geladen. Bitte warte einen Moment und versuche es erneut.",
    );
    return false;
  }

  if (typeof window.teamOffcanvas.removePokemonFromTeam !== "function") {
    return false;
  }

  try {
    window.teamOffcanvas.removePokemonFromTeam(parseInt(pokemonId));

    setTimeout(() => {
      renderTeamOverview();
    }, 200);

    return false;
  } catch (error) {
    console.error("Error removing pokemon:", error);
    return false;
  }
};

window.openTeamAnalysis = function () {
  if (
    window.pokemonTeamAnalyzer &&
    typeof window.pokemonTeamAnalyzer.openTeamAnalysis === "function"
  ) {
    window.pokemonTeamAnalyzer.openTeamAnalysis();
  } else {
    alert(
      "Team Analyzer wird noch geladen. Bitte warte einen Moment und versuche es erneut.",
    );
  }
};

function calculatePokemonStrengthValue(pokemon) {
  if (!pokemon || !pokemon.id) return 0;

  try {
    if (
      window.pokemonGoFeatures &&
      typeof window.pokemonGoFeatures.getBaseStats === "function"
    ) {
      const base = window.pokemonGoFeatures.getBaseStats(pokemon.id);
      if (base) {
        return (base.attack || 0) + (base.defense || 0) + (base.stamina || 0);
      }
    }
  } catch (error) {
  }

  if (Array.isArray(pokemon.stats) && pokemon.stats.length) {
    return pokemon.stats.reduce((sum, stat) => sum + (stat.base_stat || 0), 0);
  }

  return Number(pokemon.base_experience || 0);
}

function setupStrengthToggle(container, { exclusive = true } = {}) {
  if (!container || container.__strengthToggleBound) return;
  container.__strengthToggleBound = true;
  const openState = new Map();

  const debounceMap = new WeakMap();
  const DEBOUNCE_MS = 90;

  function now() {
    return performance.now();
  }
  function recently(btn) {
    return now() - (debounceMap.get(btn) || 0) < DEBOUNCE_MS;
  }
  function stamp(btn) {
    debounceMap.set(btn, now());
  }

  function applyState(panel, btn, expand) {
    if (!panel || !btn) return;
    if (expand) {
      panel.classList.remove("is-hidden");
      panel.setAttribute("aria-hidden", "false");
      btn.setAttribute("aria-expanded", "true");
    } else {
      panel.classList.add("is-hidden");
      panel.setAttribute("aria-hidden", "true");
      btn.setAttribute("aria-expanded", "false");
    }
  }

  function getPanel(btn) {
    const panelId = btn.getAttribute("aria-controls");
    if (!panelId) return null;
    return container.querySelector("#" + panelId);
  }

  function toggle(btn) {
    const panel = getPanel(btn);
    if (!panel) return;
    if (recently(btn)) {
      /* TODO: Debounce unvollstaendig - aktuell kein Effekt, Verhalten bewusst belassen */
    }
    stamp(btn);

    const expanding = panel.classList.contains("is-hidden");

    if (expanding && exclusive) {
      container
        .querySelectorAll(".team-strength:not(.is-hidden)")
        .forEach((openP) => {
          if (openP === panel) return;
          const linked = container.querySelector(
            `.strength-toggle-btn[aria-controls="${openP.id}"]`,
          );
          applyState(openP, linked, false);
          const logicalId = openP.id.startsWith("team-strength-")
            ? openP.id.substring(14)
            : openP.id;
          openState.set(logicalId, false);
        });
    }

    applyState(panel, btn, expanding);
    const logicalId = panel.id.startsWith("team-strength-")
      ? panel.id.substring(14)
      : panel.id;
    openState.set(logicalId, expanding);
  }

  function restore() {
    openState.forEach((expanded, logicalId) => {
      const pid = "team-strength-" + logicalId;
      const panel = container.querySelector("#" + pid);
      const btn = container.querySelector(
        `.strength-toggle-btn[aria-controls="${pid}"]`,
      );
      if (panel && btn) applyState(panel, btn, expanded);
    });
  }

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".strength-toggle-btn");
    if (!btn) return;
    toggle(btn);
  });

  container.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const btn = e.target.closest(".strength-toggle-btn");
    if (!btn) return;
    e.preventDefault();
    toggle(btn);
  });

  container.restoreStrengthPanels = restore;
  if (!window.setupStrengthToggle)
    window.setupStrengthToggle = setupStrengthToggle;
}

function generateTeamStats(team) {
  const typeCounts = {};
  team.forEach((pokemon) => {
    pokemon.types.forEach((type) => {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
  });

  const uniqueTypes = Object.keys(typeCounts).length;
  const coverage = Math.round((uniqueTypes / 18) * 100);

  return {
    uniqueTypes,
    coverage,
    typeBreakdown: Object.entries(typeCounts).sort((a, b) => b[1] - a[1]),
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const teamModal = document.getElementById("teamModal");
  if (teamModal) {
    teamModal.addEventListener("show.bs.modal", () => {
      renderTeamOverview();
    });

    teamModal.addEventListener("hidden.bs.modal", () => {
      const mainContent =
        document.getElementById("mainContent") || document.body;
      if (mainContent && typeof mainContent.focus === "function") {
        mainContent.focus();
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (event.target.id === "showTeamBtn") {
      event.preventDefault();
      showDetailedTeamViewInternal();
    }

    if (event.target.id === "analyzeTeamBtn") {
      event.preventDefault();
      openTeamAnalysis();
    }

    if (event.target.classList.contains("pokemon-remove-btn")) {
      event.preventDefault();
      const pokemonId = event.target.getAttribute("data-pokemon-id");
      if (pokemonId) {
        window.removePokemonFromTeam(parseInt(pokemonId));
      }
    }
  });
});

function initializeMyPokedexSection() {
  if (!window.teamOffcanvas) {
    setTimeout(initializeMyPokedexSection, 100);
    return;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeMyPokedexSection);
} else {
  initializeMyPokedexSection();
}

window.toggleDropdown = function (dropdownId) {
  showTeamModal();
};

function updatePokedexCount() {
  const countElement = document.getElementById("pokedexCount");
  if (countElement && window.teamOffcanvas) {
    countElement.textContent = window.teamOffcanvas.getTeamSize();
  }
}
