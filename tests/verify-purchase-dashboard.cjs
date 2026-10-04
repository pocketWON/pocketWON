/* Purchase chart, ranking, spend colors and interaction checks in isolated browser contexts. */
const t = require('./product-test-utils.cjs');
const {assert,fs,path,launch,setup,ready,unchanged}=t;
const out=t.output('purchase-dashboard'),report={status:'RUNNING',checks:[],geometry:[]};
const date=new Date('2026-10-04T14:59:00Z');
const transaction=(amount,type='out',memo='문구 세트',day=4)=>({amount,type,memo,category:type==='in'?'용돈':'문구',ts:`2026-10-0${day}T10:00:00+09:00`});
const state=transactions=>({balance:32000,monthly:{saving:50000,spending:18000},goal:{title:'책',target:100000,current:45000},transactions});
async function arcPoint(page,id){return page.locator(`[data-purchase="${id}"][role="button"]`).evaluate(n=>{const r=n.ownerSVGElement.getBoundingClientRect(),angle=(-.25+Number(n.dataset.offset)+Number(n.dataset.fraction)/2)*2*Math.PI;return {x:r.left+r.width*(60+46*Math.cos(angle))/120,y:r.top+r.height*(60+46*Math.sin(angle))/120};});}
async function arcAppearance(page,name){
  const styles=await page.locator('.pw-home-donut-chart [role="button"]').evaluateAll(ns=>ns.map(n=>{const s=getComputedStyle(n);return {id:n.dataset.purchase,active:n.dataset.active,focused:n===document.activeElement,outline:s.outlineStyle,shadow:s.boxShadow,filter:s.filter,width:parseFloat(s.strokeWidth),tap:s.webkitTapHighlightColor};}));
  for(const style of styles){
    assert.equal(style.outline,'none',name+' unexpected arc outline');
    assert.equal(style.shadow,'none',name+' rectangular focus shadow');
    assert.equal(style.filter,'none',name+' unexpected arc glow');
    assert.equal(style.width,22,name+' arc thickness changed');
    assert.equal(style.tap,'rgba(0, 0, 0, 0)',name+' native tap highlight');
  }
  (report.arcStyles ||= []).push({name,styles});
}
async function layout(p,name){
  await ready(p);
  const g=await p.evaluate(()=>{
    const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const donut=rect(document.querySelector('.pw-home-donut'));
    const plot=document.querySelector('.pw-home-weekly-plot');
    return {donut,weeklyBody:rect(document.querySelector('.pw-home-weekly-body')),weeklyCard:rect(document.querySelector('.pw-home-weekly')),bars:[...plot.querySelectorAll('.pw-home-weekly-bar')].map(rect),chartText:[...plot.querySelectorAll('.pw-home-weekly-value,.pw-home-weekly-date')].map(rect),habit:rect(document.querySelector('.pw-home-habit')),plot:rect(plot),nav:rect(document.querySelector('.pw-bottom-navigation')),
      days:[...plot.querySelectorAll('.pw-home-weekly-day')].map(n=>{const bar=n.querySelector('.pw-home-weekly-bar'),label=n.querySelector('.pw-home-weekly-value');return {value:bar.dataset.value??null,color:getComputedStyle(bar).backgroundColor,label:label.textContent,labelBox:rect(label),column:rect(n)};})};
  });
  report.geometry.push({name,...g});
  assert.equal(g.nav.height,84);
  assert.equal(await p.locator('.pw-home-score,.pw-home-insight--positive').count(),0);
  assert.equal(await p.locator('.pw-home-ranking').count(),1);
  assert.equal(await p.locator('.pw-home-weekly-reaction,.pw-home-weekly-score,.pw-home-weekly-art,.pw-home-weekly .pw-sprite,.pw-home-weekly-bubble,.pw-home-weekly-music').count(),0);
  assert(Math.abs(g.plot.left-g.weeklyBody.left)<1 && Math.abs(g.plot.right-g.weeklyBody.right)<1,name+' weekly chart must fill card content width');
  assert.equal(g.bars.length,7);
  for(const glyph of g.chartText) assert(glyph.left>=g.weeklyCard.left && glyph.right<=g.weeklyCard.right && glyph.top>=g.plot.top-1 && glyph.bottom<=g.weeklyCard.bottom,name+' weekly chart text clipping');
  for(let i=1;i<g.bars.length;i++) assert(Math.abs((g.bars[i].left-g.bars[i-1].left)-g.plot.width/7)<1,name+' bars must be equally spaced');
  assert(Math.abs(g.donut.width-g.donut.height)<1 && Math.abs((g.donut.left+g.donut.right)-(g.habit.left+g.habit.right))<2,name+' donut is not round and centered');
  assert.equal(await p.locator('.pw-home-legend,.pw-home-purchase').count(),0);
  assert.equal(await p.locator('.pw-home-weekly-crown,.pw-home-weekly-bar--highlight').count(),0);
  const known=g.days.filter(d=>d.value!==null).sort((a,b)=>Number(a.value)-Number(b.value));
  for(const day of g.days){
    assert.equal(day.label,day.value===null?'—':(Number(day.value)>0?'-':'')+Number(day.value).toLocaleString('ko-KR')+'원',name+' exact won label');
    assert(day.labelBox.left>=day.column.left&&day.labelBox.right<=day.column.right,name+' adjacent amount labels overlap');
  }
  for(let i=0;i<known.length;i++){
    const rgb=known[i].color.match(/\d+/g).map(Number);
    assert(rgb[2]>=230&&rgb[1]>=150&&rgb[2]>rgb[1]&&rgb[1]>rgb[0],name+' palette must stay bright blue');
    if(i){
      const previous=known[i-1].color.match(/\d+/g).map(Number);
      assert(rgb.every((c,j)=>c<=previous[j]),name+' more spend must have a deeper blue');
      if(known[i].value===known[i-1].value)assert.equal(known[i].color,known[i-1].color,name+' equal spend must share a color, even today');
    }
  }
}
(async()=>{let browser,current;try{
 for(const engine of ['chromium','webkit']){
  browser=await launch(engine);
  const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await c.newPage();
  await p.goto('http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html');await ready(p);await layout(p,engine+'-demo');
  assert.equal(await p.locator('.pw-home-insights-heading,.pw-home-insights h2').count(),0);assert.equal(await p.locator('.pw-home-overview > .pw-home-weekly,.pw-home-overview > .pw-home-insights').count(),2);assert.equal(await p.locator('.pw-home-score-label').count(),0);
  for(const [width,height] of [[320,568],[390,844],[844,390]]){await p.setViewportSize({width,height});await layout(p,engine+'-demo-'+width);}
  await p.setViewportSize({width:390,height:844});await ready(p);
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
   await arcAppearance(p,engine+'-hover-'+item.id);
  }
  await p.mouse.move(1,1);await ready(p);assert.equal(await p.locator('.pw-home-donut-value').innerText(),'50,000원');
  const first=d.donut.items[0],q=await point(first.id);
  await p.mouse.click(q.x,q.y);await p.mouse.move(1,1);await ready(p);
  assert.equal(await p.locator('.pw-home-donut-center').getAttribute('data-purchase'),first.id,'clicked selection must persist');
  await arcAppearance(p,engine+'-selected');
  await p.screenshot({path:path.join(out,'screenshots',engine+'-purchase-selected.png')});
  const firstArc=p.locator(`.pw-home-donut-segment[data-purchase="${first.id}"]`);
  await firstArc.focus();await p.keyboard.press('ArrowRight');await ready(p);assert.equal(await p.locator('.pw-home-donut-label').innerText(),d.donut.items[1].label);
  await arcAppearance(p,engine+'-keyboard-focus');
  await p.screenshot({path:path.join(out,'screenshots',engine+'-purchase-focused.png')});
  await p.keyboard.press('End');await ready(p);assert.equal(await p.locator('.pw-home-donut-label').innerText(),'남은 용돈');assert.equal(await p.locator('.pw-home-donut-value').innerText(),'32,000원');
  await arcAppearance(p,engine+'-remaining-focus');
  await p.keyboard.press('Escape');await ready(p);assert.equal(await p.locator('.pw-home-donut-value').innerText(),'50,000원');
  await p.mouse.click(q.x,q.y);await p.locator('.pw-home-donut-center').click();await ready(p);
  const route=await p.evaluate(()=>PWNavigation.current());assert.equal(route.screen,'record');assert.equal(route.stage,'detail');assert.equal(route.sourceIndex,first.sourceIndex);
  assert.match(await p.locator('.pw-record-detail-money').innerText(),/5,000/);
  await p.locator('.pw-nav-item[data-screen="home"]').click();await ready(p);
  assert.equal(await p.locator('.pw-home-weekly-crown').count(),0);
  await p.locator('.pw-home-habit [data-action="habit"]').click();await ready(p);assert.equal(await p.locator('.pw-record[data-stage="list"]').count(),1);
  const seen=new Set();do {for(const id of await p.locator('.pw-record-row-button').evaluateAll(ns=>ns.map(n=>Number(n.dataset.sourceIndex))))seen.add(id);if(await p.getByRole('button',{name:'다음',exact:true}).isDisabled())break;await p.getByRole('button',{name:'다음',exact:true}).click();await ready(p);}while(true);
  assert(d.donut.items.every(item=>seen.has(item.sourceIndex)),'All weekly purchases reachable through card title');
  await p.locator('.pw-nav-item[data-screen="home"]').click();await ready(p);await p.mouse.move(1,1);
  await p.screenshot({path:path.join(out,'screenshots',engine+'-final-demo.png')});await c.close();
  const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),touchPage=await touch.newPage();
  await touchPage.goto('http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html');await ready(touchPage);
  const touchPoint=await arcPoint(touchPage,first.id);
  await touchPage.touchscreen.tap(touchPoint.x,touchPoint.y);await ready(touchPage);
  assert.equal(await touchPage.locator('.pw-home-donut-label').innerText(),first.label);
  assert.equal(await touchPage.locator('.pw-home-donut-value').innerText(),'−5,000원');
  await arcAppearance(touchPage,engine+'-touch-selected');
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
    assert.equal(await current.page.locator('.pw-home-ranking').getAttribute('data-status'),'unavailable');
    assert.equal(await current.page.locator('.pw-home-ranking-person').count(),0);
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
  report.checks.push(engine+' exact individual purchase arcs, hover/click/touch/keyboard/remaining details without focus boxes, detail/list routing, full weekly won labels, no crown, monotonic bright blue spend colors, and seven edge states');
  await browser.close();browser=null;
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1;}finally{await current?.context.close();await browser?.close();t.save(out,report);}})();
