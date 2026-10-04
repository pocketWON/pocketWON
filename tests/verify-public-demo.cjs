const {launch,ready,fs,path,assert}=require('./product-test-utils.cjs');
const out=path.resolve(process.env.PW_EVIDENCE_ROOT||'evidence/FULLSCREEN-DEMO/data');fs.mkdirSync(out,{recursive:true});
const report={status:'RUNNING',checks:[]},url='http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html';
(async()=>{let browser;try{
 for(const engine of ['chromium','webkit']){
  browser=await launch(engine);const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>{const state={balance:77,monthly:{saving:77,spending:0},transactions:[]};localStorage.setItem('pocketwon_demo_v1',JSON.stringify(state));window.__before=localStorage.getItem('pocketwon_demo_v1');window.__writes=[];for(const name of ['setItem','removeItem','clear']){const fn=Storage.prototype[name];Storage.prototype[name]=function(...args){__writes.push([name,...args]);return fn.apply(this,args);};}});
  await page.goto(url);await ready(page);
  assert.match(await page.locator('.pw-home-money').innerText(),/32,000/);assert.equal(await page.locator('.pw-demo-badge').innerText(),'가상 데이터');
  const model=await page.evaluate(()=>createHomeDashboardModel(PWDemo.load(),PWDemo.now));
  assert.equal(model.donut.categories.reduce((n,c)=>n+c.amount,0),model.donut.total);assert.equal(model.donut.categories.reduce((n,c)=>n+c.percent,0),100);assert(model.week.days.every(d=>Number.isSafeInteger(d.amount)&&d.amount>0));
  const data=await page.evaluate(()=>PWDemo.load());assert.equal(data.state.monthly.saving-data.state.monthly.spending,data.state.balance);
  await page.getByRole('button',{name:'기록하기',exact:true}).click();const d=page.locator('dialog[open]');
  await page.getByLabel('받은 돈',{exact:true}).check();await d.getByRole('button',{name:'다음',exact:true}).click();await d.locator('input[inputmode="numeric"]').fill('1000');await d.getByRole('button',{name:'다음',exact:true}).click();await d.getByRole('textbox').fill('데모 저장 차단');await d.getByRole('button',{name:'다음',exact:true}).click();
  assert(await page.getByRole('button',{name:'기록 저장',exact:true}).isDisabled());
  assert(await page.evaluate(()=>document.querySelector('dialog[open]').getBoundingClientRect().bottom<=document.querySelector('.pw-bottom-navigation').getBoundingClientRect().top+1));
  await page.screenshot({path:path.join(out,engine+'-record.png')});await page.keyboard.press('Escape');await ready(page);
  await page.locator('.pw-nav-item[data-screen="goal"]').click();await page.getByRole('button',{name:'목표 수정',exact:true}).click();await d.getByRole('button',{name:'다음',exact:true}).click();await d.getByRole('button',{name:'다음',exact:true}).click();assert(await page.getByRole('button',{name:'목표 저장',exact:true}).isDisabled());await page.keyboard.press('Escape');await ready(page);
  await page.locator('.pw-nav-item[data-screen="all"]').click();await page.getByRole('button',{name:'실제 기록 보기',exact:true}).click();assert.match(await page.locator('.pw-home-money').innerText(),/77/);assert.equal(await page.locator('.pw-demo-badge').count(),0);assert.equal(await page.evaluate(()=>PWDemo.enabled),false);
  assert(await page.evaluate(()=>localStorage.getItem('pocketwon_demo_v1')===__before));assert.deepEqual(await page.evaluate(()=>__writes),[]);assert.deepEqual(errors,[]);
  await page.locator('.pw-nav-item[data-screen="all"]').click();
  await page.getByRole('button',{name:'전체 화면',exact:true}).click();await ready(page);
  assert(await page.evaluate(()=>!!document.fullscreenElement||document.querySelector('.pw-app-hint').textContent.includes('홈 화면에 추가')));
  if(await page.evaluate(()=>!!document.fullscreenElement))await page.getByRole('button',{name:'전체 화면',exact:true}).click();
  await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('Synthetic unavailable'));});
  await page.getByRole('button',{name:'전체 화면',exact:true}).click();await ready(page);
  assert.match(await page.locator('.pw-app-hint').innerText(),/홈 화면에 추가/);
  report.checks.push({engine,demoValues:true,consistentTotals:true,recordAndGoalSaveBlocked:true,existingDataRestored:true,storageWrites:0,fullscreenButtonAndFallback:true,errors});
  await context.close();await browser.close();browser=null;
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1;}finally{await browser?.close();fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}})();
