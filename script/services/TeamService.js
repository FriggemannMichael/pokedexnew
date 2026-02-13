/**
 * TeamService - Team Management Service
 *
 * Features:
 * - Team von max 6 Pokemon verwalten
 * - Persistierung in Storage
 * - Team Validierung
 * - Event Notifications
 */

export class TeamService {
  #stateManager;
  #storageService;
  #pokemonService;
  #maxTeamSize = 6;

  constructor(stateManager, storageService, pokemonService) {
    this.#stateManager = stateManager;
    this.#storageService = storageService;
    this.#pokemonService = pokemonService;

    this.#initializeState();
    this.#loadTeamFromStorage();
  }

  /**
   * Initialisiert den Team State
   * @private
   */
  #initializeState() {
    this.#stateManager.setState({
      team: [],
      teamCount: 0,
      isTeamFull: false
    });
  }

  /**
   * Lädt Team aus Storage
   * @private
   */
  #loadTeamFromStorage() {
    const savedTeam = this.#storageService.get('team', []);
    if (savedTeam.length > 0) {
      this.#updateTeamState(savedTeam);
    }
  }

  /**
   * Fügt ein Pokemon zum Team hinzu
   * @param {number} pokemonId - Pokemon ID
   * @returns {boolean} Erfolg
   */
  addPokemon(pokemonId) {
    const team = this.getTeam();

    // Validierung
    if (team.length >= this.#maxTeamSize) {
      console.warn('⚠️ Team is already full (max 6 Pokemon)');
      return false;
    }

    if (team.includes(pokemonId)) {
      console.warn('⚠️ Pokemon is already in team');
      return false;
    }

    // Pokemon zum Team hinzufügen
    const newTeam = [...team, pokemonId];
    this.#updateTeamState(newTeam);
    this.#saveTeamToStorage(newTeam);

    console.log(`✅ Added Pokemon #${pokemonId} to team`);
    return true;
  }

  /**
   * Entfernt ein Pokemon aus dem Team
   * @param {number} pokemonId - Pokemon ID
   * @returns {boolean} Erfolg
   */
  removePokemon(pokemonId) {
    const team = this.getTeam();

    if (!team.includes(pokemonId)) {
      console.warn('⚠️ Pokemon is not in team');
      return false;
    }

    const newTeam = team.filter(id => id !== pokemonId);
    this.#updateTeamState(newTeam);
    this.#saveTeamToStorage(newTeam);

    console.log(`✅ Removed Pokemon #${pokemonId} from team`);
    return true;
  }

  /**
   * Togglet ein Pokemon im Team (add/remove)
   * @param {number} pokemonId - Pokemon ID
   * @returns {boolean} Ob Pokemon jetzt im Team ist
   */
  togglePokemon(pokemonId) {
    const isInTeam = this.isInTeam(pokemonId);

    if (isInTeam) {
      this.removePokemon(pokemonId);
      return false;
    } else {
      this.addPokemon(pokemonId);
      return true;
    }
  }

  /**
   * Prüft ob Pokemon im Team ist
   * @param {number} pokemonId - Pokemon ID
   * @returns {boolean}
   */
  isInTeam(pokemonId) {
    return this.getTeam().includes(pokemonId);
  }

  /**
   * Gibt das aktuelle Team zurück
   * @returns {number[]} Array von Pokemon IDs
   */
  getTeam() {
    return this.#stateManager.get('team') || [];
  }

  /**
   * Gibt Team mit vollständigen Pokemon Daten zurück
   * @returns {Object[]} Array von Pokemon Objekten
   */
  getTeamWithDetails() {
    const team = this.getTeam();
    return team
      .map(id => this.#pokemonService.getPokemonById(id))
      .filter(pokemon => pokemon !== undefined);
  }

  /**
   * Gibt die Anzahl der Team-Mitglieder zurück
   * @returns {number}
   */
  getTeamCount() {
    return this.#stateManager.get('teamCount') || 0;
  }

  /**
   * Prüft ob Team voll ist
   * @returns {boolean}
   */
  isTeamFull() {
    return this.#stateManager.get('isTeamFull') || false;
  }

  /**
   * Leert das Team
   */
  clearTeam() {
    this.#updateTeamState([]);
    this.#saveTeamToStorage([]);
    console.log('✅ Team cleared');
  }

  /**
   * Sortiert das Team
   * @param {Function} compareFn - Vergleichsfunktion
   */
  sortTeam(compareFn) {
    const teamWithDetails = this.getTeamWithDetails();
    const sortedTeam = teamWithDetails.sort(compareFn);
    const sortedIds = sortedTeam.map(p => p.id);

    this.#updateTeamState(sortedIds);
    this.#saveTeamToStorage(sortedIds);
  }

  /**
   * Updated den Team State
   * @private
   */
  #updateTeamState(team) {
    this.#stateManager.setState({
      team: team,
      teamCount: team.length,
      isTeamFull: team.length >= this.#maxTeamSize
    });
  }

  /**
   * Speichert Team in Storage
   * @private
   */
  #saveTeamToStorage(team) {
    this.#storageService.set('team', team);
  }

  /**
   * Abonniert Team Changes
   * @param {Function} listener - Callback Funktion
   * @returns {Function} Unsubscribe Funktion
   */
  subscribe(listener) {
    return this.#stateManager.subscribe((state, changes) => {
      if (changes.team !== undefined || changes.teamCount !== undefined) {
        listener(state);
      }
    });
  }

  /**
   * Exportiert Team als JSON
   * @returns {string} JSON String
   */
  exportTeam() {
    const teamWithDetails = this.getTeamWithDetails();
    return JSON.stringify(teamWithDetails, null, 2);
  }

  /**
   * Importiert Team aus JSON
   * @param {string} json - JSON String
   * @returns {boolean} Erfolg
   */
  importTeam(json) {
    try {
      const team = JSON.parse(json);
      const teamIds = team.map(p => p.id).slice(0, this.#maxTeamSize);

      this.#updateTeamState(teamIds);
      this.#saveTeamToStorage(teamIds);

      console.log('✅ Team imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Error importing team:', error);
      return false;
    }
  }
}
