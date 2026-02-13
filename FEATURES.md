# Pokédex New – Funktionsübersicht

## Projektüberblick

Pokédex New ist eine moderne, interaktive Webanwendung, die als umfassender Pokédex dient und zahlreiche Zusatzfunktionen für Pokémon-Fans bietet. Die App kombiniert eine ansprechende, responsive Benutzeroberfläche mit leistungsstarken Tools wie Team-Builder, KI-gestützter Team-Analyse und Barrierefreiheit auf hohem Niveau. Sie ist sowohl für Desktop als auch für mobile Geräte optimiert und setzt auf moderne Webtechnologien.

---

## Hauptfunktionen

- **Pokédex & Suche:**
	- Durchsuche und filtere alle Pokémon nach Name, Typ oder Nummer
	- Detailansicht mit Bild, Typen, Basiswerten und weiteren Infos
	- Schnelle, interaktive Suchleiste mit Dropdown-Vorschlägen

- **Team-Builder:**
	- Erstelle dein eigenes Pokémon-Team per Drag & Drop (max. 6 Pokémon)
	- Team-Verwaltung im Offcanvas-Bereich und zentralem Team-Builder
	- Mini-Karten, Typ-Badges und visuelle Teamübersicht
	- Speicherung des Teams im Local Storage (persistente Teams)

- **KI-Integration:**
	- Analyse deines Teams durch KI (Groq & Mistral, via Proxy oder API-Key)
	- Empfehlungen zu Typen, Rollen, Schwächen und Optimierungspotenzial
	- Battle-Strategien für Team-vs-Team Kämpfe
	- JSON-basierte, strukturierte KI-Antworten für klare Auswertungen

- **Team-Analyse & Vergleich:**
	- Automatische Schwächen-/Stärken-Analyse auf Basis des TypeCharts
	- Vergleich von Pokémon und Teams
	- Team-Analyse-Modal mit klaren Empfehlungen

- **Battle-Simulator:**
	- Simuliere Kämpfe zwischen Teams
	- Erhalte Strategieempfehlungen und Risikoanalysen

- **Favoriten & My Pokédex:**
	- Markiere Lieblingspokémon als Favoriten
	- Eigene Pokédex-Ansicht für gesammelte Pokémon

- **Filter & Sortierung:**
	- Filtere nach Typen, Favoriten, Bewertung (Rating)
	- Sortiere Pokémon nach verschiedenen Kriterien

- **Barrierefreiheit (Accessibility):**
	- Fokus-Management, ARIA-Attribute, Live-Regionen
	- Hohe Farbkontraste, Tastaturbedienung, Screenreader-Support
	- Responsives Design für alle Endgeräte

- **Design & Usability:**
	- Modernes, farbenfrohes UI mit animierten Hintergründen
	- Bootstrap 5, Custom CSS, Icon-Sets und optimierte Bildquellen
	- Drag & Drop, Offcanvas, Modal-Dialoge, Toast-Benachrichtigungen

---

## Technische Details

- **Frontend:**
	- HTML5, CSS3 (Custom Properties, Flexbox, Grid)
	- JavaScript (ES6+), modulare Struktur
	- Bootstrap 5, Font Awesome, eigene Komponenten

- **Backend:**
	- Node.js mit Express-Server
	- API-Proxy für KI-Provider (Groq, Mistral)
	- Integriertes Rate-Limiting (Schutz vor Missbrauch)
	- .env-Konfiguration für API-Keys und Umgebungsvariablen

- **Datenquellen:**
	- PokéAPI (https://pokeapi.co/) für alle Pokémon-Daten
	- Offizielle Sprites und Artworks

- **KI-Integration:**
	- Unterstützung für Groq und Mistral (wahlweise Proxy oder direkter API-Key)
	- Strukturierte Prompts und JSON-Ausgaben für Team-Analyse und Strategie

---

## Barrierefreiheit & UX

- Erfüllt zentrale WCAG-AA-Kriterien
- Fokus- und Tastatursteuerung, ARIA-Attribute, Live-Regionen
- Hohe Farbkontraste und responsives Layout
- Optimiert für Screenreader und mobile Nutzung

---

## Installation & Start

1. Repository klonen oder herunterladen
2. Abhängigkeiten installieren:
	 ```
	 npm install
	 ```
3. `.env`-Datei anlegen (siehe `.env.example` für benötigte Variablen)
4. Anwendung starten:
	 ```
	 npm start
	 ```

---

## Hinweise

- Das Projekt ist zu Lernzwecken entstanden und kann beliebig erweitert werden.
- Feedback und Beiträge sind willkommen!

---

© 2026 Michael Friggemann – Developer Akademie
