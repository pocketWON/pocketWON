/* Home has a small top inset without a header; other screens retain their titles and tools. */
const t = require('./product-test-utils.cjs');
const out = t.output('home-without-header');
const report = { status: 'RUNNING', checks: [], errors: [] };
const cases = [
  { name: 'reference', width: 390, height: 844 },
  { name: 'compact', width: 390, height: 740 },
  { name: 'short-document', width: 375, height: 568 },
  { name: 'short-safe-area', width: 375, height: 568, safe: true },
  { name: 'large-text', width: 390, height: 844, fontSize: '32px' },
  { name: 'wide-short', width: 1024, height: 400 },
  { name: 'read-error', readFailure: true },
  { name: 'preview', preview: true },
];
(async () => {
  let browser, test;
  try {
    for (const engine of ['chromium', 'webkit']) {
      browser = await t.launch(engine);
      for (const scenario of cases) {
        test = await t.setup(browser, { ...scenario, data: null });
        const p = test.page;
        if (scenario.fontSize) await p.evaluate(size => { document.documentElement.style.fontSize = size; }, scenario.fontSize);
        await t.ready(p);
        t.assert.equal(await p.locator('.pw-header').isVisible(), false);
        t.assert.equal(await p.locator('.pw-home-brand,.pw-header-notification,.pw-home-hero-cheer,.pw-home-hero-rays').count(), 0);
        const layout = await p.evaluate(() => ({
          heroTop: document.querySelector('.pw-home-hero').getBoundingClientRect().top,
          contentTop: document.querySelector('#pw-content').getBoundingClientRect().top,
          safeTop: parseFloat(getComputedStyle(document.querySelector('.pw-shell')).paddingTop),
          expectedInset: 12 * (Math.min(innerWidth, 520) - (parseFloat(getComputedStyle(document.querySelector('.pw-shell')).paddingLeft) || 0) - (parseFloat(getComputedStyle(document.querySelector('.pw-shell')).paddingRight) || 0)) / 390,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        }));
        t.assert(layout.heroTop > layout.safeTop && layout.heroTop - layout.safeTop <= 20, 'First card keeps a small positive inset below the safe area');
        t.assert(Math.abs(layout.contentTop - layout.safeTop) < .1, 'Header must leave no reserved space');
        t.assert.equal(layout.horizontalOverflow, false);
        if (scenario.name === 'reference') await p.screenshot({ path: t.path.join(out, 'screenshots', engine + '-home.png') });
        await p.evaluate(() => window.scrollTo(0, 100000)); await t.ready(p);
        t.assert.equal(await p.locator('.pw-header').isVisible(), false);
        t.assert.equal(await p.evaluate(() => scrollY), 0, 'Document stays fixed');
        const navBefore = await p.locator('.pw-bottom-navigation').boundingBox();
        await p.locator('.pw-nav-item[data-screen="report"]').click(); await t.ready(p);
        t.assert.equal(await p.locator('.pw-header').isVisible(), true);
        t.assert.deepEqual(await p.locator('.pw-bottom-navigation').boundingBox(), navBefore);
        await p.locator('.pw-nav-item[data-screen="home"]').click(); await t.ready(p);
        t.assert.equal(await p.locator('.pw-header').isVisible(), false);
        await t.unchanged(test);
        report.checks.push({ engine, scenario: scenario.name, ...layout });
        await test.context.close(); test = null;
      }
      await browser.close(); browser = null;
    }
    report.status = 'PASS';
  } catch (error) { report.status = 'FAIL'; report.failure = error.stack; process.exitCode = 1; }
  finally { await test?.context.close(); await browser?.close(); t.save(out, report); }
})();
