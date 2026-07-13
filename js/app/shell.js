/* App-Hülle: Tabs, Konto-Demo, Start. */

/* ---- Tabs ---- */
function kontextFuerTab(view) {
  if (view === "team") return dominantType();
  if (view === "fight") return "rock"; // Farbe des Gegners
  if (view === "you") return null;
  return activeType; // Pokédex: der gewählte Typ, sonst Himmel
}

function activateTab(tab) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.setAttribute("aria-selected", "false"));
  tab.setAttribute("aria-selected", "true");
  document
    .querySelectorAll(".view")
    .forEach((v) => v.removeAttribute("data-active"));
  document
    .querySelector(`.view[data-view="${tab.dataset.view}"]`)
    .setAttribute("data-active", "");
  setContext(kontextFuerTab(tab.dataset.view));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.onclick = () => activateTab(tab);
});

/* Der Konto-Knopf oben rechts führt in den Konto-Bereich. */
$("accountBtn").onclick = () =>
  document.querySelector('.tab[data-view="you"]').click();

loadDex();
