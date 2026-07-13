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
| `/api/docs/`                     | Swagger-UI (API testen)                            |
| `/api/schema/`                   | OpenAPI-Schema (YAML)                              |
| `/admin/`                        | Django-Admin (zeigt auch den Cache-Inhalt)         |

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
