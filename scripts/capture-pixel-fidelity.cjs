/* Capture real renderers in isolated browser contexts, never a user's browser/storage. */
const t = require('../tests/product-test-utils.cjs');
const f = require('../tests/pixel-fidelity-utils.cjs');
const { fs, path, root } = t;
const out = path.join(root, 'evidence/PIXEL-FIDELITY/passes');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await t.launch('chromium');
  let test;
  try {
    test = await t.setup(browser, { data: f.referenceData() });
    await f.applyReferenceFixture(test.page);
    await test.page.screenshot({ path: path.join(out, 'final-reference.png') });
    const geometry = await test.page.evaluate(() => {
      const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
      return {
        regions: Object.fromEntries(['.pw-home-hero', '.pw-home-breakdown', '.pw-home-saving', '.pw-home-habit', '.pw-home-weekly', '.pw-home-insights', '.pw-navigation-items'].map(s => [s, box(document.querySelector(s))])),
        sprites: [...document.querySelectorAll('.pw-sprite,.pw-header-avatar img')].map(n => ({ profile: n.dataset.sprite || 'balance', box: box(n.querySelector('.pw-sprite-frames') || n), poster: n.querySelector('img')?.getAttribute('src') || n.getAttribute('src') })),
        adviceChevron: getComputedStyle(document.querySelector('.pw-home-insight--advice .pw-home-card-chevron')).color,
      };
    });
    fs.writeFileSync(path.join(out, 'final-geometry.json'), JSON.stringify(geometry, null, 2) + '\n');
    await f.restoreLiveModel(test.page);
    await test.page.screenshot({ path: path.join(out, 'final-stored-data.png') });
    await t.unchanged(test); await test.context.close(); test = null;
    test = await t.setup(browser, { data: null });
    await f.freezeDate(test.page); await t.ready(test.page);
    await test.page.screenshot({ path: path.join(out, 'final-empty.png') });
    await t.unchanged(test);
    console.log(JSON.stringify({ status: 'PASS', captures: 3, adviceChevron: geometry.adviceChevron, output: out }));
  } finally { await test?.context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
