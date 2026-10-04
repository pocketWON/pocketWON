/* Isolated browser acceptance for the fixed app stage; never opens a user profile. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { chromium, webkit } = require(process.env.PW_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, process.env.PW_EVIDENCE_ROOT || 'evidence/SINGLE-SCREEN/run-' + new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(path.join(output, 'screenshots'), { recursive: true });
const url = (process.env.PW_BASE_URL || 'http://127.0.0.1:4173') + '/ks6s3juocjzc2.kimi.page/index.html?demo=0';
const original = fs.readFileSync(path.join(root, 'preservation/PW-WOORI-01/original-index.html.txt'), 'utf8');
const fixture = JSON.parse(JSON.stringify(vm.runInNewContext('(' + original.match(/const defaultState = (\{[\s\S]*?\n        \});/)[1] + ')')));
const report = { checks: [], geometry: [], screenshots: [], errors: [], engines: [], physicalKeyboardVerified: false };
const pass = (name, details) => report.checks.push({ name, details });
const copy = data => JSON.parse(JSON.stringify(data));
function executable(engine) {
  const explicit = process.env[engine === 'chromium' ? 'PW_CHROMIUM_EXECUTABLE' : 'PW_WEBKIT_EXECUTABLE'];
  if (explicit) return explicit;
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  const prefix = engine === 'chromium' ? 'chromium_headless_shell-' : 'webkit-';
  const versions = fs.readdirSync(cache).filter(n => n.startsWith(prefix)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return path.join(cache, versions[0], engine === 'chromium' ? 'chrome-headless-shell-mac-arm64/chrome-headless-shell' : 'pw_run.sh');
}
async function setup(browser, { data = fixture, width = 320, height = 568, motion = 'reduce', safe = false, readFailure = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: motion });
  await context.addInitScript(({ data, readFailure }) => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
    if (data !== null) set.call(localStorage, 'pocketwon_demo_v1', typeof data === 'string' ? data : JSON.stringify(data));
    set.call(localStorage, 'pw-unrelated', 'keep'); window.__writes = []; window.__failWrite = false; window.__failRead = readFailure;
    window.__read = () => get.call(localStorage, 'pocketwon_demo_v1');
    window.__replace = value => value === null ? remove.call(localStorage, 'pocketwon_demo_v1') : set.call(localStorage, 'pocketwon_demo_v1', JSON.stringify(value));
    Storage.prototype.getItem = function (key) { if (window.__failRead) throw new DOMException('read failure', 'SecurityError'); return get.call(this, key); };
    Storage.prototype.setItem = function (key, value) { window.__writes.push({ key, value, failed: window.__failWrite }); if (window.__failWrite) throw new DOMException('quota failure', 'QuotaExceededError'); return set.call(this, key, value); };
  }, { data, readFailure });
  const page = await context.newPage();
  page.on('pageerror', e => {report.errors.push(e.message);report.errorContext??=[];report.errorContext.push({message:e.message,viewport:page.viewportSize(),stack:e.stack});});
  page.on('console', e => { if (e.type() === 'error') report.errors.push(e.text()); });
  page.on('response', r => { if (r.status() >= 400) report.errors.push(r.status() + ' ' + r.url()); });
  await page.goto(url); await ready(page);
  if (safe) { await page.addStyleTag({ content: ':root{--pw-safe-top:20px;--pw-safe-bottom:34px}' }); await ready(page); }
  return { context, page };
}
async function ready(page) {
  // Explicitly start isolated-test lazy posters before decode; short screens may
  // keep rendered Home artwork offscreen and otherwise wait indefinitely.
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.querySelectorAll('img')].filter(n => n.getClientRects().length).map(n => { n.loading = 'eager'; return n.decode().catch(() => {}); })); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
}
async function enter(page, id) {
  if (id === 'record') {
    await page.locator('.pw-nav-item[data-screen="home"]').click();
    await page.locator('.pw-home-hero-title').click();
  } else await page.locator('.pw-nav-item[data-screen="' + id + '"]').click();
  await ready(page);
}
async function geometry(page, label) {
  const result = await page.evaluate(() => {
    const active = document.querySelector('dialog[open]') || document.querySelector('#pw-content > div');
    const box = n => { const r = n.getBoundingClientRect(); return { cls: n.className, x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom, sh: n.scrollHeight, ch: n.clientHeight, sw: n.scrollWidth, cw: n.clientWidth, overflowX: getComputedStyle(n).overflowX }; };
    const frames = document.querySelector('dialog[open]') ? [active, active.querySelector('.pw-flow-body')] : [document.documentElement, document.querySelector('.pw-shell'), document.querySelector('#pw-content'), active, ...active.querySelectorAll('.pw-record-history,.pw-record-list,.pw-report-content,.pw-text-pager')];
    const rect = active.getBoundingClientRect();
    const controls = [...active.querySelectorAll('button,input')].filter(n => n.getClientRects().length && n.type !== 'radio').map(box);
    const outside = controls.filter(r => r.x < rect.x - 1 || r.y < rect.y - 1 || r.right > rect.right + 1 || r.bottom > rect.bottom + 1);
    const textOutside=[...active.querySelectorAll('p,dt,dd,h2,h3,span')].filter(n=>n.getClientRects().length&&!n.closest('[aria-hidden="true"],.pw-sr-only')&&n.textContent.trim()).map(box).filter(r=>r.x<rect.x-1||r.y<rect.y-1||r.right>rect.right+1||r.bottom>rect.bottom+1); return { home: active.classList.contains('pw-home'), accessible: document.documentElement.classList.contains('pw-accessible'), frames: frames.filter(Boolean).map(box), controls, outside, textOutside, stage: active.dataset.stage, viewport: [innerWidth, innerHeight] };
  });
  report.geometry.push({ label, ...result });
  assert(result.frames.every(r => r.sw <= r.cw + 1 || (r.cls.includes('pw-home') && r.overflowX === 'clip')), label + ' horizontal scroll extent ' + JSON.stringify(result.frames));
  // Large type and very short screens intentionally use document reflow.
  // The reference Home may scroll at smaller sizes; other fixed stages retain their contract.
  if (!result.accessible && !result.home) assert(result.frames.every(r => r.sh <= r.ch + 1), label + ' vertical scroll extent ' + JSON.stringify(result.frames));
  assert.deepEqual(result.outside, [], label + ' controls outside frame'); assert.deepEqual(result.textOutside,[],label+' meaningful text outside frame');
  assert(result.controls.every(r => r.h >= 43 && r.w >= 43), label + ' target smaller than 44px tolerance ' + JSON.stringify(result.controls.filter(r => r.h < 43 || r.w < 43)));
  pass(label + ' contains content and controls');
}
async function screenshot(page, name) {
  await ready(page); await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.animationName==='pw-stage-fade').map(a=>a.finished.catch(()=>{})));}); const file = path.join(output, 'screenshots', name + '.png'); await page.screenshot({ path: file }); report.screenshots.push(path.relative(output, file));
}
async function matrix(browser, engine) {
  for (const [width, height] of [[320,568],[360,640],[375,667],[390,844],[393,852],[412,915],[430,932]]) {
    for (const safe of [false, true]) {
      const { context, page } = await setup(browser, { width, height, safe }); const before = await page.evaluate(() => window.__read());
      for (const route of ['home','record','goal','report','all']) {
        await enter(page, route); await geometry(page, engine + '/' + width + 'x' + height + '/' + safe + '/' + route);
        if (route === 'report') for (const label of ['돈 흐름','목표','습관']) { await page.getByRole('tab', { name: label, exact: true }).click(); await ready(page); await geometry(page, engine + '/' + width + '/' + safe + '/report-' + label); }
        if (!safe && [320,390,430].includes(width)) await screenshot(page, engine + '-' + route + '-' + width + '-reduce');
      }
      assert.equal(await page.evaluate(() => window.__read()), before); assert.deepEqual(await page.evaluate(() => window.__writes), []);
      const bounds = await page.evaluate(() => { const c = document.querySelector('#pw-content'); return [c.scrollTop, c.scrollLeft]; });
      await page.mouse.wheel(0, 600); await ready(page);
      if (!await page.locator('html').evaluate(n => n.classList.contains('pw-accessible'))) assert.deepEqual(await page.evaluate(() => { const c = document.querySelector('#pw-content'); return [c.scrollTop, c.scrollLeft]; }), bounds);
      await context.close();
    }
  }
}
async function records(browser, engine) {
  const data = copy(fixture); data.transactions = Array.from({length:37}, (_,i) => ({type:i%2?'out':'in',amount:100+i,category:i%2?'간식':'용돈',memo:'기록 '+i,ts:new Date(Date.UTC(2026,8,1,0,0,i)).toISOString(),receipt:false}));
  data.transactions[36].memo = '긴 메모🙂'.repeat(130);
  const { context, page } = await setup(browser, { data }); await enter(page, 'record');
  const seen = new Set(); let longIndex;
  while (true) { for (const id of await page.locator('.pw-record-row-button').evaluateAll(nodes => nodes.map(n=>n.dataset.sourceIndex))) seen.add(id); const next=page.locator('.pw-record-pagination').getByRole('button',{name:'다음',exact:true}); if (await next.isDisabled()) break; await next.click(); await ready(page); await geometry(page,engine+'/history-page'); }
  assert.equal(seen.size,37); pass(engine+' all 37 stored rows reachable without storage writes');
  await enter(page,'home'); await page.locator('.pw-home-hero-title').click();
  while (await page.locator('.pw-record-pagination').getByRole('button',{name:'이전',exact:true}).isEnabled()) await page.locator('.pw-record-pagination').getByRole('button',{name:'이전',exact:true}).click();
  await page.locator('.pw-record-row-button[data-source-index="36"]').click(); await ready(page); await geometry(page,engine+'/long-record-detail');
  let text=''; while(true){text+=await page.locator('.pw-text-page').innerText();const next=page.locator('.pw-text-pager').getByRole('button',{name:'다음',exact:true});if(!await next.isVisible()||await next.isDisabled())break;await next.click();await ready(page);}
  assert(text.includes(data.transactions[36].memo));await page.getByRole('button',{name:'목록으로',exact:true}).click();await ready(page);assert.equal(await page.evaluate(()=>document.activeElement.dataset.sourceIndex),'36');
  await page.getByRole('button',{name:'새 기록 추가',exact:true}).click();await page.getByRole('radio',{name:'쓴 돈',exact:true}).locator('..').click();await page.locator('dialog[open]').getByRole('button',{name:'다음',exact:true}).click();await page.locator('#pw-record-amount').fill('1000');await page.locator('#pw-record-amount').press('Enter');assert.equal(await page.locator('dialog').getAttribute('data-step'),'amount');await geometry(page,engine+'/record-amount');
  await page.locator('dialog[open]').getByRole('button',{name:'다음',exact:true}).click();await page.getByRole('radio',{name:'간식',exact:true}).locator('..').click();await page.locator('dialog[open]').getByRole('button',{name:'다음',exact:true}).click();await page.locator('#pw-record-memo').fill('🙂'.repeat(51));assert(await page.locator('dialog[open]').getByRole('button',{name:'다음',exact:true}).isDisabled());await page.locator('#pw-record-memo').fill('확인 메모');await page.locator('dialog[open]').getByRole('button',{name:'다음',exact:true}).click();await geometry(page,engine+'/record-confirm');
  const before=JSON.parse(await page.evaluate(()=>window.__read()));await page.evaluate(()=>window.__failWrite=true);await page.getByRole('button',{name:'기록 저장',exact:true}).click();assert(await page.locator('#pw-record-save-error').isVisible());assert.equal(JSON.parse(await page.evaluate(()=>window.__read())).balance,before.balance);
  await page.evaluate(()=>window.__failWrite=false);await page.getByRole('button',{name:'기록 저장',exact:true}).dblclick();await ready(page);assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.locator('.pw-record').getAttribute('data-stage'),'result');await geometry(page,engine+'/record-result');
  const after=JSON.parse(await page.evaluate(()=>window.__read()));assert.equal(after.balance,before.balance-1000);assert.equal(after.monthly.spending,before.monthly.spending+1000);assert.deepEqual(after.goal,before.goal);assert.equal(after.habitScore,before.habitScore);assert.equal(after.transactions.length,38);assert.equal((await page.evaluate(()=>window.__writes)).filter(w=>!w.failed).length,1);pass(engine+' record final save, failure/retry, double submission, immutable unrelated finance');
  await page.getByRole('button',{name:'기록 내역 보기',exact:true}).click();assert.equal(await page.locator('.pw-record').getAttribute('data-page'),'1');await context.close();
}
async function goals(browser,engine){
 const data=copy(fixture);data.goal={title:'새 자전거',current:30600,target:45000,extra:'keep'};
 const {context,page}=await setup(browser,{data});await enter(page,'goal');await page.getByRole('button',{name:'목표 수정',exact:true}).click();await page.locator('#pw-goal-title').fill('🙂'.repeat(31));assert(await page.locator('dialog[open]').getByRole('button',{name:'다음',exact:true}).isDisabled());await page.locator('#pw-goal-title').fill('바꾼 목표');await page.locator('dialog[open]').getByRole('button',{name:'다음',exact:true}).click();await page.locator('#pw-goal-target').fill('60000');await page.locator('dialog[open]').getByRole('button',{name:'다음',exact:true}).click();await geometry(page,engine+'/goal-confirm');
 await page.evaluate(()=>{const state=JSON.parse(window.__read());state.goal.current=31000;window.__replace(state);window.__failWrite=true;});await page.getByRole('button',{name:'목표 저장',exact:true}).click();assert(await page.locator('#pw-goal-step-error').isVisible());await page.evaluate(()=>window.__failWrite=false);await page.getByRole('button',{name:'목표 저장',exact:true}).dblclick();await ready(page);assert.equal(await page.locator('.pw-goal').getAttribute('data-stage'),'result');await geometry(page,engine+'/goal-result');
 const after=JSON.parse(await page.evaluate(()=>window.__read()));assert.equal(after.goal.current,31000);assert.equal(after.goal.target,60000);assert.equal(after.goal.title,'바꾼 목표');assert.equal(after.goal.extra,'keep');assert.equal(after.balance,data.balance);assert.deepEqual(after.transactions,data.transactions);assert.equal((await page.evaluate(()=>window.__writes)).filter(w=>!w.failed).length,1);
 await page.getByRole('button',{name:'목표 보기',exact:true}).click();await page.getByRole('button',{name:'목표 수정',exact:true}).click();await page.locator('dialog[open]').getByRole('button',{name:'다음',exact:true}).click();await page.locator('dialog[open]').getByRole('button',{name:'다음',exact:true}).click();await page.evaluate(()=>{const s=JSON.parse(window.__read());s.goal.title='외부 변경';window.__replace(s);});await page.getByRole('button',{name:'목표 저장',exact:true}).click();assert((await page.locator('#pw-goal-step-error').innerText()).includes('바뀌었어요'));await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);assert.equal((await page.evaluate(()=>window.__writes)).filter(w=>!w.failed).length,1);pass(engine+' goal fresh current, conflict, failed save, exactly once');await context.close();
}
async function edgeStates(browser,engine){
 const large=copy(fixture);large.balance=Number.MAX_SAFE_INTEGER;large.monthly={saving:0,spending:Number.MAX_SAFE_INTEGER};large.habitScore=82.12345678901235;large.goal={title:'긴 목표🙂'.repeat(80),current:0,target:Number.MAX_SAFE_INTEGER};large.transactions=[{type:'out',amount:500,category:'분류'.repeat(100),memo:'기존메모'.repeat(200),ts:'invalid'},null];
 for(const [name,data,readFailure] of [['empty',null,false],['invalid','{',false],['unavailable',fixture,true],['large-partial',large,false]]){
  const {context,page}=await setup(browser,{data,readFailure,safe:true});const before=await page.evaluate(()=>window.__read());for(const route of ['home','record','goal','report','all']){await enter(page,route);await geometry(page,engine+'/'+name+'/'+route);if(route==='report'&&name==='large-partial'){for(const tab of ['돈 흐름','목표','습관']){await page.getByRole('tab',{name:tab,exact:true}).click();await ready(page);await geometry(page,engine+'/'+name+'/report-'+tab);}}}
  assert.equal(await page.evaluate(()=>window.__read()),before);assert.deepEqual(await page.evaluate(()=>window.__writes),[]);await context.close();
 }
 pass(engine+' empty/invalid/read-failed/partial/large/legacy-long states');
}
async function adaptive(browser,engine){
 const {context,page}=await setup(browser,{width:390,height:844,motion:'no-preference'});for(const route of ['home','record','goal','report','all']){await enter(page,route);await ready(page);await geometry(page,engine+'/motion/'+route);assert((await page.evaluate(()=>PocketWONMotion.inspect())).length===1);await screenshot(page,engine+'-'+route+'-390-motion');}pass(engine+' one active motion session across routes/segments');
 await enter(page,'home');await page.getByRole('button',{name:'기록하기',exact:true}).click();await page.getByRole('radio',{name:'받은 돈',exact:true}).locator('..').click();await page.locator('dialog[open]').getByRole('button',{name:'다음',exact:true}).click();
 await page.evaluate(()=>{Object.defineProperty(window,'visualViewport',{configurable:true,value:{height:260,offsetTop:0,scale:1,addEventListener(){},removeEventListener(){}}});window.dispatchEvent(new Event('resize'));});await ready(page);await geometry(page,engine+'/simulated-keyboard-260');await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
 await page.evaluate(()=>{delete window.visualViewport;document.documentElement.style.fontSize='32px';});await ready(page);assert(await page.locator('html').evaluate(n=>n.classList.contains('pw-accessible')));for(const route of ['home','record','goal','report','all']){await enter(page,route);assert(await page.locator('#pw-content').isVisible());}pass(engine+' 200% text uses accessible document reflow, cancellation works');await context.close();
 for(const width of [320,430]){const normal=await setup(browser,{width,height:width===320?568:932,motion:'no-preference'});for(const route of ['home','record','goal','report','all']){await enter(normal.page,route);await geometry(normal.page,engine+'/normal/'+width+'/'+route);await screenshot(normal.page,engine+'-'+route+'-'+width+'-motion');}await normal.context.close();}
 const desk=await setup(browser,{width:1024,height:900});for(const route of ['home','record','goal','report','all']){await enter(desk.page,route);await geometry(desk.page,engine+'/desktop/'+route);}await desk.context.close();
 for(const [width,height] of [[667,375],[844,390]]){const rotated=await setup(browser,{width,height});for(const route of ['home','record','goal','report','all']){await enter(rotated.page,route);await geometry(rotated.page,engine+'/landscape/'+width+'/'+route);if(route==='report'){for(const name of ['돈 흐름','목표','습관']){await rotated.page.getByRole('tab',{name,exact:true}).click();await ready(rotated.page);await geometry(rotated.page,engine+'/landscape/'+width+'/report-'+name);}}}await rotated.context.close();}
}
(async()=>{let browser;try{for(const engine of ['chromium','webkit']){browser=await (engine==='chromium'?chromium:webkit).launch({headless:true,executablePath:executable(engine)});report.engines.push({engine,version:browser.version()});await matrix(browser,engine);await records(browser,engine);await goals(browser,engine);await edgeStates(browser,engine);await adaptive(browser,engine);await browser.close();browser=null;}assert.deepEqual(report.errors,[]);report.status='PASS';}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1;}finally{await browser?.close();fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,engines:report.engines,errors:report.errors,failure:report.failure,output},null,2));}})();
