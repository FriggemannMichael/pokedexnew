/* Professor Eich: erst der lokale Satz, dann der echte Rat aus der KI
   (/api/ai/team-advice, Prompt und Anbieterwahl liegen im Backend).
   Antwortet die KI nicht, bleibt der lokale Satz einfach stehen. */

let eichTimer = null;
let eichLetzterStand = "";

/** Der lokale Satz – sofort da, auch ganz ohne Backend. */
function eichSatz() {
  return team.length >= 6
    ? "Sechs von sechs. Dein Team steht — schau dir an, welche Typen es abdeckt."
    : `Noch ${6 - team.length} ${6 - team.length === 1 ? "Platz" : "Plätze"} frei. Achte darauf, verschiedene Typen zu mischen.`;
}

/** Nur die Felder, die die KI braucht – der Rest bläht den Prompt auf. */
function teamFuerKi() {
  return team.map((p) => ({
    id: p.id,
    name: anzeigename(p),
    types: p.types,
    stats: p.stats,
  }));
}

async function eichAnfrage() {
  const res = await fetch(`${BACKEND}/api/ai/team-advice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team: teamFuerKi(), staticAnalysis: null }),
  });
  if (!res.ok) throw new Error(String(res.status));
  const text = String((await res.json())?.text || "").trim();
  if (!text) throw new Error("Leere Antwort");
  return text;
}

async function eichVomProfessor() {
  const stand = JSON.stringify(team.map((p) => p.id));
  if (stand === eichLetzterStand) return;
  try {
    const text = await eichAnfrage();
    eichLetzterStand = stand;
    $("eichText").textContent = text;
  } catch {
    $("eichText").textContent = eichSatz(); // KI nicht erreichbar – der lokale Satz
  }
}

/** Nach jeder Team-Änderung: Satz sofort, KI mit Verzögerung
    (nicht bei jedem Klick eine Anfrage – Rate-Limit ist 30/min). */
function eichAktualisieren() {
  $("eichText").textContent = eichSatz();
  clearTimeout(eichTimer);
  if (team.length) eichTimer = setTimeout(eichVomProfessor, 1500);
}

/* Der Analysieren-Knopf fragt sofort und sichtbar nach. */
$("teamAnalysieren").onclick = () => {
  if (!team.length) {
    toast("Stell erst ein Team zusammen.", false);
    return;
  }
  eichLetzterStand = ""; // auch bei unverändertem Team neu fragen
  $("eichText").textContent = "Professor Eich denkt nach …";
  eichVomProfessor();
};
