/* Konto-Bereich: echtes Anmelden, Registrieren, Abmelden und die
   Statistik-Kacheln. Die Auth-Logik liegt in auth.js. */

let kontoModus = "login";

function kontoText(an) {
  return an
    ? "Dein Team liegt auf dem Server. Sobald die Trainerkämpfe starten, treten andere gegen genau dieses Team an."
    : "Mit Konto liegt dein Team auf dem Server — auf jedem Gerät dasselbe. Und sobald die Trainerkämpfe da sind, treten andere gegen genau dieses Team an.";
}

function kontoStatsAnzeigen() {
  const kaempfe = historieVomServer || historieLokal();
  const siege = kaempfe.filter((e) => e.result === "win").length;
  const quote = kaempfe.length ? Math.round((siege / kaempfe.length) * 100) : 0;
  $("accountStats").innerHTML = `
    <div class="stat frost"><div class="stat__n">${kaempfe.length}</div><div class="stat__l">Kämpfe</div></div>
    <div class="stat frost"><div class="stat__n">${quote}%</div><div class="stat__l">Siege</div></div>
    <div class="stat frost"><div class="stat__n">${favorites.size}</div><div class="stat__l">Favoriten</div></div>`;
}

function kontoAnzeigen() {
  const an = istAngemeldet();
  $("accountName").textContent = an ? authUser : "Anmelden";
  $("accountTitle").textContent = an ? `Hallo, ${authUser}` : "Melde dich an";
  $("accountText").textContent = kontoText(an);
  $("kontoButtons").hidden = an;
  $("kontoLogout").hidden = !an;
  $("accountStats").hidden = !an;
  if (an) {
    $("kontoForm").hidden = true;
    kontoStatsAnzeigen();
  }
}

function kontoFormZeigen(modus) {
  kontoModus = modus;
  $("kontoForm").hidden = false;
  $("kontoSubmit").textContent =
    modus === "login" ? "Anmelden" : "Konto anlegen";
  $("kontoFehler").hidden = true;
  $("kontoName").focus();
}

async function kontoSenden() {
  const name = $("kontoName").value.trim();
  const passwort = $("kontoPasswort").value;
  try {
    if (kontoModus === "login") await anmelden(name, passwort);
    else await registrieren(name, passwort);
    $("kontoForm").reset();
    toast(`Willkommen, ${authUser}!`, false);
  } catch (fehler) {
    $("kontoFehler").textContent = fehler.message || "Das hat nicht geklappt.";
    $("kontoFehler").hidden = false;
  }
}

$("kontoLoginBtn").onclick = () => kontoFormZeigen("login");
$("kontoRegisterBtn").onclick = () => kontoFormZeigen("register");
$("kontoForm").onsubmit = (e) => {
  e.preventDefault();
  kontoSenden();
};
$("kontoLogout").onclick = async () => {
  await abmelden();
  toast("Abgemeldet. Deine Daten bleiben in diesem Browser.", false);
};

kontoAnzeigen();
