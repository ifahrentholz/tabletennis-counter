# Spec: Tischtennis-Zähler-App

## Problem Statement

Als Hobby-Tischtennisspieler möchte ich beim Spielen nicht im Kopf mitzählen
müssen, welcher Spieler wie viele Punkte, Sätze und Spiele gewonnen hat.
Zusätzlich verliere ich den Überblick über vergangene Matches, sobald ich das
Handy weglege bzw. die App schließe, weil es aktuell keine Möglichkeit gibt,
den Punktestand über mehrere Sitzungen hinweg zu behalten.

## Solution

Eine mobile App (React + Expo, läuft auf iOS und Android), die vor jedem
Match die Rahmenbedingungen abfragt (Punktegrenze pro Satz, Anzahl Sätze pro
Spiel, Anzahl Spiele pro Match, Namen der zwei Spieler), anschließend Punkte,
Sätze, Spiele und das Match automatisch nach offiziellen
Tischtennis-Zählregeln (inkl. Deuce) hochzählt und den Fortschritt lokal auf
dem Gerät persistiert. Eine Match-Übersicht listet alle bisherigen Matches
(laufend und beendet) auf; ein Match antippen lädt seinen aktuellen Stand.
Solange ein Match noch läuft, können Sätze- und Spiele-Stände manuell
korrigiert werden; ein abgeschlossenes Match ist unveränderlich (read-only).

## User Stories

1. Als Spieler möchte ich vor dem Match auswählen, ob ein Satz bis 11 oder
   bis 21 Punkte gezählt wird, damit die App die für mein Match gültige
   Zählweise verwendet.
2. Als Spieler möchte ich vor dem Match auswählen, wie viele gewonnene Sätze
   ein Spiel entscheiden (Presets 3/5/6/7, Standard 6), damit ich die Länge
   eines Spiels an meine Session anpassen kann.
3. Als Spieler möchte ich vor dem Match auswählen, wie viele gewonnene Spiele
   ein Match entscheiden (Presets 1/3/5, Standard 3), damit ich die Länge
   eines Matches an meine Session anpassen kann.
4. Als Spieler möchte ich vor dem Match Namen für Spieler A und Spieler B
   eingeben, damit ich die Spieler in der Übersicht und während des Spiels
   wiedererkenne.
5. Als Spieler möchte ich mit einem einzigen "Match starten"-Button aus einem
   Formular heraus loslegen, ohne mehrere Setup-Screens durchklicken zu
   müssen.
6. Als Spieler möchte ich während eines laufenden Satzes für jeden Spieler
   per Tastendruck einen Punkt hinzufügen, damit ich live mitzählen kann.
7. Als Spieler möchte ich einen zuletzt vergebenen Punkt per
   Minus-/Rückgängig-Button pro Spieler direkt zurücknehmen können, damit ich
   Vertipper sofort korrigieren kann, ohne extra in einen Editier-Modus zu
   wechseln.
8. Als Spieler möchte ich, dass ein Satz automatisch nach der offiziellen
   Deuce-Regel (Sieg erst mit mindestens 2 Punkten Vorsprung ab Erreichen der
   Punktegrenze) entschieden wird, damit die App echten Tischtennis-Regeln
   folgt.
9. Als Spieler möchte ich, dass die App automatisch erkennt, wenn ein Spieler
   die konfigurierte Anzahl Sätze gewonnen hat, und daraus automatisch ein
   gewonnenes Spiel ableitet.
10. Als Spieler möchte ich, dass die App automatisch erkennt, wenn ein
    Spieler die konfigurierte Anzahl Spiele gewonnen hat, und daraus
    automatisch das gewonnene Match ableitet.
11. Als Spieler möchte ich eine Match-Übersicht (Liste) sehen, in der jedes
    Match mit dem Namen von Spieler A und Spieler B angezeigt wird, damit ich
    meine Matches wiedererkenne.
12. Als Spieler möchte ich, dass die Match-Liste nach zuletzt geändert
    sortiert ist (neuestes zuerst), damit ich mein zuletzt gespieltes/
    laufendes Match sofort finde.
13. Als Spieler möchte ich ein Match aus der Liste antippen und dadurch
    dessen aktuellen Stand laden, damit ich ein unterbrochenes Match
    fortsetzen kann.
14. Als Spieler möchte ich, dass ein bereits abgeschlossenes Match beim
    Antippen nur das Endergebnis read-only anzeigt, damit ein fertiges
    Ergebnis nicht versehentlich verändert wird.
15. Als Spieler möchte ich innerhalb eines Matches in eine Spiele-Übersicht
    navigieren können, die den Spiele-Stand (gewonnene Spiele je Spieler)
    zeigt.
16. Als Spieler möchte ich von der Spiele-Übersicht in die Sätze-Übersicht
    eines einzelnen Spiels navigieren können, die den Sätze-Stand (gewonnene
    Sätze je Spieler in diesem Spiel) zeigt.
17. Als Spieler möchte ich von der Sätze-Übersicht in den laufenden
    Punktezähler des aktuellen/gewählten Satzes navigieren können.
18. Als Spieler möchte ich von jeder Ansicht jederzeit über einen
    Zurück-Button zur übergeordneten Ansicht zurückkehren können, ohne dass
    ich aktiv speichern muss (der Stand wird automatisch fortlaufend
    gesichert).
19. Als Spieler möchte ich, solange das Match noch nicht gewonnen ist, über
    einen dedizierten Editieren-Button in der Spiele-Übersicht den
    Spiele-Stand (Anzahl gewonnener Spiele je Spieler) manuell korrigieren
    können, um Fehler nachträglich geradezubiegen.
20. Als Spieler möchte ich, solange das Match noch nicht gewonnen ist, über
    einen dedizierten Editieren-Button in der Sätze-Übersicht eines Spiels
    den Sätze-Stand (Anzahl gewonnener Sätze je Spieler in diesem Spiel)
    manuell korrigieren können — auch für bereits abgeschlossene, frühere
    Spiele desselben Matches.
21. Als Spieler möchte ich, dass ein Match, sobald es beendet ist (ein
    Spieler hat die konfigurierte Anzahl Spiele erreicht), vollständig
    eingefroren (read-only) wird und in keiner Ansicht mehr editierbar ist —
    auch nicht über einen Button in der Match-Liste.
22. Als Spieler möchte ich ein Match aus der Liste löschen können (z. B. per
    Wisch-Geste), damit ich Fehlanlagen oder Testspiele wieder entfernen
    kann.
23. Als Spieler möchte ich, dass alle meine Matches lokal auf meinem Gerät
    gespeichert werden und beim Schließen und erneuten Öffnen der App
    weiterhin sichtbar sind, ohne dass ich mich einloggen muss.
24. Als Spieler möchte ich die App sowohl auf einem iPhone als auch auf
    einem Android-Telefon nutzen können.

## Implementation Decisions

- **Plattform/Stack:** React Native über Expo (Managed Workflow), Ziel iOS +
  Android. Keine Web-Zielplattform gefordert.
- **Persistenz:** Rein lokal auf dem Gerät (z. B. `expo-sqlite` oder
  AsyncStorage-basierte Lösung) — kein Backend, kein Account, kein
  Cloud-Sync. Die konkrete Storage-Library ist eine Implementierungs-
  entscheidung des Coding-Agents; Anforderung ist Persistenz über
  App-Neustarts hinweg.
- **Domänenmodell / Hierarchie:** `Match` besteht aus konfigurierten
  Einstellungen (`pointsToWin`: 11 | 21, `setsToWinGame`: Anzahl, aus Preset
  3/5/6/7, Standard 6, `gamesToWinMatch`: Anzahl, aus Preset 1/3/5, Standard
  3, `playerAName`, `playerBName`) sowie einer Liste von `Game`s (Spiele).
  Ein `Game` besteht aus einer Liste von `Set`s (Sätzen). Ein `Set` besteht
  aus einem laufenden Punktestand je Spieler.
- **Satz-Gewinnregel (Deuce):** Ein Satz ist gewonnen, sobald ein Spieler die
  Punktegrenze (11 oder 21) erreicht UND mindestens 2 Punkte Vorsprung hat.
  Steht es bei Punktegrenze−1 : Punktegrenze−1 (z. B. 10:10 bei 11), wird
  über die Punktegrenze hinaus weitergespielt, bis ein 2-Punkte-Vorsprung
  erreicht ist.
- **Automatische Aggregation:** Sobald ein Satz entschieden ist, wird der
  Sätze-Stand des aktuellen Spiels erhöht und automatisch geprüft, ob die
  konfigurierte `setsToWinGame`-Schwelle erreicht ist (→ Spiel gewonnen,
  Spiele-Stand des Matches erhöht sich, nächstes Spiel wird angelegt); sobald
  die `gamesToWinMatch`-Schwelle erreicht ist, ist das Match beendet.
- **Navigations-/Screen-Struktur:**
  1. Match-Liste (Startbildschirm)
  2. Setup-Formular (neues Match: alle 4 Einstellungen + "Match starten")
  3. Match-Detail / Spiele-Übersicht (Spiele-Stand je Spieler, Liste der
     Spiele, Editieren-Button für den Spiele-Stand)
  4. Spiel-Detail / Sätze-Übersicht (Sätze-Stand je Spieler innerhalb dieses
     Spiels, Liste der Sätze, Editieren-Button für den Sätze-Stand)
  5. Satz-Detail / Punktezähler (laufender Punktestand, +1/−1 je Spieler)
  - Von jedem Screen (3–5) führt ein Zurück-Button eine Ebene nach oben.
- **Editier-Modus:** Auf den Übersichts-Screens (3) und (4) gibt es je einen
  "Editieren"-Button, der einen Bearbeitungsmodus mit einem Stepper (+/−) für
  den jeweiligen aggregierten Stand (Spiele-Stand bzw. Sätze-Stand) öffnet.
  Änderungen überschreiben den gespeicherten Zählerstand direkt, **ohne**
  automatische Neuberechnung von Siegern auf höheren Ebenen. Der
  Editier-Button ist nur sichtbar/aktiv, solange das Match nicht beendet ist
  (kein Spieler hat `gamesToWinMatch` erreicht). Nach Match-Ende ist die
  gesamte Match-Hierarchie read-only, inklusive aller untergeordneten
  Spiele/Sätze — auch bereits vorher fertige Spiele bleiben dann nicht mehr
  editierbar.
- **Live-Punktekorrektur:** Auf dem Punktezähler-Screen (5) gibt es zusätzlich
  zum "+1" je Spieler einen "−1"/Rückgängig-Button je Spieler, nutzbar
  solange der Satz noch nicht entschieden ist. Dies ist unabhängig vom
  Editier-Modus der Übersichts-Screens.
- **Autosave:** Jede Zustandsänderung (Punkt, Satz-Ende, Spiel-Ende,
  Match-Ende, Editier-Korrektur) wird sofort persistiert. Es gibt keinen
  expliziten Speichern-Button.
- **Match-Liste:** Zeigt pro Eintrag `playerAName` vs. `playerBName|, sortiert
  nach letzter Änderung absteigend (neuestes zuerst). Tippen auf ein
  laufendes Match navigiert in dessen aktuellen Stand (Ebene 3). Tippen auf
  ein beendetes Match zeigt read-only das Endergebnis. Löschen eines Matches
  über eine Wisch-Geste/Löschen-Button aus der Liste heraus.
- **Spielernamen:** Freitext-Eingabefelder ohne Speicherung/Vorschlagsliste
  früherer Namen (kein Autocomplete, keine Spielerverwaltung).
- **Preset-Auswahl:** Punktegrenze, Sätze-pro-Spiel und Spiele-pro-Match
  werden über feste, antippbare Auswahloptionen gesetzt (kein Freitext-
  Zahlenfeld), um ungültige Werte zu verhindern.

## Testing Decisions

- Gute Tests prüfen ausschließlich beobachtbares Verhalten (z. B.: "nach N
  Punkten mit 2 Vorsprung ist der Satz gewonnen", "nach Erreichen der
  Sätze-Schwelle wird automatisch ein Spiel gewertet"), keine internen
  Implementierungsdetails.
- Zentraler Test-Seam: die **Scoring-Domänenlogik** (Punkt hinzufügen/
  zurücknehmen, Satz-/Spiel-/Match-Gewinnermittlung inkl. Deuce, manuelle
  Editier-Overrides, Sperr-Logik nach Match-Ende) sollte als reine,
  UI-unabhängige Funktion/Modul getestet werden — das ist der höchste
  sinnvolle Seam, da hier sämtliche Regelkomplexität sitzt und UI-Ebenen nur
  Darstellung/Navigation sind.
- Persistenz-Schicht (lokal Speichern/Laden von Matches) wird über ihre
  öffentliche Schnittstelle getestet (z. B. "gespeichertes Match nach
  Neuladen identisch abrufbar"), nicht über Storage-Interna.
- Da dies ein neues, leeres Repository ist, gibt es noch kein bestehendes
  Test-Vorbild im Projekt; der Coding-Agent etabliert die erste
  Test-Struktur (empfohlen: Jest + `@testing-library/react-native` für
  Komponenten, reine Unit-Tests für die Scoring-Logik).

## Out of Scope

- Mehrspieler-Modi über 2 Spieler hinaus (Doppel, Turniere).
- Cloud-Sync, Benutzerkonten, Mehrgeräte-Nutzung.
- Editieren/Korrigieren eines bereits vollständig beendeten Matches.
- Editieren einzelner historischer Punktestände abgeschlossener Sätze
  (nur aggregierte Sätze-/Spiele-Stände sind editierbar).
- Konfigurierbarkeit von `setsToWinGame`/`gamesToWinMatch` über die
  angebotenen Presets hinaus (freie Zahleneingabe).
- Speichern/Vorschlagen von Spielernamen aus früheren Matches.
- Aufschlagreihenfolge, Aufschlagwechsel-Anzeige, Zeitnahme oder sonstige
  über die Punkte-/Satz-/Spiel-/Match-Zählung hinausgehende
  Tischtennis-Regeln.
- Web-Zielplattform (nur iOS/Android über Expo).

## Further Notes

- Die Punktegrenze (11 oder 21) gilt für das gesamte Match einheitlich; sie
  wird nicht pro Satz neu gewählt.
- Die Presets für Sätze-pro-Spiel (3/5/6/7, Standard 6) und Spiele-pro-Match
  (1/3/5, Standard 3) wurden in Rücksprache mit dem Anwender festgelegt, auch
  wenn sie von den offiziellen ITTF-Regeln (üblich: Best-of-5/7 Sätze,
  keine "Spiele"-Ebene) abweichen — die App bildet eine bewusst erweiterte,
  dreistufige Zählhierarchie ab, die der Nutzer so gewünscht hat.
- Repository ist aktuell leer (nur `.git`, `agents/`) — dies ist ein
  Greenfield-Projekt ohne bestehenden Code, Domänenglossar oder ADRs.
