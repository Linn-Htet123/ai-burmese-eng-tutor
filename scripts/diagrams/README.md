# Diagram tooling

The `.excalidraw` files under `docs/technical-designs/diagrams/` are the source of truth. The `.svg` files are generated previews for GitHub.

## Regenerate an SVG from an .excalidraw file

Requires Node 20 and Google Chrome installed.

```bash
# one-off setup (installs puppeteer-core + the excalidraw browser bundle)
nvm use 20
npm install -g puppeteer-core @excalidraw/excalidraw

# render one file
node scripts/diagrams/render-excalidraw.js \
  docs/technical-designs/diagrams/product-overview-architecture.excalidraw \
  docs/technical-designs/diagrams/product-overview-architecture.svg

# render all
for f in docs/technical-designs/diagrams/*.excalidraw; do
  node scripts/diagrams/render-excalidraw.js "$f" "${f%.excalidraw}.svg"
done
```

## How the renderer works

`render-excalidraw.js` boots headless Chrome, loads the Excalidraw browser bundle from unpkg, calls `ExcalidrawLib.exportToSvg(scene)` with our JSON, and writes the SVG. No native dependencies (the `excalidraw_export` npm package needs `canvas` which won't build on Node 22).

## Authoring diagrams

Two options:

1. **Edit visually.** Drag the `.excalidraw` file onto <https://excalidraw.com>. Save back to the same path. Re-run the renderer.
2. **Generate from a Python spec.** For consistency across many diagrams, use the helper in `exc_build.py`:

   ```python
   from exc_build import Scene
   s = Scene(width=1600, height=1000)
   s.title("My diagram")
   s.rect("box1", 100, 200, 220, 120, "A box", color="blue")
   s.rect("box2", 500, 200, 220, 120, "Another box", color="green")
   s.arrow("box1", "box2", label="talks to")
   s.write("path/to/output.excalidraw")
   ```

Color palette (semantic — keep it consistent):

| color | for |
|---|---|
| `blue` | learner / founder / any person |
| `green` | our services and backend code |
| `cyan` | data stores (Postgres tables) |
| `yellow` | external AI / paywall / decisions |
| `pink` | file storage (R2) / errors / terminal states |
| `purple` | notifications / integrations |
| `grey` | observability / outside-the-system arrows |
| `boundary` | dashed platform boundaries (Railway, etc.) |
