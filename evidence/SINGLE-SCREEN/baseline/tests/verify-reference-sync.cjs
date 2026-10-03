/* Reference-synchronized visual acceptance. Synthetic fixture and isolated contexts only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { chromium, webkit } = require(process.env.PW_PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'ks6s3juocjzc2.kimi.page');
const output = process.env.PW_EVIDENCE_ROOT
  ? path.resolve(root, process.env.PW_EVIDENCE_ROOT, 'reference-sync')
  : path.join(root, 'evidence/PW-WOORI-05/reference-sync');
const origin = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Use an isolated local origin');
const url = `${origin}/ks6s3juocjzc2.kimi.page/index.html`;
const widths = [320, 360, 375, 390, 412, 430];
const tabs = [['home', '홈'], ['record', '기록'], ['goal', '목표'], ['report', '리포트'], ['all', '전체']];
const snapshot = fs.readFileSync(path.join(root, 'preservation/PW-WOORI-01/original-index.html.txt'), 'utf8');
const literal = snapshot.match(/const defaultState = (\{[\s\S]*?\n        \});/)[1];
const fixture = JSON.parse(JSON.stringify(vm.runInNewContext(`(${literal})`)));
fs.mkdirSync(path.join(output, 'screenshots'), { recursive: true });
const report = {
  startedAt: new Date().toISOString(), url, status: 'RUNNING', checks: [], screenshots: [],
  consoleErrors: [], pageErrors: [], resourceErrors: [], browsers: {}, assets: [],
  limitations: ['Screenshots use a synthetic fixture, not user data', 'Visual similarity still requires reference review; alpha checks do not evaluate drawing quality', 'No physical mobile keyboard or screen reader testing'],
};
const pass = (name, detail = true) => { report.checks.push({ name, status: 'PASS', detail }); console.log(`PASS ${name}`); };

function executable(engine) {
  const configured = process.env[engine === 'chromium' ? 'PW_CHROMIUM_EXECUTABLE' : 'PW_WEBKIT_EXECUTABLE'];
  if (configured) return configured;
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  const prefix = engine === 'chromium' ? 'chromium_headless_shell-' : 'webkit-';
  const versions = fs.existsSync(cache) ? fs.readdirSync(cache).filter(name => name.startsWith(prefix)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })) : [];
  if (versions.length) return path.join(cache, versions[0], engine === 'chromium' ? 'chrome-headless-shell-mac-arm64/chrome-headless-shell' : 'pw_run.sh');
  const installed = (engine === 'chromium' ? chromium : webkit).executablePath();
  assert(fs.existsSync(installed), `Install ${engine} or set its executable override`);
  return installed;
}

function observe(page, engine) {
  page.on('console', event => { if (event.type() === 'error') report.consoleErrors.push({ engine, message: event.text() }); });
  page.on('pageerror', error => report.pageErrors.push({ engine, message: error.message }));
  page.on('requestfailed', request => report.resourceErrors.push({ engine, url: request.url(), failure: request.failure() }));
  page.on('response', response => { if (response.status() >= 400) report.resourceErrors.push({ engine, url: response.url(), status: response.status() }); });
}

async function ready(page) {
  await page.locator('.pw-nav-item').last().waitFor();
  await page.evaluate(async () => {
    // Offscreen decorative assets are intentionally lazy in the product. Eager
    // loading here lets the acceptance capture verify every integrated asset.
    for (const image of document.querySelectorAll('img.pw-illustration,img.pw-sprite-poster')) image.loading = 'eager';
    await Promise.all([...document.images].filter(image => image.getAttribute('src')).map(image => image.decode()));
    document.body.getBoundingClientRect();
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function setup(browser, engine) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: 'reduce', colorScheme: 'light' });
  await context.addInitScript(data => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    if (get.call(localStorage, 'reference_sync_seed') === null) {
      set.call(localStorage, 'pocketwon_demo_v1', JSON.stringify(data));
      set.call(localStorage, 'reference_sync_seed', 'synthetic');
    }
    window.__pwReferenceRaw = () => get.call(localStorage, 'pocketwon_demo_v1');
    window.__pwReferenceWrites = [];
    for (const name of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[name];
      Storage.prototype[name] = function(...args) { window.__pwReferenceWrites.push({ name, key: args[0] }); return original.apply(this, args); };
    }
  }, fixture);
  const page = await context.newPage(); observe(page, engine);
  await page.goto(url); await ready(page);
  return { page, context };
}

async function geometry(page, screen) {
  const g = await page.evaluate(screen => {
    const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const content = document.querySelector('.pw-content'), shell = document.querySelector('.pw-shell'), view = document.querySelector(`.pw-${screen}`);
    const style = getComputedStyle(document.documentElement);
    return {
      viewport: { width: innerWidth, height: innerHeight }, doc: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      shell: box(shell), header: box(document.querySelector('.pw-header')), content: { ...box(content), client: content.clientWidth, scroll: content.scrollWidth }, nav: box(document.querySelector('.pw-bottom-navigation')),
      view: { ...box(view), client: view.clientWidth, scroll: view.scrollWidth },
      active: [...document.querySelectorAll('[aria-current="page"]')].map(node => node.dataset.screen),
      controls: [...document.querySelectorAll('.pw-header button,.pw-bottom-navigation button,.pw-content button')].filter(node => node.getBoundingClientRect().width > 0).map(node => ({ name: node.getAttribute('aria-label') || node.textContent, ...box(node), radius: parseFloat(getComputedStyle(node).borderRadius) })),
      images: [...view.querySelectorAll('img.pw-illustration')].filter(node => !node.closest('.pw-sprite')).map(node => ({ source: node.getAttribute('src'), loaded: node.complete && node.naturalWidth > 0, hidden: node.hidden, width: node.naturalWidth, height: node.naturalHeight, alt: node.alt, ariaHidden: node.getAttribute('aria-hidden'), pointerEvents: getComputedStyle(node).pointerEvents })),
      sprites: [...view.querySelectorAll('.pw-sprite')].map(node => {
        const poster = node.querySelector('.pw-sprite-poster');
        return { profile: node.dataset.sprite, ...box(node), ariaHidden: node.getAttribute('aria-hidden'), pointerEvents: getComputedStyle(node).pointerEvents, poster: poster && { source: poster.getAttribute('src'), loaded: poster.complete && poster.naturalWidth > 0, width: poster.naturalWidth, height: poster.naturalHeight, alt: poster.alt } };
      }),
      tokens: Object.fromEntries(['--pw-canvas','--pw-surface','--pw-primary','--pw-visual-blue','--pw-radius-card','--pw-radius-visual','--pw-radius-button'].map(name => [name, style.getPropertyValue(name).trim()])),
      canvas: getComputedStyle(shell).backgroundColor,
      activeColor: getComputedStyle(document.querySelector('[aria-current="page"]')).color,
      activeIconColor: getComputedStyle(document.querySelector('[aria-current="page"] .pw-icon')).color,
      headings: view.querySelectorAll('h1').length,
      text: view.textContent,
    };
  }, screen);
  assert(g.doc.width <= g.viewport.width, `document overflow: ${JSON.stringify(g)}`);
  assert(g.content.scroll <= g.content.client, `content overflow: ${JSON.stringify(g)}`);
  assert(g.view.scroll <= g.view.client, `view overflow: ${JSON.stringify(g)}`);
  assert(g.shell.width <= 520 && Math.abs(g.shell.width - Math.min(520, g.viewport.width)) < 0.1);
  assert(g.content.y >= g.header.bottom - 0.1 && g.content.bottom <= g.nav.y + 0.1, 'content must remain between header and dock');
  assert(g.controls.every(control => control.width >= 47.95 && control.height >= 47.95), `touch targets: ${JSON.stringify(g.controls)}`);
  assert(g.controls.every(control => control.x >= g.shell.x - 0.1 && control.right <= g.shell.right + 0.1), `control horizontal bounds: ${JSON.stringify(g.controls)}`);
  assert(g.images.length + g.sprites.length > 0, `${screen} has no generated illustration or sprite`);
  assert(g.images.every(image => image.loaded && !image.hidden && image.width >= 128 && image.height >= 128), `integrated assets: ${JSON.stringify(g.images)}`);
  assert(g.images.every(image => image.alt === '' && image.ariaHidden === 'true' && image.pointerEvents === 'none'), 'illustrations must stay decorative and not intercept controls');
  assert(g.sprites.every(sprite => sprite.width > 0 && sprite.height > 0 && sprite.ariaHidden === 'true' && sprite.pointerEvents === 'none'), `sprites reserve space and remain decorative: ${JSON.stringify(g.sprites)}`);
  assert(g.sprites.every(sprite => sprite.poster?.loaded && sprite.poster.width >= 128 && sprite.poster.height >= 128 && sprite.poster.alt === ''), `sprite first-frame previews decode: ${JSON.stringify(g.sprites)}`);
  assert.equal(g.tokens['--pw-primary'].toLowerCase(), '#0190f8');
  assert.equal(g.tokens['--pw-visual-blue'].toLowerCase(), '#d9eefb');
  assert.equal(g.tokens['--pw-surface'].toLowerCase(), '#ffffff');
  assert.equal(g.canvas, 'rgb(255, 255, 255)');
  assert.equal(g.activeIconColor, 'rgb(1, 144, 248)');
  assert(['rgb(1, 144, 248)', 'rgb(0, 105, 183)'].includes(g.activeColor), 'navigation text uses the primary or accessible blue tone');
  assert.deepEqual(g.active, [screen]); assert.equal(g.headings, 1);
  assert(!/Progress|PROGRESS/.test(g.text), 'Reference branding must not ship');
  return g;
}

async function homeComposition(page) {
  const composition = await page.evaluate(() => {
    const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const grid = document.querySelector('.pw-home-feature-grid');
    return { columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length, cards: [...grid.children].map(card => {
      const panel = card.querySelector('.pw-illustration-panel'), image = panel.querySelector('.pw-sprite') || panel.querySelector('img'), title = card.querySelector('h2');
      return { ...box(card), radius: parseFloat(getComputedStyle(card).borderRadius), background: getComputedStyle(card).backgroundColor, shadow: getComputedStyle(card).boxShadow, titleWeight: Number(getComputedStyle(title).fontWeight), panel: { ...box(panel), radius: parseFloat(getComputedStyle(panel).borderRadius), background: getComputedStyle(panel).backgroundColor, overflow: getComputedStyle(panel).overflow }, image: box(image) };
    }) };
  });
  assert.equal(composition.columns, 2); assert.equal(composition.cards.length, 4);
  assert(composition.cards.every(card => card.radius >= 24 && card.radius <= 32), 'feature card radii');
  assert(composition.cards.every(card => card.panel.radius >= 18 && card.panel.radius <= 24), 'visual panel radii');
  assert(composition.cards.every(card => card.background === 'rgb(255, 255, 255)' && card.shadow !== 'none' && card.panel.background === 'rgb(217, 238, 251)'), 'white ambient-shadow cards and pale-blue panels');
  assert(composition.cards.every(card => card.titleWeight >= 750), 'feature title weight');
  const stagger = composition.cards[1].y - composition.cards[0].y;
  assert(stagger >= 20 && stagger <= 60, `designed stagger offset: ${stagger}`);
  assert(composition.cards[0].right < composition.cards[1].x && composition.cards[2].right < composition.cards[3].x, 'two distinct non-overlapping columns');
  assert(composition.cards.some(card => card.image.y < card.panel.y - 1 || card.image.bottom > card.panel.bottom + 1), 'illustration must extend beyond visual panel');
  return { ...composition, stagger };
}

async function dockClearance(page, screen) {
  await page.locator('.pw-content').evaluate(node => { node.scrollTop = node.scrollHeight; });
  await ready(page);
  const clearance = await page.evaluate(screen => {
    const view = document.querySelector(`.pw-${screen}`), nav = document.querySelector('.pw-bottom-navigation');
    const nodes = screen === 'home' ? [...view.querySelectorAll('.pw-home-feature-card')] : screen === 'all' ? [...view.querySelectorAll('.pw-all-card')] : [...view.children].filter(node => node.getBoundingClientRect().height > 0);
    const lastBottom = Math.max(...nodes.map(node => node.getBoundingClientRect().bottom));
    return { lastBottom, navTop: nav.getBoundingClientRect().top, gap: nav.getBoundingClientRect().top - lastBottom };
  }, screen);
  assert(clearance.gap >= 10, `${screen} last content hidden behind dock: ${JSON.stringify(clearance)}`);
  await page.locator('.pw-content').evaluate(node => { node.scrollTop = 0; }); await ready(page);
  return clearance;
}

async function capture(page, name, fullPage = false) {
  await ready(page); await page.mouse.move(0, 0);
  const filename = `screenshots/${name}.png`;
  await page.screenshot({ path: path.join(output, filename), fullPage });
  report.screenshots.push(filename);
}

async function assetAlpha(page, engine) {
  const directory = path.join(app, 'assets/pocketwon/characters');
  const files = fs.readdirSync(directory).filter(file => file.endsWith('.png'));
  const paths = files.map(file => `./assets/pocketwon/characters/${file}`);
  const samples = await page.evaluate(async sources => {
    const result = [];
    for (const source of sources) {
      const image = new Image(); image.src = source; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0, opaque = 0, semitransparent = 0;
      // Resampling can leave formerly opaque artwork at alpha 253/254. Use
      // visually opaque alpha, while reporting antialiased edges separately.
      for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] === 0) transparent++; else if (pixels[i] >= 240) opaque++; else semitransparent++; }
      const count = canvas.width * canvas.height;
      const cornerAlpha = [0, canvas.width - 1, count - canvas.width, count - 1].map(index => pixels[index * 4 + 3]);
      result.push({ source, width: canvas.width, height: canvas.height, transparentFraction: transparent / count, opaqueFraction: opaque / count, semitransparentFraction: semitransparent / count, cornerAlpha });
    }
    return result;
  }, paths);
  for (const [index, sample] of samples.entries()) {
    assert(sample.transparentFraction > 0.1 && sample.transparentFraction < 0.95, `transparent isolated illustration: ${JSON.stringify(sample)}`);
    assert(sample.opaqueFraction > 0.02, `visible artwork: ${JSON.stringify(sample)}`);
    assert(sample.cornerAlpha.every(alpha => alpha === 0), `transparent margin: ${JSON.stringify(sample)}`);
    sample.bytes = fs.statSync(path.join(directory, files[index])).size;
    assert(sample.bytes < 1024 * 1024, `optimized PNG: ${sample.source}`);
  }
  if (engine === 'Chromium') report.assets = samples;
  pass(`${engine}: ${samples.length} generated PNGs decode with transparent margins and service-size files`, samples);
}

async function matrix(browser, engine) {
  const { context, page } = await setup(browser, engine);
  try {
    const original = await page.evaluate(() => window.__pwReferenceRaw());
    await assetAlpha(page, engine);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      for (const [screen, label] of tabs) {
        await page.locator(`.pw-nav-item[data-screen="${screen}"]`).click(); await ready(page);
        const detail = await geometry(page, screen);
        if (screen === 'home') detail.composition = await homeComposition(page);
        detail.dockClearance = await dockClearance(page, screen);
        await capture(page, `${engine.toLowerCase()}-${width}x844-${screen}`);
        assert.equal(page.url(), url); assert.equal(await page.title(), `${label} · 포켓WON`);
        pass(`${engine}: ${width}x844 ${screen} reference geometry, assets and dock clearance`, detail);
      }
    }
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.locator('.pw-nav-item[data-screen="home"]').click(); await ready(page);
    const desktop = await geometry(page, 'home'); desktop.composition = await homeComposition(page);
    assert.equal(desktop.shell.width, 520); assert.equal(desktop.shell.x, 252);
    assert.equal(await page.locator('.pw-shell').evaluate(node => getComputedStyle(node).borderRadius), '36px');
    await capture(page, `${engine.toLowerCase()}-1024x900-home`);
    pass(`${engine}: desktop retains centered 520px rounded mobile canvas`, desktop);

    await page.setViewportSize({ width: 390, height: 844 }); await ready(page);
    // Capture-only expansion exposes the scrollable Home; it never changes a
    // shipped file, the fixture, or the application state.
    const expanded = await page.addStyleTag({ content: '.pw-shell{height:auto;min-height:100dvh;margin-block:0}.pw-content{flex:none;overflow:visible}' });
    await capture(page, `${engine.toLowerCase()}-390-home-full`, true); await expanded.evaluate(node => node.remove()); await ready(page);
    assert.equal(await page.evaluate(() => window.__pwReferenceRaw()), original);
    assert.deepEqual(await page.evaluate(() => window.__pwReferenceWrites), []);
    pass(`${engine}: visual navigation/captures preserve exact storage and perform zero writes`);
  } finally { await ready(page); await context.close(); }
}

(async () => {
  const opened = [];
  try {
    for (const [name, type, label] of [['chromium', chromium, 'Chromium'], ['webkit', webkit, 'WebKit']]) {
      const executablePath = executable(name), browser = await type.launch({ headless: true, executablePath }); opened.push(browser);
      report.browsers[label] = { version: browser.version(), executable: executablePath };
      await matrix(browser, label);
    }
    assert.deepEqual(report.consoleErrors, []); assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.resourceErrors, []);
    pass('All visual acceptance contexts: console/page/resource errors zero'); report.status = 'PASS';
  } catch (error) { report.status = 'FAIL'; report.failure = error.stack; process.exitCode = 1; }
  finally {
    await Promise.all(opened.map(browser => browser.close()));
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ status: report.status, checks: report.checks.length, screenshots: report.screenshots.length, consoleErrors: report.consoleErrors, pageErrors: report.pageErrors, resourceErrors: report.resourceErrors, failure: report.failure }, null, 2));
  }
})();
