TeamOffcanvas.prototype.getRandomTypeGradient = function () {
  if (!this.typeGradients || !this.typeGradients.length) return 'var(--gradient)';
  return this.typeGradients[Math.floor(Math.random() * this.typeGradients.length)];
};

TeamOffcanvas.prototype.setupDynamicModalHeader = function () {
  const applyGradient = (header) => {
    if (!header) return;
    const g = this.getRandomTypeGradient();
    header.classList.add('dynamic-gradient');
    header.style.setProperty('--_prev-gradient', getComputedStyle(header).backgroundImage || 'none');
    header.style.backgroundImage = g;
    header.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 480, easing: 'ease' });
  };
  document.addEventListener('show.bs.modal', (ev) => {
    applyGradient(ev.target.querySelector('.modal-header'));
  });
  const existing = document.getElementById('teamModal');
  if (existing?.classList.contains('show')) applyGradient(existing.querySelector('.modal-header'));
  if (this.offcanvasElement) {
    this.offcanvasElement.addEventListener('shown.bs.offcanvas', () => {
      const h = this.offcanvasElement.querySelector('.modal-header');
      if (h) applyGradient(h);
    });
  }
};

TeamOffcanvas.prototype.renderMiniCard = function (pokemon) {
  const card = document.createElement('div');
  const primaryType = (pokemon.types && pokemon.types[0]) ? pokemon.types[0].toLowerCase() : 'normal';
  card.className = `mini-pokemon-card new-card type-${primaryType}`;
  card.dataset.pokemonId = pokemon.id;
  const badges = pokemon.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
  card.innerHTML = `
    <button class="remove-btn" onclick="teamOffcanvas.removePokemonFromTeam('${pokemon.id}')"><i class="fas fa-times"></i></button>
    <img src="${pokemon.image}" alt="${pokemon.name}" loading="lazy">
    <div class="pokemon-name">${pokemon.name}</div>
    <div class="pokemon-types">${badges}</div>
  `;
  this.cardsContainer.appendChild(card);
  setTimeout(() => card.classList.remove('new-card'), 500);
};

TeamOffcanvas.prototype.animateRemoveMiniCard = function (pokemonId) {
  const card = this.cardsContainer.querySelector(`[data-pokemon-id="${pokemonId}"]`);
  if (card) {
    card.style.animation = 'fadeInUp 0.3s ease reverse';
    setTimeout(() => card.remove(), 300);
  }
};

TeamOffcanvas.prototype.refreshTeamModalIfOpen = function () {
  try {
    const modal = document.getElementById('teamModal');
    if (modal?.classList.contains('show')) {
      if (typeof window.showDetailedTeamView === 'function') window.showDetailedTeamView();
    }
    if (typeof window.renderTeamOverview === 'function') window.renderTeamOverview();
  } catch (e) {
    console.warn('Fehler beim Aktualisieren des Team Modals:', e);
  }
};

TeamOffcanvas.prototype.renderAllMiniCards = function () {
  this.cardsContainer.innerHTML = '';
  this.team.forEach(p => this.renderMiniCard(p));
};

TeamOffcanvas.prototype.updateCounters = function () {
  const count = this.team.length;
  if (this.teamCounter) {
    this.teamCounter.textContent = `${count}/6`;
    this.teamCounter.classList.toggle('full', count >= this.maxTeamSize);
  }
  if (this.pokedexCounter) this.pokedexCounter.textContent = count;
  if (this.pokedexCounterOffcanvas) this.pokedexCounterOffcanvas.textContent = count;
};

TeamOffcanvas.prototype.updateDropPlaceholder = function () {
  const ph = this.dropZone?.querySelector('.drop-placeholder');
  if (ph) ph.style.display = this.team.length > 0 ? 'none' : 'block';
};

TeamOffcanvas.prototype.showToast = function (message, type = 'info') {
  if (typeof bootstrap === 'undefined') {
    if (type === 'error') console.error(message);
    else if (type === 'warning') console.warn(message);
    return;
  }
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '\u2705', warning: '\u26A0\uFE0F', error: '\u274C', info: '\u2139\uFE0F' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `
    <div class="toast-header">
      <strong class="me-auto">${icons[type] || '\u2139\uFE0F'} Pokemon Team</strong>
      <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
    </div>
    <div class="toast-body">${message}</div>
  `;
  container.appendChild(el);
  const toast = new bootstrap.Toast(el, { autohide: true, delay: type === 'error' ? 5000 : 3000 });
  toast.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
};

let teamOffcanvas;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { teamOffcanvas = new TeamOffcanvas(); window.teamOffcanvas = teamOffcanvas; });
} else {
  teamOffcanvas = new TeamOffcanvas();
  window.teamOffcanvas = teamOffcanvas;
}
