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

  #initializeState() {
    this.#stateManager.setState({
      team: [],
      teamCount: 0,
      isTeamFull: false
    });
  }

  #loadTeamFromStorage() {
    const savedTeam = this.#storageService.get('team', []);
    if (savedTeam.length > 0) {
      this.#updateTeamState(savedTeam);
    }
  }

  addPokemon(pokemonId) {
    const team = this.getTeam();

    if (team.length >= this.#maxTeamSize) {
      console.warn('⚠️ Team is already full (max 6 Pokemon)');
      return false;
    }

    if (team.includes(pokemonId)) {
      console.warn('⚠️ Pokemon is already in team');
      return false;
    }

    const newTeam = [...team, pokemonId];
    this.#updateTeamState(newTeam);
    this.#saveTeamToStorage(newTeam);

    console.log(`✅ Added Pokemon #${pokemonId} to team`);
    return true;
  }

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

  isInTeam(pokemonId) {
    return this.getTeam().includes(pokemonId);
  }

  getTeam() {
    return this.#stateManager.get('team') || [];
  }

  getTeamWithDetails() {
    const team = this.getTeam();
    return team
      .map(id => this.#pokemonService.getPokemonById(id))
      .filter(pokemon => pokemon !== undefined);
  }

  getTeamCount() {
    return this.#stateManager.get('teamCount') || 0;
  }

  isTeamFull() {
    return this.#stateManager.get('isTeamFull') || false;
  }

  clearTeam() {
    this.#updateTeamState([]);
    this.#saveTeamToStorage([]);
    console.log('✅ Team cleared');
  }

  sortTeam(compareFn) {
    const teamWithDetails = this.getTeamWithDetails();
    const sortedTeam = teamWithDetails.sort(compareFn);
    const sortedIds = sortedTeam.map(p => p.id);

    this.#updateTeamState(sortedIds);
    this.#saveTeamToStorage(sortedIds);
  }

  #updateTeamState(team) {
    this.#stateManager.setState({
      team: team,
      teamCount: team.length,
      isTeamFull: team.length >= this.#maxTeamSize
    });
  }

  #saveTeamToStorage(team) {
    this.#storageService.set('team', team);
  }

  subscribe(listener) {
    return this.#stateManager.subscribe((state, changes) => {
      if (changes.team !== undefined || changes.teamCount !== undefined) {
        listener(state);
      }
    });
  }

  exportTeam() {
    const teamWithDetails = this.getTeamWithDetails();
    return JSON.stringify(teamWithDetails, null, 2);
  }

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
