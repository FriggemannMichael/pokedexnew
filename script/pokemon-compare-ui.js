PokemonCompare.prototype.showComparison = async function () {
  if (this.selectedPokemon.length !== 2) return;

  const [pokemon1, pokemon2] = this.selectedPokemon;
  const [details1, details2] = await Promise.all([
    this.fetchPokemonDetails(pokemon1.id),
    this.fetchPokemonDetails(pokemon2.id)
  ]);

  const modalBody = document.getElementById('compareModalBody');
  if (!modalBody) return;

  modalBody.innerHTML = this.generateComparisonHTML(
    { ...pokemon1, details: details1 },
    { ...pokemon2, details: details2 }
  );

  this.compareModal.show();
};

PokemonCompare.prototype.generateComparisonHTML = function (pokemon1, pokemon2) {
  const stats1 = this.extractStats(pokemon1.details);
  const stats2 = this.extractStats(pokemon2.details);
  const effectiveness = this.calculateTypeEffectiveness(pokemon1, pokemon2);

  return `
    <div class="compare-container">
      <div class="pokemon-compare-card" style="--type-color-1: var(--type-${pokemon1.types[0]}); --type-color-2: var(--type-${pokemon1.types[1] || pokemon1.types[0]});">
        ${this.generatePokemonCardHTML(pokemon1, stats1)}
      </div>
      <div class="vs-divider">
        <div class="vs-circle">VS</div>
      </div>
      <div class="pokemon-compare-card" style="--type-color-1: var(--type-${pokemon2.types[0]}); --type-color-2: var(--type-${pokemon2.types[1] || pokemon2.types[0]});">
        ${this.generatePokemonCardHTML(pokemon2, stats2)}
      </div>
    </div>
    <div class="compare-stats-section">
      <h3 class="compare-section-title">Base Stats Comparison</h3>
      ${this.generateStatsComparisonHTML(stats1, stats2)}
    </div>
    <div class="type-effectiveness-section">
      <h3 class="compare-section-title">Type Effectiveness</h3>
      ${this.generateEffectivenessHTML(pokemon1, pokemon2, effectiveness)}
    </div>
    <button class="battle-trigger-btn" onclick="window.pokemonCompare.triggerBattle()">
      ⚔️ Start Battle Simulation
    </button>
  `;
};

PokemonCompare.prototype.generatePokemonCardHTML = function (pokemon, stats) {
  const typesBadges = pokemon.types.map(type =>
    `<span class="type-badge type-${type}">${type.toUpperCase()}</span>`
  ).join('');

  return `
    <div class="compare-card-header">
      <img src="${pokemon.image}" alt="${pokemon.name}" class="compare-pokemon-image" loading="lazy">
      <h3 class="compare-pokemon-name">${pokemon.name}</h3>
      <p class="compare-pokemon-number">#${pokemon.id.toString().padStart(3, '0')}</p>
      <div class="compare-types">${typesBadges}</div>
    </div>
  `;
};

PokemonCompare.prototype.generateStatsComparisonHTML = function (stats1, stats2) {
  const statNames = ['HP', 'Attack', 'Defense', 'Sp. Attack', 'Sp. Defense', 'Speed'];
  const statKeys = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

  return statKeys.map((key, index) => {
    const value1 = stats1[key] || 0;
    const value2 = stats2[key] || 0;
    const class1 = value1 > value2 ? 'winner' : (value1 === value2 ? 'tie' : 'loser');
    const class2 = value2 > value1 ? 'winner' : (value2 === value1 ? 'tie' : 'loser');

    return `
      <div class="stat-compare-row">
        <div class="stat-value ${class1}">${value1}</div>
        <div class="stat-name">${statNames[index]}</div>
        <div class="stat-value ${class2}">${value2}</div>
      </div>
    `;
  }).join('');
};

PokemonCompare.prototype.generateEffectivenessHTML = function (pokemon1, pokemon2, effectiveness) {
  return `
    <div class="effectiveness-grid">
      <div class="effectiveness-card">
        <div class="effectiveness-label">${pokemon1.name} attacks ${pokemon2.name}</div>
        <div class="effectiveness-pokemon-name">${pokemon1.name}</div>
        <div class="effectiveness-value ${this.getEffectivenessClass(effectiveness.pokemon1ToPokemon2)}">
          ${effectiveness.pokemon1ToPokemon2}x
        </div>
        <div class="effectiveness-text">${this.getEffectivenessText(effectiveness.pokemon1ToPokemon2)}</div>
      </div>
      <div class="effectiveness-card">
        <div class="effectiveness-label">${pokemon2.name} attacks ${pokemon1.name}</div>
        <div class="effectiveness-pokemon-name">${pokemon2.name}</div>
        <div class="effectiveness-value ${this.getEffectivenessClass(effectiveness.pokemon2ToPokemon1)}">
          ${effectiveness.pokemon2ToPokemon1}x
        </div>
        <div class="effectiveness-text">${this.getEffectivenessText(effectiveness.pokemon2ToPokemon1)}</div>
      </div>
    </div>
  `;
};

PokemonCompare.prototype.getEffectivenessClass = function (value) {
  if (value === 0) return 'immune';
  if (value >= 2) return 'super-effective';
  if (value === 1) return 'effective';
  return 'not-effective';
};

PokemonCompare.prototype.getEffectivenessText = function (value) {
  if (value === 0) return 'No Effect';
  if (value >= 4) return 'Extremely Effective';
  if (value >= 2) return 'Super Effective';
  if (value === 1) return 'Normal Damage';
  if (value >= 0.5) return 'Not Very Effective';
  return 'Barely Effective';
};

PokemonCompare.prototype.showSelectionIndicator = function () {
  const indicator = document.createElement('div');
  indicator.id = 'compareSelectionIndicator';
  indicator.className = 'compare-select-mode';
  indicator.innerHTML = `
    <span>Select Pokemon to Compare</span>
    <span class="compare-count">0/${this.maxSelection}</span>
    <button onclick="window.pokemonCompare.exitSelectionMode()" style="background: rgba(255,255,255,0.3); border: none; padding: 0.3rem 0.8rem; border-radius: 20px; color: white; cursor: pointer;">Cancel</button>
  `;
  document.body.appendChild(indicator);
};

PokemonCompare.prototype.hideSelectionIndicator = function () {
  const indicator = document.getElementById('compareSelectionIndicator');
  if (indicator) indicator.remove();
};

PokemonCompare.prototype.updateSelectionIndicator = function () {
  const countElement = document.querySelector('.compare-select-mode .compare-count');
  if (countElement) {
    countElement.textContent = `${this.selectedPokemon.length}/${this.maxSelection}`;
  }
};

PokemonCompare.prototype.markCardAsSelected = function (pokemonId) {
  const card = document.querySelector(`.pokemon-card[data-pokemon-id="${pokemonId}"]`);
  if (card) card.classList.add('compare-selected-card');
};

PokemonCompare.prototype.unmarkCardAsSelected = function (pokemonId) {
  const card = document.querySelector(`.pokemon-card[data-pokemon-id="${pokemonId}"]`);
  if (card) card.classList.remove('compare-selected-card');
};

PokemonCompare.prototype.clearCardSelections = function () {
  document.querySelectorAll('.compare-selected-card').forEach(card => {
    card.classList.remove('compare-selected-card');
  });
};

PokemonCompare.prototype.showMaxSelectionWarning = function () {
  alert('You can only compare 2 Pokemon at a time. Please deselect one first.');
};
