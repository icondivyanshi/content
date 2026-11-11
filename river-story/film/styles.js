// Renders style-options/*.png from styles.html: the same story moment in four art styles.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  p.on('pageerror', (e) => console.error(e));
  await p.goto('file://' + path.join(__dirname, 'styles.html'));
  const names = ['madhubani', 'gond', 'warli', 'shadow'];
  for (const [i, n] of names.entries()) { await p.evaluate((n) => window.drawStyle(n), n); await p.screenshot({ path: path.join(__dirname, 'style-options', `${i + 1}-${n}.png`) }); }
  await b.close(); console.log('done');
})();
