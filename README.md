# Pokédex New

![Pokémon](https://img.shields.io/badge/Pok%C3%A9mon-Pok%C3%A9dex-ffcb05?style=for-the-badge&logo=pokemon&logoColor=2a75bb)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-f7df1e?style=for-the-badge&logo=javascript&logoColor=111)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=fff)
![Django](https://img.shields.io/badge/Django-REST%20Framework-092e20?style=for-the-badge&logo=django&logoColor=fff)
![Status](https://img.shields.io/badge/Status-Lernprojekt-4c8bf5?style=for-the-badge)

Ein moderner Pokédex mit Team-Builder, Team-Analyse, Pokémon-Vergleich, Battle-Simulator, Gym-Challenge und optionaler KI-Unterstützung über das Django-Backend.

---

## Inhaltsverzeichnis

- [Über das Projekt](#über-das-projekt)
- [Highlights](#highlights)
- [Features](#features)
- [Demo-Vorschau](#demo-vorschau)
- [Screenshots](#screenshots)
- [Technologien](#technologien)
- [Installation](#installation)
- [Konfiguration](#konfiguration)
- [Projektstruktur](#projektstruktur)
- [Lokale Speicherung](#lokale-speicherung)
- [API und KI](#api-und-ki)
- [Bekannte Einschränkungen](#bekannte-einschränkungen)
- [Roadmap](#roadmap)
- [Weiterführende Doku](#weiterführende-doku)
- [Lizenz](#lizenz)

---

## Über das Projekt

`Pokedex New` besteht aus zwei Teilen: einem statischen Frontend, das ein kleiner Express-Server ausliefert, und einem Django-Backend. Das Backend cached die PokéAPI serverseitig, stellt die KI-Endpunkte bereit und speichert mit Konto Team, Favoriten, Presets, Orden und Kampfhistorie in der Datenbank. Ohne Konto bleiben diese Daten im `localStorage` des Browsers – die App läuft dann genauso, nur ohne Geräte-Sync.

Die KI-Provider (Groq, Mistral, Gemini, OpenRouter) werden ausschließlich vom Backend angesprochen; API-Keys tauchen nie im Frontend auf.

**Projektstatus:** Stand 18.07.2026

## Highlights

| Bereich | Beschreibung |
| --- | --- |
| Pokédex | Suche, Typ-Filter, Pagination, Load-More und Detailansichten |
| Team-Builder | Aktives 6er-Team mit Drag-and-Drop, Slot-Replacement und Offcanvas |
| Team-Analyse | Statische Checks für Coverage, Schwächen und Team-Zusammensetzung |
| KI-Unterstützung | Optionale Teamberatung und Strategiehilfen über das Django-Backend |
| Battle-System | 1v1-Battle-Simulator, Battle-Log, Export und Gym-Challenge |
| Persistenz | Favoriten, Ratings, Notizen, Presets und Battle-Historie im Browser |

## Features

### Pokédex und Oberfläche

| Feature | Status |
| --- | --- |
| Pokémon-Daten aus der PokéAPI laden | Fertig |
| Suche mit Dropdown-Vorschlägen | Fertig |
| Filter nach Typ, Favoritenstatus und Bewertung | Fertig |
| Karten- und Detailansichten | Fertig |
| Responsive Navigation und mobiles Filter-Menü | Fertig |
| Power-/Strength-Anzeigen und GO-inspirierte Zusatzfunktionen | Fertig |

### Team-System

| Feature | Status |
| --- | --- |
| Team-Offcanvas mit Mini-Cards und Counter | Fertig |
| Active-Team-Builder mit sechs festen Slots | Fertig |
| Drag-and-Drop für Team-Zusammenstellung | Fertig |
| Slot-Replacement bei vollem Team | Fertig |
| Synchronisation zwischen Builder, Offcanvas und `localStorage` | Fertig |
| Statusmeldungen für Team-Änderungen | Fertig |

### Team-Modal und Presets

| Feature | Status |
| --- | --- |
| Aktuelles Team anzeigen | Fertig |
| Einzelne Pokémon entfernen | Fertig |
| Team mischen | Fertig |
| Nicht-Favoriten gesammelt entfernen | Fertig |
| Team als JSON exportieren | Fertig |
| Team über Share API oder Clipboard teilen | Fertig |
| Team-Presets speichern | Teilweise |

### Analyse, KI und Battle

| Feature | Status |
| --- | --- |
| Statische Team-Analyse | Fertig |
| KI-Teamberatung im Team-Builder | Fertig |
| KI-gestützte Analyse mit Provider-Fallback | Fertig |
| Pokémon-Vergleich im Modal | Fertig |
| 1v1-Battle-Simulator mit Rundensystem | Fertig |
| Auto-Play und Battle-Log-Export | Fertig |
| Gym-Challenge gegen generierte Gegnerteams | Fertig |
| Lokale Battle-Statistiken mit Win-Rate, Damage und MVP | Fertig |

## Demo-Vorschau

### Hauptworkflow

```mermaid
flowchart LR
  A[Pokédex durchsuchen] --> B[Pokémon öffnen]
  B --> C[Bewerten oder favorisieren]
  B --> D[Zum Team hinzufügen]
  D --> E[Team analysieren]
  E --> F[Battle simulieren]
  F --> G[Gym-Challenge spielen]
```

### Desktop-Skizze

```text
┌──────────────────────────────────────────────────────────────┐
│                         POKÉDEX NEW                          │
│        Suche, Typ-Filter, Favoriten, Ratings, Power           │
├──────────────────────────────────────────────────────────────┤
│ [Search Pokémon...] [Type] [Favorites] [Rating] [Load More]   │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ #001     │ │ #004     │ │ #007     │ │ #025     │          │
│  │ Bulbasaur│ │Charmander│ │ Squirtle │ │ Pikachu  │          │
│  │ + Team   │ │ + Team   │ │ Compare  │ │ Details  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├──────────────────────────────────────────────────────────────┤
│ Team-Builder │ Analyse │ Battle-Simulator │ Gym-Challenge     │
└──────────────────────────────────────────────────────────────┘
```

## Screenshots

Die Screenshots werden mit Playwright aus der laufenden App erzeugt:

```powershell
npm run screenshots
```

| Ansicht | Vorschau |
| --- | --- |
| Pokédex Desktop | ![Pokédex Desktop](./assets/screenshots/pokedex-desktop.png) |
| Pokémon Detail | ![Pokémon Detail](./assets/screenshots/pokemon-detail.png) |
| Team-Builder | ![Team-Builder](./assets/screenshots/team-builder.png) |
| Gym-Challenge | ![Gym-Challenge](./assets/screenshots/gym-challenge.png) |
| Mobile Ansicht | ![Mobile Ansicht](./assets/screenshots/mobile-view.png) |

## Technologien

| Technologie | Verwendung |
| --- | --- |
| HTML5 | Grundstruktur der App |
| CSS3 | Layout, Responsive Design, Karten, Modal- und Battle-UI |
| JavaScript ES6+ | Frontend-Logik, Module, State, DOM-Updates |
| Node.js | Lokale Laufzeit für den Frontend-Server |
| Express | Statische Auslieferung des Frontends |
| Django + DRF | Backend: PokéAPI-Cache, Token-Auth, Konto-Daten, KI-Proxy |
| PokeAPI | Pokémon-Daten, Typen, Stats und Sprites (über den Backend-Cache) |
| Groq / Mistral / Gemini / OpenRouter | Optionale KI-Provider für Analyse und Strategie |

## Installation

### Voraussetzungen

- Node.js
- npm
- Optional: API-Key für mindestens einen KI-Provider

### Setup

Frontend:

```bash
npm install
```

```powershell
Copy-Item .env.example .env
```

Backend (einmalig):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
```

### Starten

Beide Server laufen getrennt:

```bash
npm start                  # Frontend auf http://localhost:3000
```

```powershell
cd backend
python manage.py runserver # Backend auf http://127.0.0.1:8000
```

## Konfiguration

Die Datei `.env.example` liegt im Projektwurzelverzeichnis und wird vom Django-Backend gelesen (`backend/config/settings.py`); nur `PORT` betrifft den Express-Server:

```env
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.1-8b-instant
MISTRAL_API_KEY=your-mistral-api-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct
AI_PROVIDER=
PORT=3000
```

Mindestens ein AI-Key ist nur nötig, wenn KI-Funktionen genutzt werden sollen. Die reine Pokédex- und Team-Funktionalität läuft ohne AI-Key.

## Projektstruktur

| Datei / Bereich | Zweck |
| --- | --- |
| `index.html` | Grundlayout und feste Ladereihenfolge der Frontend-Skripte |
| `js/app/*` | Frontend-Logik: klassische Skripte mit gemeinsamem globalem Scope |
| `server.js` | Express-Server für die statische Auslieferung |
| `assets/css/*` | Modulare Styles für Pokédex, Karten, Team, Analyse und Battle |
| `assets/icon/*` | SVG-Icons für Pokémon-Typen |
| `assets/img/9.png` | Favicon / Pokéball-Asset |
| `backend/` | Django-Backend: PokéAPI-Cache, Auth, Konto-Daten, KI-Endpoints |
| `test/*` | Frontend-Unit-Tests (`node --test`) |
| `tools/capture-screenshots.js` | Playwright-Skript für die README-Screenshots |

## Lokale Speicherung

Die App speichert nutzerbezogene Daten im Browser:

| Key | Inhalt |
| --- | --- |
| `pokemonTeam` | Aktuelles Team |
| `pokemonFavorites` | Favorisierte Pokémon |
| `pokemonTeamPresets` | Gespeicherte Team-Presets |
| `pokemonBattleHistory` | Verlauf und Statistiken der Kämpfe |
| `pokemonBadges` | Gewonnene Arena-Orden |
| `pokedexToken` | Login-Token für das Backend (nur mit Konto) |
| `pokedexIntroGesehen` | Merker, dass das Intro schon gezeigt wurde |

Mit Konto werden Team, Favoriten, Presets, Orden und Kämpfe zusätzlich auf dem Server gespeichert (`js/app/sync.js`) und beim Login auf andere Geräte übernommen.

## API und KI

### PokéAPI (über den Backend-Cache)

Das Frontend fragt die PokéAPI nicht direkt an, sondern geht über das Django-Backend, das die Antworten serverseitig cached:

```text
GET http://127.0.0.1:8000/api/pokemon/?offset=0&limit=20
GET http://127.0.0.1:8000/api/pokemon/by-type/{type}/
GET http://127.0.0.1:8000/api/pokeapi/pokemon/{id}
```

Das spart wiederholte Browser-Requests an `https://pokeapi.co` und liefert Listen samt Details in einer Antwort.

### KI (im Django-Backend)

Die KI-Funktionen – Team-Analyse, Strategieauswertung, Kampfkommentare und Dialoge – laufen komplett im Backend. Für jede gibt es einen eigenen Endpoint (`/api/ai/team-advice`, `/api/ai/battle-commentary`, `/api/ai/gym-dialogue`, `/api/ai/team-analysis`, `/api/ai/gym-strategy`). Das Frontend schickt nur Rohdaten wie das Team; den Prompt baut Django (`backend/api/prompts.py`).

Unterstützte Provider:

- Groq
- Mistral
- Gemini
- OpenRouter

Das Backend fragt der Reihe nach jeden Anbieter, für den ein Key hinterlegt ist – `AI_PROVIDER` (`groq`, `mistral`, `gemini` oder `openrouter`) zuerst, sonst Groq. Antwortet einer nicht, übernimmt der nächste.

Die KI ist optional. Ohne konfigurierte API-Keys fallen die KI-Funktionen weg, während die übrigen App-Funktionen weiter nutzbar bleiben. Details: [backend/README.md](backend/README.md).

## Bekannte Einschränkungen

- Notizen sind im Backend-Datenmodell vorhanden, im Frontend aber noch nicht sichtbar.
- Team-Presets haben eine vollständige Verwaltung: Unter dem Team-Builder lassen sie sich speichern, laden und löschen. Mit Konto liegen sie auf dem Server.
- Die Frontend-Tests decken bisher nur die Kampf-Logik ab; das Backend hat eine eigene Test-Suite (`python manage.py test api`).
- Das Backend läuft lokal mit SQLite und Entwickler-Settings; env-basierte Settings und Deployment-Härtung sind als M4 (DevSecOps) geplant.

## Roadmap

| Status | Thema |
| --- | --- |
| Fertig | Preset-Verwaltung mit Speichern, Laden und Löschen |
| Geplant | Sichtbare Notizfunktion in Detailansichten |
| Fertig | Automatisierte README-Screenshots mit Playwright |
| Teilweise | Automatisierte Frontend-Tests (Kampf-Logik fertig, Team/Storage offen) |
| Geplant | M4 DevSecOps: env-basierte Settings, Deployment-Konzept, CI |

## Weiterführende Doku

- [FEATURES.md](./FEATURES.md) - ausführliche Feature-Übersicht
- [.env.example](./.env.example) - Beispielkonfiguration für den lokalen Server

## Lizenz

Das Projekt ist zu Lernzwecken entstanden. Pokémon und zugehörige Marken gehören Nintendo, Game Freak und The Pokémon Company. Die Pokémon-Daten werden über die PokéAPI bezogen.
