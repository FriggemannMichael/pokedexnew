# Pokedex Backend (Django)

Django-Backend für den Pokédex. Architektur & Plan: siehe
[../docs/BACKEND.md](../docs/BACKEND.md).

## Schnellstart (lokal)

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Das Backend läuft dann auf <http://127.0.0.1:8000>. Das Frontend startest du
getrennt davon mit `npm start` (Port 3000).

## Endpoints

| URL                              | Zweck                                              |
| -------------------------------- | -------------------------------------------------- |
| `/api/health/`                   | Health-Check (`{"status":"ok"}`)                   |
| `/api/pokemon/`                  | Eine Seite fertiger Pokémon (`?offset=0&limit=20`) |
| `/api/pokemon/by-type/<typ>/`    | Dasselbe, gefiltert auf einen Typ (z.B. `fire`)    |
| `/api/pokeapi/<pfad>`            | Gecachter Durchreicher, z.B. `/api/pokeapi/move/tackle` |
| `/api/ai/ping`                   | Prüft, ob die KI bereit ist                        |
| `/api/ai/team-advice` (POST)     | Professor Eichs Rat zum Team (Text)                |
| `/api/ai/battle-commentary` (POST) | Kommentar zu einem Spielzug (Text)               |
| `/api/ai/gym-dialogue` (POST)    | Spruch des Arenaleiters (Text, max. 12 Wörter)     |
| `/api/ai/team-analysis` (POST)   | Große Team-Analyse (JSON)                          |
| `/api/ai/gym-strategy` (POST)    | Battleplan gegen ein Arena-Team (JSON)             |
| `/api/auth/register` (POST)      | Konto anlegen, gibt gleich den Token zurück        |
| `/api/auth/login` (POST)         | Anmelden, gibt den Token zurück                    |
| `/api/auth/logout` (POST)        | Token löschen                                      |
| `/api/auth/me`                   | Gilt der Token noch, und zu wem gehört er?         |
| `/api/team` (GET/PUT)            | Team des angemeldeten Nutzers lesen/speichern      |
| `/api/favorites` (GET/PUT)       | Favorisierte Pokémon lesen/speichern               |
| `/api/notes` (GET/PUT)           | Persönliche Notizen lesen/speichern                |
| `/api/battles` (GET/POST/PUT/DELETE) | Kampfhistorie (anhängen, lesen, leeren)       |
| `/api/presets` (GET/PUT)         | Gespeicherte Teams lesen/speichern                 |
| `/api/docs/`                     | Swagger-UI (API testen)                            |
| `/api/schema/`                   | OpenAPI-Schema (YAML)                              |
| `/admin/`                        | Django-Admin (zeigt auch den Cache-Inhalt)         |

## Konto und gespeichertes Team (M3)

Ohne Login ändert sich nichts: Die App speichert wie bisher im localStorage des
Browsers. Wer sich anmeldet, bekommt sein Team zusätzlich auf dem Server.

**Login per Token** (`api/auth_views.py`). Beim Login legt Django einen
zufälligen Schlüssel an; das Frontend schickt ihn danach bei jeder Anfrage mit:

```http
Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b
```

Daran erkennt DRF den Nutzer und setzt `request.user`. Beim Logout wird der
Token gelöscht. Das Passwort selbst landet nie in der Datenbank – Django
speichert nur einen Hash (`create_user` erledigt das), und die Regeln dafür
stehen in `AUTH_PASSWORD_VALIDATORS`.

**Das Team** (`api/team_views.py`, Model `TeamMember`) speichert nur
Pokémon-Nummer und Platz. Name, Bild und Werte holt das Backend beim Abrufen aus
seinem PokéAPI-Cache und schickt sie im selben Format wie `/api/pokemon/` – das
Frontend kann das Team also direkt anzeigen. Sonst lägen dieselben Daten doppelt
in der Datenbank und würden veralten.

**Favoriten und Notizen** (`api/collection_views.py`, Models `Favorite` und
`Note`) funktionieren genauso: Das Frontend schickt seinen kompletten Stand, das
Backend ersetzt damit den alten. Ein leerer Notiztext löscht die Notiz.

Keine **Sterne**: Die rechnet die App aus den IVs aus (GO-Appraisal in
`script/pokemon-go-favorites.js`), sie sind keine Eingabe des Nutzers. Der Key
`pokemonRatings` im localStorage wird nirgends beschrieben – es gibt also nichts
zu speichern.

**Die Kampfhistorie** (`api/battle_views.py`, Models `BattleRecord` und
`BattleParticipant`) ist der einzige Bereich, der **wächst** statt ersetzt zu
werden: POST hängt einen Kampf an. Gespeichert wird bewusst der Stand von damals
(Name und Typen der Kämpfer) – ein Kampf ist Geschichte und darf sich nicht
ändern, nur weil das Team heute anders aussieht. Behalten werden die letzten 50,
wie im Frontend.

**Gespeicherte Teams** (`api/preset_views.py`, Models `TeamPreset` und
`TeamPresetMember`) funktionieren wie das Team: nur Nummern in der Datenbank,
Details aus dem Cache. Die Verwaltung dazu (speichern, laden, löschen) sitzt
unter dem Team-Builder (`script/team-presets-ui.js`) – **nicht** im alten
Team-Modal: Das ist unerreichbar, weil es ein `.drop-point`-Element sucht, das
es im heutigen Layout nicht mehr gibt. Es gehört gelöscht.

Im Frontend hängen daran `script/auth-service.js` (Token), `script/auth-ui.js`
(Konto-Leiste und Dialog) und die Sync-Skripte `team-sync.js`,
`pokedex-sync.js`, `battle-sync.js` und `preset-sync.js`: Beim Anmelden wird der Stand vom Server
geholt, jede Änderung wandert dorthin zurück. Ist auf dem Server noch nichts
gespeichert (frisch registriert), wandert der Stand aus dem Browser nach oben,
statt gelöscht zu werden.

Zwei Fallstricke, über die wir schon gestolpert sind:

- **Die Sync-Skripte hängen sich an `authService.onSession(...)`**, nicht ans
  Event `pokedex-auth-changed`. Beim Seitenstart feuert das Event, sobald der
  gespeicherte Token geprüft ist – wer dann noch nicht geladen war, verpasst es
  und synchronisiert nie. `onSession` läuft in beiden Fällen (und nie doppelt).
- **Sie schreiben immer zuerst in den localStorage.** `window.pokemonGoFeatures`
  gibt es beim Anmelden unter Umständen noch nicht; es liest seine Favoriten beim
  Erzeugen aus dem localStorage. So kommt der Stand vom Server auch dann an, wenn
  er vor der App da ist.

## Wie der Cache funktioniert

Jede Antwort der PokéAPI wird unter ihrem Pfad in der Tabelle `CachedResource`
gespeichert (`pokemon/25` → JSON). Danach kommt sie aus der Datenbank statt aus
dem Netz. Ein Eintrag gilt 7 Tage als frisch (`POKEAPI_CACHE_TTL_DAYS`).

Der Endpoint `/api/pokemon/` nimmt dem Browser dabei Arbeit ab: Er holt die
Liste **und** alle 20 Detailseiten selbst (parallel) und schickt sie fertig
aufbereitet zurück. Der Browser braucht dafür nur noch **eine** Anfrage statt 21.

## Wie die KI funktioniert

Ein API-Key darf **niemals** ins Frontend – im Browser könnte ihn jeder
auslesen. Deshalb spricht nur das Backend mit den KI-Anbietern.

Für jede KI-Funktion der App gibt es einen eigenen Endpoint. Das Frontend
schickt dorthin nur **Rohdaten** (das Team, den Spielzug, das Arena-Matchup),
und das Backend baut daraus den Prompt:

| Datei | Aufgabe |
| ----- | ------- |
| `api/prompts.py` | Was die KI gefragt wird (die Prompt-Texte) |
| `api/ai_views.py` | Die Endpoints, einer je KI-Funktion |
| `api/ai.py` | Wer gefragt wird: Anbieter, Keys, Fallback |

Früher baute das **Frontend** die Prompts und schickte fertige Nachrichten an
einen allgemeinen Proxy (`POST /api/ai`). Der ist entfallen: Wer die URL kannte,
konnte darüber beliebige Prompts auf Kosten des API-Keys stellen.

Die Keys stehen in der `.env` im Projektwurzelverzeichnis (eine Ebene über
`backend/`):

```env
GROQ_API_KEY=...
GEMINI_API_KEY=...
MISTRAL_API_KEY=...
OPENROUTER_API_KEY=...
# Wer zuerst gefragt wird; leer = groq
AI_PROVIDER=gemini
```

Unterstützt werden Groq, OpenRouter, Mistral und Gemini. Die ersten drei
sprechen das OpenAI-Protokoll; Geminis abweichendes Antwortformat wird
zurückübersetzt, damit das Frontend überall dasselbe liest.

**Fallback-Kette:** `ai.chat()` fragt der Reihe nach jeden Anbieter, für den ein
Key hinterlegt ist – `AI_PROVIDER` zuerst, dann die übrigen. Antwortet einer
nicht (kein Guthaben, Ausfall), übernimmt der nächste. Deshalb legt ein
aufgebrauchtes Gemini-Kontingent die KI nicht mehr lahm.

Es gilt ein **Rate-Limit von 30 Anfragen pro Minute und IP** (`api/throttling.py`).
Ohne das könnte eine einzige geöffnete Seite das Guthaben des Keys leerlaufen
lassen.

## Tests

```bash
python manage.py test api
```

Die Tests fragen weder die echte PokéAPI noch einen KI-Anbieter an (die
Netzwerk-Funktionen werden ersetzt) – sie laufen also schnell und auch ohne
Internet und ohne API-Keys.

## Stand

- **M1 – Backend-Gerüst:** fertig (Django, DRF, Health, Swagger, CORS).
- **M2 – Daten holen & cachen:** fertig. PokéAPI-Proxy mit Cache **und**
  KI-Proxy laufen im Backend. `server.js` liefert nur noch das Frontend aus.
- **M3 – Login & Speichern:** offen.
- **M4 – DevSecOps:** offen.
