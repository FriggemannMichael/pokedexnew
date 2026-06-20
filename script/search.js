
function initializeSearch() {
    const searchInput = domCache.getSearchInput();
    const searchButton = domCache.getSearchBtn();
    const searchDropdown = domCache.getSearchDropdown();

    if (!searchInput || !searchButton) return;

    updateSearchButtonState(searchButton, false);
    addSearchInputListeners(searchInput, searchButton, searchDropdown);
}

function addSearchInputListeners(input, button, dropdown) {
    let searchTimeout;

    input.addEventListener('input', (event) => {
        searchTimeout = handleInput(event, button, dropdown, searchTimeout);
    });
    input.addEventListener('keydown', (event) => handleKeydown(event, input, dropdown));
    input.addEventListener('focus', () => handleFocus(input, dropdown));
    button.addEventListener('click', () => handleButtonClick(input, dropdown));
    document.addEventListener('click', (event) => handleDocumentClick(event, input, button, dropdown));
}

function handleInput(event, button, dropdown, searchTimeout) {
    const query = event.target.value.trim();
    updateSearchButtonState(button, isQueryValid(query));
    clearTimeout(searchTimeout);
    
    if (query.length >= 3) {
        return setTimeout(() => performDropdownSearch(query, dropdown), 300);
    } else {
        hideSearchDropdown(dropdown);
    }

    return null;
}

function handleKeydown(event, input, dropdown) {
    if (event.key === 'Enter' && isQueryValid(input.value)) {
        hideSearchDropdown(dropdown);
        performFullSearch(input.value.trim());
    }
    
    if (event.key === 'Escape') {
        hideSearchDropdown(dropdown);
        input.blur();
    }
}

function handleButtonClick(input, dropdown) {
    if (isQueryValid(input.value)) {
        hideSearchDropdown(dropdown);
        performFullSearch(input.value.trim());
    }
}

function handleDocumentClick(event, input, button, dropdown) {
    const outsideClick = !input.contains(event.target) && 
                        !dropdown.contains(event.target) && 
                        !button.contains(event.target);
    
    if (outsideClick) hideSearchDropdown(dropdown);
}

function handleFocus(input, dropdown) {
    const query = input.value.trim();
    if (query.length >= 3) performDropdownSearch(query, dropdown);
}

async function performDropdownSearch(searchQuery, dropdown) {
    const currentQuery = domCache.getSearchInput()?.value.trim() || "";
    if (currentQuery !== searchQuery) return;

    try {
        const results = await searchPokemonByName(searchQuery, 5);
        const latestQuery = domCache.getSearchInput()?.value.trim() || "";
        if (latestQuery !== searchQuery) return;
        displaySearchDropdown(results, dropdown, searchQuery);
    } catch (error) {
        console.error("[Search] Dropdown search failed", error);
        displaySearchDropdown([], dropdown, searchQuery);
    }
}

function displaySearchDropdown(results, dropdown, query) {
    if (!dropdown) return;
    const resultsContainer = dropdown.querySelector('#searchResults');
    if (!resultsContainer) return;
    
    if (results.length === 0) {
        resultsContainer.innerHTML = createNoSearchResultsTemplate(query);
    } else {
        resultsContainer.innerHTML = results.map(pokemon => createSearchResultItemTemplate(pokemon)).join('');
    }
    
    showSearchDropdown(dropdown);
}

function selectPokemonFromDropdown(pokemonId) {
    const dropdown = document.getElementById('searchDropdown');
    hideSearchDropdown(dropdown);
    
    let pokemon = findPokemonInLoadedLists(pokemonId);
    
    if (pokemon) {
        openPokemonDetail(pokemon);
    } else {
        loadSinglePokemon(pokemonId);
    }
}

async function loadSinglePokemon(pokemonId) {
    try {
        const pokemon = await loadPokemonById(pokemonId);
        if (pokemon) openPokemonDetail(pokemon);
    } catch (error) {
        console.error("[Search] Single Pokemon load failed", error);
    }
}

function showSearchDropdown(dropdown) {
    if (dropdown) dropdown.classList.remove('d-none');
}

function hideSearchDropdown(dropdown) {
    if (dropdown) dropdown.classList.add('d-none');
}

async function performFullSearch(searchQuery) {
    if (appState.isLoading) return;

    setLoadingState(true);
    clearPokemonContainer();

    try {
        const searchResults = await searchPokemonByName(searchQuery, 50);
        handleSearchResults(searchResults, searchQuery);
    } catch (error) {
        console.error("[Search] Full search failed", error);
        showNoSearchResults(searchQuery);
    } finally {
        setLoadingState(false);
    }
}

async function searchPokemonByName(searchQuery, limit = 50) {
    if (window.apiService && typeof window.apiService.searchPokemon === "function") {
        return await window.apiService.searchPokemon(searchQuery, limit);
    }

    return findPokemonLocally(searchQuery).slice(0, limit);
}

function findPokemonLocally(query) {
    const lowerQuery = query.toLowerCase();
    const pools = [appState.allPokemonList, appState.pokemonList].filter(Array.isArray);
    const seen = new Set();

    return pools.flat().filter((pokemon) => {
        if (!pokemon || seen.has(pokemon.id)) return false;
        seen.add(pokemon.id);
        return pokemon.name.toLowerCase().includes(lowerQuery);
    });
}

async function loadPokemonById(pokemonId) {
    const localPokemon = findPokemonInLoadedLists(pokemonId);
    if (localPokemon) return localPokemon;

    if (window.apiService && typeof window.apiService.fetchPokemon === "function") {
        return await window.apiService.fetchPokemon(pokemonId);
    }

    return null;
}

function findPokemonInLoadedLists(pokemonId) {
    const id = Number(pokemonId);
    const pools = [appState.pokemonList, appState.allPokemonList].filter(Array.isArray);
    return pools.flat().find((pokemon) => Number(pokemon?.id) === id) || null;
}

function handleSearchResults(results, searchQuery) {
    if (results.length === 0) {
        showNoSearchResults(searchQuery);
        return;
    }

    updateSearchResults(results);
    activateSearchMode();
}

function updateSearchResults(results) {
    appState.pokemonList = results;
    appState.currentPage = 1;
    appState.totalPages = 1;
    renderPokemon(results);
    updatePaginationControls();
}

function activateSearchMode() {
    appState.selectedType = 'search';
    appState.nextPageOffset = 0;
    updateFilterButtonsForSearch();
}

function updateFilterButtonsForSearch() {
    resetFilterButtons();
    updateAllButtonForSearch();
}

function resetFilterButtons() {
    const filterButtons = document.querySelectorAll('.btn-filter[data-type]');
    filterButtons.forEach(button => button.classList.remove('active'));
    
    const dropdownButton = document.querySelector('#moreTypesDropdown');
    if (dropdownButton) dropdownButton.classList.remove('active');
}

function updateAllButtonForSearch() {
    const allButton = document.querySelector('[data-type="all"]');
    if (allButton) {
        allButton.classList.add('active');
        allButton.textContent = 'Search Results';
    }
}

function clearSearch() {
    resetSearchInput();
    resetToAllFilter();
    loadPokemon();
}

function resetSearchInput() {
    const searchInput = domCache.getSearchInput();
    const searchButton = domCache.getSearchBtn();
    const searchDropdown = domCache.getSearchDropdown();

    if (searchInput) {
        searchInput.value = '';
        updateSearchButtonState(searchButton, false);
        hideSearchDropdown(searchDropdown);
    }
}

function resetToAllFilter() {
    appState.selectedType = 'all';
    appState.currentPage = 1;
    appState.nextPageOffset = 0;
    resetAllButtonText();
}

function resetAllButtonText() {
    const allButton = document.querySelector('[data-type="all"]');
    if (allButton) allButton.innerHTML = '<span class="filter-text">All</span>';
}

function isQueryValid(query) {
    return query.trim().length >= 3;
}

function updateSearchButtonState(button, isEnabled) {
    if (!button) return;
    
    button.disabled = !isEnabled;
    button.classList.toggle('btn-primary', isEnabled);
    button.classList.toggle('btn-light', !isEnabled);
    button.title = isEnabled ? 'Search Pokemon' : 'Enter at least 3 letters';
}

