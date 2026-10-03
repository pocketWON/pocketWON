/* Focused fixed-stage record checks. Fresh contexts contain synthetic data only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { chromium, webkit } = require(process.env.PW_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, process.env.PW_EVIDENCE_ROOT || 'evidence/SINGLE-SCREEN/record-stage-' + new Date().toISOString().replace(/[:.]/g, '-'));
const origin = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const url = origin + '/ks6s3juocjzc2.kimi.page/index.html';
const original = fs.readFileSync(path.join(root, 'preservation/PW-WOORI-01/original-index.html.txt'), 'utf8');
const fixture = JSON.parse(JSON.stringify(vm.runInNewContext('(' + original.match(/const defaultState = (\{[\s\S]*?\n        \});/)[1] + ')')));
const copy = data => JSON.parse(JSON.stringify(data));
const report = { startedAt: new Date().toISOString(), url, checks: [], browsers: {}, errors: [], status: 'RUNNING', limitations: ['Keyboard events run in isolated desktop engines; physical mobile IME and keyboard are not verified'] };
fs.mkdirSync(output, { recursive: true });
const pass = (name, detail = true) => { report.checks.push({ name, status: 'PASS', detail }); console.log('PASS ' + name); };
function executable(engine) {
  const configured = process.env[engine === 'chromium' ? 'PW_CHROMIUM_EXECUTABLE' : 'PW_WEBKIT_EXECUTABLE'];
  if (configured) return configured;
  const type = engine === 'chromium' ? chromium : webkit;
  if (fs.existsSync(type.executablePath())) return type.executablePath();
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  const prefix = engine === 'chromium' ? 'chromium_headless_shell-' : 'webkit-';
  const versions = fs.readdirSync(cache).filter(name => name.startsWith(prefix)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  assert(versions.length, 'Install the browser or provide its executable override');
  return path.join(cache, versions[0], engine === 'chromium' ? 'chrome-headless-shell-mac-arm64/chrome-headless-shell' : 'pw_run.sh');
}
async function setup(browser, { state = fixture, width = 390, height = 844, readFailure = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: 'reduce' });
  await context.addInitScript(({ state, readFailure }) => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    set.call(localStorage, 'pocketwon_demo_v1', JSON.stringify(state)); set.call(localStorage, 'record_stage_unrelated', 'keep');
    window.__recordWrites = []; window.__recordReads = []; window.__recordReadFailure = readFailure;
    window.__recordRaw = () => Object.fromEntries(Object.keys(localStorage).map(key => [key, get.call(localStorage, key)]));
    window.__recordReplace = data => set.call(localStorage, 'pocketwon_demo_v1', JSON.stringify(data));
    Storage.prototype.getItem = function(key) {
      window.__recordReads.push(key);
      if (key === 'pocketwon_demo_v1' && window.__recordReadFailure) throw new DOMException('Synthetic read failure', 'SecurityError');
      return get.call(this, key);
    };
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const native = Storage.prototype[method];
      Storage.prototype[method] = function(...args) { const result = native.apply(this, args); window.__recordWrites.push({ method, key: args[0] }); return result; };
    }
  }, { state, readFailure });
  const page = await context.newPage(); page.setDefaultTimeout(5000);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(url); await page.evaluate(() => document.fonts.ready);
  await page.locator('.pw-nav-item[data-screen="record"]').click();
  await page.waitForFunction(() => Number(document.querySelector('.pw-record')?.dataset.pageSize) >= 1);
  return { context, page };
}
const dialog = page => page.locator('dialog[open]');
const next = page => dialog(page).getByRole('button', { name: '다음', exact: true }).click();
const back = page => dialog(page).getByRole('button', { name: '이전 단계', exact: true }).click();
const writes = page => page.evaluate(() => window.__recordWrites);
const raw = page => page.evaluate(() => window.__recordRaw());
const stored = async page => JSON.parse((await raw(page)).pocketwon_demo_v1);
async function openType(page, type) {
  await page.getByRole('button', { name: '새 기록 추가', exact: true }).click();
  await dialog(page).getByRole('radio', { name: type === 'in' ? '받은 돈' : '쓴 돈', exact: true }).check(); await next(page);
}
async function outgoingConfirmation(page, amount = '1000', memo = '초안 메모', category = '교통') {
  await openType(page, 'out'); await page.locator('#pw-record-amount').fill(amount); await next(page);
  await dialog(page).getByRole('radio', { name: category, exact: true }).check(); await next(page);
  await page.locator('#pw-record-memo').fill(memo); await next(page);
  assert.equal(await dialog(page).getAttribute('data-step'), 'confirm');
}
async function incomingAndLatest(browser, engine) {
  const { context, page } = await setup(browser);
  try {
    await openType(page, 'in'); await page.locator('#pw-record-amount').fill('1200'); await next(page);
    assert.equal(await dialog(page).getAttribute('data-step'), 'memo');
    assert.equal(await page.locator('#pw-record-memo').inputValue(), '');
    await dialog(page).getByRole('button', { name: '건너뛰기', exact: true }).click();
    assert.equal(await dialog(page).getAttribute('data-step'), 'confirm');
    assert.match(await page.locator('.pw-record-confirm-summary').textContent(), /용돈/);
    assert.deepEqual(await writes(page), []);
    pass(`${engine}: incoming skips category, supports optional memo, and confirms 용돈 without writes`);
    const latest = copy(fixture); latest.balance = 80000;
    latest.monthly = { ...latest.monthly, saving: 45600, spending: 900, goal: 3456, unknownMonthly: { kept: true } };
    latest.goal = { ...latest.goal, current: latest.goal.current + 111 };
    latest.unknownRoot = { retained: ['latest'] }; latest.current = 'unknown current field';
    latest.transactions.reverse(); latest.transactions.push({ type: 'out', amount: 70, category: '교통', ts: '2001-01-01T01:00:00.000Z', receipt: true, unknownTransaction: 'keep' });
    await page.evaluate(data => window.__recordReplace(data), latest);
    const readCount = await page.evaluate(() => window.__recordReads.length);
    await dialog(page).getByRole('button', { name: '기록 저장', exact: true }).evaluate(button => { button.click(); button.click(); button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); });
    assert.equal(await dialog(page).count(), 0); assert.equal(await page.locator('.pw-record').getAttribute('data-stage'), 'result');
    const data = await stored(page); assert.equal(data.balance, 81200); assert.equal(data.monthly.saving, 46800);
    assert.equal(data.monthly.spending, latest.monthly.spending); assert.equal(data.monthly.goal, latest.monthly.goal);
    assert.deepEqual(data.monthly.unknownMonthly, latest.monthly.unknownMonthly); assert.deepEqual(data.goal, latest.goal);
    assert.deepEqual(data.unknownRoot, latest.unknownRoot); assert.equal(data.current, latest.current);
    assert.deepEqual(data.transactions.slice(1), latest.transactions); assert.equal(data.transactions[0].category, '용돈');
    assert.equal(data.transactions[0].amount, 1200); assert.equal(data.transactions[0].type, 'in'); assert.equal(data.transactions[0].receipt, false);
    assert.deepEqual(Object.keys(data.transactions[0]), ['type', 'amount', 'category', 'ts', 'receipt']);
    assert.equal((await writes(page)).length, 1); assert.equal(await page.evaluate(() => window.__recordReads.length), readCount + 1);
    assert.equal((await raw(page)).record_stage_unrelated, 'keep');
    await page.getByRole('button', { name: '기록 내역 보기', exact: true }).click(); assert.equal(await page.locator('.pw-record').getAttribute('data-page'), '1');
    pass(`${engine}: one final read preserves latest fields/current and transaction order; duplicate activation saves once`, { writes: await writes(page), transactionCount: data.transactions.length });
  } finally { await context.close(); }
}
async function draftBackAndCancellation(browser, engine) {
  const { context, page } = await setup(browser);
  try {
    const before = await raw(page); await outgoingConfirmation(page, '300', '돌아가도 남는 메모', '교통');
    await back(page); assert.equal(await page.locator('#pw-record-memo').inputValue(), '돌아가도 남는 메모');
    await back(page); assert(await dialog(page).getByRole('radio', { name: '교통', exact: true }).isChecked());
    await back(page); assert.equal(await page.locator('#pw-record-amount').inputValue(), '300');
    await back(page); assert(await dialog(page).getByRole('radio', { name: '쓴 돈', exact: true }).isChecked());
    await next(page); assert.equal(await page.locator('#pw-record-amount').inputValue(), '300');
    await next(page); assert(await dialog(page).getByRole('radio', { name: '교통', exact: true }).isChecked());
    await next(page); assert.equal(await page.locator('#pw-record-memo').inputValue(), '돌아가도 남는 메모'); await next(page);
    assert.deepEqual(await writes(page), []); assert.deepEqual(await raw(page), before);
    pass(`${engine}: every backward/forward step retains type, amount, category and memo draft`);
    await dialog(page).getByRole('button', { name: '돈 기록하기 닫기', exact: true }).click();
    assert.equal(await dialog(page).count(), 0); assert.equal(await page.evaluate(() => document.activeElement.textContent), '새 기록 추가');
    await page.getByRole('button', { name: '새 기록 추가', exact: true }).click();
    assert.equal(await dialog(page).getAttribute('data-step'), 'type');
    assert.equal(await dialog(page).getByRole('radio', { name: '쓴 돈', exact: true }).isChecked(), false);
    await page.keyboard.press('Escape'); assert.equal(await dialog(page).count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.textContent), '새 기록 추가');
    assert.deepEqual(await writes(page), []); assert.deepEqual(await raw(page), before);
    pass(`${engine}: Close and Escape discard draft and restore the original opener without writes`);
  } finally { await context.close(); }
}
async function homeEntryCancellation(browser, engine) {
  const { context, page } = await setup(browser);
  try {
    const before = await raw(page);
    await page.locator('.pw-nav-item[data-screen="home"]').click();
    for (const method of ['Close', 'Escape']) {
      await page.locator('.pw-home-card[aria-label="기록하기"]').click();
      assert.equal(await dialog(page).getAttribute('data-step'), 'type');
      if (method === 'Close') await dialog(page).getByRole('button', { name: '돈 기록하기 닫기', exact: true }).click();
      else await page.keyboard.press('Escape');
      assert.equal(await dialog(page).count(), 0); assert.equal(await page.locator('.pw-home').count(), 1);
      await page.waitForFunction(() => document.activeElement.getAttribute('aria-label') === '기록하기');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), '기록하기', `${engine} Home ${method} opener restoration`);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'form');
    }
    assert.deepEqual(await writes(page), []); assert.deepEqual(await raw(page), before);
    pass(`${engine}: Home form Close/Escape returns focus to the original 기록하기 action`);
  } finally { await context.close(); }
}
async function modalKeyboard(browser, engine) {
  const { context, page } = await setup(browser);
  try {
    await openType(page, 'in'); await page.locator('#pw-record-amount').fill('500');
    const inside = [];
    for (const key of ['Tab', 'Tab', 'Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
      await page.keyboard.press(key);
      inside.push(await page.evaluate(() => document.querySelector('dialog[open]').contains(document.activeElement)));
    }
    assert(inside.every(Boolean));
    await page.locator('#pw-record-amount').focus();
    const prevented = await page.locator('#pw-record-amount').evaluate(input => {
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: 'ㅎ' }));
      const enter = new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }); input.dispatchEvent(enter); return enter.defaultPrevented;
    });
    assert.equal(prevented, true); await page.keyboard.press('Enter');
    assert.equal(await dialog(page).getAttribute('data-step'), 'amount'); assert.deepEqual(await writes(page), []);
    await page.locator('#pw-record-amount').evaluate(input => input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '한' })));
    await page.keyboard.press('Enter'); assert.equal(await dialog(page).getAttribute('data-step'), 'amount');
    await next(page); await dialog(page).getByRole('button', { name: '건너뛰기', exact: true }).click();
    await dialog(page).getByRole('button', { name: '기록 저장', exact: true }).focus();
    await dialog(page).evaluate(node => node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: 'ㅎ' })));
    await page.keyboard.press('Enter'); assert.equal(await dialog(page).count(), 1); assert.deepEqual(await writes(page), []);
    await dialog(page).evaluate(node => node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '한' })));
    await page.keyboard.press('Escape');
    pass(`${engine}: Tab stays inside the modal; input and composing Enter never advance or save`, { tabSamples: inside.length, composingEnterPrevented: prevented });
  } finally { await context.close(); }
}
async function latestInsufficient(browser, engine) {
  const { context, page } = await setup(browser);
  try {
    await outgoingConfirmation(page, '1000', '마지막에 다시 확인', '교통');
    const latest = copy(fixture); latest.balance = 300; latest.latest = 'keep';
    await page.evaluate(data => window.__recordReplace(data), latest); const before = await raw(page);
    await dialog(page).getByRole('button', { name: '기록 저장', exact: true }).click();
    assert.match(await page.locator('#pw-record-save-error').textContent(), /지금 가진 돈보다 큰 금액/);
    assert.deepEqual(await writes(page), []); assert.deepEqual(await raw(page), before);
    await back(page); assert.equal(await page.locator('#pw-record-memo').inputValue(), '마지막에 다시 확인');
    await back(page); assert(await dialog(page).getByRole('radio', { name: '교통', exact: true }).isChecked());
    await back(page); assert.equal(await page.locator('#pw-record-amount').inputValue(), '1000'); await page.keyboard.press('Escape');
    assert.deepEqual(await writes(page), []); assert.deepEqual(await raw(page), before);
    pass(`${engine}: latest insufficient balance prevents writes and preserves the complete draft`);
  } finally { await context.close(); }
}
async function recoveryRead(browser, engine) {
  const { context, page } = await setup(browser, { readFailure: true });
  try {
    assert.match(await page.locator('.pw-record-notice').textContent(), /불러오지 못/);
    const count = await page.evaluate(() => window.__recordReads.length), before = await raw(page);
    await page.evaluate(() => { window.__recordReadFailure = false; });
    await page.getByRole('button', { name: '다시 불러오기', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__recordReads.length), count + 1);
    assert.match(await page.locator('.pw-record-balance').textContent(), new RegExp(fixture.balance.toLocaleString('ko-KR')));
    assert.equal(await page.getByRole('button', { name: '새 기록 추가', exact: true }).count(), 1);
    assert.deepEqual(await writes(page), []); assert.deepEqual(await raw(page), before);
    pass(`${engine}: read-error retry reads recovered storage once and never repairs or writes`);
  } finally { await context.close(); }
}
async function paginationResize(browser, engine) {
  const many = copy(fixture);
  many.transactions = Array.from({ length: 37 }, (_, i) => ({ type: i % 2 ? 'out' : 'in', amount: 100 + i, category: i % 2 ? '교통' : '용돈', memo: `기록 ${i + 1}`, ts: new Date(Date.UTC(2026, 8, 11, 12, 59) - i * 60000).toISOString(), receipt: false }));
  const { context, page } = await setup(browser, { state: many, width: 430, height: 932 });
  try {
    await page.waitForFunction(() => document.querySelector('.pw-record').dataset.pageSize === '6');
    const forward = page.locator('.pw-record-pagination').getByRole('button', { name: '다음', exact: true }); await forward.click(); await forward.click();
    assert.equal(await page.locator('.pw-record').getAttribute('data-page'), '3');
    const row = page.locator('.pw-record-list [data-source-index]').last(), source = await row.getAttribute('data-source-index'); await row.focus();
    await page.setViewportSize({ width: 320, height: 568 });
    await page.waitForFunction(source => document.querySelector('.pw-record').dataset.pageSize === '3' && document.activeElement.dataset.sourceIndex === source, source);
    assert.equal(await page.locator('.pw-record').getAttribute('data-page'), String(Math.floor(Number(source) / 3) + 1));
    assert.equal(await page.locator(`[data-source-index="${source}"]`).count(), 1);
    await page.setViewportSize({ width: 430, height: 932 });
    await page.waitForFunction(source => document.querySelector('.pw-record').dataset.pageSize === '6' && document.activeElement.dataset.sourceIndex === source, source);
    assert.equal(await page.locator('.pw-record').getAttribute('data-page'), '3');
    await forward.focus(); await page.setViewportSize({ width: 320, height: 568 });
    await page.waitForFunction(() => document.querySelector('.pw-record').dataset.pageSize === '3');
    assert.equal(await page.locator('.pw-record').getAttribute('data-page'), '5');
    assert.equal(await page.locator('.pw-record-list [data-source-index]').first().getAttribute('data-source-index'), '12');
    await page.locator('.pw-nav-item[data-screen="home"]').click(); await page.locator('.pw-nav-item[data-screen="record"]').click();
    await page.waitForFunction(() => document.querySelector('.pw-record').dataset.pageSize === '3');
    assert.equal(await page.locator('.pw-record').getAttribute('data-page'), '5');
    assert.equal(await page.locator('.pw-record-list [data-source-index]').first().getAttribute('data-source-index'), '12');
    assert.deepEqual(await writes(page), []); assert.deepEqual(await stored(page), many);
    pass(`${engine}: resize keeps the focused transaction and focus; unfocused anchor and navigation page remain stable`, { focusedSource: source, restoredPage: 5, transactions: many.transactions.length });
    for (const [width, height, font] of [[430, 932, 32], [320, 568, 16], [390, 844, 32], [430, 932, 16]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(font => { document.documentElement.style.fontSize = `${font}px`; }, font);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(100); assert.deepEqual(await writes(page), []);
    pass(`${engine}: record observer tolerates viewport/font reflow without stale work or loop errors`, { reflows: 4 });
  } finally { await context.close(); }
}
(async () => {
  try {
    for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
      const browser = await type.launch({ headless: true, executablePath: executable(engine) });
      try {
        report.browsers[engine] = { version: browser.version(), executable: executable(engine) };
        await incomingAndLatest(browser, engine); await draftBackAndCancellation(browser, engine); await homeEntryCancellation(browser, engine); await modalKeyboard(browser, engine);
        await latestInsufficient(browser, engine); await recoveryRead(browser, engine); await paginationResize(browser, engine);
      } finally { await browser.close(); }
    }
    assert.deepEqual(report.errors, []); report.status = 'PASS';
  } catch (error) { report.status = 'FAIL'; report.failure = error.stack; process.exitCode = 1; }
  finally {
    report.finishedAt = new Date().toISOString(); fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ status: report.status, checks: report.checks.length, output, failure: report.failure, errors: report.errors }, null, 2));
  }
})();
