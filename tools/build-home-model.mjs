import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root, chromium, launchOptions, serve } from './browser-runtime.mjs';

const { server, url } = await serve();
let browser;
try {
  browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  page.on('pageerror', error => console.error(error));
  await page.goto(`${url}/tools/home-model.html`);
  await page.waitForFunction(() => typeof window.generateModel === 'function');
  const { base64, ...stats } = await page.evaluate(() => window.generateModel());
  if (stats.instances !== stats.sourceBlocks) throw new Error('GLB round-trip lost block instances');
  const output = resolve(root, 'assets/models/home');
  await mkdir(output, { recursive: true });
  const data = Buffer.from(base64, 'base64');
  await writeFile(resolve(output, 'pcc-riverside.glb'), data);
  console.log(JSON.stringify({ ...stats, bytes: data.length }, null, 2));
} finally {
  await browser?.close();
  server.close();
}
