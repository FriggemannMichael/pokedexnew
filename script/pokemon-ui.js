
function initializeFilters() {
    domElements.filterButtons.forEach((button) => {
        button.addEventListener("click", () => handleFilterClick(button));
    });

    domElements.dropdownItems.forEach((item) => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            handleDropdownFilterClick(item);
        });
    });
}

function handleFilterClick(button) {
    const selectedType = button.getAttribute("data-type");
    updateAppStateForFilter(selectedType);
    changeBodyBackground(selectedType);
    setActiveFilter(button);
    loadPokemonByType(selectedType);
}

function handleDropdownFilterClick(item) {
    const selectedType = item.getAttribute("data-type");
    updateAppStateForFilter(selectedType);
    changeBodyBackground(selectedType);
    closeDropdown();
    setActiveDropdownFilter(selectedType);
    loadPokemonByType(selectedType);
}

function updateAppStateForFilter(selectedType) {
    appState.selectedType = selectedType;
    appState.nextPageOffset = 0;
    appState.currentPage = 1;
}

function closeDropdown() {
    const dropdown = document.querySelector("#moreTypesDropdown");
    if (!dropdown) return;
    
    const bsDropdown = bootstrap.Dropdown.getInstance(dropdown);
    if (bsDropdown) bsDropdown.hide();
}

function setActiveFilter(selectedButton) {
    domElements.filterButtons.forEach((button) => button.classList.remove("active"));
    
    const dropdownButton = document.querySelector("#moreTypesDropdown");
    if (dropdownButton) dropdownButton.classList.remove("active");
    
    selectedButton.classList.add("active");
}

function setActiveDropdownFilter(selectedType) {
    domElements.filterButtons.forEach((button) => button.classList.remove("active"));
    
    const dropdownButton = document.querySelector("#moreTypesDropdown");
    if (!dropdownButton) return;
    
    dropdownButton.classList.add("active");
    dropdownButton.setAttribute("data-type", selectedType);
    updateDropdownButtonContent(dropdownButton, selectedType);
}

function updateDropdownButtonContent(dropdownButton, selectedType) {
    const selectedItem = document.querySelector(`[data-type="${selectedType}"]`);
    if (!selectedItem) return;
    
    const typeName = capitalizeFirstLetter(selectedType);
    const icon = selectedItem.querySelector(".type-icon");
    
    if (icon) {
        dropdownButton.innerHTML = createDropdownButtonHTML(icon.src, typeName);
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function createDropdownButtonHTML(iconSrc, typeName) {
    return `<img src="${iconSrc}" alt="${typeName}" class="type-icon">
            <span class="filter-text">${typeName}</span>`;
}

function changeBodyBackground(pokemonType) {
    document.body.className = document.body.className.replace(/type-\w+/g, "");
    
    if (pokemonType && pokemonType !== "all") {
        document.body.classList.add(`type-${pokemonType}`);
    }
}

function initializeLoadMore() {
    const loadMoreButton = domElements.loadMoreButton();
    if (loadMoreButton) {
        loadMoreButton.addEventListener("click", () => loadMorePokemon());
    }
}

function updatePaginationControls() {
    const prevBtn = domCache.get("prevPageBtn");
    const nextBtn = domCache.get("nextPageBtn");
    const pageInfo = domCache.get("pageInfo");
    const paginationControls = domCache.get("paginationControls");

    if (pageInfo) pageInfo.textContent = `Page ${appState.currentPage}`;
    if (prevBtn) prevBtn.disabled = appState.currentPage <= 1;

    updateNextButton(nextBtn);
    updatePaginationVisibility(paginationControls);
}

function updateNextButton(nextBtn) {
    if (!nextBtn) return;

    if (appState.selectedType === "all") {
        nextBtn.disabled = false;
    } else if (appState.selectedType === "search") {
        nextBtn.disabled = true;
    } else {
        nextBtn.disabled = appState.currentPage >= 10;
    }
}

function updatePaginationVisibility(paginationControls) {
    if (paginationControls) {
        paginationControls.style.display = appState.selectedType === "search" ? "none" : "flex";
    }
}

// Debug Hinweis: window.POKE_DEBUG = true; aktiviert zusätzliche console.debug Ausgaben in mehreren Modulen
function initializeApp() {
    if (window.POKE_DEBUG) console.debug("[App] init start");
    
    // Prüfen ob DOM bereit ist
    if (document.readyState === "loading") {
        if (window.POKE_DEBUG) console.debug("[App] DOM not ready yet, waiting...");
        return;
    }
    
    loadPokemon();
    initializeFilters();
    initializeLoadMore();
    initializeSearch();

    if (typeof initializeFullNavigation === "function") {
        initializeFullNavigation();
    }

    if (typeof updateNavigationForType === "function") {
        updateNavigationForType("all");
    }
    
    if (window.POKE_DEBUG) console.debug("[App] init complete");
}

// Nur aufrufen, wenn nicht bereits von main.js gehandhabt wird
if (!window.mainJsLoaded) {
    document.addEventListener("DOMContentLoaded", initializeApp);
}
