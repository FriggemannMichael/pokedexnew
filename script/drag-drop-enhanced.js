// Enhanced drag-and-drop behavior for Pokemon cards
function handlePokemonDragStart(event) {
  const pokemonCard = event.target.closest(".pokemon-card");
  if (!pokemonCard) return;

  const pokemonId = pokemonCard.dataset.pokemonId || pokemonCard.dataset.id;
  event.dataTransfer.setData("pokedex-card-id", pokemonId);
  event.dataTransfer.setData("text/plain", pokemonId);

  pokemonCard.style.opacity = "0.7";
  pokemonCard.classList.add("dragging");
  document.body.classList.add("team-builder-drag-active");
  document.dispatchEvent(
    new CustomEvent("pokemon-card-drag-start", { detail: { pokemonId } })
  );

  const rect = pokemonCard.getBoundingClientRect();
  event.dataTransfer.setDragImage(pokemonCard, rect.width / 2, rect.height / 2);
}

function handlePokemonDragEnd(event) {
  const pokemonCard = event.target.closest(".pokemon-card");
  if (pokemonCard) {
    pokemonCard.style.opacity = "1";
    pokemonCard.classList.remove("dragging");
  }

  document.body.classList.remove("team-builder-drag-active");
  document.dispatchEvent(new CustomEvent("pokemon-card-drag-end"));
}

document.addEventListener("dragend", handlePokemonDragEnd);

document.addEventListener("DOMContentLoaded", () => {
  enableDragForPokemonCards();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const pokemonCards = node.querySelectorAll(".pokemon-card");
          pokemonCards.forEach(enableDragForCard);
        }
      });
    });
  });

  observer.observe(document.getElementById("pokemonContainer") || document.body, {
    childList: true,
    subtree: true,
  });
});

function enableDragForPokemonCards() {
  const pokemonCards = document.querySelectorAll(".pokemon-card");
  pokemonCards.forEach(enableDragForCard);
}

function enableDragForCard(card) {
  if (!card.hasAttribute("draggable")) {
    card.setAttribute("draggable", "true");
    card.addEventListener("dragstart", handlePokemonDragStart);
  }
}
