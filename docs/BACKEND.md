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

M1 ist gebaut: Django, Django REST Framework, Health-Endpoint, Swagger/OpenAPI
und CORS liegen unter `backend/`. Die naechsten Schritte sind M2 bis M4:
PokeAPI-/KI-Proxy ins Backend umziehen, Login und echte Persistenz einfuehren
sowie Docker, CI/CD, Deployment und Security vorbereiten.
