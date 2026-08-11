# Spec: Visueller Design-Pass (Standalone)

- **Typ:** Standalone-Design-Run (kein `coding_agent`-Stage-4 — die Funktionalität ist fertig und gemerged)
- **Ausführender:** `design_agent`, `Mode: standalone`, eigener Branch + eigener PR
- **Status:** wartet auf Freigabe durch den Menschen

## Problem

Die App ist funktional vollständig (Issues #1–#27 gemerged), aber optisch ungestaltet.
Der Ist-Zustand:

- Jede der 5 Screen-Dateien hält ihr eigenes `StyleSheet.create` mit wiederholten
  Hex-Werten; es gibt kein Token-/Theme-Modul.
- Die verwendeten Farben (`#16a34a`, `#dc2626`, `#1d4ed8`) sind die Tailwind-
  Defaultpalette — das Erscheinungsbild ist damit austauschbar und trägt nichts
  vom Gegenstand des Produkts.
- Der Live-Punktezähler ist auf Lesbarkeit am Tisch nicht ausgelegt
  (Score-Ziffern 48pt, kleine Buttons).

## Nutzungskontext (entscheidungsleitend)

Das Handy liegt oder steht **neben der Platte**. Zwischen den Ballwechseln wird
aus ~1 m Entfernung kurz getippt und geschaut — oft in einer schlecht
beleuchteten Halle, mit schwitzigen Händen, ohne Lesebrille.

Daraus folgt die Zweiteilung:

- **`PointCounterScreen` = Sportgerät.** Aus 1 m lesbar, große sichere
  Trefferflächen, nichts Dekoratives.
- **Die übrigen vier Screens = normale App.** Listen und Formular in
  gewohnter Lesegröße.

## Gestalterische Richtung

Palette und Signature-Element werden aus dem **physischen Material des Sports**
abgeleitet, nicht aus einer Default-Palette:

- **Signature-Element:** Der Tischtennisschläger hat regelbedingt eine **rote**
  und eine **schwarze** Seite. Das wird zur Identität der beiden Spieler —
  Spieler A = rot, Spieler B = schwarz.
- **Fläche:** das tiefe Blaugrün der Wettkampfplatte.
- **Akzent:** Ball-Orange, ausschließlich für „hier bist du gerade"
  (Aufschlag, laufender Satz).
- **Typografie:** System-Schrift mit `fontVariant: ['tabular-nums']`, damit der
  Score beim Hochzählen nicht springt. Persönlichkeit entsteht über Gewicht,
  Größensprünge, Laufweite und Rhythmus.

### Zwei bewusst aufgelöste Konflikte

1. **Rot ist heute Destruktiv-Farbe** (Undo `#dc2626`, Löschen). Da Rot zur
   Spieleridentität wird, wird Destruktiv **entfärbt** (zurückgenommener
   Outline-/Text-Button). Farbe bleibt der Spieleridentität vorbehalten.
2. **Rot/Schwarz darf nie allein tragen** — bei Rotblindheit erscheint Rot
   nahezu schwarz. Spielernamen und Position bleiben immer sichtbare,
   redundante Unterscheidungsmerkmale.

## Umfang

**Drin:**

- `src/screens/*.tsx` (alle 5) + `src/screens/PlayerStandRow.tsx`
- neues `src/theme/` (Tokens: Farbe, Abstand, Radius, Typo-Skala — für beide Schemata)
- neue, rein präsentationale Bausteine (z. B. Button, Surface/Card, Screen-Rahmen);
  ohne eigenen Zustand, ohne Logik, reine Props
- `app.json`: **eine** Zeile — `userInterfaceStyle` → `"automatic"`

**Draußen (jeweils eigenes Folge-Ticket, falls gewünscht):**

- `src/PlaceholderScreen.tsx` — toter Code (nur der eigene Test referenziert ihn).
  Löschen ist Aufräumarbeit für den `coding_agent`, kein Design.
- `App.tsx` — `Route`/`renderScreen` bleiben unangetastet. Ein rein
  präsentationaler Rahmen darf eingezogen werden, die Navigationslogik nicht.
- App-Icon und Splash (`assets/*.png`) — Rasterbild-Neuzeichnung, andere Disziplin.
- Manuelle Theme-Umschaltung in der App — wäre neues Control + Persistenz +
  neuer User-Flow, also `coding_agent`.
- Neue Dependencies (Custom Font, Animationsbibliothek) — `package.json` ist
  Build-Konfiguration.

## Akzeptanzkriterien

### Verhalten (stehende, nicht verhandelbare AC)

- [ ] **AC-0: Keine Verhaltensänderung.** Die 5 Screens, ihre Reihenfolge, die
      vorhandenen Bedienelemente und deren Wirkung sind identisch zu vorher.
      Keine Änderung an Logik, State, Persistenz, Datenfluss, Routing oder
      Formularverhalten.
- [ ] **AC-1:** Kein Test wird editiert, abgeschwächt oder gelöscht, um neues
      Markup passieren zu lassen. Die Suite ist so grün wie vorgefunden
      (`npm test`, `npm run lint`, `npm run typecheck`). Kippt ein Test auf
      einem Selektor, **stoppt** der Agent und meldet es.
- [ ] **AC-2:** Alle Accessibility-Rollen und -Namen bleiben unverändert — die
      Testsuite greift über `getByRole(..., { name })`, u. a. `'Alice +1'`,
      `'Zurück'`, `'Match starten'`, `'Editieren'`.

### Gestaltung

- [ ] **AC-3:** Es existiert ein einziges Token-Modul unter `src/theme/`; keine
      der 5 Screen-Dateien enthält danach noch literale Hex-Farbwerte.
- [ ] **AC-4:** Light- **und** Dark-Schema, gesteuert über `useColorScheme()`
      nach Systemeinstellung; `userInterfaceStyle` steht auf `"automatic"`.
      Das Dark-Schema ist keine Invertierung des Light-Schemas — insbesondere
      trägt „Schwarz" als Spieler-B-Identität im Light-Schema als dunkle
      Kontur/Typo, nicht als Fläche.
- [ ] **AC-5:** Beide Schemata erfüllen für Text und bedeutungstragende
      Elemente **mindestens WCAG AA**; die Kontrastwerte sind im Ergebnis
      benannt.
- [ ] **AC-6:** Die Rot/Schwarz-Spieleridentität ist konsistent über alle
      Screens durchgezogen, auf denen beide Spieler vorkommen, und nie das
      einzige Unterscheidungsmerkmal.
- [ ] **AC-7:** Auf `PointCounterScreen` ist der Punktestand aus ~1 m lesbar
      (deutlich größer als die bisherigen 48pt) und die Punktflächen erfüllen
      mindestens 44×44pt Trefferfläche.
- [ ] **AC-8:** Ziffern-Anzeigen verwenden `fontVariant: ['tabular-nums']`; der
      Score springt beim Hochzählen nicht in der Breite.
- [ ] **AC-9:** Ball-Orange erscheint ausschließlich als Statusakzent
      („hier bist du gerade"), nicht als allgemeine Dekorfarbe.
- [ ] **AC-10:** Bewegung nur mit dem eingebauten `Animated`, sparsam und
      bedeutungstragend (Punkt fällt, Satz-/Matchgewinn). Nichts Dauerlaufendes.
- [ ] **AC-11:** `package.json` bleibt unverändert (keine neuen Dependencies).
- [ ] **AC-12:** Das Ergebnis ist bei schmaler Viewport-Breite geprüft, nicht
      nur bei großer.

## Definition of Done

Design auf eigenem Branch, eigener PR geöffnet, Suite so grün wie vorgefunden,
Ergebnisbericht nennt Richtung, geänderte Dateien, Kontrastnachweis und die
bewusst nicht erledigten Logik-Folgethemen.
