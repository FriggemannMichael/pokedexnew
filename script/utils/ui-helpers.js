function toggleButtonState(button, isEnabled, activeClass, inactiveClass, titles) {
  if (!button) return;
  button.disabled = !isEnabled;
  button.classList.toggle(activeClass, isEnabled);
  button.classList.toggle(inactiveClass, !isEnabled);
  if (titles) {
    button.title = isEnabled ? titles.enabled : titles.disabled;
  }
}

function setGlobalLoadingState(loading) {
  if (typeof appState !== "undefined") {
    appState.isLoading = loading;
  }
  const spinner = document.querySelector(".loading-spinner");
  if (spinner) {
    spinner.classList.toggle("d-none", !loading);
  }
}

function resetSearchInput() {
  const searchInput = typeof domCache !== "undefined" ? domCache.getSearchInput() : null;
  const searchButton = typeof domCache !== "undefined" ? domCache.getSearchBtn() : null;
  const searchDropdown = typeof domCache !== "undefined" ? domCache.getSearchDropdown() : null;

  if (searchInput) {
    searchInput.value = "";
    if (typeof updateSearchButtonState === "function") {
      updateSearchButtonState(searchButton, false);
    }
    if (searchDropdown) {
      searchDropdown.classList.add("d-none");
    }
  }
}

function resetToAllFilter() {
  if (typeof appState !== "undefined") {
    appState.selectedType = "all";
    appState.currentPage = 1;
    appState.nextPageOffset = 0;
  }
  resetAllButtonText();
}

function resetAllButtonText() {
  const allButton = document.querySelector('[data-type="all"]');
  if (allButton) allButton.innerHTML = '<span class="filter-text">All</span>';
}

function resetSearchMode() {
  if (typeof appState !== "undefined") {
    appState.selectedType = "all";
    appState.nextPageOffset = 0;
    appState.currentPage = 1;
  }
  resetAllButtonText();
  resetSearchInput();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

window.toggleButtonState = toggleButtonState;
window.setGlobalLoadingState = setGlobalLoadingState;
window.escapeHtml = escapeHtml;
