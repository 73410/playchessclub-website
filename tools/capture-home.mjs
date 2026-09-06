import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root, chromium, launchOptions, serve } from './browser-runtime.mjs';

// Run after changing geometry, camera stops or lighting. Covers are captured directly
// from the rendered WebGL canvas, without the website text or its contrast overlay.
const { server, url } = await serve();
const output = resolve(root, '.cache/home-qa');
await mkdir(output, { recursive: true });
let browser;
try {
  browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1, colorScheme: 'light' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://**/*', route => route.abort());
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector('[data-home-journey]').dataset.sceneState === 'ready');
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => window.PCCTheme.applyMode(theme, true), theme);
    await page.waitForTimeout(900);
    for (let chapter = 0; chapter < 4; chapter++) {
      await page.evaluate(chapter => {
        const j = document.querySelector('[data-home-journey]');
        const header = document.querySelector('pcc-header').getBoundingClientRect().height;
        const start = scrollY + j.getBoundingClientRect().top - header;
        scrollTo({ top: start + chapter / 3 * (j.offsetHeight - j.querySelector('canvas').clientHeight), behavior: 'instant' });
      }, chapter);
      await page.waitForFunction(chapter => document.querySelector('[data-home-journey]').dataset.activeStop === String(chapter), chapter);
      await page.waitForFunction(() => document.querySelector('.journey__canvas').dataset.cameraMoving === 'false');
      await page.screenshot({ path: resolve(output, `${theme}-${chapter + 1}.png`), animations: 'disabled' });
      if (chapter === 0) {
        const image = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
          resolve(document.querySelector('.journey__canvas').toDataURL('image/webp', 0.88));
        })));
        const data = Buffer.from(image.split(',')[1], 'base64');
        if (data.length < 10000) throw new Error('The rendered cover is unexpectedly empty');
        await writeFile(resolve(root, `assets/images/home/cover-${theme === 'light' ? 'day' : 'night'}.webp`), data);
      }
    }
  }
  await page.close();
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: 'light' });
  await mobile.route('https://**/*', route => route.abort());
  await mobile.goto(url);
  await mobile.waitForFunction(() => document.querySelector('[data-home-journey]').dataset.sceneState === 'ready');
  for (const chapter of [0, 2, 3]) {
    await mobile.evaluate(i => document.querySelectorAll('[data-journey-stop]')[i].scrollIntoView({ behavior: 'instant' }), chapter);
    await mobile.waitForFunction(i => document.querySelector('[data-home-journey]').dataset.activeStop === String(i), chapter);
    await mobile.waitForFunction(() => document.querySelector('.journey__canvas').dataset.cameraMoving === 'false');
    await mobile.screenshot({ path: resolve(output, `mobile-${chapter + 1}.png`), animations: 'disabled' });
  }
  console.log(JSON.stringify({ output, errors }, null, 2));
} finally {
  await browser?.close();
  server.close();
}
