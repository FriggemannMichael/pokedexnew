function initializePokemonModal() {
    const existingModal = domCache.getPokemonOverlay();
    if (existingModal) return;
    
    createModal();
    setupModalEventListeners();
}

function createModal() {
    const modalHTML = createPokemonModalTemplate();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function setupModalEventListeners() {
    const overlay = domCache.getPokemonOverlay();
    if (!overlay) return;
    
    setupBackgroundListener(overlay);
    setupNavigationListeners(overlay);
    addEscapeListener();
}

function setupBackgroundListener(overlay) {
    const background = overlay.querySelector('.overlay-background');
    const closeBtn = overlay.querySelector('.nav-close');
    
    background.addEventListener('click', closePokemonModal);
    closeBtn.addEventListener('click', closePokemonModal);
}

function setupNavigationListeners(overlay) {
    const prevBtn = overlay.querySelector('.nav-prev');
    const nextBtn = overlay.querySelector('.nav-next');
    
    prevBtn.addEventListener('click', () => navigatePokemon(-1));
    nextBtn.addEventListener('click', () => navigatePokemon(1));
}

function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        const overlay = domCache.getPokemonOverlay();
        if (overlay && overlay.classList.contains('show')) {
            closePokemonModal();
        }
    }
}

function openPokemonModal() {
    const overlay = domCache.getPokemonOverlay();
    if (!overlay) return;

    showModal(overlay);
    disableBodyScroll();
    initializeTabsDelayed();

    const img = overlay.querySelector(".detail-pokemon-image");
    if (img) {
        img.classList.remove("show");  
        setTimeout(() => img.classList.add("show"), 40);
    }
}


function showModal(overlay) {
    overlay.classList.remove('d-none');
    setTimeout(() => overlay.classList.add('show'), 10);
}

function disableBodyScroll() {
    document.body.style.overflow = 'hidden';
}

function initializeTabsDelayed() {
    setTimeout(initializeTabs, 100);
}

function closePokemonModal() {
    const overlay = domCache.getPokemonOverlay();
    if (!overlay) return;
    
    hideModal(overlay);
    scheduleModalCleanup(overlay);
}

function hideModal(overlay) {
    overlay.classList.remove('show');
}

function scheduleModalCleanup(overlay) {
    setTimeout(() => {
        overlay.classList.add('d-none');
        document.body.style.overflow = 'auto';
        resetModalCard();
    }, 300);
}

function resetModalCard() {
    const overlay = domCache.getPokemonOverlay();
    if (!overlay) return;
    
    const card = overlay.querySelector('.pokemon-detail-card');
    if (card) {
        removeTypeClasses(card);
    }
}

function removeTypeClasses(card) {
    const typeClasses = Array.from(card.classList).filter(cls => cls.startsWith('type-'));
    typeClasses.forEach(cls => card.classList.remove(cls));
}

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            switchToTab(targetTab, tabButtons, tabPanels);
        });
    });
}

function switchToTab(targetTab, tabButtons, tabPanels) {
    deactivateAllTabs(tabButtons, tabPanels);
    activateSelectedTab(targetTab);
}

function deactivateAllTabs(tabButtons, tabPanels) {
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });
    tabPanels.forEach(panel => panel.classList.remove('active'));
}

function activateSelectedTab(targetTab) {
    const activeButton = document.querySelector(`[data-tab="${targetTab}"]`);
    const activePanel = document.getElementById(`tab-${targetTab}`);

    if (activeButton) {
        activeButton.classList.add('active');
        activeButton.setAttribute('aria-selected', 'true');
    }
    if (activePanel) activePanel.classList.add('active');
}





