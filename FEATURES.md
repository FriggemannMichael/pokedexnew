# Pokédex New – Feature-Übersicht

Stand: 18.07.2026

## Kurzfassung

Das Projekt ist ein interaktiver Pokédex mit Team-Management, Liga-Modus, Kampfsystem und optionaler KI-Unterstützung. Es besteht aus einem statischen Frontend (`index.html` + `js/app/*`, ausgeliefert von einem kleinen Express-Server) und einem Django-Backend, das die PokéAPI cached, die KI-Endpunkte bereitstellt und mit Konto die Nutzerdaten in der Datenbank hält. Die Datei beschreibt den aktuell im Code vorhandenen Stand.

## Aktive Kern-Features

### Pokédex und Navigation

- Pokédex-Raster mit Karten aus dem Backend-Cache (`/api/pokemon/`)
- Suche über ein vollständiges Namensverzeichnis (`/api/pokemon/names/`)
- Typ-Filter über ein Sheet mit allen 18 Typen, inklusive Kontext-Hintergrund
- Schrittweises Nachladen weiterer Pokémon (Load More)
- Favoriten direkt auf der Karte, lokal gespeichert und mit Konto synchronisiert
- Detailkarte (Sheet) mit demselben Umfang wie die Original-Detailkarte

### Team

- Team mit sechs Slots, gefüllt direkt aus dem Pokédex
- Professor-Eich-Hinweis zum Team, auf Wunsch mit echtem KI-Rat (`/api/ai/team-advice`)
- Gespeicherte Teams (Presets): lokal im Browser, mit Konto zusätzlich auf dem Server

### Liga und Kampf

- Liga-Modus: acht Arenen in fester Reihenfolge plus Champ, mit steigenden Leveln
- Orden sammeln; ein Sieg schaltet die nächste Arena frei
- Arena-Kampf: Spieler wählt Attacken (die vier besten je Pokémon, über den Backend-Cache), der Arenaleiter zieht zufällig
- Schadensformel mit STAB, Effektivität, Volltreffern, Statusstufen und Nebenwirkungen
- Arenaleiter-Dialoge mit optionaler KI-Unterstützung (`/api/ai/gym-dialogue`)
- Andere Trainer: echte Teams anderer Nutzer als Gegner plus Rangliste (`/api/trainers`)
- Kampfhistorie: lokal, mit Konto vom Server (`/api/battles`)

### Konto und Sync

- Intro für neue Besucher mit Wahl zwischen Konto und „ohne Konto"
- Registrieren, Anmelden und Abmelden über Token-Auth (`/api/auth`)
- Beim Anmelden gewinnt der Server-Stand; danach werden Team, Favoriten, Presets, Orden und Kämpfe laufend synchronisiert
- Konto-Bereich mit Statistik-Kacheln

### KI-Integration

- KI komplett im Django-Backend: Prompts, Anbieterwahl und Keys liegen dort
- Ein Endpoint je KI-Funktion (`/api/ai/team-advice`, `/api/ai/battle-commentary`, `/api/ai/gym-dialogue`, `/api/ai/team-analysis`, `/api/ai/gym-strategy`)
- Fallback-Kette über Groq, Mistral, Gemini und OpenRouter
- Rate Limiting für AI-Requests; ohne konfigurierte Keys fallen nur die KI-Funktionen weg

## Persistenz

Lokal im Browser (`localStorage`):

- `pokemonTeam`, `pokemonFavorites`, `pokemonTeamPresets`, `pokemonBattleHistory`, `pokemonBadges`
- `pokedexToken` (Login-Token), `pokedexIntroGesehen`

Mit Konto liegen Team, Favoriten, Notizen, Presets, Orden und Kampfhistorie zusätzlich in der Backend-Datenbank.

## Status-Tabelle

| Feature | Status | Kommentar |
| --- | --- | --- |
| Pokédex-Anzeige | Live | Karten und Detail-Sheet aus dem Backend-Cache |
| Suche und Typ-Filter | Live | Namensverzeichnis plus 18-Typen-Sheet |
| Favoriten | Live | Lokal, mit Konto auf dem Server |
| Team (6 Slots) | Live | Direkt aus dem Pokédex befüllt |
| Team-Presets | Live | Speichern, Laden, Löschen; mit Konto auf dem Server |
| KI-Teamberatung | Live | Professor Eich, `/api/ai/team-advice` |
| Liga mit Orden | Live | Acht Arenen plus Champ, steigende Level |
| Arena-Kampf | Live | Klickbare Moves, Schadensformel, Statusstufen |
| Andere Trainer | Live | Echte Teams als Gegner, Rangliste |
| Kampfhistorie | Live | Lokal, mit Konto vom Server |
| Konto und Sync | Live | Token-Auth, Server gewinnt beim Anmelden |
| Notizen | Teilweise | Backend-Datenmodell vorhanden, keine Frontend-UI |

## Technische Struktur

### Wichtige Einstiegspunkte

- `index.html`: Layout und feste Ladereihenfolge der Frontend-Skripte
- `js/app/*`: Frontend-Logik als klassische Skripte mit gemeinsamem globalem Scope
- `server.js`: Express-Server, liefert nur das Frontend aus
- `backend/`: Django-Backend (PokéAPI-Cache, Auth, Konto-Daten, KI)

### Modulbereiche (`js/app/`)

| Bereich | Dateien | Aufgabe |
| --- | --- | --- |
| Grunddaten | `config.js`, `storage.js`, `icons.js` | Zustand, lokale Ablage, Strich-Icons |
| Daten | `api.js` | Listen, Namensverzeichnis und Details über das Backend |
| Pokédex | `grid.js`, `type-filter.js`, `sheet.js` | Raster, Filter, Detailkarte |
| Team | `team.js`, `eich.js`, `presets.js` | Slots, KI-Rat, gespeicherte Teams |
| Kampf | `battle-data.js`, `battle-moves.js`, `battle.js`, `battle-ui.js` | Logik, Moves, Ablauf, Oberfläche |
| Liga | `liga.js`, `trainers.js`, `history.js` | Orden, andere Trainer, Historie |
| Konto | `auth.js`, `account.js`, `sync.js` | Token-Auth, Konto-Bereich, Server-Abgleich |
| Hülle | `shell.js`, `intro.js` | Tabs und Intro |

## Installation und Betrieb

Siehe [README.md](./README.md#installation) – Frontend (`npm start`) und Backend (`python manage.py runserver`) laufen getrennt.

## Bekannte Einschränkungen

- Ohne laufendes Backend zeigt der Pokédex nur einen kleinen Fallback-Datensatz.
- Die Notiz-Funktion ist im Backend vorbereitet, aber nicht als Frontend-UI ausgebaut.
- Kein Pokémon-Vergleich und keine Bewertungen mehr – diese Features der alten Oberfläche wurden beim UI-Umbau nicht übernommen.
