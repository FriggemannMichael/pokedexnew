# Entwurf: vier Bereiche statt Endlosseite

Klickbarer Prototyp für den Umbau der Oberfläche. **Nicht** Teil der App —
er dient als Vorlage und wird gelöscht, wenn der Umbau durch ist.

Starten: `npm start`, dann <http://localhost:3000/design-draft/>
(Backend auf Port 8000 starten, sonst fällt er auf zehn eingebaute Pokémon zurück.)

## Warum

Die App war eine einzige Seite, auf der vier Aufgaben um Platz kämpften:
nachschlagen, Team bauen, kämpfen, Konto. **4.811 px hoch am Desktop, 13.025 px
auf dem Handy** – mit leerem Team. Der Pokédex, der eigentliche Kern, begann
erst unterhalb von sechs leeren Team-Slots, einem leeren Preset-Kasten und einem
Professor Eich, der noch nichts zu sagen hatte.

Das ist keine Styling-Frage, sondern Informationsarchitektur.

## Was der Entwurf zeigt

- **Vier Bereiche mit Tab-Leiste** – unten am Handy (Daumen), oben am Desktop.
  Jede Ansicht macht eine Sache: Pokédex, Team, Kampf, Konto.
- **Kontextfarbe als Leitmotiv**: Der Himmel färbt sich nach Bereich und Typ.
  Das ist kein neues Prinzip, sondern euer vorhandenes (`body.type-fire` in
  `assets/css/main-base.css`) – hier auf alle 18 Typen ausgedehnt.
- **Der Weg ins Team ist ein Tipp, kein Zug**: Auf dem Handy gibt es kein
  Drag-and-Drop. Ein „+" auf der Karte, ein großer Knopf in der Detailkarte,
  eine Rückmeldung mit „Rückgängig", ein Zähler am Team-Tab.
- **Typ-Filter als Sheet** statt einer Chip-Reihe zum Endlos-Wischen –
  alle 18 Typen mit den vorhandenen SVG-Icons, in Daumenreichweite.
- **Kampf** hat schon einen Platz für die geplanten Trainerkämpfe
  („Andere Trainer – tritt gegen die Teams echter Spieler an").
- **Konto** sagt endlich, wozu: damit andere gegen genau dein Team antreten.

Die Atmosphäre (Himmel, Wolken, Partikel, schwebende Pokémon) ist aus der App
übernommen – nur nicht mehr in einem 350-px-Hero eingesperrt, sondern fest
hinter der ganzen Anwendung.

## Was er benutzt

Echte Daten aus dem Django-Backend: `/api/pokemon/`, `/api/pokemon/by-type/…`,
`/api/pokemon/names/` (deutsche Namen), `/api/pokeapi/…` für Detail, Spezies und
Entwicklungsreihe.

## Was noch fehlt

- Battle-Ansicht ist eine Attrappe (Gegnerliste, keine Kampflogik)
- Konto-Bereich zeigt beide Zustände, meldet aber nicht wirklich an
- Vergleichsansicht, Gym-Challenge, Historie sind nicht ausgearbeitet
