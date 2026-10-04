/* Golden-master Home acceptance in isolated contexts; never opens a user profile. */
const t = require('./product-test-utils.cjs');
const { assert, fs, path, root, fixture, launch, setup, ready, unchanged } = t;
const { REFERENCE_BOXES, referenceData, freezeDate, applyReferenceFixture, restoreLiveModel } = require('./pixel-fidelity-utils.cjs');
const crypto = require('node:crypto');
const capture = process.argv.includes('--capture'), edges = process.argv.includes('--edges');
const out = t.output('pixel-fidelity-dashboard');
const alpha = JSON.parse(fs.readFileSync(path.join(root, 'evidence/SINGLE-SCREEN/art-bounds/source-alpha.json')));
const runs = JSON.parse(fs.readFileSync(path.join(root, 'evidence/SINGLE-SCREEN/art-bounds/alpha-runs.json')));
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'evidence/REFERENCE-DASHBOARD/baseline/manifest.json')));
const report = { status: 'RUNNING', checks: [], geometry: [], errors: [], screenshots: [], fixture: 'Isolated reference override; default demo and real-data mode tested separately' };
const heroSizes = new Map();
function preserved() {
  for (const [name, hash] of Object.entries(baseline)) {
    const characterAsset = /\/assets\/pocketwon\/(characters|sprites)\//.test(name);
    const protectedSource = /\/(state|sprite-manifest|sprites|illustrations|feature-models|feature-navigation)\.js$/.test(name) || /\/sprites\.css$/.test(name);
    if (characterAsset || protectedSource) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex'), hash, name);
  }
  report.checks.push('Existing character assets, sprite atlas/timing runtime, financial source and routes byte-preserved; theme is allowed to change');
}
function pixelsIntersect(profile, player, text) {
  const left = (text.left + 1 - player.left) / player.width * 384, right = (text.right - 1 - player.left) / player.width * 384;
  const top = (text.top + 1 - player.top) / player.height * 384, bottom = (text.bottom - 1 - player.top) / player.height * 384;
  if (right <= left || bottom <= top) return false;
  for (let y = Math.max(0, Math.floor(top)); y < Math.min(384, Math.ceil(bottom)); y++) {
    for (const [start, end] of runs[profile][y]) if (end > left && start < right) return true;
  }
  return false;
}
async function inspect(page, name, { reference = false } = {}) {
  const g = await page.evaluate(() => {
    const box = n => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const q = s => { const n = document.querySelector(s); if (!n) throw new Error('Missing reference region: ' + s); return n; };
    const panels = [...document.querySelectorAll('.pw-home-hero,.pw-home-card,.pw-home-insights')];
    const sprites = [...document.querySelectorAll('.pw-home .pw-sprite')].map(n => {
      const panel = n.closest('.pw-home-hero,.pw-home-card,.pw-home-insights');
      const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT), texts = [];
      while (walker.nextNode()) {
        const text = walker.currentNode, el = text.parentElement;
        if (!text.textContent.trim() || el.closest('[aria-hidden="true"],.pw-sr-only') || !el.getClientRects().length) continue;
        const range = document.createRange(); range.selectNodeContents(text);
        for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) texts.push({ label: text.textContent.trim().slice(0, 50), rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom } });
      }
      return { profile: n.dataset.sprite, layer: box(n.querySelector('.pw-sprite-frames')), panel: box(panel), texts };
    });
    return {
      designUnit: parseFloat(getComputedStyle(q('.pw-home-hero')).borderTopLeftRadius) / 15, contentScale: Number(document.querySelector('.pw-home').dataset.viewportScale || 1), accessible: document.documentElement.classList.contains('pw-accessible'), viewport: [innerWidth, innerHeight],
      document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      hero: box(q('.pw-home-hero')), status: box(q('.pw-home-breakdown')), row: box(q('.pw-home-primary-row')), saving: box(q('.pw-home-saving')), habit: box(q('.pw-home-habit')),
      balance: box(q('.pw-home-balance-link')), balanceFont:parseFloat(getComputedStyle(q('.pw-home-money .pw-money-digits,.pw-home-money .pw-money-unknown')).fontSize),
      balanceGlyphs:[...document.querySelectorAll('.pw-home-money .pw-money-digits,.pw-home-money .pw-money-unit,.pw-home-money .pw-money-exact,.pw-home-money .pw-money-unknown')].flatMap(n=>{const range=document.createRange();range.selectNodeContents(n);return [...range.getClientRects()].map(r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom}));}),
      obsoleteHeroCopy: !!document.querySelector('.pw-home-status') || /지금 남은 용돈|오늘도 잘 관리하고/.test(q('.pw-home-hero').textContent),
      weekly: box(q('.pw-home-weekly')), insights: box(q('.pw-home-insights')), nav: box(q('.pw-bottom-navigation')), navVisual: box(q('.pw-navigation-items')), add: box(q('.pw-nav-add')),
      sprites, panels: panels.map(box),
      graphics: [...document.querySelectorAll('.pw-home-donut-chart,.pw-home-weekly-plot')].map(n => ({ box: box(n), panel: box(n.closest('.pw-home-card')) })),
      buttons: [...document.querySelectorAll('.pw-shell button')].filter(n => n.getClientRects().length).map(n => ({ label: n.getAttribute('aria-label') || n.textContent, nav: !!n.closest('.pw-bottom-navigation'), purchase: n.classList.contains('pw-home-purchase'), box: box(n) })),
      nestedButtons: document.querySelectorAll('.pw-home button button').length,
      horizontal: (!['clip', 'hidden'].includes(getComputedStyle(q('.pw-home')).overflowX) && q('.pw-home').scrollWidth > q('.pw-home').clientWidth + 1) || document.documentElement.scrollWidth > innerWidth + 1,
      profiles: sprites.map(sprite => sprite.profile).sort(),
      removedCalendar: !!document.querySelector('.pw-home-calendar'),
    };
  });
  report.geometry.push({ name, ...g });
  assert.equal(g.horizontal, false, name + ' horizontal overflow');
  assert.equal(g.nestedButtons, 0, name + ' nested buttons');
  assert.equal(g.obsoleteHeroCopy,false,name+' obsolete hero heading or pill');
  for(const glyph of g.balanceGlyphs) assert(glyph.left>=g.hero.left+7 && glyph.right<=g.hero.right-7 && glyph.top>=g.hero.top+7 && glyph.bottom<=g.status.top-7,name+' balance glyph exceeds hero space '+JSON.stringify(glyph));
  assert.equal(g.removedCalendar, false, name + ' obsolete calendar card remains');
  assert.deepEqual(g.profiles, ['all', 'balance'], name + ' original character components');
  if (g.viewport[0] >= 700 && !g.accessible) {
    assert(g.hero.right <= g.row.left + 1, name + ' desktop top row collision');
    assert(g.weekly.right <= g.insights.left + 1, name + ' desktop bottom row collision');
    assert(g.hero.bottom <= g.weekly.top + 1, name + ' desktop row collision');
  } else {
    assert(g.hero.bottom <= g.row.top + 1, name + ' Hero/first row collision');
    assert(g.row.bottom <= g.weekly.top + 1, name + ' first row/weekly collision');
    assert(g.weekly.bottom <= g.insights.top + 1, name + ' weekly/insight collision');
  }
  assert(g.insights.bottom <= g.nav.top + 1, name + ' dashboard exceeds navigation');
  assert(g.document[1] <= g.viewport[1] + 1, name + ' dashboard scrolls');
  assert(Math.abs(g.nav.height - 84) <= 1, name + ' navigation geometry');
  if (!g.accessible) {
    assert(Math.abs(g.saving.width - g.habit.width) < 1, name + ' first row unequal widths');
    assert(Math.abs(g.saving.height - g.habit.height) < 1, name + ' first row unequal heights');
    assert(g.saving.right <= g.habit.left + 1, name + ' two-column card overlap');
    assert(g.nav.bottom <= g.viewport[1] + 1 && g.nav.top >= 0, name + ' navigation outside viewport');
  }
  if (reference) {
    assert(g.balanceFont/g.designUnit>=54,name+' representative balance is not substantially enlarged');
    assert(g.insights.bottom <= g.nav.top + 1, name + ' representative dashboard does not fit above navigation');
    assert(g.document[1] <= g.viewport[1] + 1, name + ' representative dashboard scrolls');
    // Historical reference deltas are reported, not acceptance limits: the requested fluid viewport replaces fixed Golden Master coordinates.
    report.referenceDeltas = Object.fromEntries(Object.entries(REFERENCE_BOXES).filter(([key]) => g[key]).map(([key, expected]) => [key, Object.fromEntries(Object.keys(expected).map(axis => [axis, +((key === 'nav' ? g.navVisual : g[key])[axis] - (expected[axis] - (axis === 'y' && key !== 'nav' ? 46 : 0))).toFixed(2)]))]));
    assert(g.hero.top > 0 && g.hero.top <= 20, name + ' small top breathing room');
  }
  for (const v of g.graphics) assert(v.box.left >= v.panel.left - 1 && v.box.right <= v.panel.right + 1 && v.box.top >= v.panel.top - 1 && v.box.bottom <= v.panel.bottom + 1, name + ' graphic exceeds card ' + JSON.stringify(v));
  for (const b of g.buttons) {
    assert(b.box.width >= (b.nav ? 43 : 24 * g.contentScale * (b.purchase ? g.designUnit : 1) - .1) && b.box.height >= (b.nav ? 43 : 24 * g.contentScale * (b.purchase ? g.designUnit : 1) - .1), name + ' navigation 44px / content 24px before explicit viewport scaling ' + JSON.stringify(b));
  }
  for (const s of g.sprites) {
    const bounds = alpha.profiles[s.profile].bounds, r = s.layer;
    const art = { left: r.left + bounds[0] / 384 * r.width, top: r.top + bounds[1] / 384 * r.height, right: r.left + bounds[2] / 384 * r.width, bottom: r.top + bounds[3] / 384 * r.height };
    assert(art.left >= s.panel.left - 1 && art.right <= s.panel.right + 1 && art.top >= s.panel.top - 1 && art.bottom <= s.panel.bottom + 1, name + ' all-frame art clipping ' + JSON.stringify({ profile: s.profile, art, panel: s.panel }));
    if (s.profile === 'balance') {
      const sizeKey=JSON.stringify([g.viewport,g.hero.width,g.hero.height,g.designUnit,g.contentScale]);
      if(heroSizes.has(sizeKey)) assert(Math.abs(heroSizes.get(sizeKey)-r.width)<.1,name+' amount changes character size');
      else heroSizes.set(sizeKey,r.width);
      assert(Math.abs(r.width-r.height)<.1,name+' character aspect ratio changed');
      assert(art.left >= s.panel.left + 7.8 && art.top >= s.panel.top + 7.8 && art.right <= s.panel.right - 7.8 && art.bottom <= g.status.top - 7.8, name + ' Hero 8px frame/status clearance ' + JSON.stringify({art,panel:s.panel,status:g.status}));
      for(const text of g.balanceGlyphs) assert(art.left>=text.right+7.8 || art.right<=text.left-7.8 || art.top>=text.bottom+7.8 || art.bottom<=text.top-7.8,name+' enlarged balance/character clearance '+JSON.stringify({art,text}));
      for(const text of s.texts) assert(art.left >= text.rect.right + 7.8 || art.right <= text.rect.left - 7.8 || art.top >= text.rect.bottom + 7.8 || art.bottom <= text.rect.top - 7.8, name + ' Hero 8px text clearance ' + text.label);
    }
    const collisions = s.texts.filter(v => pixelsIntersect(s.profile, s.layer, v.rect));
    assert.equal(collisions.length, 0, name + ' all-frame art/text overlap ' + JSON.stringify({ profile: s.profile, collisions }));
  }
  return g;
}
async function screenshot(page, name) {
  const file = name + '.png'; await page.screenshot({ path: path.join(out, 'screenshots', file), fullPage: false }); report.screenshots.push(file);
}
async function liveHome(test) { await freezeDate(test.page); await test.page.evaluate(() => PWNavigation.go('home')); await ready(test.page); }
async function navReachable(page) {
  await page.locator('.pw-home-insights').scrollIntoViewIfNeeded(); await ready(page);
  await page.locator('.pw-nav-item[data-screen="goal"]').click();
  assert.equal(await page.evaluate(() => PWNavigation.current().screen), 'goal');
  await page.locator('.pw-nav-item[data-screen="home"]').click(); await ready(page);
}
async function navigation(test, engine) {
  const p = test.page;
  for (const [selector, target, segment] of [['.pw-home-hero-title', 'record'], ['.pw-home-balance-link', 'record'], ['.pw-home-habit [data-action="habit"]', 'record'], ['.pw-home-weekly [data-action="weekly"]', 'report', 'flow'], ['.pw-home-breakdown-item[data-status="spending"]', 'report', 'habit'], ['.pw-home-breakdown-item[data-status="saving"]', 'report', 'habit'], ['.pw-home-breakdown-item[data-status="goal"]', 'goal']]) {
    await p.locator(selector).focus(); await p.keyboard.press('Enter'); await ready(p);
    assert.equal(await p.evaluate(() => PWNavigation.current().screen), target);
    if (segment) assert.equal(await p.locator('.pw-report').getAttribute('data-segment'), segment);
    await p.locator('.pw-nav-item[data-screen="home"]').click(); await ready(p);
  }
  for (const [selector, feature] of [['.pw-home-saving-open', 'goal-contribution'], ['.pw-home-insights-more', 'ai-report'], ['[data-action="insight-positive"]', 'habit-analysis'], ['[data-action="insight-advice"]', 'coaching']]) {
    await p.locator(selector).click(); await ready(p);
    assert.equal(await p.locator('.pw-feature').getAttribute('data-feature'), feature);
    await p.getByRole('button', { name: '이전 화면', exact: true }).click(); await ready(p);
    assert.equal(await p.evaluate(() => PWNavigation.current().screen), 'home');
  }
  for (const label of ['저축 챌린지 더보기', '금융 습관 더보기', '이번 주 용돈 흐름 더보기']) {
    const opener = p.getByRole('button', { name: label, exact: true });
    await opener.click();
    assert.equal(await p.locator('dialog[open]').count(), 1);
    for (let i = 0; i < 8; i++) {
      await p.keyboard.press('Tab');
      assert(await p.evaluate(() => document.querySelector('dialog[open]').contains(document.activeElement)), label + ' focus leaves modal');
    }
    await p.keyboard.press('Escape'); await ready(p);
    assert.equal(await p.locator('dialog[open]').count(), 0);
    assert.equal(await opener.evaluate(node => node === document.activeElement), true, label + ' focus restoration');
  }
  assert.equal(await p.locator('.pw-header').isVisible(), false);
  await p.getByRole('button', { name: '기록하기', exact: true }).click();
  await p.keyboard.press('Escape'); await ready(p);
  assert.equal(await p.evaluate(() => document.activeElement.dataset.action), 'form');
  assert.equal(await p.evaluate(() => PWNavigation.current().screen), 'home');
  report.checks.push(engine + ' history, report segments, removed home header and center-add Escape/focus restoration');
}
async function referenceSemantics(page) {
  assert((await page.locator('.pw-home-money').innerText()).includes('32,000'));
  assert.equal(await page.locator('.pw-home-hero-title .pw-home-card-title').innerText(),'정후의 용돈');
  assert.equal(await page.locator('.pw-home-saving-track').getAttribute('aria-valuenow'), '1');
  assert.equal(await page.locator('.pw-home-saving-track').getAttribute('aria-valuemax'), '3');
  assert.equal(await page.locator('.pw-home-donut-segment').count(), 7);
  assert.equal(await page.locator('.pw-home-donut-value').innerText(), '50,000원');
  assert.equal(await page.locator('.pw-home-legend-value').count(),0);
  assert.equal(await page.locator('.pw-home-legend,.pw-home-purchase').count(),0);
  assert.deepEqual(await page.locator('.pw-home-weekly-bar').evaluateAll(nodes => nodes.map(node => Number(node.dataset.value))), [5000, 3000, 2800, 1000, 2000, 2400, 1800]);
  assert.equal(await page.locator('.pw-home-weekly-bar--highlight').getAttribute('data-date-key'), '2026-10-04');
  assert.equal(await page.locator('.pw-home-insight').count(), 2);
}
(async () => {
  let browser, current;
  try {
    preserved();
    for (const engine of capture && !process.argv.includes('--both') ? ['chromium'] : ['chromium', 'webkit']) {
      browser = await launch(engine);
      const matrix = edges ? [] : capture ? [[390, 844]] : process.argv.includes('--responsive') ? [[320,568],[360,640],[375,667],[390,844],[393,852],[402,874],[412,896],[430,932],[667,375],[844,390],[1024,768],[1440,900]] : [...[360, 375, 390, 393, 402, 412, 430].flatMap(w => [667, 740, 780, 812, 844, 852, 874, 896, 932].map(h => [w, h])), [320, 568], [1024, 900], [667, 375]];
      for (const [width, height] of matrix) {
        current = await setup(browser, { data: referenceData(), width, height });
        await applyReferenceFixture(current.page);
        await referenceSemantics(current.page);
        if (height === 844 || width === 320) await screenshot(current.page, engine + '-' + width + 'x' + height);
        await inspect(current.page, engine + '/' + width + 'x' + height, { reference: width === 390 && height === 844 });
        if (!capture && height < 844) await navReachable(current.page);
        await unchanged(current); await current.context.close(); current = null;
      }
      if (!capture) {
        for (const options of [
          { data: referenceData(), safe: true }, { data: { ...referenceData(), balance: 99999999 } }, { data: null }, { data: '{' }, { data: fixture, readFailure: true },
          { data: { ...referenceData(), balance: Number.MAX_SAFE_INTEGER, habitScore: 82.123456789, goal: { title: '긴 목표🙂'.repeat(30), current: Number.MAX_SAFE_INTEGER - 1, target: Number.MAX_SAFE_INTEGER } } },
          { data: { ...referenceData(), balance: Number.MAX_SAFE_INTEGER }, width: 360, height: 667, safe: true },
        ]) {
          current = await setup(browser, options); await liveHome(current);
          await inspect(current.page, engine + '/live-edge/' + report.geometry.length); await navReachable(current.page);
          await unchanged(current); await current.context.close(); current = null;
        }
        current = await setup(browser, { data: referenceData() }); await applyReferenceFixture(current.page);
        await current.page.evaluate(() => { document.documentElement.style.fontSize = '32px'; }); await ready(current.page);
        await inspect(current.page, engine + '/200%-text'); await navReachable(current.page);
        await unchanged(current); await current.context.close(); current = null;
        current = await setup(browser, { data: { ...referenceData(), balance: 24680 } }); await liveHome(current);
        assert((await current.page.locator('.pw-home-money').innerText()).includes('24,680'), 'Live balance must not use reference constants');
        await applyReferenceFixture(current.page);
        assert((await current.page.locator('.pw-home-money').innerText()).includes('32,000'), 'Isolated reference model is applied');
        await restoreLiveModel(current.page);
        assert((await current.page.locator('.pw-home-money').innerText()).includes('24,680'), 'Reference override is reversible without storage changes');
        await navigation(current, engine); await unchanged(current); await current.context.close(); current = null;
      }
      await browser.close(); browser = null;
      report.checks.push(engine + ' reference composition, equal first row, viewport fit, alpha geometry, live/error/long data and immutable storage');
    }
    report.status = 'PASS';
  } catch (error) { report.status = 'FAIL'; report.failure = error.stack; process.exitCode = 1; }
  finally { await current?.context.close(); await browser?.close(); t.save(out, report); }
})();
