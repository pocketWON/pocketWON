/* PW-WOORI-04: isolated synthetic data, real Chromium/WebKit; no user profile. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const crypto = require('node:crypto');
const { chromium, webkit } = require(process.env.PW_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const app = path.join(root, 'ks6s3juocjzc2.kimi.page');
const output = process.env.PW_EVIDENCE_ROOT
  ? path.resolve(root, process.env.PW_EVIDENCE_ROOT, 'goal')
  : path.join(root, 'evidence/PW-WOORI-05/goal');
const origin = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';
assert(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
const url = `${origin}/ks6s3juocjzc2.kimi.page/index.html`;
fs.mkdirSync(path.join(output, 'screenshots'), { recursive: true });
const report = { startedAt: new Date().toISOString(), url, checks: [], screenshots: [], consoleErrors: [], resourceErrors: [], browsers: {}, limitations: ['No physical mobile keyboard or screen reader testing', 'No atomic cross-tab localStorage transaction guarantee'] };
const pass = (name, detail = true) => { report.checks.push({ name, status: 'PASS', detail }); console.log(`PASS ${name}`); };
const copy = value => JSON.parse(JSON.stringify(value));
const snapshot = fs.readFileSync(path.join(root, 'preservation/PW-WOORI-01/original-index.html.txt'), 'utf8');
const literal = snapshot.match(/const defaultState = (\{[\s\S]*?\n        \});/)[1];
const fixture = copy(vm.runInNewContext(`(${literal})`));
const stateSource = fs.readFileSync(path.join(app, 'scripts/state.js'), 'utf8');
const api = vm.runInNewContext(`${stateSource}\n({loadPocketWONState,createHomeViewModel,createRecordViewModel,validateRecordDraft,applyTransaction,persistPocketWONState,parsePocketWONDate,createGoalViewModel,validateGoalDraft,applyGoalUpdate})`);
const draft = (type = 'out', amount = '3500', category = '간식', memo = '') => ({ type, amount, category, memo });
const stamp = '2026-09-11T04:05:06.000Z';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function executable(engine) {
  const configured = process.env[engine === 'chromium' ? 'PW_CHROMIUM_EXECUTABLE' : 'PW_WEBKIT_EXECUTABLE'];
  if (configured) return configured;
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  const prefix = engine === 'chromium' ? 'chromium_headless_shell-' : 'webkit-';
  const versions = fs.readdirSync(cache).filter(n => n.startsWith(prefix)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  assert(versions.length);
  return path.join(cache, versions[0], engine === 'chromium' ? 'chrome-headless-shell-mac-arm64/chrome-headless-shell' : 'pw_run.sh');
}
function observe(page) {
  page.on('pageerror', error => report.consoleErrors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') report.consoleErrors.push(event.text()); });
  page.on('requestfailed', request => report.resourceErrors.push({ url: request.url(), failure: request.failure(), lastCompletedCheck: report.checks.at(-1)?.name }));
  page.on('response', response => { if (response.status() >= 400) report.resourceErrors.push({ url: response.url(), status: response.status() }); });
}
async function settlePresentation(page) {
  await page.evaluate(async () => {
    document.body.getBoundingClientRect(); await document.fonts.ready;
    // Reload/teardown intentionally remove the Home view; wait for its eager
    // preview so those operations do not create artificial request failures.
    await Promise.all([...document.querySelectorAll('.pw-sprite-poster[loading="eager"]')].map(image => image.decode()));
  });
}
async function setup(browser, data = fixture, width = 390, height = 844) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: 'reduce' });
  const raw = data === null ? null : typeof data === 'string' ? data : JSON.stringify(data);
  await context.addInitScript(seed => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
    if (get.call(localStorage, 'unrelated_test_value') === null) {
      if (seed !== null) set.call(localStorage, 'pocketwon_demo_v1', seed);
      set.call(localStorage, 'pocketwon_theme', 'dark'); set.call(localStorage, 'pocketwon_intro_done', '1'); set.call(localStorage, 'unrelated_test_value', 'keep');
    }
    window.__calls = []; window.__writeFailure = false; window.__readFailure = false;
    window.__rawRead = () => Object.fromEntries(Object.keys(localStorage).map(k => [k, get.call(localStorage, k)]));
    window.__replace = value => value === null ? remove.call(localStorage, 'pocketwon_demo_v1') : set.call(localStorage, 'pocketwon_demo_v1', value);
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function(...args) {
        window.__calls.push({ method, key: args[0] });
        if (method === 'setItem' && window.__writeFailure) throw new DOMException('Injected quota failure', 'QuotaExceededError');
        if (method === 'getItem' && window.__readFailure) throw new DOMException('Injected read failure', 'SecurityError');
        return original.apply(this, args);
      };
    }
  }, raw);
  const page = await context.newPage(); observe(page);
  await page.goto(url); await settlePresentation(page);
  await page.getByRole('button', { name: '목표', exact: true }).click();
  return { context, page, raw };
}
const read = page => page.evaluate(() => window.__rawRead());
const calls = page => page.evaluate(() => window.__calls.filter(call => call.method !== 'getItem'));
const stored = async page => JSON.parse((await read(page)).pocketwon_demo_v1);
async function screenshot(page, name, enabled) {
  if (!enabled) return;
  await settlePresentation(page);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: path.join(output, 'screenshots', `${name}.png`) });
  report.screenshots.push(`screenshots/${name}.png`);
}
async function textContrast(page, selector) {
  const values = await page.locator(selector).evaluateAll(nodes => {
    const lum = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
    return nodes.filter(node => node.getBoundingClientRect().height > 0 && node.textContent).map(node => {
      let surface = node;
      while (surface.parentElement && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)') surface = surface.parentElement;
      const a = lum(getComputedStyle(node).color), b = lum(getComputedStyle(surface).backgroundColor);
      return { text: node.textContent, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    });
  });
  assert(values.length); assert(values.every(value => value.ratio >= 4.5), JSON.stringify(values));
  return Math.min(...values.map(value => value.ratio));
}
const goalFixture = { ...copy(fixture), goal: { title: '새 자전거', current: 42000, target: 100000, daysLeft: 12 }, monthly: { ...fixture.monthly, goal: 100000 } };
const goalDraft = (title = '새 자전거', target = '120000') => ({ title, target });
function unitTests() {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'preservation/PW-WOORI-05/baseline.json')));
  for (const [file, digest] of Object.entries(baseline.files)) if (!baseline.snapshots.includes(file) && (!file.startsWith('ks6s3juocjzc2.kimi.page/') || /\/scripts\/(state|tabs|icons)\.js$/.test(file)) && file !== 'tests/fixtures/design-system.html') assert.equal(hash(fs.readFileSync(path.join(root, file))), digest, file);
  assert.equal(hash(Buffer.from(snapshot)), '24405c1c583da11d362f82b067add7fb7c62e152cba55f44d331f161b62314ba');
  pass('Preservation: original hash and all non-target/historical files unchanged');
  function freeze(x) { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; }
  const frozen = freeze(copy(goalFixture)), before = JSON.stringify(frozen);
  assert.deepEqual(copy(api.createGoalViewModel(frozen)), { status: 'active', title: '새 자전거', current: 42000, target: 100000, remaining: 58000, percent: 42 });
  const changed = copy(api.applyGoalUpdate(frozen, goalDraft('  나의 자전거  ')));
  assert.deepEqual(changed.goal, { title: '나의 자전거', current: 42000, target: 120000, daysLeft: 12 });
  assert.equal(changed.monthly.goal, 120000); assert.equal(JSON.stringify(frozen), before);
  for (const key of Object.keys(frozen).filter(k => !['goal', 'monthly'].includes(k))) assert.deepEqual(changed[key], frozen[key]);
  assert.deepEqual({ ...changed.monthly, goal: frozen.monthly.goal }, frozen.monthly);
  const nameOnly = copy(api.applyGoalUpdate(frozen, goalDraft('새 이름', '100000')));
  assert.equal(nameOnly.goal.current, 42000); assert.equal(nameOnly.goal.target, 100000);
  pass('B/C: immutable update, only title/target/monthly.goal change; current/daysLeft/accounting preserved');
  const created = copy(api.applyGoalUpdate(null, goalDraft('새 자전거', '100000')));
  assert.deepEqual(created, { balance: 0, monthly: { saving: 0, spending: 0 }, transactions: [], goal: { current: 0, title: '새 자전거', target: 100000 } });
  for (const base of [{ ...copy(frozen), goal: null }, (() => { const s = copy(frozen); delete s.goal; return s; })()]) {
    assert.equal(api.applyGoalUpdate(base, goalDraft()).goal.current, 0);
  }
  const extras = { ...copy(frozen), extra: { unchanged: true }, goal: { ...frozen.goal, extra: ['keep'] } };
  delete extras.monthly.goal;
  const extraResult = copy(api.applyGoalUpdate(extras, goalDraft()));
  assert(!Object.hasOwn(extraResult.monthly, 'goal')); assert.deepEqual(extraResult.goal.extra, ['keep']); assert.deepEqual(extraResult.extra, extras.extra);
  pass('A: approved zero-start, null/missing goal, no invented daysLeft/monthly.goal, unknown fields preserved');
  for (const raw of ['', '0', '-1', '1.2', '1e3', 'NaN', 'Infinity', '1,000', ' 100', '+100', '0x10', '９', '1\n', '9'.repeat(400), String(Number.MAX_SAFE_INTEGER + 1), 100, null]) assert(!api.validateGoalDraft(goalDraft('목표', raw), null).valid, String(raw));
  assert(api.validateGoalDraft(goalDraft('목표', String(Number.MAX_SAFE_INTEGER)), null).valid);
  assert(!api.validateGoalDraft(goalDraft('목표', '30000'), frozen).valid);
  assert.equal(api.createGoalViewModel(api.applyGoalUpdate(frozen, goalDraft('목표', '42000'))).status, 'complete');
  for (const title of ['', '  ', '😀'.repeat(31), null, 5]) assert(!api.validateGoalDraft(goalDraft(title), null).valid);
  assert(api.validateGoalDraft(goalDraft('😀'.repeat(30)), null).valid);
  assert(api.validateGoalDraft(goalDraft('<svg onload=alert(1)>'), null).valid);
  pass('D/E/F: target strict integers, safe bounds, equality completion, Unicode code points and trim');
  for (const current of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '100']) assert.equal(api.createGoalViewModel({ goal: { title: '목표', current, target: 100 } }).status, 'invalid');
  for (const target of [0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '100']) assert.equal(api.createGoalViewModel({ goal: { title: '목표', current: 0, target } }).status, 'invalid');
  for (const state of [{}, [], { ...frozen, goal: {} }, { ...frozen, monthly: { ...frozen.monthly, goal: '45000' } }, { ...frozen, transactions: [null] }]) {
    assert(!api.validateGoalDraft(goalDraft(), state).valid); assert.throws(() => api.applyGoalUpdate(state, goalDraft()));
  }
  assert.equal(api.createGoalViewModel({ goal: { title: '긴'.repeat(100), target: 1, current: Number.MAX_SAFE_INTEGER } }).percent, 100);
  assert.equal(api.createGoalViewModel({ goal: { title: '목표', target: Number.MAX_SAFE_INTEGER, current: 0 } }).remaining, Number.MAX_SAFE_INTEGER);
  pass('K: malformed/unsafe source blocked; large arithmetic and legacy long titles readable');
  const tx = api.applyTransaction(changed, draft('in', '10000', '용돈'), stamp);
  assert.deepEqual(copy(tx.goal), changed.goal); assert.equal(tx.monthly.goal, changed.monthly.goal);
  assert.equal(tx.balance, changed.balance + 10000);
  assert.equal(api.applyTransaction(created, draft('in', '1000', '용돈'), stamp).goal.current, 0);
  pass('Record compatibility: Goal-first state accepts first income, transaction never contributes to goal');
}
async function openGoal(page, title, target) {
  await page.locator('.pw-goal-hero > button').click();
  await page.waitForFunction(() => document.activeElement.id === 'pw-goal-title');
  if (title !== undefined) await page.locator('#pw-goal-title').fill(title);
  if (target !== undefined) await page.locator('#pw-goal-target').fill(target);
}
const saveGoal = page => page.getByRole('button', { name: '목표 저장', exact: true }).click();
async function geometry(page, sheet = false) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const g = await page.evaluate(sheet => {
    const box = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const content = document.querySelector('.pw-content'), dialog = document.querySelector('dialog');
    const controls = [...document.querySelectorAll(sheet ? 'dialog button,dialog input' : '.pw-goal button')];
    return { width: innerWidth, height: innerHeight, docWidth: document.documentElement.scrollWidth, contentClient: content.clientWidth, contentScroll: content.scrollWidth,
      controls: controls.map(box), nav: box(document.querySelector('.pw-bottom-navigation')),
      money: [...document.querySelectorAll('.pw-goal-money')].map(n => ({ client: n.clientWidth, scroll: n.scrollWidth })),
      progress: [...document.querySelectorAll('.pw-goal-progress')].map(n => ({ client: n.clientWidth, scroll: n.scrollWidth })),
      ...(sheet ? { dialog: box(dialog), fields: box(document.querySelector('.pw-goal-fields')), footer: box(document.querySelector('.pw-goal-sheet-footer')), dialogScroll: dialog.scrollWidth, dialogClient: dialog.clientWidth } : {}) };
  }, sheet);
  assert(g.docWidth <= g.width && g.contentScroll <= g.contentClient, JSON.stringify(g));
  assert(g.money.every(m => m.scroll <= m.client + 1) && g.progress.every(m => m.scroll <= m.client + 1), JSON.stringify(g));
  assert(g.controls.every(c => c.width >= 48 && c.height >= 48 && c.x >= -0.1 && c.right <= g.width + 0.1), JSON.stringify(g));
  if (sheet) {
    assert(g.dialog.y >= -0.1 && g.dialog.bottom <= g.height + 0.1 && g.dialogScroll <= g.dialogClient, JSON.stringify(g));
    assert(g.fields.bottom <= g.footer.y + 0.1 && g.footer.bottom <= g.dialog.bottom + 0.1, JSON.stringify(g));
  }
  return g;
}
async function saves(browser, engine) {
  for (const [label, source, name, target] of [
    ['create', null, '새 자전거', '100000'], ['edit', goalFixture, '새 자전거', '120000'], ['title', goalFixture, '나의 자전거', '100000'],
    ['no-goal', { ...goalFixture, goal: null }, '새 자전거', '100000'],
    ['equal', goalFixture, '새 자전거', '42000'],
  ]) {
    const { page, context } = await setup(browser, source);
    try {
      const before = await read(page);
      if (label === 'create') await screenshot(page, 'empty-goal', engine === 'Chromium');
      await openGoal(page, name, target);
      await screenshot(page, `sheet-${label}`, engine === 'Chromium' && ['create', 'edit'].includes(label));
      await page.getByRole('button', { name: '목표 저장', exact: true }).evaluate(button => { button.click(); button.click(); button.form.dispatchEvent(new Event('submit', { cancelable: true })); });
      assert.equal(await page.locator('dialog[open]').count(), 0);
      await page.waitForFunction(() => document.activeElement.matches('.pw-goal-hero > button'));
      const next = await stored(page);
      assert.equal(next.goal.current, source?.goal?.current || 0); assert.equal(next.goal.target, Number(target)); assert.equal(next.goal.title, name);
      assert.equal(await page.locator('.pw-goal-feedback').textContent(), source?.goal ? '목표를 바꿨어요.' : '목표를 만들었어요.');
      assert.equal((await calls(page)).length, 1);
      const after = await read(page);
      for (const key of Object.keys(before).filter(k => k !== 'pocketwon_demo_v1')) assert.equal(before[key], after[key]);
      if (engine === 'Chromium') fs.writeFileSync(path.join(output, `storage-${label}.json`), JSON.stringify({ before: source, after: next }, null, 2));
      await page.getByRole('button', { name: '홈', exact: true }).click();
      if (label === 'equal') {
        assert.equal(await page.locator('.pw-home-goal .pw-home-empty').textContent(), '저장된 목표 금액을 모두 모았어요.');
      } else {
      assert.equal(await page.locator('.pw-home-goal-name').textContent(), name);
      assert((await page.locator('.pw-home-goal').textContent()).includes(Number(target).toLocaleString('ko-KR')));
      assert.equal(await page.locator('.pw-home-goal [role=progressbar]').getAttribute('aria-valuenow'), String(Math.round(next.goal.current / Number(target) * 100)));
            }
      await page.locator('.pw-home-goal').scrollIntoViewIfNeeded();
      await screenshot(page, `home-after-${label}`, engine === 'Chromium');
      await settlePresentation(page);
      await page.reload(); await page.getByRole('button', { name: '목표', exact: true }).click();
      assert.equal((await read(page)).pocketwon_demo_v1, after.pocketwon_demo_v1); assert.deepEqual(await calls(page), []);
      assert.equal(await page.locator('#pw-goal-name').textContent(), name);
      await screenshot(page, `reload-${label}`, engine === 'Chromium');
      // Goal-first and edited-state Record compatibility exercised through real UI.
      await page.getByRole('button', { name: '기록하러 가기', exact: true }).click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'pw-screen-title');
      await page.getByRole('button', { name: '새 기록 추가', exact: true }).click();
      await page.getByRole('radio', { name: '받은 돈', exact: true }).check();
      await page.locator('#pw-record-amount').fill('10000');
      await page.getByRole('button', { name: '기록 저장', exact: true }).click();
      const recordResult = await stored(page); assert.deepEqual(recordResult.goal, next.goal); assert.equal(recordResult.balance, next.balance + 10000);
      pass(`${engine}: ${label} save, one write, Home sync, reload and Record preserves current`);
    } finally { await settlePresentation(page); await context.close(); }
  }
}
async function invalidAndFailure(browser, engine) {
  const { page, context } = await setup(browser, goalFixture);
  try {
    const before = await read(page), hero = await page.locator('.pw-goal-hero').textContent();
    await openGoal(page);
    for (const raw of ['0', '-1', '1.2', '1e3', 'Infinity', 'NaN', '9007199254740992', '1,000']) {
      await page.locator('#pw-goal-target').fill(raw);
      assert(await page.getByRole('button', { name: '목표 저장', exact: true }).isDisabled());
      assert.equal(await page.locator('#pw-goal-target').getAttribute('aria-invalid'), 'true');
    }
    await page.locator('#pw-goal-target').fill('0'); await screenshot(page, 'target-validation', engine === 'Chromium');
    await page.locator('#pw-goal-target').fill('30000');
    assert.equal(await page.locator('#pw-goal-target-error').textContent(), '지금까지 모은 금액 이상으로 정해주세요.');
    await screenshot(page, 'below-current-error', engine === 'Chromium');
    await page.locator('#pw-goal-target').fill('120000');
    for (const title of [' ', '😀'.repeat(31)]) {
      await page.locator('#pw-goal-title').fill(title); assert(await page.getByRole('button', { name: '목표 저장', exact: true }).isDisabled());
    }
    await page.locator('#pw-goal-title').fill('새 자전거');
    await page.locator('#pw-goal-target').press('Enter'); assert.deepEqual(await calls(page), []);
    await page.evaluate(() => { window.__writeFailure = true; }); await saveGoal(page);
    assert(await page.locator('dialog').isVisible()); assert.equal(await page.locator('#pw-goal-target').inputValue(), '120000');
    assert.equal(await page.locator('.pw-goal-hero').textContent(), hero); assert.deepEqual(await read(page), before);
    assert.equal(await page.locator('.pw-goal-feedback').textContent(), '');
    assert.equal(await page.locator('#pw-goal-save-error').textContent(), '목표를 저장하지 못했어요. 다시 시도해주세요.');
    await screenshot(page, 'storage-failure', engine === 'Chromium'); await geometry(page, true);
    await page.evaluate(() => { window.__writeFailure = false; }); await saveGoal(page);
    assert.equal((await stored(page)).goal.target, 120000);
    pass(`${engine}: D/E/F/G invalid input, Enter no write, failed storage preserves exact string/view/draft; retry succeeds`);
  } finally { await settlePresentation(page); await context.close(); }
  for (const [name, data] of [['bad-json', '{'], ['partial', {}], ['invalid-goal', { ...goalFixture, goal: {} }], ['bad-monthly-goal', { ...goalFixture, monthly: { ...goalFixture.monthly, goal: '100000' } }]]) {
    const { page, context } = await setup(browser, data);
    try {
      const before = await read(page); await openGoal(page, '새 자전거', '100000');
      assert(await page.getByRole('button', { name: '목표 저장', exact: true }).isDisabled());
      assert(await page.locator('#pw-goal-save-error').isVisible());
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: '홈', exact: true }).click();
      await settlePresentation(page);
      await page.reload();
      assert.deepEqual(await read(page), before); assert.deepEqual(await calls(page), []);
      pass(`${engine}: ${name} cannot be repaired or overwritten`);
    } finally { await settlePresentation(page); await context.close(); }
  }
}
async function latestState(browser, engine) {
  for (const kind of ['current-allowed', 'current-too-high', 'removed', 'created', 'retitled', 'read-failure', 'malformed', 'balance']) {
    const { page, context } = await setup(browser, kind === 'created' ? null : goalFixture);
    try {
      await openGoal(page, '새 자전거', '120000');
      const latest = copy(goalFixture);
      if (kind === 'current-allowed') latest.goal.current = 70000;
      if (kind === 'current-too-high') latest.goal.current = 130000;
      if (kind === 'retitled') latest.goal.title = '다른 목표';
      if (kind === 'balance') latest.balance = 10000;
      if (kind === 'read-failure') await page.evaluate(() => { window.__readFailure = true; });
      else await page.evaluate(value => window.__replace(value), kind === 'removed' ? null : kind === 'malformed' ? '{' : JSON.stringify(latest));
      const before = await read(page); await saveGoal(page);
      if (['current-allowed', 'balance'].includes(kind)) {
        const after = await stored(page); assert.equal(after.goal.current, latest.goal.current); assert.equal(after.balance, latest.balance);
      } else {
        assert.deepEqual(await read(page), before); assert.deepEqual(await calls(page), []); assert(await page.locator('dialog').isVisible());
        assert.equal(await page.locator('#pw-goal-target').inputValue(), '120000');
      }
      pass(`${engine}: latest storage ${kind}, no stale accounting overwrite`);
    } finally { await settlePresentation(page); await context.close(); }
  }
}
async function layoutAndAccess(browser, engine) {
  for (const [width, height] of [[360, 844], [390, 844], [430, 844], [360, 640]]) {
    const { page, context } = await setup(browser, goalFixture, width, height);
    try {
      for (const scale of [1, 2]) {
        await page.evaluate(scale => { document.documentElement.style.fontSize = `${16 * scale}px`; }, scale);
        const suffix = `${width}x${height}${scale === 2 ? '-200percent' : ''}`;
        await geometry(page); await screenshot(page, `${suffix}-goal`, engine === 'Chromium');
        assert.equal(await page.getByRole('progressbar', { name: '목표 진행률' }).getAttribute('aria-valuenow'), '42');
        await page.locator('.pw-goal-next').scrollIntoViewIfNeeded();
        const last = await page.locator('.pw-goal-action').boundingBox(), nav = await page.locator('.pw-bottom-navigation').boundingBox(); assert(last.y + last.height <= nav.y + 0.1);
        await openGoal(page, '새 자전거', '120000'); await geometry(page, true);
        await screenshot(page, `${suffix}-sheet`, engine === 'Chromium');
        await page.keyboard.press('Escape'); await page.waitForFunction(() => document.activeElement.matches('.pw-goal-hero > button'));
        await page.locator('.pw-content').evaluate(el => { el.scrollTop = 0; });
      }
      assert.deepEqual(await calls(page), []); pass(`${engine}: ${width}x${height}, 100/200% screen/Sheet geometry and no writes`);
    } finally { await settlePresentation(page); await context.close(); }
  }
  const { page, context } = await setup(browser, goalFixture);
  try {
    const minScreen = await textContrast(page, '.pw-goal h1,.pw-goal h2,.pw-goal p,.pw-goal dt,.pw-goal button,.pw-goal-money-display');
    await openGoal(page);
    assert.equal(await page.getByRole('dialog', { name: '목표 수정', exact: true }).count(), 1);
    assert.equal(await page.locator('dialog input').count(), 2);
    assert.equal(await page.locator('#pw-goal-target').getAttribute('inputmode'), 'numeric');
    for (const key of ['title', 'target']) assert((await page.locator(`#pw-goal-${key}`).getAttribute('aria-describedby')).includes(`pw-goal-${key}-error`));
    fs.writeFileSync(path.join(output, `accessibility-${engine}.txt`), await page.locator('body').ariaSnapshot());
    const minSheet = await textContrast(page, 'dialog h2,dialog label,dialog p:not([hidden]),dialog button[type=submit]');
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'pw-goal-target');
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.textContent), '목표 저장');
    assert.equal(await page.locator('button[type=submit]').evaluate(n => getComputedStyle(n).outlineWidth), '2px');
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '목표 설정 닫기');
    await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.textContent), '목표 저장');
    await page.keyboard.press('Escape'); await page.waitForFunction(() => document.activeElement.matches('.pw-goal-edit'));
    await openGoal(page, '새 자전거', '0');
    await page.locator('#pw-goal-target').press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '목표 설정 닫기');
    await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'pw-goal-target');
    await page.keyboard.press('Escape');
    pass(`${engine}: native dialog, labels/errors, first focus, enabled/disabled Tab trap, Escape and focus-visible`, { minScreen, minSheet });
    await page.evaluate(() => {
      for (const [key, value] of Object.entries({ top: 47, bottom: 34, left: 24, right: 24 })) document.documentElement.style.setProperty(`--pw-safe-${key}`, `${value}px`);
    });
    await openGoal(page); await geometry(page, true);
    assert.equal(await page.locator('.pw-goal-sheet-footer').evaluate(n => getComputedStyle(n).paddingBottom), '46px');
    await screenshot(page, 'safe-area-sheet', engine === 'Chromium');
    await page.setViewportSize({ width: 360, height: 440 }); await page.locator('#pw-goal-target').focus(); await geometry(page, true);
    await screenshot(page, 'keyboard-height', engine === 'Chromium');
    const button = await page.locator('button[type=submit]').boundingBox(); assert(button.y + button.height <= 440);
    await page.locator('.pw-goal-fields').evaluate(n => { n.scrollTop = n.scrollHeight; });
    assert(await page.locator('.pw-goal-fields').evaluate(n => n.scrollTop > 0));
    await page.keyboard.press('Escape'); assert.deepEqual(await calls(page), []);
    pass(`${engine}: safe area once, simulated keyboard height and fields scrolling`);
  } finally { await settlePresentation(page); await context.close(); }
  for (const [label, goal] of [
    ['complete', { title: '새 자전거', current: 100000, target: 100000 }],
    ['over-target', { title: '새 자전거', current: Number.MAX_SAFE_INTEGER, target: 1 }],
    ['large-long', { title: '내가 오래 기다려 온 정말 멋진 새 자전거와 안전 장비', current: 999999999999999, target: Number.MAX_SAFE_INTEGER }],
    ['html-text', { title: '<svg onload=alert(1)>', current: 42000, target: 100000 }],
    ['invalid-fallback', { title: '오류', current: -1, target: 100 }],
  ]) {
    const { page, context } = await setup(browser, { ...goalFixture, goal }, 360, 844);
    try {
      await geometry(page); await screenshot(page, label, engine === 'Chromium');
      if (label === 'complete' || label === 'over-target') {
        assert.equal(await page.locator('.pw-goal-complete').textContent(), '✓목표를 달성했어요!');
        assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '100');
      }
      if (label === 'html-text') assert.equal(await page.locator('#pw-goal-name svg').count(), 0);
      await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; }); await geometry(page);
      await screenshot(page, `${label}-200percent`, engine === 'Chromium');
      if (label === 'large-long') {
        await page.locator('.pw-goal-money--large').scrollIntoViewIfNeeded();
        await screenshot(page, 'large-money-200percent', engine === 'Chromium');
        assert.equal(await page.locator('.pw-goal-money--large').getAttribute('aria-label'), '999,999,999,999,999원');
        await openGoal(page); await geometry(page, true);
        await screenshot(page, 'large-amount-sheet-200percent', engine === 'Chromium');
        await page.keyboard.press('Escape');
      }
      assert.deepEqual(await calls(page), []); pass(`${engine}: ${label}, exact amounts and 200% overflow`);
    } finally { await settlePresentation(page); await context.close(); }
  }
}
(async () => {
  try {
    unitTests();
    for (const [type, name] of [[chromium, 'Chromium'], [webkit, 'WebKit']]) {
      const key = name.toLowerCase(), browser = await type.launch({ headless: true, executablePath: executable(key) });
      try {
        report.browsers[key] = { version: browser.version(), executable: executable(key) };
        await saves(browser, name); await invalidAndFailure(browser, name); await latestState(browser, name); await layoutAndAccess(browser, name);
      } finally { await browser.close(); }
    }
    assert.deepEqual(report.consoleErrors, []); assert.deepEqual(report.resourceErrors, []);
    pass('Console/page errors and failed resource/HTTP requests: zero'); report.status = 'PASS';
  } catch (error) { report.status = 'FAIL'; report.failure = error.stack; process.exitCode = 1; }
  finally {
    report.finishedAt = new Date().toISOString(); fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, checks: report.checks.length, failure: report.failure, consoleErrors: report.consoleErrors, resourceErrors: report.resourceErrors }, null, 2));
  }
})();
