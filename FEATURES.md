# Pokedex New - Feature-Uebersicht

Stand: 19.03.2026

## Kurzfassung

Das Projekt ist ein interaktiver Pokedex mit lokalem Team-Management, Team-Analyse, Vergleichs- und Battle-Funktionen sowie optionaler KI-Unterstuetzung ueber einen lokalen Express-Proxy. Die Datei beschreibt den aktuell im Code vorhandenen Stand, nicht aeltere Planungen.

## Aktive Kern-Features

### Pokedex und Navigation

- Anzeige von Pokemon aus der PokeAPI mit Bild, Typen, Stats und Detailansicht
- Suche ueber Suchfeld mit Ergebnis-Dropdown
- Filter nach Typen, Favoriten und Bewertungsstufe
- Pagination mit `Previous` / `Next`
- `Load More` zum schrittweisen Nachladen weiterer Pokemon
- Responsives Filter-Menue fuer kleinere Viewports

### Pokemon-Karten und Detailansichten

- Kartenansicht mit Typ-Badges, Bild und Schnellaktionen
- Detailansicht fuer einzelne Pokemon
- Vergleichsmodus fuer zwei Pokemon
- Direkter Start eines 1v1-Battle-Simulators aus dem Vergleichsmodal

### Pokemon-GO-inspirierte Features

- Favoriten-System mit lokaler Persistenz
- Bewertungs-/Appraisal-System mit gespeicherten Ratings
- Power-/Strength-Berechnungen auf Basis von Stats
- Lokale Notizen-Struktur fuer Pokemon ist im Code vorhanden

### Team-Management

- Team-Offcanvas mit Team-Counter und Mini-Cards
- Separater `Active Team`-Builder mit 6 Slots
- Drag-and-Drop vom Pokedex in Team-Slots bzw. Team-Bereiche
- Ersetzen bereits belegter Slots per Drop
- Synchronisation zwischen Team-Builder, Offcanvas und `localStorage`
- Live-Regionen und Statusmeldungen fuer Team-Aenderungen

### Team-Modal und Team-Aktionen

- Team-Modal mit Uebersicht ueber aktuelles Team
- Anzeige von Team-Kennzahlen wie Typenverteilung, Favoriten und Durchschnittswerten
- Pokemon aus dem Team entfernen
- Team mischen
- Nicht-Favoriten gesammelt entfernen
- Team als JSON exportieren
- Team ueber `navigator.share` oder Clipboard teilen
- Team-Presets im `localStorage` speichern

### Team-Analyse

- Statische Team-Analyse fuer Coverage, Schwaechen und Zusammensetzung
- Eigenes Analyse-Modal
- Team-Analyse direkt aus dem Team-Modal und aus der Hauptansicht
- KI-gestuetzte Team-Analyse mit Fallback ueber mehrere Provider
- KI-Teamberater im `Active Team`-Bereich

### Battle-Features

- 1v1-Battle-Simulator mit Rundenlogik
- `Next Round`, Auto-Play und Reset im Simulator
- Export des Battle-Logs
- Gym-Challenge-Modus gegen ein generiertes Gegnerteam
- Gym-Leader-Dialoge und Kampfkommentare mit optionaler KI-Unterstuetzung
- Challenge-Auswertung mit Schaden, Zuegen und MVP
- Kampfhistorie mit Statistiken, Win-Rate und meistgenutzten Pokemon

### KI-Integration und Server

- Lokaler Express-Server fuer statische Auslieferung und AI-Proxy
- `/api/ai/ping` zur Proxy-Erkennung im Frontend
- `/api/ai` als Proxy fuer Groq, Mistral und Gemini
- Rate Limiting fuer AI-Requests
- Frontend-Fallback zwischen direktem API-Zugriff und Proxy-Nutzung
- Caching, Retry-Logik, Timeout und Throttling fuer KI-Anfragen

## Persistenz

Die Anwendung speichert mehrere Bereiche lokal im Browser:

- `pokemonTeam`
- `pokemonFavorites`
- `pokemonRatings`
- `pokemonNotes`
- `pokemonTeamPresets`
- `pokemonBattleHistory`
- AI-API-Keys fuer lokale Nutzung, falls kein Proxy aktiv ist

## Status-Tabelle

| Feature | Status | Kommentar |
| --- | --- | --- |
| Pokedex-Anzeige | Live | PokeAPI-basierte Karten- und Detailansicht |
| Suche und Typ-Filter | Live | Suche, Typen, Favoriten und Ratings |
| Favoriten | Live | Lokal gespeichert |
| Ratings / Appraisal | Live | Lokal gespeichert |
| Notizen-Datenstruktur | Teilweise live | Persistenz vorhanden, keine ausgebaute UI im Hauptfluss |
| Team-Offcanvas | Live | Mini-Cards und Counter |
| Active Team Builder | Live | 6 Slots mit Drag-and-Drop |
| Team-Modal | Live | Uebersicht, Export und Aktionen |
| Team teilen | Live | Share API oder Clipboard |
| Team-Presets speichern | Live | Speicherung im `localStorage` |
| Team-Analyse | Live | Statisch plus KI-Unterstuetzung |
| Pokemon-Vergleich | Live | Zwei Pokemon im Modal vergleichen |
| Battle-Simulator | Live | 1v1 mit Log und Export |
| Gym-Challenge | Live | Gegnerteam, Strategie und Historie |
| Battle-Historie | Live | Lokale Historie mit Kennzahlen |
| AI-Proxy-Server | Live | Express-Endpunkt mit Rate Limit |

## Technische Struktur

### Wichtige Einstiegspunkte

- `index.html`: Layout, Filter, Offcanvas, Team-Modal, Team-Builder
- `main.js`: Script-Bootstrap und Initialisierung aller Frontend-Module
- `server.js`: Express-Server und AI-Proxy

### Modulbereiche

| Bereich | Dateien / Muster | Aufgabe |
| --- | --- | --- |
| API und Daten | `script/services/ApiService.js`, `script/pokemon-core.js` | Laden und Transformieren der Pokemon-Daten |
| Rendering | `script/pokemon-ui.js`, `script/template.js`, `script/pokemon-detail.js` | Karten, Details und UI-Bausteine |
| Navigation | `script/search.js`, `script/navigation.js` | Suche, Pagination, Load More, Responsive-Verhalten |
| GO-Features | `script/pokemon-go-*` | Favoriten, Ratings, Power, Filter |
| Team-Builder | `script/team-builder*.js`, `script/team-offcanvas-*.js` | Slots, Drag-and-Drop, Team-Sync |
| Team-Modal | `script/team-modal-*.js`, `script/mypokedex-*.js` | Team-Uebersicht und Team-Aktionen |
| Analyse | `script/team-analyzer-*.js`, `script/team-ai-service.js` | Statische und KI-gestuetzte Team-Analyse |
| Vergleich | `script/pokemon-compare*.js` | Vergleichsmodal und Battle-Trigger |
| Battle | `script/battle-sim-*.js`, `script/team-battle-*.js`, `script/battle-history.js` | Simulator, Gym-Challenge, Historie |
| Infrastruktur | `script/utils/*.js`, `js/ai-service.js` | Retry, Modal-Fabrik, Hilfsfunktionen, AI-Client |

## Installation und Betrieb

1. Abhaengigkeiten installieren:
   ```bash
   npm install
   ```
2. `.env` auf Basis von `.env.example` anlegen
3. Mindestens einen AI-Key hinterlegen, wenn KI-Funktionen genutzt werden sollen
4. Server starten:
   ```bash
   npm start
   ```
5. Anwendung im Browser ueber `http://localhost:3000` aufrufen

## Bekannte Einschraenkungen

- Die Notiz-Funktion ist daten- und service-seitig vorbereitet, aber nicht als vollstaendige Haupt-UI ausgebaut.
- Team-Presets werden gespeichert, im aktuellen Stand aber nicht als vollstaendige Preset-Verwaltung mit Laden/Loeschen praesentiert.
- Ein Teil des Projekts enthaelt aeltere und neuere Modulpfade parallel; `main.js` bootstrapped den aktuell genutzten Satz.

## Nicht mehr zutreffend aus der alten Datei

Folgende Punkte aus der frueheren `FEATURES.md` sind nicht mehr korrekt:

- Battle- und Compare-Funktionen sind nicht mehr "geplant", sondern vorhanden.
- Export und Teilen sind implementiert.
- Team-Presets koennen gespeichert werden.
- Das Projekt nutzt inzwischen einen lokalen Node-/Express-Server fuer die KI-Anbindung.
- Die alte Datei war in Teilen fehlerhaft kodiert und enthielt ueberholte Versions-/Changelog-Eintraege.
