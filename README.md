# Pokédex New

Ein moderner, interaktiver Pokédex mit Team-Builder, Team-Analyse, Gym-Battle, Favoriten, Bewertungssystem und KI-Integration.

---

## Projektbeschreibung

Dieses Projekt ist ein voll funktionsfähiger Pokédex, der es Nutzer:innen ermöglicht, Pokémon zu durchsuchen, Details anzuzeigen, eigene Teams zusammenzustellen und diese zu analysieren. Die Anwendung bietet eine moderne Benutzeroberfläche, Drag-and-Drop-Team-Builder, KI-gestützte Team-Analyse, Gym-Battle-Modus, Favoriten, Bewertungssystem und ist für Barrierefreiheit optimiert.

---

## Features (Stand: 16.02.2026)

- **Pokédex:** Durchsuche, filtere und suche alle Pokémon mit Bildern, Typen, Stats und Detailansicht
- **Team-Builder:** Ziehe Pokémon-Karten per Drag & Drop in Team-Slots (max. 6 Pokémon), Mini-Cards, doppelter Counter
- **Favoriten-System:** Herz-Icon, persistiert lokal, Filter nach Favoriten
- **5-Sterne-Bewertung:** Individuelle Bewertung jedes Pokémon (lokal gespeichert, auto-rating)
- **Power-/Strength-Anzeige:** Berechnete Leistungskennzahl (CP, IV, Prozent, visuell)
- **Team Modal & Analyse:** Kompakte Übersicht, Typen-Coverage, Schwächen, Empfehlungen, dynamischer Modal-Header
- **Team Compare:** Vergleich von zwei Pokémon im Modal
- **Gym Battle System:** Team-Battle gegen KI-Gym-Leader, Modal-Ansicht, Logik für MVP, Damage, Turns
- **Barrierefreiheit:** Fokus-Management, ARIA-Attribute, hohe Farbkontraste, Tastaturbedienung, Live-Regionen
- **Responsives Design:** Optimiert für Desktop und mobile Geräte
- **Schnelle Suche & Filter:** Nach Name, Typ, Nummer, Favoriten, Bewertung
- **Persistenz:** Favoriten, Ratings, Team im LocalStorage
- **Defensive Checks & Fallbacks:** Robustes UI, Fehlerbehandlung, Bootstrap-Fallbacks
- **Moderne UI:** Glassmorphism, animierte Gradients, strukturierte Stat- und Team-Ansichten

---

## Status-Tabelle (Auszug)

| Feature                  | Status     | Kommentar                     |
| ------------------------ | ---------- | ----------------------------- |
| Favoriten-System         | ✅ Live    | Persistenz via LocalStorage   |
| Bewertungssystem         | ✅ Live    | Sterne-UI + Filter            |
| Power/Strength Anzeige   | ✅ Live    | Berechnete Basiswerte         |
| Team Offcanvas           | ✅ Neu     | Drag & Drop + Mini-Cards      |
| Doppelter Team-Counter   | ✅ Neu     | Sync im Button + Offcanvas    |
| Mini-Card Redesign       | ✅ Neu     | Gradient + Glass + Typ-Badges |
| Strength Mini-Card       | ✅ Neu     | Kompakte Stats + ARIA         |
| Dynamischer Modal-Header | ✅ Neu     | Zufallsgradient pro Öffnung   |
| Team Modal               | ✅ Live    | Übersicht & Aktionen          |
| Team Analyse             | ✅ Live    | Externes Modul integriert     |
| Team Compare             | ✅ Live    | Vergleichsmodal               |
| Gym Battle               | ✅ Live    | Team-Battle gegen KI          |
| Export / Teilen          | 📝 Geplant | JSON / Share API              |
| Notiz-System             | 📝 Geplant | Platzhalter / Konzeptphase    |
| Kampfsimulator           | 📝 Geplant | Strategische Simulation       |
| Preset-Teams             | 📝 Geplant | Mehrfach-Konfiguration        |
| Mehrsprachigkeit         | 📝 Geplant | i18n Struktur später          |
| Offline-Modus            | 📝 Geplant | Service Worker Option         |

---

## Architektur & Technische Struktur

### Modul-Schichten

| Ebene                    | Dateien (Beispiele)                                        | Aufgabe                                                  |
| ------------------------ | ---------------------------------------------------------- | -------------------------------------------------------- |
| Core Daten / API         | `api.js`, `pokemon-core.js`, `services/ApiService.js`      | Laden & Aufbereiten von Pokémon-Daten                    |
| UI Rendering             | `pokemon-ui.js`, `pokemon-detail.js`, `template.js`        | Karten, Detail-Views, dynamische Templates               |
| Interaktion / Navigation | `navigation.js`, `search.js`                               | Filtering, Suche, Pagination                             |
| Team Funktionalität      | `team-offcanvas.js`, `mypokedex-section.js`, `team-modal*` | Team-State, Offcanvas, Modals, Actions                   |
| Analyse                  | `team-analyzer.js`                                         | Coverage, Effektivitäten, Empfehlungen                   |
| Zusatz Features          | `pokemon-go-*`                                             | GO-inspirierte Erweiterungen (Power, Favoriten, Ratings) |
| Bootstrap Integration    | (divers verteilt)                                          | Events (`show.bs.modal`, Offcanvas)                      |

### State & Persistenz

- Team-State: In-Memory Array in Instanz `TeamOffcanvas` + Sync auf `localStorage` (`pokemonTeam`)
- Favoriten / Ratings: Speicherung lokal (`pokemonFavorites`, `pokemonRatings`)
- Keine serverseitige Persistenz → rein lokaler Zustand

### Fehler- & Fallback-Strategien

- Fehlende Bootstrap APIs → Warnungen statt Abbruch
- Ungültige / nicht verfügbare Typen → Fallback `'normal'`
- Entfernen von Pokémon, die nicht mehr existieren → stilles Abbrechen mit Log

---

## Barrierefreiheit

Die Anwendung erfüllt die wichtigsten WCAG-AA-Kriterien:

- Fokus- und Tastatursteuerung
- ARIA-Attribute für Screenreader
- Farbkontraste geprüft
- Live-Regionen für dynamische Inhalte
- Buttons behalten Focus Outline (keine aggressive Reset-Entfernung)
- Defensive Checks in Modal/Offcanvas Logik

---

## Installation

1. Repository klonen oder herunterladen
2. Abhängigkeiten installieren:
   ```
   npm install
   ```
3. Eine `.env`-Datei im Projektverzeichnis anlegen (siehe `.env.example` für benötigte Variablen)
4. Anwendung starten:
   ```
   npm start
   ```

---

## .env-Konfiguration

Die Anwendung benötigt eine `.env`-Datei mit API-Schlüsseln für die unterstützten KI-Provider (Groq, Mistral) und ggf. weiteren Einstellungen. Beispiel siehe `.env.example`.

---

## Technologien

- HTML5, CSS3 (Custom Properties, Flexbox, Grid)
- JavaScript (ES6+), Node.js, Express
- KI-Integration (Groq, Mistral)

---

## Changelog (Kurz)

| Version       | Datum      | Änderungen                                                                                                                |
| ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| 2.0           | früher     | Grundsystem + Bewertung + Favoriten + Analyse                                                                             |
| 2.1           | 22.09.2025 | Offcanvas, Mini-Card Redesign, Strength Mini-Card, dynamischer Gradient Header, doppelter Counter, Dokumentations-Updates |
| 2.2 (geplant) | TBA        | Notiz-System, Gradient Konsolidierung, Stat-Heatmapping, Legacy CSS Cleanup                                               |

---

## Lizenz

Dieses Projekt ist zu Lernzwecken entstanden. Bei Fragen oder Feedback gerne melden!
