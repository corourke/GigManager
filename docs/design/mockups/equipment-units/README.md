# Equipment items and units: mockups (#162)

Mockups of the 11 screens affected by splitting **what it is** (`equipment_items`, new) from **what we own** (`assets` as units and lots). Nothing here is built; these are for Cameron's review.

- Open [`index.html`](./index.html) in a browser. Each screen is one self-contained HTML file (CSS inlined), with a 1440 px PNG in [`png/`](./png/).
- Each screen ends with "What changes and why". Pink numbered dots and the dark banner are mockup chrome, not part of the design.
- They use the app's tokens and class strings ([STYLE_GUIDE](../../STYLE_GUIDE.md), [component sheet](../../component-sheet/index.html)).

## Editing

The HTML is generated: edit `_src/pages/*.mjs` (and the shared `_src/lib.mjs`, `_src/data.mjs`), then rebuild:

```bash
cd docs/design/mockups/equipment-units/_src
npm i --no-save @tailwindcss/cli@4.1.13 tailwindcss@4.1.13 playwright-core@1.56.1
node build.mjs            # HTML + PNGs (Chromium at /opt/pw-browsers, or set CHROMIUM_PATH)
node build.mjs --no-png   # HTML only
```
