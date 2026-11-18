# Kristallwacht – Maze TD

Tower-Defense-Browserspiel, in dem man das Labyrinth frei selbst baut.
Live-Version: https://kristallwacht.netlify.app

Das Spiel wird als **eine einzige HTML-Datei** ausgeliefert, damit es komplett offline läuft.
Zum Weiterentwickeln liegt es aufgeteilt in `src/`.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `src/index.html` | Seitengerüst: Menüs, Fenster, Spielfeld, Icon-Symbole |
| `src/spiel.js` | Die komplette Spiellogik (Türme, Gegner, Labyrinth, Level, Werkstatt, Booster, Sound) |
| `src/ios-bedienung.js` | Kleine iPhone/iPad-Anpassungen (kein Doppeltipp-Zoom, Barrierefreiheit) |
| `src/style.css` | Hauptgestaltung |
| `src/lesbarkeit.css` | Schrift und Kontrast (bessere Lesbarkeit) |
| `src/comic.css` | Blauer Comic-Stil für Menü und Fenster |
| `src/assets/` | Bilder (Türme, Gegner, Emmi, Hintergründe, Icons) und die Spiele-Schrift |
| `src/assets/audio/` | Soundeffekte und Musik (`.m4a`) |
| `build.py` | Baut aus `src/` wieder die eine spielbare Datei |
| `dist/Kristallwacht.html` | Fertig gebaute Datei zum Spielen und für Netlify |

## Bauen

```
python3 build.py
```

Ergebnis: `dist/Kristallwacht.html`. Diese Datei auf Netlify hochladen oder direkt öffnen.
`src/` ist nicht direkt spielbar, weil die Sounds erst beim Bauen eingesetzt werden.

## Labyrinth-Bau (ab V26)

- Erste Karte (Grüne Lichtung) 11 × 17 Felder, alle anderen 15 × 23 (`scaleMaps` überträgt die Karten).
- Gegner laufen nur gerade (keine Diagonalen) – siehe `NBM`.
- Mauer antippen → umbauen zu **Tor** (im Kampf auf/zu), **Dornmauer** oder **Kristallmauer** (`WK`).
- **Fallen** (`TRAPS`): Stachel, Teer, Glut – liegen auf dem Weg, blockieren nicht, max. 8 pro Runde.
- **Baupläne** im Pausemenü: Mauern je Karte speichern und wieder aufbauen (`meta.bp`).

## Grafiken und Designvorlage

`grafiken/` enthält das Grafikpaket: Stilvorgabe (`CANVA_STILVORGABE.md`), Designvorlage „Drei Welten“
(Gezeitenhafen, Uhrwerkgarten, Pilzkathedrale), Bildtafeln, alle Spielgrafiken und Galerie (`Galerie.html`).
Die Karte **Uhrwerkgarten** (Draufsicht, Hecken) ist der erste Schritt in Richtung dieser Vorlage.

## Wichtige Spielregeln für Änderungen

- Komplett offline spielbar – keine Dateien aus dem Internet nachladen.
- Labyrinth frei baubar: keine Pflichtpunkte, keine vorgegebenen Mauern, kein festes Mauer-Budget.
- Läuft auf iPhone und iPad in allen Bildschirmgrößen.
- Balance ist sehr wichtig – Änderungen an Werten bewusst und sparsam.
