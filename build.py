"""Baut aus src/ wieder eine einzige, offline spielbare HTML-Datei.

Aufruf:  python3 build.py            -> dist/Kristallwacht.html
         python3 build.py ziel.html  -> eigene Zieldatei

- <link rel="stylesheet" href="X.css" ...> wird zu <style ...>Inhalt</style>
- <script src="X.js"></script> wird zu <script>Inhalt</script>
- Jeder Verweis "assets/<datei>" aus assets/manifest.json wird zu einer data:-URI
- /*@build:audio*/ in spiel.js wird mit den Sounds aus assets/audio/ gefüllt
  (Reihenfolge laut assets/audio/reihenfolge.json)

src/ selbst ist nicht direkt spielbar (Sounds fehlen dort) – immer die gebaute Datei nehmen.
"""
import base64, json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")


def read(name):
    with open(os.path.join(SRC, name), encoding="utf-8", newline="") as f:
        return f.read()


def build():
    html = read("index.html")

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)"((?:\s[^>]*)?)>',
                  lambda m: f"<style{m.group(2)}>{read(m.group(1))}</style>", html)
    html = re.sub(r'<script src="([^"]+)"></script>',
                  lambda m: f"<script>{read(m.group(1))}</script>", html)

    with open(os.path.join(SRC, "assets", "manifest.json"), encoding="utf-8") as f:
        manifest = json.load(f)
    uris = {}
    for name, mime in manifest.items():
        with open(os.path.join(SRC, "assets", name), "rb") as f:
            uris["assets/" + name] = f"data:{mime};base64," + base64.b64encode(f.read()).decode()
    pattern = re.compile("|".join(re.escape(k) for k in sorted(uris, key=len, reverse=True)))
    html = pattern.sub(lambda m: uris[m.group(0)], html)

    # Sounds: /*@build:audio*/ wird zur Liste  "name":"<base64>"  aus assets/audio/
    audio_dir = os.path.join(SRC, "assets", "audio")
    with open(os.path.join(audio_dir, "reihenfolge.json"), encoding="utf-8") as f:
        order = json.load(f)
    entries = []
    for key in order:
        with open(os.path.join(audio_dir, key + ".m4a"), "rb") as f:
            entries.append(f'  "{key}":"' + base64.b64encode(f.read()).decode() + '"')
    html = html.replace("/*@build:audio*/", ",\n".join(entries), 1)
    return html


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "dist", "Kristallwacht.html")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="") as f:
        f.write(build())
    print("Fertig:", out, f"({os.path.getsize(out) / 1e6:.1f} MB)")
