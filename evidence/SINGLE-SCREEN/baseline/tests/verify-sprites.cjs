/* Frame animation acceptance. Local origin, synthetic fixtures, fresh browser contexts only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { chromium, webkit } = require(process.env.PW_PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const app = path.join(root, 'ks6s3juocjzc2.kimi.page');
const output = path.resolve(root, process.env.PW_EVIDENCE_ROOT || 'evidence/SPRITE-MOTION', 'sprites');
const origin = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Only use isolated local origin');
const url = `${origin}/ks6s3juocjzc2.kimi.page/index.html`;
const snapshot = fs.readFileSync(path.join(root, 'preservation/PW-WOORI-01/original-index.html.txt'), 'utf8');
const fixture = JSON.parse(JSON.stringify(vm.runInNewContext(`(${snapshot.match(/const defaultState = (\{[\s\S]*?\n        \});/)[1]})`)));
fs.mkdirSync(path.join(output, 'screenshots'), { recursive: true });
const report = {
  startedAt: new Date().toISOString(), url, status: 'RUNNING', checks: [], screenshots: [], browsers: {}, pageErrors: [],
  limitations: ['Synthetic fixture only; no real bank connection or user storage', 'Alpha, geometry and timing checks complement manual character/art continuity review', 'Visibilitychange contract is simulated; no physical-device battery measurement', 'Layout Shift API is unavailable in WebKit; geometry stability is checked in both engines'],
};
const pass = (name, detail = true) => { report.checks.push({ name, status: 'PASS', detail }); console.log(`PASS ${name}`); };

function executable(engine) {
  const custom = process.env[engine === 'chromium' ? 'PW_CHROMIUM_EXECUTABLE' : 'PW_WEBKIT_EXECUTABLE'];
  if (custom) return custom;
  const type = engine === 'chromium' ? chromium : webkit;
  if (fs.existsSync(type.executablePath())) return type.executablePath();
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  const prefix = engine === 'chromium' ? 'chromium_headless_shell-' : 'webkit-';
  const versions = fs.existsSync(cache) ? fs.readdirSync(cache).filter(name => name.startsWith(prefix)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })) : [];
  assert(versions.length, `Install ${engine} or set executable override`);
  return path.join(cache, versions[0], engine === 'chromium' ? 'chrome-headless-shell-mac-arm64/chrome-headless-shell' : 'pw_run.sh');
}

async function setup(browser, { state = fixture, motion = 'no-preference', width = 390, height = 844, routes = [] } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: motion });
  await context.addInitScript(data => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    set.call(localStorage, 'pocketwon_demo_v1', JSON.stringify(data));
    set.call(localStorage, 'sprite_test_unrelated', 'keep');
    window.__spriteWrites = []; window.__spriteFailedWrites = []; window.__spriteWriteFailure = false;
    window.__spriteRaw = () => Object.fromEntries(Object.keys(localStorage).map(key => [key, get.call(localStorage, key)]));
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function(...args) {
        if (method === 'setItem' && window.__spriteWriteFailure) { window.__spriteFailedWrites.push({ method, key: args[0] }); throw new DOMException('Synthetic quota failure', 'QuotaExceededError'); }
        const result = original.apply(this, args); window.__spriteWrites.push({ method, key: args[0], at: performance.now() }); return result;
      };
    }
    window.__spriteLayoutShifts = [];
    if (PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__spriteLayoutShifts.push({ value: entry.value, at: entry.startTime });
      }).observe({ type: 'layout-shift', buffered: true });
    }
  }, state);
  const page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push(error.message));
  for (const [pattern, handler] of routes) await page.route(pattern, handler);
  await page.goto(url);
  await page.locator('.pw-sprite').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

async function screenshot(page, name) {
  const file = `screenshots/${name}.png`;
  await page.screenshot({ path: path.join(output, file) }); report.screenshots.push(file);
}

async function assetChecks(page, engine) {
  const profiles = await page.evaluate(() => PW_SPRITE_PROFILES);
  assert.deepEqual(Object.keys(profiles).sort(), ['all', 'balance', 'goal', 'record', 'report', 'success']);
  const clips = Object.entries(profiles).flatMap(([profile, value]) => Object.entries(value.clips).map(([kind, clip]) => ({ profile, kind, ...clip })));
  assert.equal(clips.length, 11);
  for (const clip of clips) {
    const count = clip.profile === 'success' ? 10 : clip.kind === 'idle' ? 6 : 8;
    assert.equal(clip.frameCount, count); assert.equal(clip.fps, clip.kind === 'idle' ? 6 : 10);
    assert.equal(clip.frameWidth, 384); assert.equal(clip.frameHeight, 384);
    assert(clip.frameWidth * clip.frameCount <= 4096);
    assert(/\.(webp|png)$/.test(clip.src), 'Controllable alpha sheet, not GIF or video');
    assert.equal(clip.bytes, fs.statSync(path.resolve(app, clip.src)).size);
    assert(clip.bytes <= 512 * 1024, `Sheet exceeds 512KiB motion budget: ${clip.src}`);
  }
  const samples = await page.evaluate(async clips => {
    const results = [];
    for (const clip of clips) {
      const image = new Image(); image.src = clip.src; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
      const frames = [];
      for (let frame = 0; frame < clip.frameCount; frame++) {
        const rgba = context.getImageData(frame * clip.frameWidth, 0, clip.frameWidth, clip.frameHeight).data;
        let visible = 0, transparent = 0, hash = 2166136261;
        for (let i = 0; i < rgba.length; i++) { hash = Math.imul(hash ^ rgba[i], 16777619); if (i % 4 === 3) { if (!rgba[i]) transparent++; else visible++; } }
        const last = clip.frameWidth * clip.frameHeight - 1;
        const corners = [0, clip.frameWidth - 1, last - clip.frameWidth + 1, last].map(pixel => rgba[pixel * 4 + 3]);
        frames.push({ hash: hash >>> 0, visible, transparent, corners });
      }
      results.push({ src: clip.src, width: canvas.width, height: canvas.height, frames });
    }
    return results;
  }, clips);
  for (const [index, sample] of samples.entries()) {
    assert.equal(sample.width, clips[index].frameWidth * clips[index].frameCount); assert.equal(sample.height, clips[index].frameHeight);
    assert(sample.frames.every(frame => frame.visible > 1000 && frame.transparent > 1000 && frame.corners.every(alpha => alpha === 0)), `Visible art with real transparent margins: ${sample.src}`);
    assert(new Set(sample.frames.map(frame => frame.hash)).size >= 3, `Sequence must change actual artwork: ${sample.src}`);
  }
  assert(fs.existsSync(path.join(root, 'sprite-source/manifest.json')), 'Keep frame provenance and source sequence manifest');
  pass(`${engine}: 11 alpha sheets, exact metadata/grid, changing artwork and mobile byte budget`, { clips, samples });
}

// Pause and seek the browser's real CSS Animation to both sides of each frame
// interval. This detects off-by-one cells without timing-sensitive screenshots.
async function frameTiming(page, engine) {
  const result = await page.evaluate(async () => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const root = document.createElement('div'); root.style.cssText = 'position:fixed;inset:0;z-index:9999;background:white'; document.body.append(root);
    const rows = [];
    for (const [name, profile] of Object.entries(PW_SPRITE_PROFILES)) for (const [kind, clip] of Object.entries(profile.clips)) {
      const player = createPocketWONSprite(name, { autoplay: false }); root.append(player.element);
      player.element.style.cssText = 'width:192px;height:192px;position:relative';
      player.play(kind);
      let animation;
      for (let tries = 0; tries < 100; tries++) { animation = player.element.getAnimations({ subtree: true }).find(item => item.effect.getTiming().duration > 0); if (animation) break; await wait(30); }
      if (!animation) throw new Error(`No actual frame animation: ${name}/${kind}`);
      animation.pause();
      const target = animation.effect.target;
      const duration = clip.frameCount / clip.fps * 1000;
      const samples = [];
      for (let frame = 0; frame < clip.frameCount; frame++) for (const fraction of [0.05, 0.95]) {
        animation.currentTime = (frame + fraction) / clip.fps * 1000;
        const style = getComputedStyle(target), width = target.getBoundingClientRect().width;
        samples.push({ frame, fraction, x: style.backgroundPositionX, y: style.backgroundPositionY, size: style.backgroundSize, width });
      }
      rows.push({ name, kind, duration: animation.effect.getTiming().duration, expectedDuration: duration, samples });
      player.dispose(); player.element.remove();
    }
    root.remove(); return rows;
  });
  for (const row of result) {
    assert.equal(row.duration, row.expectedDuration, `${row.name}/${row.kind} duration`);
    for (const sample of row.samples) {
      // CSS background positions may be represented as percentages or pixels.
      const count = row.samples.length / 2;
      const actual = sample.x.endsWith('%') ? parseFloat(sample.x) / 100 * (count - 1) : -parseFloat(sample.x) / sample.width;
      assert(Math.abs(actual - sample.frame) < 0.001, `Exact cell ${row.name}/${row.kind}: ${JSON.stringify(sample)}`);
      assert.equal(parseFloat(sample.y), 0);
    }
  }
  pass(`${engine}: every frame occupies its full interval, first/last cells included without blank wrap`, result);
}

async function decorativeGeometry(page, engine, motion) {
  for (const width of [320, 360, 390, 430, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const screen of ['home', 'record', 'goal', 'report', 'all']) {
      await page.locator(`.pw-nav-item[data-screen="${screen}"]`).click();
      const geometry = await page.evaluate(() => {
        const sprites = [...document.querySelectorAll('#pw-content .pw-sprite')];
        return { width: innerWidth, scroll: document.documentElement.scrollWidth, contentWidth: document.querySelector('#pw-content').clientWidth, contentScroll: document.querySelector('#pw-content').scrollWidth, sprites: sprites.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, hidden: node.getAttribute('aria-hidden'), events: getComputedStyle(node).pointerEvents, buttons: node.querySelectorAll('button,input,a').length })) };
      });
      assert(geometry.scroll <= width && geometry.contentScroll <= geometry.contentWidth, JSON.stringify(geometry));
      assert(geometry.sprites.length > 0 && geometry.sprites.every(sprite => sprite.width > 0 && sprite.height > 0 && Math.abs(sprite.width - sprite.height) < 1 && sprite.hidden === 'true' && sprite.events === 'none' && sprite.buttons === 0), JSON.stringify(geometry));
      if (motion === 'reduce') {
        const active = await page.evaluate(() => [...document.querySelectorAll('.pw-sprite')].flatMap(node => node.getAnimations({ subtree: true })).filter(animation => animation.playState === 'running').length);
        assert.equal(active, 0, `Reduced motion static ${screen}`);
      }
      if ([320, 390, 1024].includes(width) && screen === 'home') await screenshot(page, `${engine}-${motion}-${width}-home`);
    }
  }
  assert.deepEqual(await page.evaluate(() => window.__spriteWrites), []);
  const stored = await page.evaluate(() => window.__spriteRaw());
  assert.equal(stored.pocketwon_demo_v1, JSON.stringify(fixture)); assert.equal(stored.sprite_test_unrelated, 'keep');
  assert.deepEqual(Object.keys(stored).sort(), ['pocketwon_demo_v1', 'sprite_test_unrelated']);
  pass(`${engine}: ${motion} mobile/desktop geometry, decorative semantics and storage untouched`);
}

async function navigation(page, engine) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.pw-nav-item[data-screen="home"]').click();
  const before = await page.evaluate(() => window.__spriteRaw());
  const result = await page.locator('.pw-home-hero .pw-home-action').evaluate(button => {
    const start = performance.now(); button.click();
    return { elapsed: performance.now() - start, screen: document.querySelector('[aria-current="page"]').dataset.screen, heading: document.activeElement.id };
  });
  assert.equal(result.screen, 'record'); assert.equal(result.heading, 'pw-screen-title');
  assert(result.elapsed < 150, `Navigation must not wait for character playback: ${result.elapsed}ms`);
  assert.deepEqual(await page.evaluate(() => window.__spriteRaw()), before);
  await page.locator('.pw-nav-item[data-screen="home"]').click();
  await page.locator('.pw-home-hero .pw-home-action').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('[aria-current="page"]').getAttribute('data-screen'), 'record');
  pass(`${engine}: click navigates synchronously and keyboard activation preserves functionality`, result);
}

async function lifecycle(page, engine) {
  const actual = await page.evaluate(async () => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    let completed = 0;
    const player = createPocketWONSprite('balance', { onComplete: () => completed++ });
    player.element.style.cssText = 'position:fixed;top:0;left:0;width:192px;height:192px;z-index:9999'; document.body.append(player.element);
    await player.play('action');
    const animation = player.element.querySelector('.pw-sprite-frames').getAnimations()[0];
    await wait(80); player.pause(); const pausedTime = animation.currentTime;
    await wait(220); const stoppedTime = animation.currentTime, paused = player.inspect();
    player.resume(); await wait(80); const resumedTime = animation.currentTime;
    animation.finish(); await wait(100); const once = completed;
    const layer = player.element.querySelector('.pw-sprite-frames');
    layer.dispatchEvent(new AnimationEvent('animationend', { animationName: 'pw-sprite-8-cells' }));
    const duplicate = completed;
    await player.play('idle'); player.stop(); await wait(1100); const cancelled = completed;
    await player.play('action', { loop: true }); await wait(900); const looping = completed;
    player.dispose(); layer.dispatchEvent(new AnimationEvent('animationend', { animationName: 'pw-sprite-8-cells' }));
    await wait(100); const disposed = player.inspect(), afterDispose = completed, acceptedAfterDispose = await player.play('action');
    player.element.remove();
    return { pausedTime, stoppedTime, paused, resumedTime, once, duplicate, cancelled, looping, disposed, afterDispose, acceptedAfterDispose };
  });
  assert.equal(actual.paused.state, 'paused'); assert(Math.abs(actual.stoppedTime - actual.pausedTime) < 25);
  assert(actual.resumedTime > actual.stoppedTime); assert.equal(actual.once, 1); assert.equal(actual.duplicate, 1);
  assert.equal(actual.cancelled, 1); assert.equal(actual.looping, 1); assert.equal(actual.afterDispose, 1);
  assert.equal(actual.disposed.state, 'disposed'); assert.equal(actual.acceptedAfterDispose, false);
  pass(`${engine}: pause/resume, complete once, duplicate end, cancellation, loop and dispose`, actual);
}

async function orchestration(page, engine) {
  await page.setViewportSize({ width: 390, height: 1800 });
  await page.locator('.pw-nav-item[data-screen="home"]').click();
  await page.waitForFunction(() => PocketWONMotion.inspect()[0]?.players.filter(player => player.visible).length >= 3);
  const budget = await page.evaluate(async () => {
    const session = PocketWONMotion.controllerFor(document.querySelector('.pw-home'));
    session.request('balance', 'action', 'interaction'); session.request('record', 'idle', 'idle');
    const repeat = session.request('balance', 'action', 'interaction'), rejectedStrong = session.request('report', 'action', 'interaction');
    const samples = [];
    for (let i = 0; i < 35; i++) { const state = session.inspect(); samples.push({ strong: state.strong, idle: state.idle, playing: state.players.filter(player => player.state === 'playing').length }); await new Promise(resolve => setTimeout(resolve, 40)); }
    return { repeat, rejectedStrong, samples };
  });
  assert.equal(budget.repeat, false); assert.equal(budget.rejectedStrong, false);
  assert(budget.samples.every(sample => sample.strong <= 1 && sample.idle <= 1 && sample.playing <= 2));
  pass(`${engine}: one strong plus one idle, repeated interactions never queue`, budget);

  await page.setViewportSize({ width: 390, height: 640 });
  await page.locator('#pw-content').evaluate(node => { node.scrollTop = 0; });
  await page.evaluate(() => PocketWONMotion.controllerFor(document.querySelector('.pw-home')).request('balance', 'success', 'success'));
  await page.waitForFunction(() => PocketWONMotion.inspect()[0].players.find(player => player.profile === 'balance').state === 'playing');
  await page.locator('#pw-content').evaluate(node => { node.scrollTop = node.scrollHeight; });
  await page.waitForFunction(() => !PocketWONMotion.inspect()[0].players.find(player => player.profile === 'balance').visible);
  const offscreen = await page.evaluate(async () => {
    const node = document.querySelector('.pw-sprite[data-sprite="balance"]');
    const animation = node.querySelector('.pw-sprite-frames').getAnimations()[0];
    const before = animation?.currentTime; await new Promise(resolve => setTimeout(resolve, 220));
    return { state: PocketWONMotion.controllerFor(node).inspect(), before, after: animation?.currentTime };
  });
  assert.equal(offscreen.state.state, 'paused'); assert(Math.abs(offscreen.before - offscreen.after) < 25);
  await page.locator('#pw-content').evaluate(node => { node.scrollTop = 0; });
  await page.waitForFunction(() => PocketWONMotion.inspect()[0].players.find(player => player.profile === 'balance').state === 'playing');
  const hidden = await page.evaluate(async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(resolve => setTimeout(resolve, 60));
    const state = PocketWONMotion.inspect()[0];
    const result = { blocked: state.blocked, playing: state.players.filter(player => player.state === 'playing').length };
    delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); return result;
  });
  assert.equal(hidden.blocked, true); assert.equal(hidden.playing, 0);
  pass(`${engine}: real scroll-root offscreen pause/resume and hidden-document event suspension`, { offscreen, hidden });

  await page.locator('.pw-nav-item[data-screen="record"]').click();
  await page.getByRole('button', { name: '새 기록 추가', exact: true }).click();
  await page.waitForFunction(() => PocketWONMotion.inspect()[0].blocked);
  const modal = await page.evaluate(() => {
    const state = PocketWONMotion.inspect()[0]; return { blocked: state.blocked, playing: state.players.filter(player => player.state === 'playing').length };
  });
  assert.equal(modal.playing, 0); await page.keyboard.press('Escape');
  await page.waitForFunction(() => !PocketWONMotion.inspect()[0].blocked);
  await page.locator('.pw-nav-item[data-screen="home"]').click();
  assert.equal(await page.evaluate(() => PocketWONMotion.inspect().length), 1);
  pass(`${engine}: dialog suspension/resume and old screen sessions disposed`, modal);
}

async function watchSuccess(page) {
  await page.evaluate(() => {
    window.__spriteSuccessEvents = [];
    const seen = new WeakSet();
    new MutationObserver(() => {
      for (const node of document.querySelectorAll('.pw-sprite[data-sprite-clip="success"][data-sprite-state="playing"]')) {
        if (seen.has(node)) continue; seen.add(node);
        window.__spriteSuccessEvents.push({ at: performance.now(), writes: window.__spriteWrites.length, dialog: !!document.querySelector('dialog[open]'), balance: document.querySelector('.pw-record-balance')?.textContent, goal: document.querySelector('#pw-goal-name')?.textContent });
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['data-sprite-clip', 'data-sprite-state'], childList: true, subtree: true });
  });
}

async function overlappingPauseReasons(page, engine) {
  const scenarios = [];
  for (const reason of ['hidden', 'dialog']) {
    await page.locator('.pw-nav-item[data-screen="record"]').click();
    await page.waitForFunction(() => PocketWONMotion.inspect()[0]?.players.some(player => player.visible));
    await page.evaluate(() => PocketWONMotion.controllerFor(document.querySelector('.pw-record')).request('record', 'action', 'success'));
    await page.waitForFunction(() => PocketWONMotion.inspect()[0].players.some(player => player.state === 'playing'));
    if (reason === 'hidden') await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    else await page.getByRole('button', { name: '새 기록 추가', exact: true }).click();
    await page.waitForFunction(() => PocketWONMotion.inspect()[0].blocked);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => {
      const state = PocketWONMotion.inspect()[0];
      return state.reduced && state.players.every(player => player.priority === null && player.state === 'static');
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const stillBlocked = await page.evaluate(() => {
      const state = PocketWONMotion.inspect()[0];
      return { blocked: state.blocked, strong: state.strong, idle: state.idle, playing: state.players.filter(player => player.state === 'playing').length };
    });
    assert.equal(stillBlocked.blocked, true); assert.equal(stillBlocked.strong, 0); assert.equal(stillBlocked.idle, 0); assert.equal(stillBlocked.playing, 0);
    if (reason === 'hidden') await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    else await page.keyboard.press('Escape');
    await page.waitForFunction(() => !PocketWONMotion.inspect()[0].blocked);
    const accepted = await page.evaluate(() => PocketWONMotion.controllerFor(document.querySelector('.pw-record')).request('record', 'action', 'interaction'));
    assert.equal(accepted, true);
    await page.waitForFunction(() => PocketWONMotion.inspect()[0].players.some(player => player.state === 'playing'));
    scenarios.push({ reason, stillBlocked, accepted });
  }
  pass(`${engine}: reduced motion during hidden/dialog pause cancels stale timelines without starving the budget`, scenarios);
}

async function saves(browser, engine) {
  for (const screen of ['record', 'goal']) {
    const { context, page } = await setup(browser);
    try {
      await page.locator(`.pw-nav-item[data-screen="${screen}"]`).click(); await watchSuccess(page);
      if (screen === 'record') {
        await page.getByRole('button', { name: '새 기록 추가', exact: true }).click();
        await page.getByLabel('받은 돈', { exact: true }).check(); await page.locator('#pw-record-amount').fill('1000');
      } else {
        await page.getByRole('button', { name: '목표 수정', exact: true }).click();
        await page.locator('#pw-goal-title').fill('Sprite 검증 목표'); await page.locator('#pw-goal-target').fill('50000');
      }
      const before = await page.evaluate(() => window.__spriteRaw());
      await page.evaluate(() => { window.__spriteWriteFailure = true; });
      await page.getByRole('button', { name: screen === 'record' ? '기록 저장' : '목표 저장', exact: true }).click();
      assert.equal(await page.locator('dialog[open]').count(), 1);
      assert.deepEqual(await page.evaluate(() => window.__spriteRaw()), before);
      assert.deepEqual(await page.evaluate(() => window.__spriteSuccessEvents), []);
      await page.evaluate(() => { window.__spriteWriteFailure = false; });
      await page.getByRole('button', { name: screen === 'record' ? '기록 저장' : '목표 저장', exact: true }).click();
      await page.waitForFunction(() => window.__spriteSuccessEvents.length === 1);
      const success = await page.evaluate(() => window.__spriteSuccessEvents[0]);
      assert.equal(success.writes, 1); assert.equal(success.dialog, false);
      if (screen === 'record') assert.equal(success.balance, `${(fixture.balance + 1000).toLocaleString('ko-KR')}원`);
      else assert.equal(success.goal, 'Sprite 검증 목표');
      const writes = await page.evaluate(() => window.__spriteWrites); assert(writes[0].at <= success.at);
      const raw = await page.evaluate(() => window.__spriteRaw()); assert.equal(raw.sprite_test_unrelated, 'keep'); assert.equal(Object.keys(raw).length, 2);
      pass(`${engine}: ${screen} success only after saved state and updated UI; quota failure never celebrates`, { success, writes });
    } finally { await context.close(); }
  }
  for (const current of [999, 1000]) {
    const state = { ...fixture, goal: { title: '경계 목표', current, target: 1000 } };
    const { context, page } = await setup(browser, { state });
    try {
      await watchSuccess(page); await page.locator('.pw-nav-item[data-screen="goal"]').click();
      if (current === 1000) await page.waitForFunction(() => window.__spriteSuccessEvents.length === 1);
      else {
        await page.waitForTimeout(1200); assert.deepEqual(await page.evaluate(() => window.__spriteSuccessEvents), []);
        assert.equal(await page.locator('.pw-goal-complete').count(), 0);
      }
      await page.locator('.pw-nav-item[data-screen="record"]').click(); await page.locator('.pw-nav-item[data-screen="goal"]').click();
      await page.waitForTimeout(1200);
      assert.equal(await page.evaluate(() => window.__spriteSuccessEvents.length), current === 1000 ? 1 : 0);
      assert.deepEqual(await page.evaluate(() => window.__spriteWrites), []);
      pass(`${engine}: ${current}/1000 uses exact completion; one celebration per session, no storage flag`);
    } finally { await context.close(); }
  }
}

async function loadingAndFallback(browser, engine) {
  const { context, page } = await setup(browser, { routes: [['**/sprites/*', async route => { await new Promise(resolve => setTimeout(resolve, 400)); await route.continue(); }]] });
  try {
    const before = await page.locator('.pw-home-hero').boundingBox();
    await page.waitForTimeout(1400); const after = await page.locator('.pw-home-hero').boundingBox();
    assert.deepEqual(after, before, 'Reserved hero geometry while sheets load');
    const shifts = await page.evaluate(() => window.__spriteLayoutShifts); assert(shifts.reduce((sum, shift) => sum + shift.value, 0) < 0.01, JSON.stringify(shifts));
    pass(`${engine}: delayed sheet load preserves geometry and causes no material CLS`, { before, after, shifts });
  } finally { await context.close(); }
  for (const posterFailure of [false, true]) {
    const { context, page } = await setup(browser, { routes: [['**/sprites/*', route => /-sprite\.(png|webp)$/.test(route.request().url()) || posterFailure ? route.abort('failed') : route.continue()]] });
    try {
      const sprite = page.locator('.pw-sprite[data-sprite="balance"]');
      await page.waitForFunction(() => document.querySelector('.pw-sprite[data-sprite="balance"]').dataset.spriteAssetError);
      await sprite.locator('.pw-sprite-poster').evaluate(async image => { image.loading = 'eager'; await image.decode(); });
      const fallback = await sprite.evaluate(node => ({ state: node.dataset.spriteState, fallback: node.dataset.spriteFallback, loaded: node.querySelector('img').complete && node.querySelector('img').naturalWidth > 0, width: node.getBoundingClientRect().width }));
      assert.equal(fallback.state, 'static'); assert.equal(fallback.loaded, true); assert(fallback.width > 0);
      if (posterFailure) assert.equal(fallback.fallback, 'true');
      await page.locator('.pw-home-hero .pw-home-action').click(); assert.equal(await page.locator('[aria-current="page"]').getAttribute('data-screen'), 'record');
      pass(`${engine}: ${posterFailure ? 'sheet + poster' : 'sheet'} failure displays fallback without breaking navigation`, fallback);
    } finally { await context.close(); }
  }
}

async function unchangedCompletedGoalSave(browser, engine) {
  const state = { ...fixture, monthly: { ...fixture.monthly, goal: 1000 }, goal: { title: '이미 달성한 목표', current: 1000, target: 1000 } };
  const { context, page } = await setup(browser, { state });
  try {
    await watchSuccess(page);
    await page.locator('.pw-nav-item[data-screen="goal"]').click();
    await page.waitForFunction(() => window.__spriteSuccessEvents.length === 1);
    await page.waitForFunction(() => !PocketWONMotion.inspect()[0].players.some(player => player.clip === 'success'));
    await page.getByRole('button', { name: '목표 수정', exact: true }).click();
    assert.equal(await page.locator('#pw-goal-title').inputValue(), state.goal.title);
    assert.equal(await page.locator('#pw-goal-target').inputValue(), '1000');
    await page.getByRole('button', { name: '목표 저장', exact: true }).evaluate(button => {
      button.click(); button.click();
      button.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(() => window.__spriteSuccessEvents.length === 2);
    assert.equal((await page.evaluate(() => window.__spriteWrites)).length, 1);
    const events = await page.evaluate(() => window.__spriteSuccessEvents);
    assert.equal(events[0].writes, 0); assert.equal(events[1].writes, 1); assert.equal(events[1].dialog, false);
    assert.deepEqual(JSON.parse((await page.evaluate(() => window.__spriteRaw())).pocketwon_demo_v1).goal, state.goal);
    await page.waitForTimeout(1300);
    await page.locator('.pw-nav-item[data-screen="record"]').click();
    await page.locator('.pw-nav-item[data-screen="goal"]').click();
    await page.waitForTimeout(1300);
    assert.equal(await page.evaluate(() => window.__spriteSuccessEvents.length), 2);
    pass(`${engine}: unchanged completed-goal save celebrates its confirmed write once; subsequent display remains deduplicated`, events);
  } finally { await context.close(); }
}

async function run(browser, engine) {
  const normal = await setup(browser);
  try { await assetChecks(normal.page, engine); await frameTiming(normal.page, engine); await lifecycle(normal.page, engine); await decorativeGeometry(normal.page, engine, 'no-preference'); await navigation(normal.page, engine); await orchestration(normal.page, engine); await overlappingPauseReasons(normal.page, engine); }
  finally { await normal.context.close(); }
  const reduced = await setup(browser, { motion: 'reduce' });
  try {
    await decorativeGeometry(reduced.page, engine, 'reduce'); await navigation(reduced.page, engine);
    const successLoads = [];
    reduced.page.on('request', request => { if (/pocketwon-success-action-sprite/.test(request.url())) successLoads.push(request.url()); });
    assert.equal(await reduced.page.evaluate(() => PocketWONMotion.prepareSuccess()), false);
    await reduced.page.getByRole('button', { name: '새 기록 추가', exact: true }).click();
    await reduced.page.waitForTimeout(100);
    assert.deepEqual(successLoads, []);
    await reduced.page.keyboard.press('Escape');
    pass(`${engine}: reduced motion does not preload an unused success atlas`);
  }
  finally { await reduced.context.close(); }
  await saves(browser, engine); await unchangedCompletedGoalSave(browser, engine); await loadingAndFallback(browser, engine);
}

(async () => {
  const opened = [];
  try {
    for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
      const executablePath = executable(engine), browser = await type.launch({ headless: true, executablePath }); opened.push(browser);
      report.browsers[engine] = { executable: executablePath, version: browser.version() };
      await run(browser, engine);
    }
    assert.deepEqual(report.pageErrors, []); report.status = 'PASS';
  } catch (error) { report.status = 'FAIL'; report.failure = error.stack; process.exitCode = 1; }
  finally {
    await Promise.all(opened.map(browser => browser.close())); report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ status: report.status, checks: report.checks.length, failure: report.failure, pageErrors: report.pageErrors }, null, 2));
  }
})();
