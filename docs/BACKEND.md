# Backend-Plan (Django)

Diese Datei erklärt **einfach**, warum dieses Projekt ein Backend bekommt, wie
es aufgebaut ist und in welchen Schritten es entsteht. Sie ist bewusst für
Einsteiger geschrieben.

## Worum geht es?

Der Pokédex war bisher **reines Frontend**: Der Browser holt sich alle Daten
direkt von der öffentlichen [PokéAPI](https://pokeapi.co/). Das funktioniert,
hat aber Nachteile (viele wiederholte Anfragen, keine echten Nutzer-Accounts,
Daten liegen nur lokal im Browser).

Deshalb kommt ein **Django-Backend** dazu. Es sitzt zwischen Browser und
PokéAPI und übernimmt das Holen, Cachen und Speichern.

## Architektur (ganz einfach)

```
   Browser (Frontend, bleibt wie es ist)
        │   fragt JSON an  (HTTP)
        ▼
   Django-Backend  ───►  PokéAPI / KI-Provider
   • REST-API (Django REST Framework)   (nur das Backend
   • Datenbank (SQLite)                  redet nach außen)
   • API-Doku (Swagger unter /api/docs)
```

**Ein Satz pro Vorteil:**

- **Cachen:** Das Backend holt Daten einmal und liefert sie schnell aus →
  weniger Anfragen an die PokéAPI.
- **Speichern:** Team, Favoriten, Ratings, Notizen und Battle-Historie landen
  in einer echten Datenbank statt nur im `localStorage`.
- **Doku:** Eine testbare API mit Swagger-Oberfläche – gut fürs Portfolio.

## Ordnerstruktur (Monorepo)

Frontend und Backend liegen im **gleichen Repo**:

```
pokedexnew/
├── (Frontend bleibt genau wo es ist)
├── backend/          ← das ganze Django lebt hier drin
│   ├── manage.py
│   ├── requirements.txt
│   └── config/       ← Django-Projekteinstellungen
│       └── ...
│   └── api/          ← unsere API-App (Endpoints)
└── docs/BACKEND.md   ← diese Datei
```

Das Frontend muss dafür **nicht** umgebaut werden.

## Tech-Stack (bewusst schlank gehalten)

| Baustein   | Wahl                       | Wofür                                  |
| ---------- | -------------------------- | -------------------------------------- |
| Framework  | Django + Django REST Framework | Web-Backend und REST-API           |
| Datenbank  | SQLite (lokal)             | Null-Setup zum Entwickeln              |
| API-Doku   | drf-spectacular (Swagger)  | API im Browser anschauen und testen    |
| CORS       | django-cors-headers        | Frontend darf das Backend aufrufen     |

Login (JWT), PostgreSQL, Docker und Deployment kommen **später** – Schritt für
Schritt, nicht alles auf einmal.

## Die Phasen (Meilensteine auf GitHub)

| Meilenstein            | Inhalt                                                       |
| ---------------------- | ----------------------------------------------------------- |
| **M1 – Backend-Gerüst** | Django + DRF + Health-Endpoint + Swagger + diese Doku        |
| **M2 – Daten holen & cachen** | PokéAPI-Proxy + KI-Proxy von Node nach Django umziehen |
| **M3 – Login & Speichern** | Accounts + Datenbank für Team/Favoriten/Ratings/Notizen  |
| **M4 – DevSecOps**      | Docker, CI/CD, Deployment, Security (nächster Kurs)         |

## Lokal starten (sobald M1 gebaut ist)

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

Dann im Browser:

- Health-Check: <http://127.0.0.1:8000/api/health/>
- API-Doku: <http://127.0.0.1:8000/api/docs/>

## Status

**M1 ist gebaut:** Django, Django REST Framework, Health-Endpoint,
Swagger/OpenAPI und CORS liegen unter `backend/`.

**M2 ist gebaut:** PokeAPI-Zugriff *und* KI-Anfragen laufen jetzt komplett ueber
das Django-Backend.

Konkret hat sich dadurch geaendert:

- Das Frontend spricht **nicht mehr direkt** mit der PokeAPI. Alle Zugriffe
  laufen ueber `script/utils/pokeapi-client.js` – die einzige Stelle, die die
  PokeAPI ueberhaupt noch kennt (als Notfall-Rueckfallebene, falls das Backend
  nicht laeuft).
- Das **Nachladen der Detailseiten** ist ins Backend gewandert: Frueher holte der
  Browser fuer die erste Seite 21 Ressourcen (1 Liste + 20 Details), heute
  genuegt **eine** Anfrage an `/api/pokemon/`.
- Die **KI** ist von Node (`server.js`) nach Django gezogen, samt Rate-Limit
  (30 Anfragen pro Minute und IP). Inzwischen liegen dort auch die **Prompts**
  (`backend/api/prompts.py`): Das Frontend schickt nur noch Rohdaten an einen
  Endpoint je KI-Funktion (`backend/api/ai_views.py`) und bekommt fertigen Text
  bzw. fertiges JSON zurueck. Faellt ein Anbieter aus, nimmt `backend/api/ai.py`
  automatisch den naechsten.
- Die alte, nirgends eingebundene `script/api.js` ist entfallen – ihre Logik
  (`createPokemonData`, Typ-Filter) steckt jetzt in `backend/api/transform.py`
  und `backend/api/views.py`.

**Node ist damit fast weg:** `server.js` liefert nur noch die statischen Dateien
aus (Port 3000). Express-Zusatzpakete (`cors`, `dotenv`, `node-fetch`) sind
entfallen.

## Beide Teile starten

```bash
# Terminal 1 – Backend (API, Cache, KI)
cd backend
.venv\Scripts\activate
python manage.py runserver        # http://127.0.0.1:8000

# Terminal 2 – Frontend
npm start                         # http://localhost:3000
```

Laeuft das Backend nicht, faellt das Frontend automatisch auf die oeffentliche
PokeAPI zurueck. Die KI-Funktionen sind dann still deaktiviert.

**Als Naechstes:** M3 (Login und echte Persistenz fuer Team, Favoriten, Ratings,
Notizen und Battle-Historie) und danach M4 (Docker, CI/CD, Deployment, Security).
