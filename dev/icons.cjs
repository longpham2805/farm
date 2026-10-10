// Renders the PWA icons into public/icons. Run: node dev/icons.cjs
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const svg = require('./icon-svg.cjs');
(async () => {
  const out = path.join(__dirname, '..', 'public', 'icons');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'icon.svg'), svg(false));
  const b = await chromium.launch();
  const p = await b.newPage();
  const shots = [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['maskable-512.png', 512, true], ['apple-touch-icon.png', 180, true]];
  for (const [name, size, full] of shots) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg(full)}`);
    await p.screenshot({ path: path.join(out, name), omitBackground: true });
  }
  await b.close();
  console.log('icons written to', out);
})();
