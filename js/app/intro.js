/* Das Intro: begrüßt neue Besucher und bietet Konto oder "ohne Konto".
   Es erscheint nur, solange kein Token gespeichert ist und der Besucher
   nicht schon bewusst ohne Konto weitergemacht hat. */

const INTRO_KEY = "pokedexIntroGesehen";
let introModus = "login";

function introSchliessen() {
  localStorage.setItem(INTRO_KEY, "1");
  const el = $("intro");
  el.classList.add("intro--weg");
  setTimeout(() => (el.hidden = true), 450);
}

function introFormZeigen(modus) {
  introModus = modus;
  $("introWahl").hidden = true;
  $("introForm").hidden = false;
  $("introSubmit").textContent =
    modus === "login" ? "Anmelden" : "Konto anlegen";
  $("introFehler").hidden = true;
  $("introName").focus();
}

async function introSenden() {
  const name = $("introName").value.trim();
  const passwort = $("introPasswort").value;
  try {
    if (introModus === "login") await anmelden(name, passwort);
    else await registrieren(name, passwort);
    introSchliessen();
    toast(`Willkommen, ${authUser}!`, false);
  } catch (fehler) {
    $("introFehler").textContent = fehler.message || "Das hat nicht geklappt.";
    $("introFehler").hidden = false;
  }
}

$("introLogin").onclick = () => introFormZeigen("login");
$("introRegister").onclick = () => introFormZeigen("register");
$("introForm").onsubmit = (e) => {
  e.preventDefault();
  introSenden();
};
$("introOhne").onclick = introSchliessen;

/* Anzeigen nur, wenn weder Token noch "ohne Konto"-Entscheidung da ist. */
if (!authToken && !localStorage.getItem(INTRO_KEY)) $("intro").hidden = false;
