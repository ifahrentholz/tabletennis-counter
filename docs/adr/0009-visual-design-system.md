# ADR 0009 — Visuelles Designsystem: Broadcast-Scoreboard

- **Status:** akzeptiert
- **Datum:** 2026-08-11
- **Ticket:** [#29](https://github.com/ifahrentholz/tabletennis-counter/issues/29)
- **Spec:** [`docs/specs/design-pass-visual-overhaul.md`](../specs/design-pass-visual-overhaul.md)
- **Art der Änderung:** ausschließlich Präsentation. Kein Verhalten, kein
  State, keine Persistenz, kein Datenfluss, kein Routing, kein
  Formularverhalten, keine neue Dependency, kein geänderter Test.

## 1 Kontext

Das Handy liegt oder steht neben der Platte. Zwischen Ballwechseln wird die
App aus ungefähr einem Meter Entfernung kurz gelesen und mit wenig Präzision
bedient. Der Live-Zähler muss deshalb wie ein Sportgerät funktionieren; Setup
und Übersichten bleiben kompakte mobile Arbeitsflächen.

Die erste Material-Richtung war zwar sportbezogen, aber durch viele ähnlich
petrolfarbene Flächen und textlastige Controls visuell zu gleichförmig. Die
Überarbeitung verwendet deshalb die Hierarchie einer TV-Sportgrafik:

- große, tabellarische Zahlen;
- helle beziehungsweise dunkle neutrale Hallenflächen;
- klare Spielerfarben;
- Orange ausschließlich für den laufenden Zustand;
- wenige, harte Kartenkanten statt dekorativer Formen.

## 2 Farbrollen

Jede Farbe hat genau eine Aufgabe:

| Rolle      | Verwendung                                                     |
| ---------- | -------------------------------------------------------------- |
| Spieler A  | Schlägerrot für Chip, Name, Zahl und Punktfläche               |
| Spieler B  | Schlägerschwarz beziehungsweise helle Tinte im Dark Mode       |
| Aktion     | tiefes Tischgrün im Light Mode, helle Linienfarbe im Dark Mode |
| Status     | Ballorange ausschließlich für „Live“ und aktuelle Position     |
| Oberfläche | neutrale Hallen- und Scoreboard-Flächen                        |

Spieleridentität wird nie nur durch Farbe vermittelt. Name, feste Position
und der vertikale Spielerbalken bleiben immer sichtbar. Primäraktionen und
destruktive Aktionen verwenden keine Spielerfarbe.

Light und Dark sind eigene Kompositionen, keine einfache Invertierung. Das
Systemschema wird über `useColorScheme()` übernommen; `app.json` setzt
`userInterfaceStyle` auf `"automatic"`.

## 3 Layout

### 3.1 Live-Zähler

`PointCounterScreen` besteht aus zwei gleich breiten Spielerpanels. Jedes
Panel bündelt Name, 104-pt-Punktestand, Satz-/Spielstand, eine 84-pt-`+1`-
Fläche und die separate Undo-Aktion. Anzeige und Eingabe bleiben getrennte
Elemente. Die Spielerfarbe liegt als obere Panelkante und als Punktfläche an,
nicht als vollflächiger Bildschirmhintergrund.

### 3.2 Übersichten

Spiel- und Satzstände erscheinen als zwei gleich große Scorekarten. Darunter
stehen Rundenname, Live- oder Gewinnerstatus und Ergebnis in festen Spalten.
Die Ergebniszahlen verwenden tabellarische Ziffern und sind deutlich stärker
als Begleittext gesetzt.

### 3.3 Setup und Matchliste

Das Setup verwendet kompakte, gleich breite Segmented Controls und zwei klar
getrennte Oberflächen für Format und Spieler. Matchkarten zeigen Status und
Spielerhierarchie; Löschen ist eine zurückgenommene quadratische Symbolaktion.

## 4 Tokens und Komponenten

`src/theme/` ist die einzige Quelle für Farben, Abstände, Radien,
Trefferflächen und Typografie. Screen-Dateien enthalten keine Hexwerte.

- `palette.ts`: semantische Light-/Dark-Farben und Spielerrollen
- `tokens.ts`: 4-pt-Abstandsraster, Radien bis 8 pt, Hit-Areas und Typografie
- `useTheme.ts`: Auflösung des Systemschemas
- `makeStyles.ts`: pro Schema gecachte `StyleSheet`s

Die Skala trennt normale App-Texte (12–32 pt), aggregierte Scores (52 pt) und
den Live-Score (104 pt). Alle Ziffernanzeigen verwenden
`fontVariant: ['tabular-nums']`; `letterSpacing` bleibt 0. Jede Aktion ist
mindestens 44 pt groß.

Gemeinsame Präsentationskomponenten (`Screen`, `Button`, `RubberFace`,
`PlayerTag`, `ScoreNumeral`, `WinnerBanner`) erhalten Daten über Props und
enthalten keine Spiellogik.

## 5 Kontrastnachweis

Gemessen nach WCAG; normaler Text benötigt 4.5:1. Die wichtigsten tatsächlich
gerenderten Kombinationen liegen darüber.

**Light** (Grund `#F2F4F1`)

| Paar                                |   Ratio |
| ----------------------------------- | ------: |
| Primärtext `#111817` auf Grund      | 16.27:1 |
| Sekundärtext `#56615D` auf Grund    |  5.82:1 |
| Status `#A93E05` auf Grund          |  5.62:1 |
| Weiß auf Primäraktion `#153F38`     | 11.67:1 |
| Spieler A `#A9142D` auf Grund       |  6.72:1 |
| Weiß auf Spieler-A-Fläche `#C91F3A` |  5.61:1 |
| Weiß auf Spieler-B-Fläche `#141B19` | 17.49:1 |

**Dark** (Grund `#0B1110`)

| Paar                                        |   Ratio |
| ------------------------------------------- | ------: |
| Primärtext `#F4F7F5` auf Grund              | 17.67:1 |
| Sekundärtext `#AAB8B2` auf Grund            |  9.26:1 |
| Status `#FFA14A` auf Grund                  |  9.48:1 |
| Aktionstinte `#15201D` auf Aktion `#F1F5F3` | 15.20:1 |
| Spieler A `#FF8291` auf Grund               |  8.04:1 |
| Weiß auf Spieler-A-Fläche `#CE2641`         |  5.28:1 |
| Weiß auf Spieler-B-Fläche `#050807`         | 20.11:1 |

## 6 Bewegung

Bewegung bleibt auf zwei bedeutungstragende Stellen beschränkt und verwendet
nur das eingebaute `Animated`:

- `ScoreNumeral`: 240-ms-Scale-Impuls bei einer echten Punktänderung;
- `WinnerBanner`: 220-ms-Fade und kurzer vertikaler Eintritt beim Matchgewinn.

Press-Zustände skalieren nur das gedrückte Element leicht und verändern keine
Layoutdimension.

## 7 Verifikation

- iPhone SE (3. Generation), 375 × 667 pt
- Light und Dark Mode
- Matchliste, Setup, Matchübersicht und Live-Zähler als Simulator-Screenshot
- keine abgeschnittenen Texte oder überlappenden Controls
- 98 Tests, TypeScript und ESLint erfolgreich

## 8 Bewusst nicht geändert

1. Domain- und Zähllogik
2. Persistenz und Routing
3. App-Icon und Splash-Grafiken
4. manuelle Theme-Umschaltung
5. Scroll-/Virtualisierungsverhalten langer Listen
6. Aufschlaglogik
