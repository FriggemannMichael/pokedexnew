# Pokedex New

Ein interaktiver Pokedex mit Team-Builder, Team-Analyse, Pokemon-Vergleich, Battle-Simulator, Gym-Challenge und optionaler KI-Unterstuetzung ueber einen lokalen Express-Server.

## Projektstatus

Stand: 19.03.2026

Die Anwendung laeuft als statische Frontend-App mit lokalem Node-/Express-Server. Der Server liefert die App aus und stellt einen AI-Proxy fuer Groq, Mistral und Gemini bereit. Ein grosser Teil des Zustands wird im Browser per `localStorage` gespeichert.

## Kernfunktionen

- Pokedex mit Suche, Typ-Filtern, Pagination und `Load More`
- Detailansichten fuer einzelne Pokemon
- Favoriten und Ratings mit lokaler Persistenz
- Power-/Strength-Anzeigen und GO-inspirierte Zusatzfunktionen
- Team-Offcanvas und `Active Team`-Builder mit 6 Slots
- Drag-and-Drop fuer Team-Zusammenstellung und Slot-Replacement
- Team-Modal mit Export-, Share- und Preset-Funktionen
- Team-Analyse mit statischen Checks und optionaler KI-Auswertung
- Vergleich von zwei Pokemon im Modal
- 1v1-Battle-Simulator mit Battle-Log und Export
- Gym-Challenge gegen generierte Gegnerteams mit Kampfhistorie
- AI-Dialoge und Strategiehilfen, wenn API-Keys oder Proxy verfuegbar sind

## Feature-Details

### Pokedex und UI

- Pokemon-Daten werden aus der PokeAPI geladen und fuer Karten- und Detailansichten aufbereitet
- Suche mit Dropdown-Vorschlaegen
- Filter nach Typ, Favoritenstatus und Bewertungsstufe
- Responsive Navigation und mobiles Filter-Menue

### Team-System

- Team-Offcanvas mit Mini-Cards und Team-Counter
- Separater Team-Builder mit sechs festen Slots
- Synchronisation zwischen Team-Builder, Offcanvas und `localStorage`
- Live-Hinweise und Statusmeldungen fuer Team-Aenderungen

### Team-Modal

- Uebersicht ueber aktuelles Team
- Entfernen einzelner Pokemon
- Team mischen
- Nicht-Favoriten gesammelt entfernen
- Team als JSON exportieren
- Team ueber Share API oder Clipboard teilen
- Team-Presets speichern

### Analyse und KI

- Statische Team-Analyse fuer Coverage, Schwaechen und Zusammensetzung
- KI-Teamberatung im Team-Builder
- KI-gestuetzte Team-Analyse mit Provider-Fallback
- Optionaler lokaler Proxy statt direktem Frontend-API-Zugriff

### Battle

- Pokemon-Vergleich mit direktem Start in den Battle-Simulator
- Battle-Simulator mit Rundensystem, Auto-Play und Log-Export
- Gym-Challenge mit Gegnerteam, Strategieauswertung und Kampfhistorie
- Lokale Battle-Statistiken mit Win-Rate, Damage und MVP-Auswertung

## Lokale Speicherung

Im Browser werden unter anderem folgende Daten gespeichert:

- `pokemonTeam`
- `pokemonFavorites`
- `pokemonRatings`
- `pokemonNotes`
- `pokemonTeamPresets`
- `pokemonBattleHistory`
- lokale AI-Key-Eintraege fuer Frontend-Nutzung ohne Proxy

## Projektstruktur

| Datei / Bereich | Zweck |
| --- | --- |
| `index.html` | Grundlayout, Filter, Offcanvas, Team-Modal, Team-Builder |
| `main.js` | Bootstrap und Initialisierung der Frontend-Module |
| `server.js` | Express-Server und AI-Proxy |
| `script/pokemon-*` | Pokedex, Karten, Detailansichten, GO-Features |
| `script/team-*` | Team-Builder, Team-Modal, Team-Analyse, Gym-Battle |
| `script/battle-*` | Battle-Simulator und Battle-Historie |
| `script/services/*` | API-, Storage-, State- und Service-Schicht |
| `js/ai-service.js` | Frontend-AI-Client fuer Kampfkommentare und Dialoge |

## Installation

1. Abhaengigkeiten installieren:
   ```bash
   npm install
   ```
2. `.env` auf Basis von `.env.example` anlegen
3. Optional mindestens einen AI-Key hinterlegen
4. Server starten:
   ```bash
   npm start
   ```
5. Anwendung im Browser unter `http://localhost:3000` oeffnen

## .env-Beispiel

```env
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.1-8b-instant
MISTRAL_API_KEY=your-mistral-api-key
PORT=3000
```

Hinweis: Der Server unterstuetzt im Code neben Groq und Mistral auch Gemini ueber den Proxy. In `.env.example` ist dafuer aktuell kein Beispielwert hinterlegt.

## Scripts

```bash
npm start
```

Startet den lokalen Express-Server und liefert die App unter `http://localhost:3000` aus.

## Technologien

- HTML5
- CSS3
- JavaScript (ES6+)
- Node.js
- Express
- PokeAPI
- Groq / Mistral / Gemini ueber lokalen Proxy

## Bekannte Einschraenkungen

- Notizen sind im Datenmodell und in Teilen der Logik vorhanden, aber nicht als voll ausgebaute Hauptfunktion sichtbar.
- Team-Presets koennen gespeichert werden, es gibt aber keine vollstaendige Preset-Verwaltung mit Laden und Loeschen.
- Das Projekt enthaelt aeltere und neuere Modulbereiche parallel; `main.js` initialisiert den aktuell genutzten Satz.

## Weiterfuehrende Doku

- Ausfuehrliche Feature-Uebersicht: [FEATURES.md](./FEATURES.md)

## Lizenz

Das Projekt ist zu Lernzwecken entstanden.
