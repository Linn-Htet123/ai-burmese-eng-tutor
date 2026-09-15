// Render an .excalidraw file to SVG using headless Chrome + the Excalidraw browser bundle.
// Usage: node render-excalidraw.js <input.excalidraw> <output.svg>
//
// Requires:
//   - Node 20
//   - Google Chrome at /Applications/Google Chrome.app (edit CHROME_PATH for other platforms)
//   - `npm install -g puppeteer-core`  (loaded via NODE_PATH)

const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const [,, inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error('Usage: node render-excalidraw.js <input.excalidraw> <output.svg>');
  process.exit(1);
}
const scene = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@excalidraw/excalidraw@0.17.6/dist/excalidraw.production.min.js"></script>
</head>
<body>
<script>
(async () => {
  try {
    const scene = ${JSON.stringify(scene)};
    const svg = await ExcalidrawLib.exportToSvg({
      elements: scene.elements,
      appState: {
        ...scene.appState,
        exportBackground: true,
        viewBackgroundColor: '#ffffff',
        exportPadding: 20,
      },
      files: scene.files || {},
    });
    window.__svg = svg.outerHTML;
  } catch (e) {
    window.__err = e.message + ' :: ' + e.stack;
  }
})();
</script>
</body></html>`;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 5000));
  const svg = await page.evaluate(() => window.__svg || null);
  const err = await page.evaluate(() => window.__err || null);
  await browser.close();
  if (err) { console.error('Render error:', err); process.exit(2); }
  if (!svg) { console.error('No SVG produced (waited 5s)'); process.exit(3); }
  fs.writeFileSync(outputPath, svg);
  console.log('OK ->', outputPath, `(${svg.length} bytes)`);
})();
