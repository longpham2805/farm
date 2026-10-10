// Usage: node dev/shot.cjs <url> <out.png> [width] [height] [waitMs]
const { chromium } = require('playwright');
(async () => {
  const [url, out, w = '1280', h = '720', wait = '2500'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  const logs = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
  p.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await p.goto(url);
  await p.waitForTimeout(+wait);
  await p.screenshot({ path: out });
  if (logs.length) console.log(logs.slice(0, 15).join('\n'));
  await b.close();
})();
