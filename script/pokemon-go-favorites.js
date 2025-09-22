// Favorites / rating / notes UI + filters
(function(){
  const PGF = PokemonGoFeatures.prototype;
  PGF.toggleFavorite = function(id){ this.favorites.has(id)?this.favorites.delete(id):this.favorites.add(id); localStorage.setItem('pokemonFavorites', JSON.stringify([...this.favorites])); this.updateFavoriteButtons(id); document.dispatchEvent(new CustomEvent('favoriteToggled',{detail:{pokemonId:id,isFavorite:this.favorites.has(id)}})); };
  PGF.isFavorite = function(id){ return this.favorites.has(id); };
  PGF.updateFavoriteButtons = function(id){ document.querySelectorAll(`[data-pokemon-id="${id}"] .favorite-btn`).forEach(btn=>{ const fav=this.isFavorite(id); btn.classList.toggle('active',fav); btn.innerHTML = fav?'❤️':'🤍'; }); };
  PGF.getRating = function(id){ return this.ratings[id]||0; };
  PGF.addNote = function(id,n){ this.personalNotes[id]=n; localStorage.setItem('pokemonNotes', JSON.stringify(this.personalNotes)); };
  PGF.getNote = function(id){ return this.personalNotes[id]||''; };
  PGF.getFavoriteButtonHTML = function(id){ const fav=this.isFavorite(id); return `<button class="favorite-btn ${fav?'active':''}" data-pokemon-id="${id}">${fav?'❤️':'🤍'}</button>`; };
  PGF.getRatingStarsHTML = function(id,p){ const stars=this.calculateAutoRating(p); let h='<div class="rating-container auto-rating">'; for(let i=1;i<=5;i++) h+=`<span class="rating-star ${i<=stars?'active':''} auto" title="Automatische Bewertung">⭐</span>`; return h+'</div>'; };
})();
