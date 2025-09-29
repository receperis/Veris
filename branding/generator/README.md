Branding / Icon Generator
=========================

This folder contains supporting files for generating the browser extension icons.

Files moved here:

- `icon-generator.html` – In-browser canvas-based generator (no native deps)
- `generate_icons.py` – Optional script-based generator (requires Pillow + CairoSVG)
- `icons/` – Source SVG (`icon.svg`) and exported PNG renditions

Usage
-----
Open `icon-generator.html` in a browser (or via the dev static server) and download the required sizes:

Required by Chrome:
- 16, 32, 48, 128 px

Optional (store / marketing):
- 256, 440 px

After exporting, copy the PNGs (or keep symlinked path) under the top-level `icons/` referenced in `manifest.json`.

Manifest snippet:
```
"icons": {
  "16": "icons/icon16.png",
  "32": "icons/icon32.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

The SVG (`icon.svg`) is the single source of truth for design tweaks.

If you prefer automated generation, run:
```
python generate_icons.py
```
in this folder (after installing dependencies).

Dependencies for script mode:
```
pip install Pillow cairosvg
```

Notes
-----
- The current style is matte (gloss removed) with subtle depth.
- To revert to a glossy style, reintroduce rim light & gloss arcs (see git history).
