(function () {
  /**
   * Die App-Hülle: vier Bereiche statt einer Endlosseite.
   *
   * Die Abschnitte selbst sind unangetastet – sie tragen nur ein data-view.
   * Hier wird umgeschaltet, mehr nicht. Der Kampf-Bereich ruft dieselben
   * Funktionen auf wie bisher die Aktionsleiste im Team-Builder.
   */
  const TABS = ["dex", "team", "fight", "you"];
  const STORAGE_KEY = "pokedexTab";

  const el = (id) => document.getElementById(id);

  function currentTeam() {
    if (window.teamOffcanvas?.getTeam) return window.teamOffcanvas.getTeam();
    try {
      return JSON.parse(localStorage.getItem("pokemonTeam")) || [];
    } catch {
      return [];
    }
  }

  function showTab(name) {
    const tab = TABS.includes(name) ? name : "dex";
    document.body.dataset.tab = tab;
    document.querySelectorAll(".app-tab").forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.tab === tab));
    });
    localStorage.setItem(STORAGE_KEY, tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.dispatchEvent(new CustomEvent("pokedex-tab-changed", { detail: { tab } }));
  }

  function updateTeamBadge() {
    const badge = el("teamTabBadge");
    const hint = el("fightTeamHint");
    const count = currentTeam().length;
    if (badge) {
      badge.textContent = count;
      badge.hidden = count === 0;
    }
    if (hint) hint.textContent = `Dein Team: ${count} / 6`;
  }

  /** Die Kampf-Ansicht startet, was bisher nur im Team-Builder erreichbar war. */
  function runFightAction(action) {
    if (action === "gym") {
      window.teamBattle?.startChallenge?.(currentTeam());
      return;
    }
    if (action === "history") window.teamBattle?.showBattleHistory?.();
  }

  function attachTabs() {
    document.querySelectorAll(".app-tab").forEach((button) => {
      button.addEventListener("click", () => showTab(button.dataset.tab));
    });
  }

  function attachFight() {
    document.querySelectorAll("[data-fight]").forEach((button) => {
      button.addEventListener("click", () => runFightAction(button.dataset.fight));
    });
  }

  /** Wer sucht, will in den Pokédex – auch wenn er gerade woanders steht. */
  function attachSearchJump() {
    el("searchInput")?.addEventListener("focus", () => {
      if (document.body.dataset.tab !== "dex") showTab("dex");
    });
  }

  function attachAccount() {
    document.addEventListener("pokedex-auth-changed", (event) => {
      const angemeldet = Boolean(event.detail?.loggedIn);
      const heading = el("accountHeading");
      const lead = el("accountLead");
      if (heading) {
        heading.textContent = angemeldet ? `Hallo, ${event.detail.username}` : "Melde dich an";
      }
      if (lead && angemeldet) {
        lead.textContent =
          "Dein Team, deine Favoriten, Notizen und die Kampfhistorie liegen auf dem Server.";
      }
      el("accountOpenLogin").hidden = angemeldet;
      el("accountViewLogout").hidden = !angemeldet;
    });
    el("accountViewLogout")?.addEventListener("click", () => window.authService?.logout());
  }

  /**
   * Das Typ-Sheet muss direkt an den <body>.
   *
   * Es lag in der Filterleiste – und die trägt einen backdrop-filter. Der macht
   * sie zum Bezugsrahmen für "position: fixed": Das Sheet richtete sich dann an
   * IHR aus statt am Bildschirm und landete oberhalb des Sichtfelds (gemessen:
   * y = -200px). Sichtbar war es trotzdem – nur eben nicht dort, wo man es
   * anklicken kann.
   *
   * Dasselbe Element, dieselben Handler – nur ein anderer Platz im DOM.
   */
  function liftFilterSheet() {
    const sheet = document.getElementById("filterContainer");
    if (sheet && sheet.parentElement !== document.body) {
      document.body.appendChild(sheet);
    }
  }

  function init() {
    if (!document.getElementById("appTabs")) return;
    liftFilterSheet();
    attachTabs();
    attachFight();
    attachSearchJump();
    attachAccount();
    window.addEventListener("pokemon-team-updated", updateTeamBadge);
    showTab(localStorage.getItem(STORAGE_KEY) || "dex");
    updateTeamBadge();
    window.pokedexTabs = { show: showTab };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
