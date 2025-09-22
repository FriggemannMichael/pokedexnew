
function createPokemonModalTemplate() {
    return `
        <div id="pokemonOverlay" class="pokemon-overlay d-none">
            <div class="overlay-background"></div>
            <div class="overlay-content">
                ${createPokemonDetailCardTemplate()}
            </div>
        </div>
    `;
}

function createPokemonDetailCardTemplate() {
    return `
        <div class="pokemon-detail-card">
            ${createCardNavigationTemplate()}
            ${createDetailHeaderTemplate()}
            ${createDetailImageTemplate()}
            ${createTabNavigationTemplate()}
            ${createTabContentTemplate()}
        </div>
    `;
}

function createCardNavigationTemplate() {
    return `
        <div class="card-navigation">
            <button class="nav-btn nav-prev" title="Previous Pokémon">‹</button>
            <button class="nav-btn nav-close" title="Close">✕</button>
            <button class="nav-btn nav-next" title="Next Pokémon">›</button>
        </div>
    `;
}

function createDetailHeaderTemplate() {
    return `
        <div class="detail-header">
            <h2 id="detailName" class="detail-pokemon-name">-</h2>
            <span id="detailNumber" class="detail-pokemon-number">-</span>
        </div>
    `;
}

function createDetailImageTemplate() {
    return `
        <div class="detail-image-section">
            <img id="detailImage" src="" alt="" class="detail-pokemon-image">
        </div>
    `;
}

function createTabNavigationTemplate() {
    return `
        <div class="pokemon-tabs">
            <button class="tab-btn active" data-tab="info">INFO</button>
            <button class="tab-btn" data-tab="stats">STATS</button>
            <button class="tab-btn" data-tab="breeding">BREEDING</button>
            <button class="tab-btn" data-tab="moves">MOVES</button>
            <button class="tab-btn" data-tab="evolution">EVOLUTION</button>
            <button class="tab-btn" data-tab="description">DESCRIPTION</button>
        </div>
    `;
}

function createTabContentTemplate() {
    return `
        <div class="tab-content">
            ${createInfoTabTemplate()}
            ${createStatsTabTemplate()}
            ${createBreedingTabTemplate()}
            ${createMovesTabTemplate()}
            ${createEvolutionTabTemplate()}
            ${createDescriptionTabTemplate()}
        </div>
    `;
}

function createInfoTabTemplate() {
    return `
        <div class="tab-panel active" id="tab-info">
            <div id="detailTypes" class="pokemon-types-display"></div>
            <div class="pokemon-stats">
                <div id="detailStats" class="stats-grid"></div>
            </div>
        </div>
    `;
}

function createStatsTabTemplate() {
    return `
        <div class="tab-panel" id="tab-stats">
            <div id="detailBaseStats" class="base-stats-container"></div>
        </div>
    `;
}

function createBreedingTabTemplate() {
    return `
        <div class="tab-panel" id="tab-breeding">
            <div id="detailBreeding" class="breeding-info"></div>
        </div>
    `;
}

function createMovesTabTemplate() {
    return `
        <div class="tab-panel" id="tab-moves">
            <div id="detailMoves" class="moves-container"></div>
        </div>
    `;
}

function createEvolutionTabTemplate() {
    return `
        <div class="tab-panel" id="tab-evolution">
            <div id="detailEvolutions" class="evolution-display"></div>
        </div>
    `;
}

function createDescriptionTabTemplate() {
    return `
        <div class="tab-panel" id="tab-description">
            <div class="description-container">
                <p id="detailDescription" class="pokemon-description">Loading description...</p>
            </div>
        </div>
    `;
}

function getPokemonCardTemplate(pokemon) {
    const pokemonNumber = formatPokemonNumber(pokemon.id);
    const typeBadges = createTypeBadges(pokemon.types);
    
    // Pokemon Go Features
    const favoriteBtn = window.pokemonGoFeatures ? 
        window.pokemonGoFeatures.getFavoriteButtonHTML(pokemon.id) : '';
    const ratingStars = window.pokemonGoFeatures ? 
        window.pokemonGoFeatures.getRatingStarsHTML(pokemon.id, pokemon) : '';
    const powerLevel = window.pokemonGoFeatures ? 
        window.pokemonGoFeatures.getPowerLevelHTML(pokemon) : '';

    
    return `
        <div class="pokemon-card h-100 type-${pokemon.types[0]}" 
             data-pokemon-id="${pokemon.id}" 
             draggable="true" 
             ondragstart="handlePokemonDragStart(event)">
            <div class="pokemon-image-wrapper">
                ${favoriteBtn}
                <span class="pokemon-number">${pokemonNumber}</span>
                <img src="${pokemon.image}" alt="${pokemon.name}" class="pokemon-image" loading="lazy">
            </div>
            <div class="pokemon-card-content">
                <h5 class="pokemon-name">${pokemon.name}</h5>
                <div class="pokemon-types">${typeBadges}</div>
                ${ratingStars}
                ${powerLevel}
            </div>
        </div>
    `;
}

function createNoResultsTemplate(searchQuery) {
    return `
        <div class="col-12">
            <div class="no-results text-center py-5">
                <h3>🔍 No Pokemon Found</h3>
                <p>No Pokemon found for "<strong>${searchQuery}</strong>".</p>
                <p class="text-muted">
                    <small>Make sure to search in English (e.g., "pikachu", "charizard")</small>
                </p>
                <button class="btn btn-primary" onclick="clearSearch()">
                    ← Back to All Pokemon
                </button>
            </div>
        </div>
    `;
}

function createErrorTemplate(message = 'An error occurred') {
    return `
        <div class="col-12">
            <div class="search-error text-center py-5">
                <h3>⚠️ Error</h3>
                <p>${message}. Please try again.</p>
                <button class="btn btn-primary" onclick="window.location.reload()">
                    🔄 Reload Page
                </button>
            </div>
        </div>
    `;
}

function createSearchResultItemTemplate(pokemon) {
    return `
        <div class="search-result-item" onclick="selectPokemonFromDropdown(${pokemon.id})">
            <img src="${pokemon.image}" alt="${pokemon.name}" class="search-result-image" loading="lazy">
            <div class="search-result-info">
                <div class="search-result-name">${pokemon.name}</div>
                <div class="search-result-types">
                    ${pokemon.types.map(type => `<span class="search-result-type">${type}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
}

function createNoSearchResultsTemplate(query) {
    return `
        <div class="search-result-item">
            <div class="search-result-info">
                <div class="search-result-name">No results for "${query}"</div>
                <div class="search-result-hint card-meta">
                    Try searching in English (e.g., "pikachu", "charizard")
                </div>
            </div>
        </div>
    `;
}

function createTypeBadgeTemplate(type) {
    return `<span class="detail-type-badge type-${type}">${type.toUpperCase()}</span>`;
}

function createStatItemTemplate(label, value) {
    return `
        <div class="stat-item">
            <div class="stat-label">${label}</div>
            <div class="stat-value">${value}</div>
        </div>
    `;
}

function createEvolutionItemTemplate(pokemon, isCurrent = false) {
    return `
        <div class="evolution-item ${isCurrent ? 'current' : ''}" data-pokemon-id="${pokemon.id}">
            <img src="${pokemon.image}" alt="${pokemon.name}" class="evolution-image">
            <div class="evolution-name">${pokemon.name}</div>
        </div>
    `;
}

function createEvolutionArrowTemplate() {
    return `<div class="evolution-arrow">→</div>`;
}

function createProgressStatTemplate(stat) {
    const percentage = calculateStatPercentage(stat);
    return createProgressStatHTML(stat, percentage);
}

function calculateStatPercentage(stat) {
    return Math.min((stat.value / stat.maxValue) * 100, 100);
}

function createProgressStatHTML(stat, percentage) {
    return `
        <div class="progress-stat-item">
            <div class="progress-header">
                <span class="progress-label">${stat.name}</span>
                <span class="progress-value">${stat.value}</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" data-progress="${percentage}"></div>
            </div>
        </div>
    `;
}

function createMoveBadgeTemplate(moveName) {
    const cleanName = moveName.replace('-', ' ');
    return `<span class="move-badge">${cleanName}</span>`;
}

function getLoadMoreButtonHTML() {
    return `
        <span class="load-more-text">⬇️ Load More Pokemon</span>
        <span class="load-more-spinner d-none">
            <span class="spinner-border spinner-border-sm me-1" role="status"></span>
            Loading...
        </span>
    `;
}

function getBurgerMenuOpenHTML() {
    return createBurgerMenuHTML("☰", "Filters");
}

function getBurgerMenuCloseHTML() {
    return createBurgerMenuHTML("✕", "Close");
}

function createBurgerMenuHTML(icon, text) {
    return `
        <span class="burger-icon">${icon}</span>
        <span class="filter-text">${text}</span>
    `;
}

function showNoSearchResults(searchQuery) {
    const container = domCache.getPokemonContainer();
    container.innerHTML = `
        <div class="col-12">
            <div class="no-results text-center py-5">
                <h3>🔍 No Pokemon Found</h3>
                <p>No Pokemon found for "<strong>${searchQuery}</strong>".</p>
                <p class="text-muted">
                    <small>Make sure to search in English (e.g., "pikachu", "charizard")</small>
                </p>
                <button class="btn btn-primary" onclick="clearSearch()">
                    ← Back to All Pokemon
                </button>
            </div>
        </div>
    `;
}

let isEscapeListenerActive = false;

function addEscapeListener() {
    if (!isEscapeListenerActive) {
        document.addEventListener('keydown', handleEscapeKey);
        isEscapeListenerActive = true;
    }
}

