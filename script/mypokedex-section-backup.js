const myPokedexBtn = document.querySelector("#myPokedexBtn");
const dropPoint = document.querySelector(".drop-point");

window.handleButtonDragover = function(e) {
  e.preventDefault();
  myPokedexBtn.style.backgroundColor = "var(--accent)";
  myPokedexBtn.style.transform = "scale(1.1)";
};

window.handleButtonDragleave = function(e) {
  myPokedexBtn.style.backgroundColor = "";
  myPokedexBtn.style.transform = "";
};

window.handleButtonDrop = function(e) {
  e.preventDefault();
  myPokedexBtn.style.backgroundColor = "";
  myPokedexBtn.style.transform = "";

  const cardId = e.dataTransfer.getData("pokedex-card-id");
  if (cardId && dropPoint) {
    addPokemonToDropPoint(cardId, dropPoint);
    updatePokedexCount();
  }
};

function updatePokedexCount() {
  const count = dropPoint.querySelectorAll(".pokemon-card").length;
  const countElement = document.getElementById("pokedexCount");
  if (countElement) {
    countElement.textContent = count;
  }
}

function addPokemonToDropPoint(cardId, dropPoint) {
  if (!cardId) return;
  const cards = dropPoint.querySelectorAll(".pokemon-card");
  if (cards.length >= 6) return;
  if (
    [...cards].some(
      (card) =>
        card.dataset.id === cardId ||
        card.getAttribute("data-pokemon-id") === cardId
    )
  )
    return;
  const originalCard = document.querySelector(
    `.pokemon-grid .pokemon-card[data-id='${cardId}'], .pokemon-grid .pokemon-card[data-pokemon-id='${cardId}']`
  );
  if (!originalCard) return;
  const clone = originalCard.cloneNode(true);
  clone.classList.add("drop-point-card", "mx-2", "mb-2");

  clone.style.transformOrigin = "top left";
  const btnWrapper = document.createElement("div");
  btnWrapper.style.display = "flex";
  btnWrapper.style.justifyContent = "center";
  btnWrapper.style.marginTop = "12px";
  btnWrapper.style.marginBottom = "8px";

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn btn-filter";
  removeBtn.textContent = "Entfernen";
  removeBtn.onclick = () => {
    clone.remove();
    updatePokedexCount();
  };
  btnWrapper.appendChild(removeBtn);
  clone.appendChild(btnWrapper);
  dropPoint.appendChild(clone);
  updatePokedexCount();
}
