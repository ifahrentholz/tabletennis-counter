# ADR 0009 — Visuelles Designsystem: die Schlägeridentität

- **Status:** akzeptiert
- **Datum:** 2026-08-11
- **Ticket:** [#29](https://github.com/ifahrentholz/tabletennis-counter/issues/29)
- **Spec:** [`docs/specs/design-pass-visual-overhaul.md`](../specs/design-pass-visual-overhaul.md)
- **Art der Änderung:** ausschließlich Präsentation. Kein Verhalten, kein
  State, keine Persistenz, kein Datenfluss, kein Routing, kein
  Formularverhalten, keine neue Dependency, kein geänderter Test.

## 1 Kontext

Die App war funktional vollständig (#1–#27), aber ungestaltet: jede der fünf
Screen-Dateien hielt ihr eigenes `StyleSheet.create` mit denselben
Hex-Literalen, und diese Werte (`#16a34a`, `#dc2626`, `#1d4ed8`) waren die
Tailwind-Defaultpalette. Das Erscheinungsbild war damit austauschbar und trug
nichts vom Gegenstand des Produkts.

Entscheidungsleitend ist der Nutzungskontext, nicht Geschmack: das Handy liegt
oder steht **neben der Platte**, wird zwischen den Ballwechseln aus ~1 m
Entfernung getippt und gelesen, oft in einer schlecht beleuchteten Halle, mit
schwitzigen Händen, ohne Lesebrille. Daraus folgt eine Zweiteilung, die das
ganze Designsystem trägt:

- **`PointCounterScreen` ist ein Sportgerät.** Aus 1 m lesbar, große sichere
  Trefferflächen, nichts Dekoratives.
- **Die übrigen vier Screens sind eine normale App.** Listen und ein Formular
  in gewohnter Lesegröße.

## 2 Entscheidung: drei Farbrollen aus drei physischen Objekten

Palette und Signature-Element kommen aus dem Material des Sports, nicht aus
einer UI-Palette. Jede Rolle hat genau eine Bedeutung, damit eine Farbe nie
zwei Dinge gleichzeitig sagt:

| Rolle         | Herkunft                                 | Verwendung                           |
| ------------- | ---------------------------------------- | ------------------------------------ |
| **Identität** | die rote und die schwarze Belagseite     | Spieler A = rot, Spieler B = schwarz |
| **Fläche**    | das tiefe Blaugrün der Wettkampfplatte   | Grund (Dark) bzw. Tinte (Light)      |
| **Status**    | das matte Orange des Balls               | ausschließlich „hier bist du gerade" |
| _Aktion_      | die weißen Linienmarkierungen der Platte | primäre Handlungsflächen             |

Das **Signature-Element** ist die Belagseite selbst: `RubberFace`, die
tappbare Punktfläche, ist eine Belagseite mitsamt der hellen **Blattkante**,
die an einem echten Schläger dort sichtbar ist, wo der Belag aufs Holz
beschnitten ist. Diese Kante ist gleichzeitig das, was die tiefrote Fläche im
Dark-Schema auf 3:1 gegen die dunkle Platte hält — Signature-Detail und
Kontrastuntergrenze sind derselbe Strich. Auf `PointCounterScreen` ist der
Bildschirm die Platte von oben: zwei Hälften, getrennt durch die
**Mittellinie**, jede Hälfte mit einem Punktestand und einer Belagseite.

### 2.1 Zwei bewusst aufgelöste Konflikte

1. **Rot war Destruktiv-Farbe** (Undo, Löschen). Da Rot zur Spieleridentität
   wird, ist Destruktiv **entfärbt**: `Button variant="quiet"` — ein
   gestempeltes, weit laufendes Label in einer Haarlinien-Pille, wie der
   Aufdruck auf einem Schlägergriff. Aus demselben Grund ist die
   Fehlermeldung des Setup-Formulars nicht rot, sondern eine Notiz mit harter
   Kante und Gewicht.
2. **Rot/Schwarz trägt nie allein.** Bei Rotblindheit erscheint Rot nahezu
   schwarz. Es liegen immer drei Merkmale gleichzeitig vor: der Name, die
   feste Position (A links/oben, B rechts/unten) und die _Behandlung_ — im
   Light-Schema ist A gefüllt und B Kontur, ein Helligkeits- und kein
   Farbtonunterschied.

### 2.2 Light ist keine Invertierung von Dark

- **Dark = der Schläger als Material.** Platte im Hallenschatten, beide
  Beläge als gefüllte Flächen mit heller Blattkante.
- **Light = der Schläger als technische Zeichnung.** Helle Halle,
  Platten-Blaugrün als Tinte, und die schwarze Seite als dunkle Kontur und
  Typo — **nie als Fläche**, weil ein Tageslicht-Screen sonst ein Loch bekäme.

Gesteuert über `useColorScheme()` nach Systemeinstellung; `app.json` setzt
`userInterfaceStyle` auf `"automatic"`, damit die Einstellung die App
erreicht. Es gibt bewusst **keinen** In-App-Umschalter: das wäre ein neues
Bedienelement plus Persistenz plus ein neuer Flow, also Arbeit für den
`coding_agent`.

## 3 Typografie

System-Schrift, keine geladene Schriftdatei — es soll nichts heruntergeladen
werden müssen, bevor ein Punktestand lesbar ist. Persönlichkeit entsteht über
Gewicht, Größensprünge und Laufweite: `micro` (12pt, Versalien, +1.6
Laufweite) ist ein gestempeltes Etikett wie auf einer Schiedsrichteranzeige,
die Ziffern sind eng und schwer gesetzt wie Klappkarten. Die Skala ist
absichtlich sprunghaft (12 → 17 → 28 → 92), weil auf zwei Distanzen gelesen
wird.

Alle Ziffernstile tragen `fontVariant: ['tabular-nums']`, damit der Score beim
Hochzählen nicht in der Breite springt. Der Punktestand steht auf 92pt (vorher
48pt); die Punktfläche ist 96pt hoch, jede andere Bedienfläche mindestens
44pt.

## 4 Struktur der Tokens

`src/theme/` ist die einzige Quelle der Wahrheit; keine Screen-Datei enthält
danach noch einen literalen Farbwert.

- `palette.ts` — beide Schemata, semantisch benannt (`color.*`, `player.A/B.*`)
- `tokens.ts` — `space`, `radius`, `stroke`, `hit`, `type`
- `useTheme.ts` — Systemschema → Theme (referenziell stabil pro Schema)
- `makeStyles.ts` — themeabhängige `StyleSheet`s, pro Schema einmal gebaut

Dazu rein präsentationale Bausteine in `src/components/` (`Screen`,
`Button`, `RubberFace`, `PlayerTag`, `ScoreNumeral`, `WinnerBanner`): Props
rein, View raus — kein eigener State, keine Logik.

## 5 Kontrastnachweis (WCAG)

Gemessen als Kontrastverhältnis; AA verlangt 4.5:1 für Text, 3:1 für
bedeutungstragende Nicht-Text-Elemente.

**Dark** (Grund `#07272C`, Fläche `#0E3A41`)

| Paar                                          | Ratio |
| --------------------------------------------- | ----- |
| Text primär `#F2F7F5` auf Grund               | 14.52 |
| Text sekundär `#A9C3C2` auf Grund             | 8.44  |
| Text primär auf Fläche                        | 11.41 |
| Text sekundär auf Fläche                      | 6.63  |
| Spieler A Tinte `#FF7A82` auf Grund           | 6.26  |
| Spieler A Tinte auf Fläche                    | 4.92  |
| Weiß auf Spieler-A-Fläche `#C4102B`           | 6.08  |
| Bone `#EDF2F0` auf Spieler-B-Fläche `#0B0F11` | 17.02 |
| Blattkante `#C8D8D5` auf Grund (Nicht-Text)   | 11.49 |
| Blattkante auf Spieler-A-Fläche (Nicht-Text)  | 4.40  |
| Akzent `#FF8A3D` auf Grund                    | 6.70  |
| Akzent auf Fläche                             | 5.27  |
| Quiet-Tinte `#C7D8D5` auf Grund               | 10.64 |
| Rahmen `#6E9B9E` auf Grund (Nicht-Text)       | 4.85  |
| Rahmen auf Fläche (Nicht-Text)                | 4.03  |
| Aktionstinte `#07272C` auf Bone `#E8EFED`     | 13.48 |

**Light** (Grund `#E3EDE9`, Fläche `#FFFFFF`)

| Paar                                           | Ratio |
| ---------------------------------------------- | ----- |
| Text primär `#062026` auf Grund                | 14.13 |
| Text sekundär / Quiet `#4A6B70` auf Grund      | 4.84  |
| Text primär auf Fläche                         | 16.90 |
| Text sekundär auf Fläche                       | 5.79  |
| Spieler A `#A80E27` auf Grund                  | 6.37  |
| Spieler A auf Fläche                           | 7.62  |
| Weiß auf Spieler-A-Fläche `#A80E27`            | 7.62  |
| Spieler B `#121618` auf Grund                  | 15.22 |
| Spieler B auf Belag-Wash `#E7EAE9`             | 16.32 |
| Akzent-Text `#9C3D06` auf Grund                | 5.69  |
| Akzent-Marker `#D65A0A` auf Grund (Nicht-Text) | 3.30  |
| Aktionsfläche `#0E4B54` auf Grund (Nicht-Text) | 8.15  |
| Weiß auf Aktionsfläche                         | 9.75  |
| Rahmen `#4A6B70` auf Grund (Nicht-Text)        | 4.84  |

Die Kartenkanten tragen bewusst einen eigenen Rahmen (`borderStrong`), weil
Weiß auf dem hellen Grund allein nur 1.20:1 erreicht — die Begrenzung eines
tappbaren Elements darf nicht an der Flächenhelligkeit hängen.

Geprüft wurde nicht nur die Tabelle, sondern auch, dass **jede** Farbe, die
tatsächlich in den Render-Baum gelangt, ein Token ist: alle fünf Screens in
beiden Schemata gerendert, jeder `color`/`backgroundColor`/`borderColor`-Wert
gegen die Palette abgeglichen, keine Ausreißer.

## 6 Bewegung

Nur mit dem eingebauten `Animated`, keine Bibliothek. Zwei Stellen, beide
bedeutungstragend, keine Dauerläufer:

- `ScoreNumeral`: der Punkt landet — eine einzelne Skalierung (90ms hoch,
  150ms zurück), ausgelöst nur durch eine echte Zahlenänderung.
- `WinnerBanner`: 220ms Einblenden mit 8pt Anstieg. Das Banner mountet
  ausschließlich im Moment des Matchgewinns, das Mount _ist_ das Ereignis.

Beide bewegen nur `transform`/`opacity` und tragen keinen Zustand.

## 7 Verworfene Alternativen

- **Rot/Schwarz nur als Fläche.** Im Light-Schema hätte die schwarze Seite
  eine schwarze Fläche gebraucht; auf einem Tageslicht-Screen ist das ein
  Loch. Deshalb im Light Kontur und Typo (§2.2).
- **Die Punktestand-Fläche selbst als +1-Button.** Größte denkbare
  Trefferfläche, aber ein Streifen über den Bildschirm hätte Punkte
  vergeben, und Anzeige und Bedienung wären dasselbe Element geworden.
- **Ball-Orange als Primärfarbe für Aktionen.** Hätte den Status entwertet;
  Aktionen nehmen stattdessen die weißen Linienmarkierungen.
- **Eigene Schriftart.** Neue Dependency und ein Ladezustand vor dem ersten
  Punktestand.
- **`ScrollView` auf den Listen-Screens.** Die Screens scrollen weiterhin
  nicht; die vertikalen Budgets sind so gesetzt, dass sie auf dem kleinsten
  Gerät passen. Ein Overflow bei sehr vielen Matches bestand vorher genauso
  und ist Verhalten, nicht Gestaltung — siehe §8.

## 8 Bewusst nicht erledigt (Folgethemen für den `coding_agent`)

1. `src/PlaceholderScreen.tsx` ist toter Code (nur der eigene Test
   referenziert ihn) und bleibt ungestaltet — Löschen ist Aufräumarbeit.
2. `App.tsx` (`Route`/`renderScreen`) bleibt unangetastet.
3. App-Icon und Splash (`assets/*.png`) sind noch in der alten Richtung;
   Rasterbild-Neuzeichnung ist eine andere Disziplin.
4. Manuelle Theme-Umschaltung in der App (neues Control + Persistenz + Flow).
5. `ScrollView`/`FlatList` auf Match-, Spiel- und Satzliste, damit sehr viele
   Einträge erreichbar bleiben.
6. Aufschlagwechsel-Anzeige: Ball-Orange ist dafür reserviert, aber die
   Domäne führt keinen Aufschlag — das ist Logik.
7. „Reduzierte Bewegung" respektieren (`AccessibilityInfo`): beide
   Animationen sind sub-perzeptuell kurz, eine echte Auswertung wäre ein
   asynchroner Systemzustand.
