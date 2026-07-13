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
| `/api/ai` (POST)                 | KI-Proxy (Chat-Anfrage, Key bleibt im Backend)     |
| `/api/ai/ping`                   | Prüft, ob der KI-Proxy bereit ist                  |
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

## Wie der KI-Proxy funktioniert

Ein API-Key darf **niemals** ins Frontend – im Browser könnte ihn jeder
auslesen. Das Frontend schickt seine Anfrage darum an `/api/ai`, und erst
`backend/api/ai.py` hängt den Key an und spricht mit dem Anbieter.

Die Keys stehen in der `.env` im Projektwurzelverzeichnis (eine Ebene über
`backend/`) – dieselbe Datei, die das Frontend schon benutzt hat:

```env
GROQ_API_KEY=...
GEMINI_API_KEY=...
MISTRAL_API_KEY=...
OPENROUTER_API_KEY=...
# Standard-Anbieter, wenn das Frontend keinen nennt; leer = groq
AI_PROVIDER=gemini
```

Unterstützt werden Groq, OpenRouter, Mistral und Gemini. Die ersten drei
sprechen das OpenAI-Protokoll; Geminis abweichendes Antwortformat wird
zurückübersetzt, damit das Frontend überall dasselbe liest.

Welchen der vier eine Anfrage nimmt, entscheidet das Frontend: Es schickt
`"provider": "gemini"` mit, und `AI_PROVIDER` greift nur, wenn nichts (oder
ein unbekannter Name) mitkommt. Das ist wichtig, weil das Frontend bei einem
Ausfall der Reihe nach die anderen Anbieter durchprobiert – würde `AI_PROVIDER`
den Wunsch überstimmen, liefen alle Versuche wieder in denselben Fehler.

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
