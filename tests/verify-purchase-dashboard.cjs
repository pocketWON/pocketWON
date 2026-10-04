/* Purchase chart, score, crown and interaction checks in isolated browser contexts. */
const t = require('./product-test-utils.cjs');
const {assert,fs,path,launch,setup,ready,unchanged}=t;
const out=t.output('purchase-dashboard'),report={status:'RUNNING',checks:[],geometry:[]};
const date=new Date('2026-10-04T14:59:00Z');
const transaction=(amount,type='out',memo='문구 세트',day=4)=>({amount,type,memo,category:type==='in'?'용돈':'문구',ts:`2026-10-0${day}T10:00:00+09:00`});
const state=transactions=>({balance:32000,monthly:{saving:50000,spending:18000},goal:{title:'책',target:100000,current:45000},transactions});
async function arcPoint(page,id){return page.locator(`[data-purchase="${id}"][role="button"]`).evaluate(n=>{const r=n.ownerSVGElement.getBoundingClientRect(),angle=(-.25+Number(n.dataset.offset)+Number(n.dataset.fraction)/2)*2*Math.PI;return {x:r.left+r.width*(60+46*Math.cos(angle))/120,y:r.top+r.height*(60+46*Math.sin(angle))/120};});}
async function layout(p,name){
  await ready(p);
  const g=await p.evaluate(()=>{
    const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const donut=rect(document.querySelector('.pw-home-donut'));
    const value=rect(document.querySelector('.pw-home-score-value')),score=rect(document.querySelector('.pw-home-score')),copy=rect(document.querySelector('.pw-home-positive-content>.pw-home-insight-body')),panel=rect(document.querySelector('.pw-home-insight--positive'));
    const crown=document.querySelector('.pw-home-weekly-crown'),plot=document.querySelector('.pw-home-weekly-plot');
    const weeklyScore=document.querySelector('.pw-home-weekly-score'),weeklyArt=document.querySelector('.pw-home-weekly-art');
    return {donut,value,score,copy,panel,weeklyScore:rect(weeklyScore),weeklyGlyphs:[...weeklyScore.children].map(rect),weeklyArt:rect(weeklyArt),weeklyCard:rect(document.querySelector('.pw-home-weekly')),habit:rect(document.querySelector('.pw-home-habit')),crown:crown?rect(crown):null,plot:rect(plot),crownedValue:crown?rect(plot.querySelector(`rect[data-date-key="${crown.dataset.dateKey}"]`).nextElementSibling):null,nav:rect(document.querySelector('.pw-bottom-navigation'))};
  });
  report.geometry.push({name,...g});
  assert.equal(g.nav.height,84);assert(g.value.right<=g.score.right+1&&g.value.left>=g.score.left-1,name+' score text exceeds slot');
  assert(g.score.left>=g.copy.right-1 && g.score.bottom<=g.panel.bottom+1 && g.score.right<=g.panel.right+1,name+' score/copy overlap');
  assert(g.plot.right<=g.weeklyArt.left+1 && g.weeklyArt.right<=g.weeklyScore.left+1,name+' weekly plot/character/score overlap');
  for(const glyph of g.weeklyGlyphs) assert(glyph.left>=g.weeklyScore.left-1 && glyph.right<=g.weeklyScore.right+1 && glyph.top>=g.weeklyCard.top && glyph.bottom<=g.weeklyCard.bottom,name+' weekly score clipping');
  assert.equal(await p.locator('.pw-home-weekly-score').getAttribute('data-score'),await p.locator('.pw-home-score').getAttribute('data-score'),name+' weekly and insight scores differ');
  assert.equal(await p.locator('.pw-home-weekly-bubble,.pw-home-weekly-music').count(),0);
  assert(!((await p.locator('.pw-home-weekly-reaction').innerText()).includes('습관 점수')));
  assert(Math.abs(g.donut.width-g.donut.height)<1 && Math.abs((g.donut.left+g.donut.right)-(g.habit.left+g.habit.right))<2,name+' donut is not round and centered');
  assert.equal(await p.locator('.pw-home-legend,.pw-home-purchase').count(),0);
  if(g.crown){assert(g.crown.top>=g.plot.top-1 && g.crown.bottom<=g.crownedValue.top+1,name+' crown overlaps value or exceeds plot '+JSON.stringify(g));}
}
(async()=>{let browser,current;try{
 for(const engine of ['chromium','webkit']){
  browser=await launch(engine);
  const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await c.newPage();
  await p.goto('http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html');await ready(p);await layout(p,engine+'-demo');
  assert.equal(await p.locator('.pw-home-insights h2 .pw-home-card-title').innerText(),'AI 인사이트');assert.equal(await p.locator('.pw-home-score-label').count(),0);
  assert.equal(await p.locator('.pw-home-score').evaluate(n=>getComputedStyle(n).backgroundImage),'none');
  await p.evaluate(()=>{window.__scoreModel=createHomeDashboardModel;window.createHomeDashboardModel=(...args)=>{const m=__scoreModel(...args);return {...m,insights:{...m.insights,positive:{...m.insights.positive,score:100}}};};PWNavigation.go('home');});
  for(const [width,height] of [[320,568],[390,844],[844,390]]){await p.setViewportSize({width,height});await layout(p,engine+'-100-points-'+width);}
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{window.createHomeDashboardModel=__scoreModel;delete window.__scoreModel;PWNavigation.go('home');});await ready(p);
  const d=await p.evaluate(()=>createHomeDashboardModel(PWDemo.load(),PWDemo.now));
  const ui=await p.locator('.pw-home-donut-segment').evaluateAll(ns=>ns.map(n=>({id:n.dataset.purchase,fraction:Number(n.dataset.fraction),color:n.getAttribute('stroke'),length:Number(n.getAttribute('stroke-dasharray').split(' ')[0]),radius:Number(n.getAttribute('r'))})));
  assert.equal(ui[0].fraction,.1);assert(Math.abs(ui[0].length/(2*Math.PI*ui[0].radius)-.1)<1e-12);
  assert.equal(ui.length,d.donut.items.length);
  for(const [index,item] of d.donut.items.entries()) {
   assert.equal(ui[index].id,item.id);assert.equal(ui[index].color,d.donut.segments[index % d.donut.segments.length].color);
   assert.equal(ui[index].fraction,item.amount/d.donut.received);
  }
  const point=id=>arcPoint(p,id);
  for(const item of d.donut.items) {
   const q=await point(item.id);await p.mouse.move(q.x,q.y);await ready(p);
   assert.equal(await p.locator('.pw-home-donut-label').innerText(),item.label,'hover must identify each individual purchase');
   assert.equal(await p.locator('.pw-home-donut-value').innerText(),'−'+item.amount.toLocaleString('ko-KR')+'원');
  }
  await p.mouse.move(1,1);await ready(p);assert.equal(await p.locator('.pw-home-donut-value').innerText(),'50,000원');
  const first=d.donut.items[0],q=await point(first.id);
  await p.mouse.click(q.x,q.y);await p.mouse.move(1,1);await ready(p);
  assert.equal(await p.locator('.pw-home-donut-center').getAttribute('data-purchase'),first.id,'clicked selection must persist');
  await p.screenshot({path:path.join(out,'screenshots',engine+'-purchase-selected.png')});
  const firstArc=p.locator(`.pw-home-donut-segment[data-purchase="${first.id}"]`);
  await firstArc.focus();await p.keyboard.press('ArrowRight');await ready(p);assert.equal(await p.locator('.pw-home-donut-label').innerText(),d.donut.items[1].label);
  await p.keyboard.press('End');await ready(p);assert.equal(await p.locator('.pw-home-donut-label').innerText(),'남은 용돈');assert.equal(await p.locator('.pw-home-donut-value').innerText(),'32,000원');
  await p.keyboard.press('Escape');await ready(p);assert.equal(await p.locator('.pw-home-donut-value').innerText(),'50,000원');
  await p.mouse.click(q.x,q.y);await p.locator('.pw-home-donut-center').click();await ready(p);
  const route=await p.evaluate(()=>PWNavigation.current());assert.equal(route.screen,'record');assert.equal(route.stage,'detail');assert.equal(route.sourceIndex,first.sourceIndex);
  assert.match(await p.locator('.pw-record-detail-money').innerText(),/5,000/);
  await p.locator('.pw-nav-item[data-screen="home"]').click();await ready(p);
  assert.equal(await p.locator('.pw-home-weekly-crown').getAttribute('data-date-key'),d.week.crownKey);
  await p.locator('.pw-home-habit [data-action="habit"]').click();await ready(p);assert.equal(await p.locator('.pw-record[data-stage="list"]').count(),1);
  const seen=new Set();do {for(const id of await p.locator('.pw-record-row-button').evaluateAll(ns=>ns.map(n=>Number(n.dataset.sourceIndex))))seen.add(id);if(await p.getByRole('button',{name:'다음',exact:true}).isDisabled())break;await p.getByRole('button',{name:'다음',exact:true}).click();await ready(p);}while(true);
  assert(d.donut.items.every(item=>seen.has(item.sourceIndex)),'All weekly purchases reachable through title arrow');
  await p.locator('.pw-nav-item[data-screen="home"]').click();await ready(p);await p.mouse.move(1,1);
  await p.screenshot({path:path.join(out,'screenshots',engine+'-final-demo.png')});await c.close();
  const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),touchPage=await touch.newPage();
  await touchPage.goto('http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html');await ready(touchPage);
  const touchPoint=await arcPoint(touchPage,first.id);
  await touchPage.touchscreen.tap(touchPoint.x,touchPoint.y);await ready(touchPage);
  assert.equal(await touchPage.locator('.pw-home-donut-label').innerText(),first.label);
  assert.equal(await touchPage.locator('.pw-home-donut-value').innerText(),'−5,000원');
  await touchPage.touchscreen.tap(touchPoint.x,touchPoint.y);await ready(touchPage);
  assert.equal(await touchPage.locator('.pw-home-donut-value').innerText(),'50,000원','second tap restores total');
  await touch.close();
  const scenarios=[
   ['unspent',state([transaction(50000,'in')]),'empty'],
   ['no-income',state([transaction(5000)]),'no-allowance'],
   ['over-budget',state([transaction(1000,'in'),transaction(5000)]),'overspent'],
   ['no-records',state([]),'no-allowance'],
   ['read-error',state([]),'unavailable'],
   ['long-purchase',state([transaction(Number.MAX_SAFE_INTEGER,'in'),transaction(Number.MAX_SAFE_INTEGER,'out','매우 긴 실제 구매 이름 '.repeat(10))]),'available'],
   ['overflow',state([transaction(Number.MAX_SAFE_INTEGER,'in'),transaction(1,'in'),transaction(5000)]),'unavailable']
  ];
  for(const [name,data,status] of scenarios){
    current=await setup(browser,{data,readFailure:name==='read-error',width:360,height:640});
    await current.page.clock.setFixedTime(date);await current.page.evaluate(()=>PWNavigation.go('home'));await layout(current.page,engine+'-'+name);
    assert.equal(await current.page.locator('.pw-home-donut').getAttribute('data-status'),status);
    if(status!=='available') assert.equal(await current.page.locator('.pw-home-donut-segment').count(),0);
    if(name==='no-records'||name==='read-error'||name==='overflow') assert.equal(await current.page.locator('.pw-home-score').getAttribute('data-score'),'unknown');
    if(name==='no-records'||name==='read-error') assert.equal(await current.page.locator('.pw-home-weekly-crown').count(),0);
    if(name==='long-purchase') {
      await current.page.locator('.pw-home-donut-segment').focus();await ready(current.page);
      assert.match(await current.page.locator('.pw-home-donut-center').getAttribute('aria-label'),/9,007,199,254,740,991원/);
      assert.equal(await current.page.locator('.pw-home-donut-segment').getAttribute('data-fraction'),'1');
      const fit=await current.page.locator('.pw-home-donut-center').evaluate(n=>{const r=n.getBoundingClientRect(),v=n.querySelector('.pw-home-donut-value').getBoundingClientRect();return v.left>=r.left-1&&v.right<=r.right+1;});
      assert(fit,'large selected purchase price exceeds center');
    }
    if(name==='over-budget') assert.equal(await current.page.locator('.pw-home-donut-value').innerText(),'4,000원');
    await current.page.screenshot({path:path.join(out,'screenshots',engine+'-'+name+'.png')});await unchanged(current);await current.context.close();current=null;
  }
  report.checks.push(engine+' exact individual purchase arcs, hover/click/touch/keyboard/remaining details, detail/list routing, centered donut without a legend, matching scores and seven edge states');
  await browser.close();browser=null;
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1;}finally{await current?.context.close();await browser?.close();t.save(out,report);}})();
