/* First real-art checkpoint. Uses the partial manifest; no placeholder frames. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium, webkit } = require(process.env.PW_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'evidence/SPRITE-MOTION/checkpoint01');
const origin = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
fs.mkdirSync(output, { recursive: true });
const report = { engines: {}, checks: [], status: 'RUNNING' };
function executable(engine, type) {
  const custom = process.env[engine === 'chromium' ? 'PW_CHROMIUM_EXECUTABLE' : 'PW_WEBKIT_EXECUTABLE'];
  if (custom) return custom;
  if (fs.existsSync(type.executablePath())) return type.executablePath();
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  const prefix = engine === 'chromium' ? 'chromium_headless_shell-' : 'webkit-';
  const version = fs.readdirSync(cache).filter(name => name.startsWith(prefix)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
  return path.join(cache, version, engine === 'chromium' ? 'chrome-headless-shell-mac-arm64/chrome-headless-shell' : 'pw_run.sh');
}

(async () => {
  try {
    for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
      const browser = await type.launch({ headless: true, executablePath: executable(engine, type) });
      try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
        const page = await context.newPage();
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${origin}/ks6s3juocjzc2.kimi.page/index.html`);
        await page.waitForFunction(() => typeof PW_SPRITE_PROFILES !== 'undefined' && PW_SPRITE_PROFILES.balance?.clips?.idle);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(450);
        await page.screenshot({ path: path.join(output, `${engine}-home.png`) });
        await page.evaluate(() => PocketWONMotion.controllerFor(document.querySelector('.pw-home')).request('balance', 'idle', 'interaction'));
        await page.waitForFunction(() => PocketWONMotion.inspect()[0].players.find(player => player.profile === 'balance').state === 'playing');
        await page.evaluate(() => {
          Object.defineProperty(document, 'hidden', { configurable: true, value: true });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => PocketWONMotion.inspect()[0].reduced && PocketWONMotion.inspect()[0].players.every(player => player.priority === null));
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.waitForFunction(() => !PocketWONMotion.inspect()[0].reduced);
        const overlap = await page.evaluate(() => {
          const state = PocketWONMotion.inspect()[0];
          const result = { blocked: state.blocked, strong: state.strong, idle: state.idle, playing: state.players.filter(player => player.state === 'playing').length };
          delete document.hidden; document.dispatchEvent(new Event('visibilitychange'));
          result.acceptedAfterResume = PocketWONMotion.controllerFor(document.querySelector('.pw-home')).request('balance', 'idle', 'interaction');
          return result;
        });
        assert.equal(overlap.blocked, true); assert.equal(overlap.strong, 0); assert.equal(overlap.idle, 0); assert.equal(overlap.playing, 0); assert.equal(overlap.acceptedAfterResume, true);
        const result = await page.evaluate(async () => {
          PocketWONMotion.controllerFor(document.querySelector('.pw-home'))?.dispose();
          const stage = document.createElement('div');
          stage.id = 'sprite-checkpoint-stage';
          stage.style.cssText = 'position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:#d9eefb';
          document.body.append(stage);
          const player = createPocketWONSprite('balance');
          player.element.style.width = '256px';
          stage.append(player.element);
          window.__checkpointPlayer = player;
          const accepted = await player.play('idle', { loop: true });
          const layer = player.element.querySelector('.pw-sprite-frames');
          const animation = layer.getAnimations()[0];
          animation.pause();
          const metadata = PW_SPRITE_PROFILES.balance.clips.idle;
          const samples = [];
          for (let frame = 0; frame < metadata.frameCount; frame++) {
            for (const portion of [0.05, 0.95]) {
              animation.currentTime = (frame + portion) / metadata.fps * 1000;
              const style = getComputedStyle(layer);
              samples.push({ frame, portion, position: style.backgroundPositionX });
            }
          }
          animation.currentTime = 1030;
          const loopPosition = getComputedStyle(layer).backgroundPositionX;
          animation.currentTime = 0;
          return { accepted, metadata, samples, loopPosition, duration: animation.effect.getTiming().duration, width: player.element.getBoundingClientRect().width, state: player.inspect() };
        });
        assert.equal(result.accepted, true);
        assert.equal(result.metadata.frameCount, 6); assert.equal(result.metadata.fps, 6);
        assert.equal(result.duration, 1000); assert.equal(parseFloat(result.loopPosition), 0);
        for (const sample of result.samples) assert(Math.abs(parseFloat(sample.position) / 100 * 5 - sample.frame) < 0.001);
        for (let frame = 0; frame < 6; frame++) {
          await page.evaluate(index => {
            const animation = window.__checkpointPlayer.element.querySelector('.pw-sprite-frames').getAnimations()[0];
            animation.currentTime = (index + 0.5) / 6 * 1000;
          }, frame);
          await page.screenshot({ path: path.join(output, `${engine}-idle-${frame + 1}.png`) });
        }
        const pause = await page.evaluate(async () => {
          const player = window.__checkpointPlayer;
          await player.play('idle', { loop: true });
          const animation = player.element.querySelector('.pw-sprite-frames').getAnimations()[0];
          await new Promise(resolve => setTimeout(resolve, 150));
          player.pause(); await new Promise(resolve => setTimeout(resolve, 40));
          const before = animation.currentTime;
          await new Promise(resolve => setTimeout(resolve, 180));
          const after = animation.currentTime;
          player.resume(); await new Promise(resolve => setTimeout(resolve, 80));
          return { before, after, resumed: animation.currentTime };
        });
        assert(Math.abs(pause.after - pause.before) < 2); assert(pause.resumed > pause.after);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => window.__checkpointPlayer.inspect().state === 'static', null, { timeout: 3000 }).catch(async error => {
          report.diagnostics = { engine, errors, actual: await page.evaluate(() => ({ state: window.__checkpointPlayer.inspect(), media: matchMedia('(prefers-reduced-motion: reduce)').matches, attached: window.__checkpointPlayer.element.isConnected })) };
          throw error;
        });
        const reduced = await page.evaluate(async () => ({ state: window.__checkpointPlayer.inspect(), accepted: await window.__checkpointPlayer.play('idle'), visibility: getComputedStyle(window.__checkpointPlayer.element.querySelector('.pw-sprite-poster')).visibility }));
        assert.equal(reduced.state.state, 'static'); assert.equal(reduced.accepted, false); assert.equal(reduced.visibility, 'visible');
        assert.deepEqual(errors, []);
        report.engines[engine] = { version: browser.version(), result, pause, reduced, overlap, errors };
        report.checks.push(`${engine}: real 6-frame/6fps sheet, all frame boundaries, clean wrap, pause/resume and reduced motion`);
        await context.close();
      } finally { await browser.close(); }
    }
    report.status = 'PASS';
  } catch (error) { report.status = 'FAIL'; report.failure = error.stack; process.exitCode = 1; }
  finally {
    fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  }
})();
