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

## Endpoints

| URL                         | Zweck                          |
| --------------------------- | ------------------------------ |
| `/api/health/`              | Health-Check (`{"status":"ok"}`) |
| `/api/docs/`                | Swagger-UI (API testen)        |
| `/api/schema/`              | OpenAPI-Schema (YAML)           |
| `/admin/`                   | Django-Admin                   |

## Stand

M1 (Backend-Gerüst): Django + DRF + Health-Endpoint + Swagger + CORS.
Nächste Schritte siehe Meilensteine M2–M4 auf GitHub.
