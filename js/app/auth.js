/* Konto-Verwaltung: Token-Auth gegen das Django-Backend (/api/auth).
   Nach dem Login schickt das Backend einen Token; der wandert in den
   localStorage und hängt an jeder persönlichen Anfrage
   (Header "Authorization: Token ..."). Ohne Login läuft die App weiter –
   dann bleiben die Daten nur in diesem Browser. */

const TOKEN_KEY = "pokedexToken";
let authToken = localStorage.getItem(TOKEN_KEY) || "";
let authUser = "";

const istAngemeldet = () => Boolean(authToken && authUser);

const authHeaders = () =>
  authToken ? { Authorization: `Token ${authToken}` } : {};

async function authFehlertext(res) {
  try {
    return (await res.json())?.detail || `Fehler ${res.status}`;
  } catch {
    return `Fehler ${res.status}`;
  }
}

async function authPost(pfad, body) {
  const res = await fetch(`${BACKEND}/api/auth${pfad}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(await authFehlertext(res));
  return res.status === 204 ? null : res.json();
}

function sessionStart(data) {
  authToken = data.token;
  authUser = data.username;
  localStorage.setItem(TOKEN_KEY, authToken);
  kontoAnzeigen();
  syncNachLogin();
}

function sessionEnde() {
  authToken = "";
  authUser = "";
  localStorage.removeItem(TOKEN_KEY);
  historieVomServer = null; // ab jetzt zählt wieder die lokale Historie
  kontoAnzeigen();
  historieAnzeigen();
  ranglisteLeeren();
}

async function anmelden(name, passwort) {
  sessionStart(
    await authPost("/login", { username: name, password: passwort }),
  );
}

async function registrieren(name, passwort) {
  sessionStart(
    await authPost("/register", { username: name, password: passwort }),
  );
}

async function abmelden() {
  try {
    await authPost("/logout");
  } catch {
    /* Backend aus – die Sitzung endet trotzdem lokal */
  }
  sessionEnde();
}

/** Beim Seitenstart: Gilt der gespeicherte Token noch? */
async function sessionWiederherstellen() {
  if (!authToken) return;
  try {
    const res = await fetch(`${BACKEND}/api/auth/me`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(String(res.status));
    authUser = (await res.json()).username;
    kontoAnzeigen();
    syncNachLogin();
  } catch {
    sessionEnde(); // Token abgelaufen oder Backend aus
  }
}
