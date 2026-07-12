(function () {
  const PGF = PokemonGoFeatures.prototype;
  PGF.initPowerObserver = function () {
    const obs = new MutationObserver((muts) => {
      muts.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            node
              .querySelectorAll(".pokemon-card[data-pokemon-id]")
              .forEach((card) => {
                const id = parseInt(card.dataset.pokemonId);
                if (id && !card.dataset.powerLevelLoaded) {
                  card.dataset.powerLevelLoaded = "true";
                  setTimeout(
                    () => {
                      this.updatePowerLevelWithStats(id);
                      this.applyTypeClassToPowerLevels(card);
                      this.syncPowerLevelTypes(card);
                    },
                    Math.random() * 2000 + 500,
                  );
                }
              });
            this.applyTypeClassToPowerLevels(node);
            this.syncPowerLevelTypes(node);
          }
        });
      });
    });
    const cont = document.getElementById("pokemonContainer");
    if (cont) obs.observe(cont, { childList: true, subtree: true });
  };
  function applyPowerLevel(el, lvl, perf) {
    const value = el.querySelector(".power-value");
    const rating = el.querySelector(".performance-rating");
    if (!value || !rating) return;

    value.textContent = `${lvl}%`;
    rating.textContent = perf.rating;
    const keptTypes = [...el.classList].filter((c) => c.startsWith("type-"));
    el.className = ["power-level", ...keptTypes, perf.class].join(" ");
  }

  // Das Power-Level haengt allein an der ID (siehe calculatePowerLevel: es
  // leitet Basiswerte, IVs und Level aus der ID ab). Frueher wurde dafuer pro
  // Karte das komplette Pokemon nachgeladen - ein HTTP-Request fuer nichts.
  PGF.updatePowerLevelWithStats = function (id) {
    const lvl = this.calculatePowerLevel({ id });
    const perf = this.getPerformanceRating(lvl);
    document
      .querySelectorAll(`[data-pokemon-id="${id}"] .power-level`)
      .forEach((el) => applyPowerLevel(el, lvl, perf));
    this.syncPowerLevelTypes();
  };
})();
