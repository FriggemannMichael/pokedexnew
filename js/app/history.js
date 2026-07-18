/* Kampf-Bereich: die echte Historie – lokal aus dem Browser, angemeldet
   vom Server (/api/battles). Das Kampfsystem selbst zieht in einer
   eigenen Phase in die neue Oberfläche um. */

let historieVomServer = null; // null = nicht angemeldet -> lokale Historie
let historyAlleZeigen = false;

function pillHTML(eintrag) {
  return eintrag.result === "win"
    ? '<span class="pill pill--win">Sieg</span>'
    : '<span class="pill pill--loss">Niederlage</span>';
}

function kampfZeile(eintrag) {
  const gegner = escHtml(eintrag.gymLeader?.name || "Unbekannt");
  const schaden = Number(eintrag.totalDamageDealt || 0);
  const zuege = Number(eintrag.totalTurns || 0);
  const zeile = document.createElement("div");
  zeile.className = "fight";
  zeile.innerHTML = `
    ${pillHTML(eintrag)}
    <span>gegen <strong>${gegner}</strong></span>
    <span class="hint" style="margin-left: auto">${schaden} Schaden · ${zuege} Züge</span>`;
  return zeile;
}

function historieAnzeigen() {
  const eintraege = historieVomServer || historieLokal();
  const box = $("historyListe");
  box.innerHTML = eintraege.length
    ? ""
    : `<p class="hint">Noch keine Kämpfe. Fordere einen Arenaleiter heraus!</p>`;
  const liste = historyAlleZeigen ? eintraege : eintraege.slice(0, 5);
  liste.forEach((e) => box.append(kampfZeile(e)));
}

async function historiePull() {
  const data = await apiAbruf("/battles");
  historieVomServer = data.battles || [];
  historieAnzeigen();
  kontoStatsAnzeigen();
}

$("historyAlle").onclick = () => {
  historyAlleZeigen = !historyAlleZeigen;
  $("historyAlle").textContent = historyAlleZeigen
    ? "Weniger anzeigen"
    : "Alle ansehen";
  historieAnzeigen();
};

/** Ein geschlagener Kampf: lokal ablegen, angemeldet auch ins Konto. */
function historieEintragen(eintrag) {
  const liste = historieLokal();
  liste.unshift(eintrag);
  historieLokalSpeichern(liste);
  if (istAngemeldet())
    apiAbruf("/battles", {
      method: "POST",
      body: JSON.stringify({ battle: eintrag }),
    })
      .then((data) => {
        historieVomServer = data.battles || historieVomServer;
        historieAnzeigen(); // die Serverliste enthaelt den Kampf jetzt auch
      })
      .catch(() => {});
  historieAnzeigen();
  kontoStatsAnzeigen();
  if (istAngemeldet()) trainerLaden(); // die eigene Bilanz in der Rangliste
}

historieAnzeigen();
