/* Purchase chart, score, crown and interaction checks in isolated browser contexts. */
const t = require('./product-test-utils.cjs');
const {assert,fs,path,launch,setup,ready,unchanged}=t;
const out=t.output('purchase-dashboard'),report={status:'RUNNING',checks:[],geometry:[]};
const date=new Date('2026-10-04T14:59:00Z');
const transaction=(amount,type='out',memo='문구 세트',day=4)=>({amount,type,memo,category:type==='in'?'용돈':'문구',ts:`2026-10-0${day}T10:00:00+09:00`});
const state=transactions=>({balance:32000,monthly:{saving:50000,spending:18000},goal:{title:'책',target:100000,current:45000},transactions});
async function layout(p,name){
  await ready(p);
  const g=await p.evaluate(()=>{
    const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const pairs=[...document.querySelectorAll('.pw-home-purchase')].map(n=>({button:rect(n),name:rect(n.querySelector('.pw-home-legend-label'))}));
    const value=rect(document.querySelector('.pw-home-score-value')),score=rect(document.querySelector('.pw-home-score')),copy=rect(document.querySelector('.pw-home-positive-content>.pw-home-insight-body')),panel=rect(document.querySelector('.pw-home-insight--positive'));
    const crown=document.querySelector('.pw-home-weekly-crown'),plot=document.querySelector('.pw-home-weekly-plot');
    const weeklyScore=document.querySelector('.pw-home-weekly-score'),weeklyArt=document.querySelector('.pw-home-weekly-art');
    return {pairs,value,score,copy,panel,weeklyScore:rect(weeklyScore),weeklyGlyphs:[...weeklyScore.children].map(rect),weeklyArt:rect(weeklyArt),weeklyCard:rect(document.querySelector('.pw-home-weekly')),habit:rect(document.querySelector('.pw-home-habit')),crown:crown?rect(crown):null,plot:rect(plot),crownedValue:crown?rect(plot.querySelector(`rect[data-date-key="${crown.dataset.dateKey}"]`).nextElementSibling):null,nav:rect(document.querySelector('.pw-bottom-navigation'))};
  });
  report.geometry.push({name,...g});
  assert.equal(g.nav.height,84);assert(g.value.right<=g.score.right+1&&g.value.left>=g.score.left-1,name+' score text exceeds slot');
  assert(g.score.left>=g.copy.right-1 && g.score.bottom<=g.panel.bottom+1 && g.score.right<=g.panel.right+1,name+' score/copy overlap');
  assert(g.plot.right<=g.weeklyArt.left+1 && g.weeklyArt.right<=g.weeklyScore.left+1,name+' weekly plot/character/score overlap');
  for(const glyph of g.weeklyGlyphs) assert(glyph.left>=g.weeklyScore.left-1 && glyph.right<=g.weeklyScore.right+1 && glyph.top>=g.weeklyCard.top && glyph.bottom<=g.weeklyCard.bottom,name+' weekly score clipping');
  assert.equal(await p.locator('.pw-home-weekly-score').getAttribute('data-score'),await p.locator('.pw-home-score').getAttribute('data-score'),name+' weekly and insight scores differ');
  assert.equal(await p.locator('.pw-home-weekly-bubble,.pw-home-weekly-music').count(),0);
  assert(!((await p.locator('.pw-home-weekly-reaction').innerText()).includes('습관 점수')));
  for(const row of g.pairs) assert(row.name.right<=g.habit.right-3 && row.name.bottom<=row.button.bottom+1 && row.name.bottom<=g.habit.bottom-3,name+' purchase label clipping '+JSON.stringify(row));
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
  for(const [index,item] of d.donut.segments.slice(0,5).entries()){
   assert.equal(ui[index].id,item.id);assert.equal(ui[index].color,item.color);
   assert.equal(await p.locator(`.pw-home-legend-row[data-purchase="${item.id}"] .pw-home-legend-dot`).evaluate(n=>n.style.background),await p.evaluate(color=>{const e=document.createElement('div');e.style.background=color;return e.style.background;},item.color));
  }
  assert.equal(await p.locator('.pw-home-weekly-crown').getAttribute('data-date-key'),d.week.crownKey);
  assert.equal(await p.locator('.pw-home-purchase').count(),5);assert.equal(await p.locator('.pw-home-purchase-note').count(),0);assert.equal(await p.locator('.pw-home-legend-value').count(),0);
  for(const item of [d.donut.segments[0]]){
   await p.locator(`.pw-home-legend-row[data-purchase="${item.id}"] button`).click();await ready(p);
   const route=await p.evaluate(()=>PWNavigation.current());assert.equal(route.screen,'record');assert.equal(route.stage,item.sourceIndex===null?'list':'detail');
   if(item.sourceIndex!==null){assert.equal(route.sourceIndex,item.sourceIndex);assert.match(await p.locator('.pw-record-detail-panel').innerText(),/문구 세트/);assert.match(await p.locator('.pw-record-detail-money').innerText(),/5,000/);}
   await p.locator('.pw-nav-item[data-screen="home"]').click();await ready(p);
  }
  await p.locator('.pw-home-habit [data-action="habit"]').click();await ready(p);assert.equal(await p.locator('.pw-record[data-stage="list"]').count(),1);
  const seen=new Set();do {for(const id of await p.locator('.pw-record-row-button').evaluateAll(ns=>ns.map(n=>Number(n.dataset.sourceIndex))))seen.add(id);if(await p.getByRole('button',{name:'다음',exact:true}).isDisabled())break;await p.getByRole('button',{name:'다음',exact:true}).click();await ready(p);}while(true);
  assert(d.donut.items.every(item=>seen.has(item.sourceIndex)),'All weekly purchases reachable through title arrow');
  await p.locator('.pw-nav-item[data-screen="home"]').click();await ready(p);await p.mouse.move(1,1);
  await p.screenshot({path:path.join(out,'screenshots',engine+'-final-demo.png')});await c.close();
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
    if(name==='over-budget') assert.equal(await current.page.locator('.pw-home-donut-value').innerText(),'4,000원');
    await current.page.screenshot({path:path.join(out,'screenshots',engine+'-'+name+'.png')});await unchanged(current);await current.context.close();current=null;
  }
  report.checks.push(engine+' exact allowance arc, blue dot/segment identity, purchase detail/list routing, crown headroom, matching scores with character/plot separation and no bubble or score label, price-free five names and seven edge states');
  await browser.close();browser=null;
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1;}finally{await current?.context.close();await browser?.close();t.save(out,report);}})();
