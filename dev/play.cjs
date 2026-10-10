// Scripted play-through. Usage: node dev/play.cjs <scenario> <outdir> [w] [h]
const { chromium } = require('playwright');
const scenarios = require('./scenarios.cjs');
(async () => {
  const [name, out, w = '1280', h = '720'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: +w < 700 });
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', (m) => { if (m.type() === 'error') logs.push(`[error] ${m.text()}`); });
  p.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
  await p.goto(process.env.URL || 'http://localhost:5173/');
  await p.waitForFunction(() => window.farm, null, { timeout: 15000 });
  await p.waitForTimeout(800);
  let n = 0;
  const shot = async (label) => { await p.screenshot({ path: `${out}/${name}-${String(++n).padStart(2, '0')}-${label}.png` }); };
  try {
    await scenarios[name](p, shot);
  } catch (e) {
    logs.push(`[scenario] ${e.message}`);
    await shot('fail');
  }
  if (logs.length) console.log(logs.slice(0, 20).join('\n'));
  await b.close();
})();
