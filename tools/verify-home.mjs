import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root, chromium, launchOptions, serve } from './browser-runtime.mjs';

const { server, url } = await serve();
const results = [];
let browser;
const state = page => page.locator('[data-home-journey]').getAttribute('data-scene-state');
const ready = page => page.waitForFunction(() => document.querySelector('[data-home-journey]').dataset.sceneState === 'ready');
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function newPage(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, colorScheme: 'light', ...options });
  page.errors = [];
  page.requests = [];
  page.on('pageerror', error => page.errors.push(error.message));
  page.on('request', request => page.requests.push(request.url()));
  // Existing feeds and embeds are unrelated to scene acceptance and stay offline.
  await page.route('https://**/*', route => route.abort());
  return page;
}

async function chapter(page, index) {
  await page.evaluate(index => document.querySelectorAll('[data-journey-stop]')[index].scrollIntoView({ behavior: 'instant' }), index);
  await page.waitForFunction(index => document.querySelector('[data-home-journey]').dataset.activeStop === String(index), index);
  await page.waitForFunction(() => document.querySelector('.journey__canvas').dataset.cameraMoving === 'false');
  await settle(page);
}

async function test(name, run) {
  try { await run(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}

try {
  browser = await chromium.launch(launchOptions);
  await test('Longer chapter travel and smoothly damped camera in both scroll directions', async () => {
    const page = await newPage();
    try {
      await page.goto(url); await ready(page);
      await page.waitForFunction(() => document.querySelector('[data-home-journey]').dataset.inView === 'true');
      const ratio = await page.evaluate(() => {
        const j = document.querySelector('[data-home-journey]');
        return j.querySelector('[data-journey-stop]').offsetHeight / j.querySelector('canvas').clientHeight;
      });
      assert.ok(Math.abs(ratio - 1.8) < 0.01);
      const samples = await page.evaluate(async () => {
        const canvas = document.querySelector('.journey__canvas');
        const j = document.querySelector('[data-home-journey]');
        document.querySelector('#landmarks').scrollIntoView({ behavior: 'instant' });
        const result = [];
        for (let i = 0; i < 5; i++) {
          await new Promise(requestAnimationFrame);
          result.push({ actual: Number(canvas.dataset.cameraProgress), target: Number(j.style.getPropertyValue('--journey-progress')) });
        }
        return result;
      });
      assert.ok(samples.some(s => s.actual > 0 && s.actual < s.target - 0.001), 'Camera must ease toward a new scroll position');
      assert.ok(samples.every((s, i) => !i || s.actual >= samples[i - 1].actual), 'Forward motion must not overshoot or reverse');
      await chapter(page, 2);
      const reverse = await page.evaluate(async () => {
        const canvas = document.querySelector('.journey__canvas');
        document.querySelector('#bridge').scrollIntoView({ behavior: 'instant' });
        const result = [];
        for (let i = 0; i < 5; i++) { await new Promise(requestAnimationFrame); result.push(Number(canvas.dataset.cameraProgress)); }
        return result;
      });
      assert.ok(reverse.some(p => p > 1 / 3 + 0.001 && p < 2 / 3), 'Reverse motion must ease too');
      assert.ok(reverse.every((p, i) => !i || p <= reverse[i - 1]));
      await chapter(page, 1);
      assert.ok(Math.abs(Number(await page.locator('canvas').getAttribute('data-camera-progress')) - 1 / 3) < 0.0001);
      assert.deepEqual(page.errors, []);
    } finally { await page.close(); }
  });
  await test('Exported GLB includes textures and water; 242 camera samples avoid solid blocks', async () => {
    const page = await newPage();
    try {
      await page.goto(`${url}/tools/home-model.html`);
      await page.waitForFunction(() => typeof window.validateCameraPaths === 'function');
      const result = await page.evaluate(() => window.validateCameraPaths());
      assert.deepEqual(result.collisions, []);
      assert.equal(result.water, true);
      assert.ok(result.textures >= 20);
    } finally { await page.close(); }
  });
  await test('Four chapters, reverse scrolling, controls, and paused offscreen rendering', async () => {
    const page = await newPage();
    try {
      await page.addInitScript(() => {
        window.__drawCalls = 0;
        for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
          const original = WebGL2RenderingContext.prototype[name];
          WebGL2RenderingContext.prototype[name] = function(...args) { window.__drawCalls++; return original.apply(this, args); };
        }
      });
      await page.goto(url);
      await ready(page);
      assert.equal(await page.locator('[data-journey-stop]').count(), 4);
      for (const i of [0, 1, 2, 3, 2, 1, 0]) {
        await chapter(page, i);
        assert.equal(await page.locator('[data-journey-marker][aria-current]').count(), 1);
        assert.equal(await page.locator('[data-journey-marker]').nth(i).getAttribute('aria-current'), 'step');
      }
      await page.locator('[data-journey-marker]').nth(2).click();
      await page.waitForFunction(() => document.querySelector('[data-home-journey]').dataset.activeStop === '2');
      await page.locator('.journey__skip').click();
      await page.waitForFunction(() => document.querySelector('#about').getBoundingClientRect().top < 120);
      await page.evaluate(() => document.querySelector('#news').scrollIntoView({ behavior: 'instant' }));
      await page.waitForFunction(() => document.querySelector('[data-home-journey]').dataset.inView === 'false');
      const calls = await page.evaluate(() => window.__drawCalls);
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => window.__drawCalls), calls, 'GPU rendering must stop below the tour');
      await chapter(page, 0);
      await page.waitForFunction(calls => window.__drawCalls > calls, calls);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(page.requests.filter(url => url.endsWith('.glb')).length, 1);
      assert.deepEqual(page.errors, []);
    } finally { await page.close(); }
  });

  await test('Theme controls, persistence, system changes, and unchanged camera progress', async () => {
    const page = await newPage();
    try {
      await page.goto(url); await ready(page); await chapter(page, 2);
      const before = await page.locator('[data-home-journey]').evaluate(j => j.style.getPropertyValue('--journey-progress'));
      // Chromium's DOM.scrollIntoViewIfNeeded (used by locator.click) scrolls
      // the document even for an already visible sticky header. Use actual pointer
      // coordinates so the test does not itself change camera progress.
      const toggle = await page.locator('[data-theme-toggle]').boundingBox();
      assert.ok(toggle.y >= 0 && toggle.y + toggle.height < 100);
      await page.mouse.click(toggle.x + toggle.width / 2, toggle.y + toggle.height / 2);
      await page.waitForFunction(() => document.querySelector('.theme-menu').classList.contains('is-open'));
      const option = await page.locator('[data-theme-option="dark"]').boundingBox();
      await page.mouse.click(option.x + option.width / 2, option.y + option.height / 2);
      await page.waitForFunction(() => document.querySelector('[data-home-journey]').dataset.sceneTheme === 'dark');
      assert.equal(await page.locator('[data-home-journey]').evaluate(j => j.style.getPropertyValue('--journey-progress')), before);
      await page.reload(); await ready(page);
      assert.equal(await page.locator('[data-home-journey]').getAttribute('data-scene-theme'), 'dark');
      await page.evaluate(() => PCCTheme.applyMode('system', true));
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForFunction(() => document.querySelector('[data-home-journey]').dataset.sceneTheme === 'dark');
      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForFunction(() => document.querySelector('[data-home-journey]').dataset.sceneTheme === 'light');
      assert.equal(page.requests.filter(url => url.endsWith('.glb')).length, 2, 'Theme changes must not reload the model');
      assert.deepEqual(page.errors, []);
    } finally { await page.close(); }
  });

  await test('Mobile chapters, 320px width, orientation, and navigation menu', async () => {
    const page = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      await page.goto(url); await ready(page);
      for (const i of [0, 1, 2, 3]) await chapter(page, i);
      await page.locator('.menu-toggle').click();
      assert.equal(await page.locator('#site-navigation').getAttribute('data-open'), 'true');
      await page.keyboard.press('Escape');
      await page.setViewportSize({ width: 320, height: 640 }); await settle(page);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForFunction(() => document.querySelector('[data-home-journey]').dataset.sceneState === 'short-viewport');
      assert.equal(await page.locator('.journey--enhanced').count(), 0);
      await page.setViewportSize({ width: 390, height: 844 }); await ready(page);
      assert.deepEqual(page.errors, []);
    } finally { await page.close(); }
  });

  await test('Reduced motion skips WebGL and can change during a tour', async () => {
    const page = await newPage({ reducedMotion: 'reduce' });
    try {
      await page.goto(url);
      assert.equal(await state(page), 'reduced-motion');
      assert.equal(page.requests.some(url => url.endsWith('.glb') || url.includes('/vendor/three/')), false);
      assert.equal(await page.locator('[data-journey-stop]').count(), 4);
      await page.emulateMedia({ reducedMotion: 'no-preference' }); await ready(page); await chapter(page, 2);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.querySelector('[data-home-journey]').dataset.sceneState === 'reduced-motion');
      assert.equal(await page.locator('.journey--enhanced').count(), 0);
      assert.ok(Math.abs(await page.locator('#landmarks').evaluate(s => s.getBoundingClientRect().top) - 72) < 6, 'Keep the current reading chapter during fallback');
      assert.deepEqual(page.errors, []);
    } finally { await page.close(); }
  });

  for (const blocked of ['model', 'engine']) {
    await test(`Static fallback when ${blocked} fails`, async () => {
      const page = await newPage();
      try {
        await page.route(blocked === 'model' ? '**/*.glb' : '**/three.module.min.js', route => route.abort());
        await page.goto(url);
        await page.waitForFunction(() => document.querySelector('[data-home-journey]').dataset.sceneState === 'fallback');
        assert.equal(await page.locator('.journey--enhanced').count(), 0);
        assert.equal(await page.locator('#riverside a').count(), 3);
        assert.equal(await page.locator('#together').evaluate(s => getComputedStyle(s).position), 'relative');
        const cover = await page.locator('.journey__cover').evaluate(el => getComputedStyle(el).backgroundImage);
        assert.ok(cover.includes('cover-day.webp'));
        assert.deepEqual(page.errors, []);
      } finally { await page.close(); }
    });
  }

  await test('No WebGL support and context loss both leave the page usable', async () => {
    const unsupported = await newPage();
    try {
      await unsupported.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
      });
      await unsupported.goto(url);
      await unsupported.waitForFunction(() => document.querySelector('[data-home-journey]').dataset.sceneState === 'fallback');
      assert.equal(await unsupported.locator('.journey--enhanced').count(), 0);
    } finally { await unsupported.close(); }
    const page = await newPage();
    try {
      await page.goto(url); await ready(page); await chapter(page, 1);
      await page.evaluate(() => document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
      await page.waitForFunction(() => document.querySelector('[data-home-journey]').dataset.sceneState === 'context-lost');
      assert.equal(await page.locator('.journey--enhanced').count(), 0);
      assert.equal(await page.locator('#about').isVisible(), true);
      assert.deepEqual(page.errors, []);
    } finally { await page.close(); }
  });

  await test('Delayed model does not move a reader out of the following content', async () => {
    const page = await newPage();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    try {
      await page.route('**/*.glb', async route => { await gate; await route.continue(); });
      await page.goto(url);
      await page.evaluate(() => document.querySelector('#news').scrollIntoView({ behavior: 'instant' }));
      const before = await page.locator('#news').evaluate(s => s.getBoundingClientRect().top);
      release();
      await ready(page); await settle(page);
      const after = await page.locator('#news').evaluate(s => s.getBoundingClientRect().top);
      assert.ok(Math.abs(before - after) < 5, `Reading position moved by ${after - before}px`);
      assert.deepEqual(page.errors, []);
    } finally { release(); await page.close(); }
  });

  await test('Subdirectory deployment resolves local scene assets and navigation', async () => {
    const page = await newPage();
    const failures = [];
    page.on('response', r => { if (r.url().startsWith(url) && r.status() >= 400) failures.push(r.url()); });
    try {
      await page.goto(`${url}/preview/`); await ready(page);
      assert.ok(page.requests.some(url => url.endsWith('/preview/assets/models/home/pcc-riverside.glb')));
      assert.ok((await page.locator('.journey__text-link').first().getAttribute('href')) === 'mail/');
      assert.ok((await page.locator('.brand').first().getAttribute('href')).endsWith('/preview/'));
      assert.deepEqual(failures, []);
      assert.deepEqual(page.errors, []);
    } finally { await page.close(); }
  });

  await test('Without JavaScript, the cover, four chapters and join links remain readable', async () => {
    const page = await newPage({ javaScriptEnabled: false });
    try {
      await page.goto(url);
      assert.equal(await page.locator('.journey--enhanced').count(), 0);
      assert.equal(await page.locator('[data-journey-stop]').count(), 4);
      assert.equal(await page.locator('#riverside a').count(), 3);
      await page.screenshot({ path: resolve(root, '.cache/home-qa/no-js.png'), animations: 'disabled' });
    } finally { await page.close(); }
  });
} finally {
  await browser?.close(); server.close();
  await mkdir(resolve(root, '.cache/home-qa'), { recursive: true });
  await writeFile(resolve(root, '.cache/home-qa/results.json'), JSON.stringify(results, null, 2));
}
console.log(`${results.filter(r => r.passed).length}/${results.length} browser scenarios passed`);
if (results.some(r => !r.passed)) process.exitCode = 1;
