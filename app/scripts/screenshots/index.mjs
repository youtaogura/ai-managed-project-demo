// pnpm shots [画面名...] — expo export (web) → 配信 → Playwright で撮影。出力は app/.screenshots/
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

import scenesModule from './scenes.cjs';
import seedModule from './seed.cjs';
import serverModule from './server.cjs';

const { STORAGE_KEYS, NDL_SEARCH_URL, parseSceneArgs } = scenesModule;
const { makeNdlSearchXml } = seedModule;
const { createStaticServer } = serverModule;

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const distDir = join(appRoot, 'dist');
const outDir = join(appRoot, '.screenshots');
const SETTLE_MS = 300;
const WAIT_MS = 15000;

class SceneError extends Error {
  constructor(scene, message) {
    super(`[${scene}] ${message}`);
    this.name = 'SceneError';
  }
}

async function shoot(browser, baseUrl, scene) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'ja-JP',
  });
  try {
    const data = scene.data();
    const entries = {};
    if (data.records) entries[STORAGE_KEYS.records] = JSON.stringify(data.records);
    if (data.shelves) entries[STORAGE_KEYS.shelves] = JSON.stringify(data.shelves);
    if (data.lastExportedAt) entries[STORAGE_KEYS.lastExportedAt] = data.lastExportedAt;
    for (const [recordId, draft] of Object.entries(data.writeDrafts ?? {})) {
      entries[`${STORAGE_KEYS.writeDraftPrefix}${recordId}`] = JSON.stringify(draft);
    }
    await context.addInitScript((items) => {
      for (const [key, value] of Object.entries(items)) window.localStorage.setItem(key, value);
    }, entries);

    const page = await context.newPage();
    if (scene.search) {
      const xml = makeNdlSearchXml(scene.search.results);
      await page.route(NDL_SEARCH_URL, (route) =>
        route.fulfill({ status: 200, contentType: 'application/xml; charset=utf-8', body: xml }),
      );
    }
    await page.goto(`${baseUrl}${scene.url}`);
    await page.evaluate(() => document.fonts.ready);
    for (const action of scene.actions ?? []) {
      const target =
        'label' in action ? page.getByLabel(action.label, { exact: true }) : page.getByText(action.text, { exact: true });
      try {
        if ('fill' in action) await target.first().fill(action.fill, { timeout: WAIT_MS });
        else await target.first().click({ timeout: WAIT_MS });
      } catch {
        throw new SceneError(scene.name, `操作の対象が見つかりません: ${JSON.stringify(action)}`);
      }
      await page.waitForTimeout(SETTLE_MS);
    }
    if (scene.search) {
      try {
        await page.getByLabel('タイトルのキーワード', { exact: true }).fill(scene.search.keyword, { timeout: WAIT_MS });
        await page.getByText('検索', { exact: true }).first().click({ timeout: WAIT_MS });
      } catch {
        throw new SceneError(scene.name, '検索の操作ができませんでした');
      }
    }
    try {
      await page.getByText(scene.waitFor, { exact: false }).first().waitFor({ timeout: WAIT_MS });
    } catch {
      throw new SceneError(scene.name, `「${scene.waitFor}」が表示されませんでした（${scene.url}）`);
    }
    await page.waitForTimeout(SETTLE_MS);
    await page.screenshot({ path: join(outDir, `${scene.name}.png`), fullPage: true });
  } finally {
    await context.close();
  }
}

async function main() {
  const scenes = parseSceneArgs(process.argv.slice(2));
  execFileSync('npx', ['expo', 'export', '--platform', 'web'], { cwd: appRoot, stdio: 'inherit' });
  mkdirSync(outDir, { recursive: true });

  const server = createStaticServer(distDir);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });

  const failures = [];
  try {
    for (const scene of scenes) {
      try {
        await shoot(browser, baseUrl, scene);
        console.log(`撮影: .screenshots/${scene.name}.png`);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (failures.length > 0) {
    console.error(`失敗 ${failures.length} 件:\n${failures.map((f) => `  - ${f}`).join('\n')}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
