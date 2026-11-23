// usage: node render.js preview t1 t2 ...   |   node render.js full
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const { TOTAL, FPS, VIDEO_END } = require('./timeline.js');
const DIR = __dirname;
const NFR = fs.readdirSync(path.join(DIR, 'frames')).filter(f => f.endsWith('.jpg')).length;

(async () => {
  const mode = process.argv[2];
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGEERR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()) });
  await page.goto('file://' + path.join(DIR, 'index.html'));
  await page.evaluate(async () => {
    const fams = ["Anton", "800 72px Brico", "700 30px Brico", "Brush", "Marker", "700 30px Mono", "700 30px DM", "400 30px DM", "64px 'Noto Color Emoji'"];
    for (const f of fams) await document.fonts.load(f.includes('px') ? f : `40px ${f}`, 'ABC₹✓✗🎓⚡');
    await window.ready;
  });
  const frameFor = t => { const i = Math.min(NFR, Math.max(1, Math.floor(t * FPS) + 1)); return 'frames/' + String(i).padStart(5, '0') + '.jpg'; };
  if (mode === 'preview') {
    fs.mkdirSync(path.join(DIR, 'preview'), { recursive: true });
    for (const ts of process.argv.slice(3)) {
      const t = parseFloat(ts);
      await page.evaluate(([t, s]) => window.render(t, s), [t, frameFor(Math.min(t, VIDEO_END - 0.01))]);
      await page.screenshot({ path: path.join(DIR, 'preview', `p_${ts}.jpg`), type: 'jpeg', quality: 80 });
    }
  } else {
    const out = path.join(DIR, 'out'); fs.mkdirSync(out, { recursive: true });
    const N = Math.round(TOTAL * FPS);
    // render sequentially (state like built caption chunk is reused between frames)
    for (let f = 0; f < N; f++) {
      const t = f / FPS;
      await page.evaluate(([t, s, f]) => window.render(t, s, f), [t, frameFor(Math.min(t, VIDEO_END - 0.01)), f]);
      await page.screenshot({ path: path.join(out, String(f + 1).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 93 });
      if (f % 60 === 0) console.log('frame', f, '/', N);
    }
  }
  await browser.close();
})();
