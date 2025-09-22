// Mutation observer + async stat update
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
                  setTimeout(() => {
                    this.updatePowerLevelWithStats(id);
                    this.applyTypeClassToPowerLevels(card);
                    this.syncPowerLevelTypes(card);
                  }, Math.random() * 2000 + 500);
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
  PGF.updatePowerLevelWithStats = async function (id) {
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const data = await res.json();
      if (data.stats) {
        const lvl = this.calculatePowerLevel(data);
        const perf = this.getPerformanceRating(lvl);
        document
          .querySelectorAll(`[data-pokemon-id="${id}"] .power-level`)
          .forEach((el) => {
            const v = el.querySelector(".power-value");
            const r = el.querySelector(".performance-rating");
            if (v && r) {
              v.textContent = `${lvl}%`;
              r.textContent = perf.rating;
              const keep = [...el.classList].filter((c) =>
                c.startsWith("type-")
              );
              el.className = ["power-level", ...keep, perf.class].join(" ");
            }
          });
        this.syncPowerLevelTypes();
      }
    } catch (e) {
      console.error("Power-Level Update fehlgeschlagen", id, e);
    }
  };
})();
