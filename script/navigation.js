const navigationState = {
    currentPage: 1,
    totalPages: 1,
    pokemonPerPage: 20,
    totalPokemon: 0,
    currentMode: "pagination",
};

function initializeNavigation() {
    setupNavigationButtons();
    updatePaginationControls();
}

function setupNavigationButtons() {
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");
    const loadMoreBtn = document.getElementById("loadMoreBtn");

    if (prevBtn) prevBtn.addEventListener("click", () => navigateToPage(navigationState.currentPage - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => navigateToPage(navigationState.currentPage + 1));
    if (loadMoreBtn) loadMoreBtn.addEventListener("click", loadMorePokemon);
}

async function navigateToPage(pageNumber) {
    if (isNavigationBlocked(pageNumber)) return;

    setLoadingState(true);
    updateCurrentPage(pageNumber);
    
    const pokemonDetails = await fetchPokemonDetails(pageNumber);
    renderPokemonList(pokemonDetails);
    updatePaginationControls();
    scrollToTop();
    setLoadingState(false);
}

function isNavigationBlocked(pageNumber) {
    return appState.isLoading || 
           pageNumber < 1 || 
           pageNumber > navigationState.totalPages || 
           appState.selectedType === "search";
}

function updateCurrentPage(pageNumber) {
    navigationState.currentPage = pageNumber;
    appState.currentPage = pageNumber;
}

async function fetchPokemonDetails(pageNumber) {
    const offset = calculateOffset(pageNumber);
    
    if (appState.selectedType === "all") {
        return await fetchPokemonData(offset, navigationState.pokemonPerPage);
    }
    
    return await fetchMorePokemonByType(appState.selectedType, offset);
}

function calculateOffset(pageNumber) {
    return (pageNumber - 1) * navigationState.pokemonPerPage;
}

async function loadMorePokemon() {
    if (appState.isLoading) return;

    setLoadingState(true);
    setLoadMoreButtonState(true);
    
    const newPokemonDetails = await fetchMorePokemonForNavigation();
    processNewPokemonData(newPokemonDetails);
    
    resetLoadingState();
}

async function fetchMorePokemonForNavigation() {
    switch (appState.selectedType) {
        case "all":
            return await fetchPokemonData(appState.nextPageOffset, navigationState.pokemonPerPage);
        case "search":
            return [];
        default:
            return await fetchMorePokemonByType(appState.selectedType, appState.nextPageOffset);
    }
}

function processNewPokemonData(newPokemonDetails) {
    if (hasNewPokemonData(newPokemonDetails)) {
        appendNewPokemon(newPokemonDetails);
        updateAppStateWithNewPokemon(newPokemonDetails);
    } else {
        showNoMorePokemon();
    }
}

function updateAppStateWithNewPokemon(newPokemonDetails) {
    appState.pokemonList = [...appState.pokemonList, ...newPokemonDetails];
    appState.nextPageOffset += navigationState.pokemonPerPage;
    
    if (appState.selectedType === "all") {
        appState.allPokemonList = [...appState.pokemonList];  // <- Fix
    }
}

function appendNewPokemon(pokemonList) {
    pokemonList.forEach(appendPokemonCard);
}

function showNoMorePokemon() {
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    if (!loadMoreBtn) return;
    
    loadMoreBtn.innerHTML = " All Pokemon loaded!";
    loadMoreBtn.disabled = true;
    resetLoadMoreButtonAfterDelay(loadMoreBtn);
}

function resetLoadMoreButtonAfterDelay(loadMoreBtn) {
    setTimeout(() => {
        loadMoreBtn.innerHTML = getLoadMoreButtonHTML();
    }, 3000);
}

function updatePaginationControls() {
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");
    const pageInfo = document.getElementById("pageInfo");
    const paginationControls = document.getElementById("paginationControls");

    if (pageInfo) pageInfo.textContent = `Page ${navigationState.currentPage}`;
    if (prevBtn) prevBtn.disabled = navigationState.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = isNextButtonDisabled();
    
    updatePaginationVisibility(paginationControls);
}

function updatePaginationVisibility(paginationControls) {
    if (paginationControls) {
        paginationControls.style.display = appState.selectedType === "search" ? "none" : "flex";
    }
}

function isNextButtonDisabled() {
    if (appState.selectedType === "all") return false;
    if (appState.selectedType === "search") return true;
    return navigationState.currentPage >= navigationState.totalPages;
}

async function calculateTotalPagesForType(type) {
    if (type === "all") {
        navigationState.totalPages = 50;
    } else if (type === "search") {
        navigationState.totalPages = 1;
    } else {
        const totalPokemon = await fetchTotalPokemonForType(type);
        navigationState.totalPages = Math.ceil(totalPokemon / navigationState.pokemonPerPage);
    }
}

async function fetchTotalPokemonForType(type) {
    const typeResponse = await window.PokeApi.fetch(`/type/${type}`);
    return typeResponse.pokemon.length;
}

function setLoadMoreButtonState(loading) {
    const btn = document.getElementById("loadMoreBtn");
    if (!btn) return;
    
    const text = btn.querySelector(".load-more-text");
    const spinner = btn.querySelector(".load-more-spinner");
    
    text?.classList.toggle("d-none", loading);
    spinner?.classList.toggle("d-none", !loading);
    btn.disabled = loading;
}

function resetLoadingState() {
    setLoadingState(false);
    setLoadMoreButtonState(false);
}

function hasNewPokemonData(newPokemonDetails) {
    return newPokemonDetails && newPokemonDetails.length > 0;
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetNavigation() {
    navigationState.currentPage = 1;
    appState.currentPage = 1;
    appState.nextPageOffset = 0;
    updatePaginationControls();
}

async function updateNavigationForType(type) {
    await calculateTotalPagesForType(type);
    resetNavigation();
    updatePaginationControls();
}

function initializeBurgerMenu() {
    const burgerBtn = document.getElementById("burgerMenuBtn");
    const filterContainer = document.getElementById("filterContainer");

    if (!burgerBtn || !filterContainer) return;

    setupBurgerButtonClick(burgerBtn, filterContainer);
    setupDocumentClickHandler(burgerBtn, filterContainer);
    setupCloseAfterTypeChoice(burgerBtn, filterContainer);
}

/** Typ gewaehlt, Sheet zu. Sonst verdeckt es die Karten, die man sehen will. */
function setupCloseAfterTypeChoice(burgerBtn, filterContainer) {
    filterContainer.addEventListener("click", (event) => {
        if (!event.target.closest("[data-type]")) return;
        filterContainer.classList.remove("show");
        updateBurgerButtonHTML(burgerBtn, false);
    });
}

function setupBurgerButtonClick(burgerBtn, filterContainer) {
    burgerBtn.addEventListener("click", (event) => {
        // Wichtig: Der Klick darf nicht bis zum Dokument durchlaufen.
        // Der Button tauscht gleich sein innerHTML aus - das angeklickte <span>
        // ist danach aus dem DOM, und handleOutsideClick haelt es faelschlich
        // fuer "ausserhalb" und schliesst das Menue sofort wieder.
        event.stopPropagation();
        toggleFilterContainer(burgerBtn, filterContainer);
    });
}

function setupDocumentClickHandler(burgerBtn, filterContainer) {
    document.addEventListener("click", (event) => handleOutsideClick(event, burgerBtn, filterContainer));
}

function toggleFilterContainer(burgerBtn, filterContainer) {
    const isVisible = filterContainer.classList.toggle("show");
    updateBurgerButtonHTML(burgerBtn, isVisible);
}

function updateBurgerButtonHTML(burgerBtn, isVisible) {
    burgerBtn.innerHTML = isVisible ? getBurgerMenuCloseHTML() : getBurgerMenuOpenHTML();
}

function handleOutsideClick(event, burgerBtn, filterContainer) {
    if (!burgerBtn.contains(event.target) && !filterContainer.contains(event.target)) {
        filterContainer.classList.remove("show");
        updateBurgerButtonHTML(burgerBtn, false);
    }
}

function initializeFullNavigation() {
    initializeNavigation();
    initializeBurgerMenu();
    checkResponsiveNavigation();
    window.addEventListener("resize", checkResponsiveNavigation);
}

function checkResponsiveNavigation() {
    const burgerBtn = document.getElementById("burgerMenuBtn");
    const filterContainer = document.getElementById("filterContainer");

    if (window.innerWidth <= 768) {
        burgerBtn?.classList.remove("d-none");
        filterContainer?.classList.remove("show");
    } else {
        burgerBtn?.classList.add("d-none");
        filterContainer?.classList.remove("show");
    }
}

function renderPokemonList(pokemonDetails) {
    clearPokemonContainer();
    pokemonDetails.forEach((pokemon) => appendPokemonCard(pokemon));
}

function handleError(message, error) {
    console.error(message, error);
    alert(message);
}

