const assert = require('node:assert/strict');
const { chromium, firefox, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = process.env.BROWSER_ENGINE || 'firefox';
const base = process.env.BASE_URL || 'http://127.0.0.1:3100';

(async () => {
  const browser = await ({ chromium, firefox, webkit }[engine]).launch({ headless: true, ...(engine === 'chromium' && process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => dialog.accept());
  page.setDefaultTimeout(15000);
  const pass = (name) => console.log(`PASS ${engine}: ${name}`);
  const emptyStudio = () => page.getByRole('heading', { name: 'METAFORGE', exact: true });
  const waitView = async (view, loaded = false) => {
    if (view === 'studio') return loaded ? page.getByRole('button', { name: 'Download image', exact: true }).waitFor() : emptyStudio().waitFor();
    const heading = { dashboard: 'MetaForge SaaS Operations Console', compare: loaded ? 'Side-by-Side Metadata Difference & Live Editor' : 'Compare Requires 2+ Images', presets: 'Metadata & SEO Presets Manager', jobs: 'Background Batch Processing Queue' }[view];
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
  };
  const navigate = async (view, width, loaded = false) => {
    const desktop = { dashboard: 'Dashboard', studio: 'Studio Workstation', compare: 'Metadata Compare', presets: 'Presets Manager', jobs: 'Batch Processing' };
    const mobile = { dashboard: 'Home', studio: 'Studio', compare: 'Compare', presets: 'Presets' };
    if (width < 768 && view === 'jobs') {
      await page.getByRole('button', { name: 'More', exact: true }).click();
      await page.getByRole('dialog', { name: 'More tools' }).getByRole('link', { name: /Batch Queue/ }).click();
    } else if (width < 768) await page.getByRole('navigation', { name: 'Mobile Navigation' }).getByRole('link', { name: mobile[view], exact: true }).click();
    else await page.getByTitle(desktop[view], { exact: true }).click();
    await waitView(view, loaded);
    assert.equal(new URL(page.url()).searchParams.get('view'), view === 'studio' ? null : view);
  };
  try {
    await page.goto(base, { timeout: 60000 });
    for (const view of ['dashboard', 'compare', 'presets', 'jobs', 'studio']) await navigate(view, 1440);
    pass('all main navigation links update the URL and visible view');
    await navigate('dashboard', 1440);
    await page.getByRole('link', { name: /METAFORGE/ }).click(); await emptyStudio().waitFor();
    await navigate('compare', 1440);
    await page.getByRole('link', { name: 'Docs', exact: true }).click();
    await page.getByRole('link', { name: 'Back to Studio', exact: true }).click(); await emptyStudio().waitFor();
    pass('brand and Docs return links always return to Studio');
    await navigate('dashboard', 1440); await navigate('presets', 1440);
    await page.goBack(); await waitView('dashboard'); await page.goForward(); await waitView('presets');
    await page.waitForURL('**/?view=presets'); await page.waitForLoadState('networkidle');
    await page.reload({waitUntil:'domcontentloaded'}); await waitView('presets');
    pass('browser Back, Forward, reload and direct workspace URLs');
    await page.goto(`${base}/?view=not-a-view`); await emptyStudio().waitFor();
    pass('invalid workspace URLs recover to Studio');
    // Development HMR intentionally reconnects/reloads after a network interruption.
    // Production runs always exercise this; keep development smoke checks online.
    if (process.env.TEST_DEVELOPMENT !== '1') {
      await context.setOffline(true);
      for (const view of ['dashboard', 'compare', 'presets', 'jobs', 'studio']) await navigate(view, 1440);
      await context.setOffline(false);
      pass('workspace tools switch immediately without another server request');
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.getByRole('dialog', { name: 'More tools' }).waitFor({ state: 'detached' });
    await page.waitForFunction(() => document.body.style.overflow === '', null, { timeout: 2000 });
    await page.keyboard.press('Control+k');
    let dialog = page.getByRole('dialog', { name: 'Command menu' });
    await dialog.waitFor(); await dialog.getByRole('textbox').fill('nothing-matches-this');
    await page.keyboard.press('Escape'); await page.keyboard.press('Control+k');
    await dialog.waitFor(); assert.equal(await dialog.getByRole('textbox').inputValue(), '');
    await dialog.getByRole('button', { name: 'Close command menu' }).click();
    pass('resized menus release focus and scroll; command searches reset on reopen');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Load Sample (GPS + Sony EXIF)', exact: true }).click();
    await page.getByRole('button', { name: 'Download image', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Load Sample (AI / ComfyUI)', exact: true }).click();
    await page.waitForFunction(() => document.body.innerText.includes('Queue (2)'));
    // With files loaded, clicking each menu must preserve the queue and render its real controls.
    for (const [width, height] of [[320,568],[390,844],[640,844],[768,1024],[820,1180],[1024,600],[1280,720],[1440,900],[1920,1080]]) {
      await page.setViewportSize({ width, height });
      for (const view of ['dashboard', 'compare', 'presets', 'jobs', 'studio']) await navigate(view, width, true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px horizontal overflow`);
      const settings = page.getByRole('button', { name: 'AI BYOK Settings', exact: true });
      const box = await settings.boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= width, `${width}px header settings clipped`);
      await settings.click(); dialog = page.getByRole('dialog', { name: 'AI settings' }); await dialog.waitFor();
      await dialog.getByRole('button', { name: 'Close AI settings' }).click();
      if ([390,820,1440].includes(width)) await page.screenshot({ path: `tests/${engine}-interaction-${width}.png`, fullPage: true });
      pass(`all five menus and header settings work at ${width}×${height}`);
    }

    await page.setViewportSize({ width: 820, height: 1180 });
    await page.getByTitle('Open batch actions menu', { exact: true }).click();
    await page.getByRole('dialog', { name: 'Quick actions' }).waitFor();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('dialog', { name: 'Quick actions' }).waitFor({ state: 'detached' });
    await page.waitForFunction(() => document.body.style.overflow === '', null, { timeout: 2000 });
    await page.getByRole('button', { name: 'AI BYOK Settings' }).click();
    await page.getByRole('dialog', { name: 'AI settings' }).getByRole('button', { name: 'Close AI settings' }).click();
    pass('quick-action menus never block header controls after resizing');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('dialog', { name: 'More tools' }).getByRole('button', { name: /Command Menu/ }).click();
    dialog = page.getByRole('dialog', { name: 'Command menu' });
    await dialog.getByRole('textbox').fill('Configure Google Gemini'); await dialog.getByRole('textbox').press('Enter');
    dialog = page.getByRole('dialog', { name: 'AI settings' }); await dialog.waitFor();
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
    assert.equal(await page.locator('[aria-modal="true"]').count(), 0);
    await page.waitForFunction(() => document.body.style.overflow === '', null, { timeout: 2000 });
    await navigate('dashboard', 390, true); await navigate('studio', 390, true);
    pass('More → command menu → settings closes without a lingering click blocker');
    await page.setViewportSize({ width:1440, height:900 });
    await page.getByRole('link',{ name:'Docs', exact:true }).click();
    await page.getByRole('link',{ name:'Back to Studio', exact:true }).click();
    await waitView('studio', true);
    pass('documentation return links preserve imported images');
    // Inspect standalone documentation in its own tab, preserving the editing session.
    const docs = await context.newPage();
    docs.on('pageerror', error => errors.push(error.message));
    for (const route of ['/about', '/tutorial', '/does-not-exist']) {
      await docs.goto(base + route);
      await docs.waitForLoadState('networkidle');
      for (const width of [320,390,768,1440]) {
        await docs.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
        assert.equal(await docs.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${route} overflows at ${width}px`);
        for (const link of await docs.locator('nav a:visible').all()) {
          const box = await link.boundingBox();
          assert.ok(box && box.x >= 0 && box.x + box.width <= width, `${route} header link clipped at ${width}px`);
        }
      }
    }
    await docs.close();
    pass('documentation, guide and 404 layouts fit mobile, tablet and desktop');
    assert.deepEqual(errors, []);
    console.log(`${engine} interaction regressions passed`);
  } catch (error) {
    console.error('Interaction failure state', JSON.stringify(await page.evaluate(() => ({ url: location.href, headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(el => el.textContent), currentLinks: Array.from(document.querySelectorAll('[aria-current="page"]')).map(el => el.textContent), dialogs: Array.from(document.querySelectorAll('[aria-modal="true"]')).map(el=>el.getAttribute('aria-label')) }))));
    await page.screenshot({ path: `tests/${engine}-interaction-failure.png`, fullPage: true }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
