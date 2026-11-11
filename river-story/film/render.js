// Renders film.html to river-story.mp4 (1080x1080, 30 fps) with the synthesized soundtrack.
//   node render.js                 full render
//   node render.js --stills=3,12   save PNG stills at those seconds (for checking) and exit
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  await p.goto('file://' + path.join(__dirname, 'film.html'));
  await p.evaluate(() => window.READY);
  const film = await p.evaluate(() => window.FILM);
  const grab = async (f) => {
    const url = await p.evaluate((f) => { window.drawFrame(f); return document.getElementById('cv').toDataURL('image/jpeg', 0.93); }, f);
    return Buffer.from(url.split(',')[1], 'base64');
  };

  const stills = process.argv.find((a) => a.startsWith('--stills='));
  if (stills) {
    const dir = process.argv.find((a) => a.startsWith('--out='))?.slice(6) || path.join(__dirname, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const s of stills.slice(9).split(',')) fs.writeFileSync(path.join(dir, `t${s}.jpg`), await grab(Math.round(parseFloat(s) * film.FPS)));
    await b.close(); console.log('stills ->', dir); return;
  }

  fs.writeFileSync(path.join(__dirname, 'cues.json'), JSON.stringify(film));
  execFileSync('node', [path.join(__dirname, 'audio.js')], { stdio: 'inherit' });

  const out = path.join(__dirname, 'river-story.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(film.FPS), '-i', '-',
    '-i', path.join(__dirname, 'soundtrack.wav'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.round(film.TOTAL * film.FPS);
  for (let f = 0; f < N; f++) {
    const buf = await grab(f);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${N}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await b.close();
  console.log('wrote', out);
})();
