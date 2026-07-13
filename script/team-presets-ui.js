(function () {
  /**
   * Die Preset-Verwaltung unter dem Team-Builder: speichern, auflisten, laden,
   * loeschen.
   *
   * Bisher konnte man Presets nur anlegen - und selbst das lief ueber das
   * Team-Modal, das gar nicht mehr erreichbar ist (es sucht ein ".drop-point",
   * das es im Layout nicht mehr gibt). Hier haengt die Verwaltung an der
   * Team-Ansicht, die wirklich benutzt wird.
   */
  const el = (id) => document.getElementById(id);
  const escape = (text) => (window.escapeHtml ? window.escapeHtml(text) : text);

  function presets() {
    return window.teamPresets;
  }

  function currentTeam() {
    if (window.teamOffcanvas?.getTeam) return window.teamOffcanvas.getTeam();
    try {
      return JSON.parse(localStorage.getItem("pokemonTeam")) || [];
    } catch {
      return [];
    }
  }

  function spriteHtml(pokemon) {
    const name = escape(pokemon.name || "");
    const image = escape(pokemon.image || pokemon.spriteUrl || "");
    return `<img class="team-preset__sprite" src="${image}" alt="${name}" title="${name}" loading="lazy">`;
  }

  function presetHtml(preset, index) {
    const team = Array.isArray(preset.team) ? preset.team : [];
    return `
      <div class="team-preset">
        <span class="team-preset__name">${escape(preset.name || "Ohne Namen")}</span>
        <span class="team-preset__count">${team.length}/6</span>
        <div class="team-preset__sprites">${team.slice(0, 6).map(spriteHtml).join("")}</div>
        <div class="team-preset__actions">
          <button type="button" class="btn btn-sm btn-outline-success" data-preset-load="${index}">Laden</button>
          <button type="button" class="btn btn-sm btn-outline-danger" data-preset-delete="${index}">Löschen</button>
        </div>
      </div>`;
  }

  function render() {
    const body = el("teamPresetsBody");
    if (!body || !presets()) return;
    const list = presets().list();
    body.innerHTML = list.length
      ? `<div class="team-presets__list">${list.map(presetHtml).join("")}</div>`
      : `<p class="team-presets__empty">Noch keins gespeichert. Stell dir ein Team zusammen und speichere es hier.</p>`;
    updateSaveButton();
  }

  function updateSaveButton() {
    const button = el("savePresetBtn");
    if (button) button.disabled = currentTeam().length === 0;
  }

  function save() {
    const team = currentTeam();
    if (!team.length) return;
    const name = prompt("Name für das gespeicherte Team:");
    if (!name || !name.trim()) return;
    presets().add(name, team);
  }

  function load(index) {
    const preset = presets().at(index);
    if (!preset || !window.teamOffcanvas?.syncExternalTeam) return;
    window.teamOffcanvas.syncExternalTeam(preset.team || [], "preset");
  }

  function remove(index) {
    const preset = presets().at(index);
    if (!preset || !confirm(`"${preset.name}" löschen?`)) return;
    presets().removeAt(index);
  }

  function onClick(event) {
    const loadBtn = event.target.closest("[data-preset-load]");
    if (loadBtn) return load(Number(loadBtn.dataset.presetLoad));
    const deleteBtn = event.target.closest("[data-preset-delete]");
    if (deleteBtn) return remove(Number(deleteBtn.dataset.presetDelete));
  }

  function attach() {
    if (!el("teamPresetsPanel")) return;
    el("teamPresetsBody")?.addEventListener("click", onClick);
    el("savePresetBtn")?.addEventListener("click", save);
    document.addEventListener("presetsChanged", render);
    window.addEventListener("pokemon-team-updated", updateSaveButton);
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();
