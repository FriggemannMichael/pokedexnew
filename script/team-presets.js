(function () {
  /**
   * Die gespeicherten Teams ("Presets").
   *
   * Bisher konnte man sie nur anlegen - geladen oder geloescht wurden sie nie,
   * es gab schlicht keine Oberflaeche dafuer. Diese Klasse ist die eine Stelle,
   * die die Liste haelt; das Team-Modal zeigt sie an, script/preset-sync.js
   * bringt sie ins Konto.
   */
  const STORAGE_KEY = "pokemonTeamPresets";
  const MAX_PRESETS = 20;

  class TeamPresets {
    list() {
      try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(raw) ? raw : [];
      } catch {
        return [];
      }
    }

    _write(presets) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.slice(0, MAX_PRESETS)));
    }

    /** Nach jeder Aenderung im Browser: preset-sync.js schickt sie ins Konto. */
    _writeAndAnnounce(presets) {
      this._write(presets);
      document.dispatchEvent(new CustomEvent("presetsChanged"));
    }

    _snapshot(team) {
      return (team || []).map((p) => ({
        id: p.id,
        name: p.name,
        types: p.types,
        image: p.image || "",
      }));
    }

    add(name, team) {
      const presets = this.list();
      presets.unshift({
        name: String(name).trim().slice(0, 60),
        created: new Date().toISOString(),
        team: this._snapshot(team),
      });
      this._writeAndAnnounce(presets);
    }

    removeAt(index) {
      const presets = this.list();
      if (index < 0 || index >= presets.length) return;
      presets.splice(index, 1);
      this._writeAndAnnounce(presets);
    }

    at(index) {
      return this.list()[index] || null;
    }

    /**
     * Der Stand vom Server. Meldet sich wie jede Aenderung, damit die Liste
     * neu gezeichnet wird - zurueckgeschickt wird er trotzdem nicht: Waehrend
     * des Abgleichs sperrt preset-sync.js das Hochschicken.
     */
    replaceAll(presets) {
      this._writeAndAnnounce(Array.isArray(presets) ? presets : []);
    }
  }

  if (!window.teamPresets) {
    window.teamPresets = new TeamPresets();
  }
})();
