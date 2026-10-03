/* PW-WOORI-05: isolated fixture contexts; no user's browser profile or stored data. */
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
  ? path.resolve(root, process.env.PW_EVIDENCE_ROOT, 'report')
  : path.join(root, 'evidence/PW-WOORI-05');
const origin = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';
assert(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
const url = `${origin}/ks6s3juocjzc2.kimi.page/index.html`;
fs.mkdirSync(path.join(output, 'screenshots'), { recursive: true });
const report = { startedAt: new Date().toISOString(), url, checks: [], screenshots: [], consoleErrors: [], pageErrors: [], requestFailures: [], httpErrors: [], browsers: {}, storageChecks: [], limitations: ['Browser viewport, keyboard and accessibility tree checks; no physical screen reader or child usability study'] };
const pass = (name, detail = true) => { report.checks.push({ name, status: 'PASS', detail }); console.log(`PASS ${name}`); };
const copy = value => JSON.parse(JSON.stringify(value));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const snapshot = fs.readFileSync(path.join(root, 'preservation/PW-WOORI-01/original-index.html.txt'), 'utf8');
const fixture = copy(vm.runInNewContext(`(${snapshot.match(/const defaultState = (\{[\s\S]*?\n        \});/)[1]})`));
const source = fs.readFileSync(path.join(app, 'scripts/report.js'), 'utf8');
const stateSource = fs.readFileSync(path.join(app, 'scripts/state.js'), 'utf8');
const api = vm.runInNewContext(`${stateSource}\n${source}\n({createReportViewModel,createGoalViewModel,validPocketWONTransaction,loadPocketWONState})`);
const model = state => copy(api.createReportViewModel(state));
const won = n => `${n.toLocaleString('ko-KR')}원`;
const max = Number.MAX_SAFE_INTEGER;
function unitTests() {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'preservation/PW-WOORI-05/baseline.json')));
  for (const [file, digest] of Object.entries(baseline.files)) if (!baseline.snapshots.includes(file) && (!file.startsWith('ks6s3juocjzc2.kimi.page/') || /\/scripts\/(state|tabs|icons)\.js$/.test(file)) && file !== 'tests/fixtures/design-system.html') assert.equal(hash(fs.readFileSync(path.join(root, file))), digest, file);
  assert.equal(hash(snapshot), '24405c1c583da11d362f82b067add7fb7c62e152cba55f44d331f161b62314ba');
  assert(!/localStorage|setItem|removeItem|\bclear\s*\(|fetch\s*\(|XMLHttpRequest|WebSocket|Math\.random|navigator\.(share|clipboard)|\bprompt\s*\(/.test(source));
  pass('Source: immutable baseline, Report has no storage writer/network/AI/share dependency');
  const expected = { score: { status: 'available', value: 82 }, moneyFlow: { status: 'available', received: 15200, spent: 12300, difference: 2900, period: 'unknown' }, goal: { status: 'active', title: '게임 아이템', current: 30600, target: 45000, remaining: 14400, percent: 68 }, records: { status: 'available', count: 4, partial: false } };
  const freeze = x => { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
  const frozen = freeze(copy(fixture)), raw = JSON.stringify(frozen);
  assert.deepEqual(model(frozen), expected); assert.equal(JSON.stringify(frozen), raw);
  pass('Default fixture: exact projection and deeply frozen immutability', expected);
  for (const score of [0, 100, 82.123456789, 0.0000001]) assert.equal(model({habitScore:score}).score.value, score);
  for (const score of [undefined, null, -1, 101, '82', NaN, Infinity, -Infinity, true]) assert.deepEqual(model({habitScore:score}).score, {status:'unavailable',value:null});
  pass('Score: zero, 100, fractional precision, missing/type/range/nonfinite rejection');
  for (const [monthly, received, spent, difference, status] of [
    [{saving:0,spending:0},0,0,0,'available'], [{saving:1,spending:9},1,9,-8,'available'],
    [{saving:max,spending:0},max,0,max,'available'], [{saving:0,spending:max},0,max,-max,'available'],
    [{saving:5},5,null,null,'partial'], [{spending:3},null,3,null,'partial'],
    [{saving:-1,spending:'3'},null,null,null,'unavailable'], [{saving:1.2,spending:max+1},null,null,null,'unavailable'],
    [null,null,null,null,'unavailable'], [[],null,null,null,'unavailable'],
  ]) assert.deepEqual(model({monthly}).moneyFlow,{status,received,spent,difference,period:'unknown'});
  pass('Money: partial/invalid, real zeros, signed difference, safe integer limits and unknown period');
  for (const state of [{},{goal:null},{goal:{}},{goal:{title:'bad',current:1,target:0}},{goal:{title:'long'.repeat(100),current:max,target:1}},{goal:{title:'complete',current:10,target:10}}, fixture]) assert.deepEqual(model(state).goal, copy(api.createGoalViewModel(state)));
  assert.equal(model({goal:{title:'not yet',current:999,target:1000}}).goal.status,'active');
  pass('Goal: exact PW04 projection, empty/invalid/complete/over-target and rounded active state');
  const tx = {type:'in',amount:1,category:'용돈',ts:'unknown',receipt:false};
  assert.equal(model({transactions:[tx,null,{}, {...tx,amount:0},{...tx,amount:'1'}, {...tx,type:'other'}]}).records.count,1);
  assert.equal(model({transactions:[tx]}).records.partial,false);
  assert.deepEqual(model({transactions:[]}).records,{status:'available',count:0,partial:false});
  assert.deepEqual(model({transactions:{}}).records,{status:'unavailable',count:null,partial:false});
  assert.equal(model({transactions:Array.from({length:30},()=>tx)}).records.count,30);
  pass('Records: established validator including unknown dates, all rows not 20-row view, mixed-invalid and absent arrays');
  for (const raw of ['{','null','[]','false','12','"text"']) assert.equal(api.loadPocketWONState(()=>({getItem:()=>raw})).status,'invalid');
  assert.equal(api.loadPocketWONState(()=>({getItem:()=>null})).status,'empty');
  assert.equal(api.loadPocketWONState(()=>{throw Error('getter');}).status,'unavailable');
  assert.equal(api.loadPocketWONState(()=>({getItem(){throw Error('read');}})).status,'unavailable');
  pass('Load: empty, malformed/invalid root and separate getter/read failures');
}
function executable(engine) {
  const custom = process.env[engine === 'chromium' ? 'PW_CHROMIUM_EXECUTABLE' : 'PW_WEBKIT_EXECUTABLE']; if (custom) return custom;
  const cache = path.join(os.homedir(),'Library/Caches/ms-playwright');
  const versions = fs.readdirSync(cache).filter(n=>n.startsWith(engine==='chromium'?'chromium_headless_shell-':'webkit-')).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
  assert(versions.length); return path.join(cache,versions[0],engine==='chromium'?'chrome-headless-shell-mac-arm64/chrome-headless-shell':'pw_run.sh');
}
function observe(page) {
  page.on('console',m=>{if(m.type()==='error') report.consoleErrors.push(m.text());});
  page.on('pageerror',e=>report.pageErrors.push(e.message));
  page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),reason:r.failure()}));
  page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()});});
}
async function setup(browser, data=fixture, failure=null) {
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,locale:'ko-KR',timezoneId:'Asia/Seoul',reducedMotion:'reduce'});
  const raw=data===null?null:typeof data==='string'?data:JSON.stringify(data);
  await context.addInitScript(({raw,failure})=>{
    const storage=window.localStorage;
    const get=Storage.prototype.getItem, set=Storage.prototype.setItem, remove=Storage.prototype.removeItem;
    if(get.call(storage,'unrelated_test_value')===null){
      if(raw!==null)set.call(storage,'pocketwon_demo_v1',raw);
      set.call(storage,'pocketwon_intro_done','1');set.call(storage,'pocketwon_theme','dark');set.call(storage,'unrelated_test_value','keep');
    }
    window.__calls=[];
    window.__raw=()=>Object.fromEntries(Object.keys(storage).map(k=>[k,get.call(storage,k)]));
    window.__replace=value=>value===null?remove.call(storage,'pocketwon_demo_v1'):set.call(storage,'pocketwon_demo_v1',value);
    for(const method of ['getItem','setItem','removeItem','clear']){
      const original=Storage.prototype[method];
      Storage.prototype[method]=function(...args){window.__calls.push({method,key:args[0]});if(method==='getItem'&&failure==='read')throw Error('Injected read failure');return original.apply(this,args);};
    }
    if(failure==='getter')Object.defineProperty(window,'localStorage',{configurable:true,get(){window.__calls.push({method:'getter',key:'pocketwon_demo_v1'});throw Error('Injected getter failure');}});
  },{raw,failure});
  const page=await context.newPage();observe(page);await page.goto(url);await ready(page);
  return {context,page,raw};
}
const ready=async page=>{await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
const read=page=>page.evaluate(()=>window.__raw());
const calls=page=>page.evaluate(()=>window.__calls);
const nav=(page,screen)=>page.locator(`.pw-nav-item[data-screen="${screen}"]`).click();
async function enter(page){await nav(page,'report');await ready(page);}
async function unchanged(page,before,label){
  assert.deepEqual(await read(page),before,label);
  const observed=await calls(page);assert(observed.every(c=>['getItem','getter'].includes(c.method)&&c.key==='pocketwon_demo_v1'),JSON.stringify(observed));
  report.storageChecks.push({label,rawUnchanged:true,writes:0,otherKeys:0,reads:observed.length});
}
async function shot(page,name,engine){
  if(engine!=='Chromium')return;await ready(page);await page.mouse.move(0,0);
  await page.screenshot({path:path.join(output,'screenshots',name+'.png')});report.screenshots.push(`screenshots/${name}.png`);
}
async function inspectSection(page, selector, name, engine) {
  await page.locator(selector).evaluate(n => { const content = document.querySelector('.pw-content'); content.scrollTop += n.getBoundingClientRect().top - content.getBoundingClientRect().top; });
  await ready(page); await geometry(page); await shot(page, name, engine);
}
async function geometry(page){
  await ready(page);
  const g=await page.evaluate(()=>{
    const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const content=document.querySelector('.pw-content');
    return {viewport:innerWidth,doc:document.documentElement.scrollWidth,client:content.clientWidth,scroll:content.scrollWidth,content:box(content),nav:box(document.querySelector('.pw-bottom-navigation')),
      amounts:[...document.querySelectorAll('.pw-report-money,.pw-report-score-value')].map(n=>({client:n.clientWidth,scroll:n.scrollWidth})),
      controls:[...document.querySelectorAll('.pw-report button')].map(box)};
  });
  assert(g.doc<=g.viewport&&g.scroll<=g.client,JSON.stringify(g));
  assert(g.amounts.every(a=>a.scroll<=a.client+1),JSON.stringify(g));
  assert(g.content.bottom<=g.nav.y+0.05,JSON.stringify(g));
  assert(g.controls.every(c=>c.width>=48&&c.height>=48&&c.x>=0&&c.right<=g.viewport+0.05),JSON.stringify(g));return g;
}
async function assertModel(page,data){
  const expected=model(data);
  assert.equal(await page.locator('.pw-report').count(),1);assert.equal(await page.locator('h1').count(),1);
  assert.equal(await page.locator('h1').textContent(),'용돈 습관 리포트');
  assert.equal(await page.locator('.pw-report-score-value,.pw-report-score-unknown').textContent(),expected.score.value===null?'확인 안 됨':String(expected.score.value));
  for(const key of ['received','spent','difference']){
    const node=page.locator(`[data-money="${key}"]`);
    if(expected.moneyFlow[key]===null)assert.equal(await node.innerText(),'확인 안 됨');else assert.equal(await node.getAttribute('aria-label'),won(expected.moneyFlow[key]));
  }
  assert((await page.locator('.pw-report').innerText()).includes('저장된 집계 · 기간 확인 안 됨'));
  assert.equal(await page.locator('.pw-report-record-count').textContent(),expected.records.count===null?'확인 안 됨':`${expected.records.count.toLocaleString('ko-KR')}건`);
  if(['active','complete'].includes(expected.goal.status)){
    assert.equal(await page.locator('.pw-report-goal-name').textContent(),expected.goal.title);
    for(const key of ['current','target','remaining'])assert.equal(await page.locator(`[data-money="${key}"]`).getAttribute('aria-label'),won(expected.goal[key]));
    const progress=page.getByRole('progressbar',{name:'목표 진행률'});
    for(const [key,value] of [['aria-valuemin','0'],['aria-valuemax','100'],['aria-valuenow',String(expected.goal.percent)]])assert.equal(await progress.getAttribute(key),value);
    assert((await progress.getAttribute('aria-valuetext')).includes(`${expected.goal.percent}%`));
    assert.equal((await page.locator('.pw-report-percent').textContent()).includes('목표 달성'),expected.goal.status==='complete');
  }else{
    assert.equal(await page.getByRole('progressbar').count(),0);
    assert((await page.locator('.pw-report').innerText()).includes(expected.goal.status==='empty'?'아직 정한 목표가 없어요':'목표 정보를 확인할 수 없어요'));
  }
  assert.equal(await page.locator('.pw-report svg:not([aria-hidden="true"])').count(),0);
  assert(!/AI|이번 달|이번 주|지난주|저축액|분석했|보내기/.test(await page.locator('.pw-report').innerText()));
  assert.equal(await page.locator('.pw-report button').count(),2);
}
async function fixtures(browser,engine){
  const cases=[
    ['default',fixture],['partial-report',{monthly:{saving:15200},goal:fixture.goal}],
    ['score-zero',{...fixture,habitScore:0}],['score-100',{...fixture,habitScore:100}],
    ['score-unavailable', {...fixture,habitScore:undefined}],['score-negative',{...fixture,habitScore:-1}],['score-high',{...fixture,habitScore:101}],['score-string',{...fixture,habitScore:'82'}],['score-fraction',{...fixture,habitScore:82.123456789}],
    ['monthly-invalid',{...fixture,monthly:{saving:-1,spending:'12'}}],['money-zero',{...fixture,monthly:{saving:0,spending:0}}],['money-negative',{...fixture,monthly:{saving:0,spending:12300}}],
    ['large-money',{...fixture,monthly:{saving:0,spending:max},goal:{title:'큰 목표',current:max-100,target:max}}],
    ['goal-empty',{...fixture,goal:null}],['goal-active',fixture],['goal-complete',{...fixture,goal:{...fixture.goal,current:45000}}],['goal-over',{...fixture,goal:{...fixture.goal,current:max,target:1}}],
    ['goal-invalid',{...fixture,goal:{...fixture.goal,target:0}}],['long-goal-title',{...fixture,goal:{...fixture.goal,title:'내가 오래 기다려 온 정말 멋진 목표 '.repeat(12)}}],
    ['html-text',{...fixture,goal:{...fixture.goal,title:'<svg onload=alert(1)>목표'}}],
    ['records-empty',{...fixture,transactions:[]}],['records-missing',{...fixture,transactions:undefined}],
    ['records-mixed',{...fixture,transactions:[...fixture.transactions,null,{type:'in',amount:-1,category:'용돈'}]}],
    ['records-unknown-date',{...fixture,transactions:[{type:'in',amount:100,category:'용돈',ts:'bad',receipt:false}]}],['empty-object',{}],
  ];
  const {page,context}=await setup(browser);
  try{
    for(const [name,data]of cases){
      await page.evaluate(raw=>{window.__replace(raw);window.__calls=[];},JSON.stringify(data));const before=await read(page);await enter(page);await assertModel(page,data);await geometry(page);
      assert.equal(await page.locator('.pw-report .pw-report-goal-name svg').count(),0);
      if(name==='default') assert.equal(await page.locator('[data-money=remaining] .pw-report-money-digits').textContent(), '14,400');
      if(name==='records-mixed')assert((await page.locator('.pw-report').innerText()).includes('확인 가능한 기록만 포함했어요'));
      await shot(page,name,engine);
      if (['default','goal-active','goal-complete','long-goal-title','large-money'].includes(name)) {
        await inspectSection(page, '#pw-report-goal-title', `${name}-goal-detail`, engine);
        await page.locator('.pw-content').evaluate(n => { n.scrollTop = n.scrollHeight; }); await geometry(page);
        const last = await page.locator('.pw-report-actions').boundingBox(), navBox = await page.locator('.pw-bottom-navigation').boundingBox();
        assert(last.y + last.height < navBox.y - 10); await shot(page, `${name}-bottom`, engine);
      }
      await unchanged(page,before,`${engine}/${name}`);
      pass(`${engine}: fixture ${name} exact values, state distinctions, geometry and read-only`);
    }
  }finally{await ready(page);await context.close();}
  for(const [name,data,failure,message]of [
    ['empty-report',null,null,'아직 보여줄 기록이 없어요.'],['invalid-report','{',null,'저장된 정보를 확인할 수 없어요.'],
    ['invalid-root','[]',null,'저장된 정보를 확인할 수 없어요.'],['storage-read',fixture,'read','저장된 정보를 불러오지 못했어요.'],['storage-getter',fixture,'getter','저장된 정보를 불러오지 못했어요.'],
  ]){
    const {page,context}=await setup(browser,data,failure);
    try{const before=await read(page);await enter(page);assert.equal(await page.locator('.pw-report-status h2').textContent(),message);assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('.pw-report-score').count(),0);await geometry(page);await shot(page,name,engine);
      if(name==='empty-report'){await page.getByRole('button',{name:'첫 기록 남기기'}).click();assert.equal(await page.locator('.pw-record').count(),1);assert.equal(await page.evaluate(()=>document.activeElement.id),'pw-screen-title');}
      await unchanged(page,before,`${engine}/${name}`);pass(`${engine}: ${name}, exact fallback and no repair writes`);
    }finally{await ready(page);await context.close();}
  }
}
async function flows(browser,engine){
  const {page,context}=await setup(browser);
  try{
    const baseline=await read(page);
    await page.getByRole('button',{name:'리포트 보기',exact:true}).click();await ready(page);await assertModel(page,fixture);assert.equal(await page.evaluate(()=>document.activeElement.id),'pw-screen-title');await unchanged(page,baseline,`${engine}/A`);pass(`${engine}: FLOW A Home action to latest Report`);
    let expected=copy(fixture);
    for(const type of ['in','out']){
      await page.getByRole('button',{name:'기록 보기',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'pw-screen-title');
      await page.getByRole('button',{name:'새 기록 추가',exact:true}).click();
      await page.getByRole('radio',{name:type==='in'?'받은 돈':'쓴 돈',exact:true}).check();
      await page.locator('#pw-record-amount').fill('1000');await page.getByRole('radio',{name:type==='in'?'용돈':'간식',exact:true}).check();
      await page.evaluate(()=>{window.__calls=[];});await page.getByRole('button',{name:'기록 저장',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
      assert.deepEqual((await calls(page)).filter(c=>c.method!=='getItem'),[{method:'setItem',key:'pocketwon_demo_v1'}]);
      const after=JSON.parse((await read(page)).pocketwon_demo_v1);
      assert.equal(after.habitScore,fixture.habitScore);assert.deepEqual(after.goal,fixture.goal);
      assert.equal(after.monthly[type==='in'?'saving':'spending'],expected.monthly[type==='in'?'saving':'spending']+1000);
      assert.equal(after.transactions.length,expected.transactions.length+1);assert.deepEqual(after.transactions.slice(1),expected.transactions);
      expected=after;await page.evaluate(()=>{window.__calls=[];});const raw=await read(page);await enter(page);await assertModel(page,expected);await unchanged(page,raw,`${engine}/${type}`);await shot(page,`record-${type}-report`,engine);pass(`${engine}: FLOW ${type==='in'?'B':'C'} Record save updates totals/count only; score/goal preserved`);
    }
    for(const [label,title,target]of [['D','이름만 바꾼 목표','45000'],['E','이름만 바꾼 목표','60000']]){
      await page.getByRole('button',{name:'목표 보기',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'pw-screen-title');
      await page.getByRole('button',{name:'목표 수정',exact:true}).click();await page.locator('#pw-goal-title').fill(title);await page.locator('#pw-goal-target').fill(target);
      await page.evaluate(()=>{window.__calls=[];});await page.getByRole('button',{name:'목표 저장',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
      assert.deepEqual((await calls(page)).filter(c=>c.method!=='getItem'),[{method:'setItem',key:'pocketwon_demo_v1'}]);
      const after=JSON.parse((await read(page)).pocketwon_demo_v1);assert.equal(after.goal.title,title);assert.equal(after.goal.target,Number(target));assert.equal(after.goal.current,fixture.goal.current);assert.equal(after.habitScore,fixture.habitScore);assert.deepEqual(after.transactions,expected.transactions);expected=after;
      await page.evaluate(()=>{window.__calls=[];});const raw=await read(page);await enter(page);await assertModel(page,expected);await unchanged(page,raw,`${engine}/${label}`);await shot(page,`goal-${label}-report`,engine);pass(`${engine}: FLOW ${label} Goal save refreshes Report; current/score/records unchanged`);
    }
    for(const [label,screen,text]of [['F','record','기록 보기'],['G','goal','목표 보기']]){
      await page.getByRole('button',{name:text,exact:true}).click();assert.equal(await page.locator(`.pw-${screen}`).count(),1);
      expected={...expected,habitScore:label==='F'?17:19};await page.evaluate(raw=>{window.__replace(raw);window.__calls=[];},JSON.stringify(expected));const raw=await read(page);
      await enter(page);await assertModel(page,expected);await unchanged(page,raw,`${engine}/${label}`);pass(`${engine}: FLOW ${label} navigation and external fixture update proves re-read`);
    }
    const raw=await read(page);await page.locator('.pw-content').evaluate(n=>{n.scrollTop=n.scrollHeight;});await page.getByRole('button',{name:'기록 보기',exact:true}).focus();await unchanged(page,raw,`${engine}/scroll-focus`);
    for(const target of ['home','record','goal','all']){await nav(page,target);await enter(page);await unchanged(page,raw,`${engine}/report-${target}`);}
    assert.equal(page.url(),url);await page.reload();await ready(page);assert.equal(await page.locator('.pw-home').count(),1);await unchanged(page,raw,`${engine}/reload`);await enter(page);await assertModel(page,expected);await unchanged(page,raw,`${engine}/H`);
    pass(`${engine}: FLOW H reload starts Home, stable raw string; all read-only navigation/scroll/focus`);
    fs.writeFileSync(path.join(output,`storage-flows-${engine}.json`),JSON.stringify({before:baseline,after:raw,reportWrites:0,explicitRecordWrites:2,explicitGoalWrites:2},null,2)+'\n');
  }finally{await ready(page);await context.close();}
}
async function responsive(browser,engine){
  const {page,context}=await setup(browser);
  try{
    const before=await read(page);await enter(page);
    for(const width of [360,390,430]){await page.setViewportSize({width,height:844});await geometry(page);await shot(page,`${width}x844-report`,engine);pass(`${engine}: ${width}x844 layout`,await geometry(page));}
    await page.setViewportSize({width:390,height:844});await ready(page);
    fs.writeFileSync(path.join(output,`accessibility-${engine}.txt`),await page.locator('body').ariaSnapshot());
    assert.equal(await page.locator('.pw-report section').evaluateAll(nodes=>nodes.every(n=>n.querySelector('h2')&&n.hasAttribute('aria-labelledby'))),true);
    const minContrast=await page.locator('.pw-report h1,.pw-report h2,.pw-report p,.pw-report dt,.pw-report button,.pw-report-money-digits').evaluateAll(nodes=>{
      const lum=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
      return Math.min(...nodes.filter(n=>n.getBoundingClientRect().height).map(n=>{let bg=n;while(bg.parentElement&&getComputedStyle(bg).backgroundColor==='rgba(0, 0, 0, 0)')bg=bg.parentElement;const a=lum(getComputedStyle(n).color),b=lum(getComputedStyle(bg).backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}));
    });assert(minContrast>=4.5,minContrast);pass(`${engine}: headings/progressbar/accessible snapshot and text contrast`,{minContrast});
    for(const key of ['Enter','Space']){
      await page.locator('.pw-nav-item[data-screen="home"]').focus();
      await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.dataset.screen),'report');await page.keyboard.press(key);await ready(page);
      await page.keyboard.press('Shift+Tab');
      // Traverse from the Report tab backward to its two preceding actions (Goal/Record tabs precede it).
      for(let i=0;i<3;i++)await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.textContent),'목표 보기');
      assert(await page.evaluate(()=>document.activeElement.matches(':focus-visible')));
      await page.keyboard.press(key);assert.equal(await page.locator('.pw-goal').count(),1);assert.equal(await page.evaluate(()=>document.activeElement.id),'pw-screen-title');
      await enter(page);await page.getByRole('button',{name:'기록 보기',exact:true}).focus();await page.keyboard.press(key);assert.equal(await page.locator('.pw-record').count(),1);assert.equal(await page.evaluate(()=>document.activeElement.id),'pw-screen-title');await enter(page);
    }
    pass(`${engine}: keyboard Tab/Shift+Tab, Enter/Space actions and h1 focus`);
    for(const width of [360,390,430]){
      await page.setViewportSize({width,height:width===360?640:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});await geometry(page);await shot(page,width===360?'200percent':`${width}-200percent`,engine);
      if (width === 360) {
        for (const [selector, name] of [['.pw-report-score', '200percent-score'], ['#pw-report-flow-title', '200percent-flow'], ['#pw-report-goal-title', '200percent-goal']]) await inspectSection(page, selector, name, engine);
        await page.locator('.pw-content').evaluate(n => { n.scrollTop = n.scrollHeight; }); await geometry(page); await shot(page, '200percent-bottom', engine);
      }
      pass(`${engine}: ${width} root 200% text with no clipped values`,await geometry(page));
    }
    const large={...fixture,monthly:{saving:0,spending:max},goal:{title:'아주 긴 한국어 목표 이름 '.repeat(20),current:max-1,target:max}};
    await page.evaluate(raw=>window.__replace(raw),JSON.stringify(large));await enter(page);await page.setViewportSize({width:360,height:640});await geometry(page);await shot(page,'large-long-200percent',engine);
    await inspectSection(page, '#pw-report-flow-title', 'large-money-200percent-flow', engine);
    await inspectSection(page, '[data-money=difference]', 'large-negative-200percent-exact', engine);
    await inspectSection(page, '[data-money=current]', 'large-goal-200percent-exact', engine);
    await inspectSection(page, '#pw-report-goal-title', 'long-goal-200percent-detail', engine);
    await page.locator('.pw-content').evaluate(n => { n.scrollTop = n.scrollHeight; }); await geometry(page); await shot(page, 'large-long-200percent-bottom', engine);
    for(const key of ['spent','difference','current','target']){const n=page.locator(`[data-money="${key}"]`);assert.equal(await n.getAttribute('aria-label'),won(key==='difference'?-max:key==='current'?max-1:max));}
    assert.equal(await page.locator('.pw-report-goal-name').textContent(),large.goal.title.trim());
    pass(`${engine}: negative safe integer and long Korean goal at 200% retain exact accessible amounts`);
    await page.evaluate(raw=>window.__replace(raw),JSON.stringify(fixture));await enter(page);
    for(const [top,bottom]of [[24,34],[47,24],[34,47]]){
      await page.evaluate(([top,bottom])=>{document.documentElement.style.setProperty('--pw-safe-top',top+'px');document.documentElement.style.setProperty('--pw-safe-bottom',bottom+'px');},[top,bottom]);
      const g=await geometry(page);await shot(page,`safe-${top}-${bottom}`,engine);
      const safe=await page.evaluate(()=>[document.querySelector('.pw-safe-area-top').getBoundingClientRect().height,document.querySelector('.pw-safe-area-bottom').getBoundingClientRect().height]);assert.deepEqual(safe,[top,bottom]);pass(`${engine}: safe area ${top}/${bottom} with 200%`,g);
    }
    // Rapid disposal while font promises/resize callbacks may still be pending.
    for(let i=0;i<8;i++){await nav(page,'home');await nav(page,'report');}await ready(page);
    await unchanged(page,before,`${engine}/responsive-keyboard`);pass(`${engine}: repeated mount/dispose and all layout interaction remains read-only`);
  }finally{await ready(page);await context.close();}
}
(async()=>{
  try{
    unitTests();
    for(const [engine,type,key]of [['Chromium',chromium,'chromium'],['WebKit',webkit,'webkit']]){
      const browser=await type.launch({headless:true,executablePath:executable(key)});
      try{report.browsers[engine]={version:browser.version(),executable:executable(key)};await fixtures(browser,engine);await flows(browser,engine);await responsive(browser,engine);}finally{await browser.close();}
    }
    for(const key of ['consoleErrors','pageErrors','requestFailures','httpErrors'])assert.deepEqual(report[key],[],key);
    pass('All browser console.error/pageerror/requestfailed/HTTP 4xx-5xx counts are zero');report.status='PASS';
  }catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;}
  finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,failure:report.failure,consoleErrors:report.consoleErrors,pageErrors:report.pageErrors,requestFailures:report.requestFailures,httpErrors:report.httpErrors},null,2));}
})();
