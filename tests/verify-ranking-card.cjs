/* Podium fit, demo/live separation, and keyboard access in isolated contexts. */
const {launch,ready,fs,path,assert}=require('./product-test-utils.cjs');
const out=path.resolve(process.env.PW_EVIDENCE_ROOT||'evidence/RANKING-CARD/layout');
fs.mkdirSync(out,{recursive:true});
const report={status:'RUNNING',geometry:[],checks:[],errors:[]};
const url='http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html';
async function measure(page,name){
  await ready(page);
  const g=await page.evaluate(()=>{
    const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    return {panel:rect(document.querySelector('.pw-home-ranking')),
      people:[...document.querySelectorAll('.pw-home-ranking-person')].map(n=>({rank:+n.dataset.rank,box:rect(n),avatar:rect(n.querySelector('.pw-home-ranking-avatar')),medal:rect(n.querySelector('svg')),name:rect(n.querySelector('.pw-home-ranking-name'))})),
      advice:rect(document.querySelector('.pw-home-insight--advice')),adviceCopy:rect(document.querySelector('.pw-home-insight--advice .pw-home-insight-body')),
      nav:rect(document.querySelector('.pw-bottom-navigation')),scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],viewport:[innerWidth,innerHeight]};
  });
  report.geometry.push({name,...g});
  assert.equal(await page.locator('.pw-home-ranking-title,.pw-home-ranking-top').count(),0);
  const contains=(parent,child)=>child.x>=parent.x-1&&child.right<=parent.right+1&&child.y>=parent.y-1&&child.bottom<=parent.bottom+1;
  assert.deepEqual(g.people.map(p=>p.rank),[2,1,3],name+' podium order');
  for(const p of g.people){
    assert(Math.abs(p.avatar.width-p.avatar.height)<1,name+' stretched avatar');
    assert(contains(g.panel,p.box)&&contains(p.box,p.avatar)&&contains(p.box,p.name)&&contains(p.box,p.medal),name+' podium clipping');
    assert(p.medal.y>=g.panel.y&&p.avatar.y>=p.medal.bottom&&p.name.y>=p.avatar.bottom,name+' medal, avatar or name overlap');
  }
  const [second,first,third]=g.people;
  assert(first.avatar.width>second.avatar.width*1.2&&first.avatar.width>third.avatar.width*1.2,name+' first place prominence');
  assert(first.avatar.y<second.avatar.y&&first.avatar.y<third.avatar.y,name+' raised first place');
  assert(second.box.right<=first.box.x&&first.box.right<=third.box.x,name+' adjacent profiles overlap');
  assert(contains(g.advice,g.adviceCopy),name+' advice copy clipped');
  assert.equal(g.nav.height,84);assert(g.panel.bottom<=g.nav.y+1,name+' navigation overlap');
  assert(g.scroll.every((size,i)=>size<=g.viewport[i]+1),name+' document overflow');
  await page.screenshot({path:path.join(out,name+'.png')});
}
(async()=>{let browser;try{
  for(const engine of ['chromium','webkit']){
    browser=await launch(engine);
    const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await c.newPage();
    p.on('pageerror',e=>report.errors.push(e.message));
    await p.goto(url);await ready(p);
    for(const [width,height] of [[320,568],[360,640],[385,664],[390,844],[430,932],[667,375],[844,390],[1440,900]]){
      await p.setViewportSize({width,height});await measure(p,engine+'-'+width+'x'+height);
    }
    await p.setViewportSize({width:390,height:844});
    const safe=await p.addStyleTag({content:':root{--pw-safe-top:20px;--pw-safe-bottom:34px;--pw-safe-left:12px;--pw-safe-right:12px}'});
    await measure(p,engine+'-safe');await safe.evaluate(n=>n.remove());
    await p.evaluate(()=>{document.documentElement.style.fontSize='32px';PWNavigation.go('home');});
    await measure(p,engine+'-200-percent');
    await p.evaluate(()=>{document.documentElement.style.fontSize='';PWNavigation.go('home');});await ready(p);
    const card=p.locator('.pw-home-ranking');
    assert.match(await card.getAttribute('aria-label'),/예시.*1위 저축대장.*2위 알뜰곰.*3위 차곡펭귄/);
    await card.focus();await p.keyboard.press('Enter');await ready(p);
    assert.match(await p.locator('dialog[open]').innerText(),/닉네임과 순위는 가상/);
    for(let i=0;i<6;i++){await p.keyboard.press('Tab');assert(await p.evaluate(()=>document.querySelector('dialog[open]').contains(document.activeElement)));}
    await p.keyboard.press('Escape');await ready(p);assert(await card.evaluate(n=>n===document.activeElement));
    await card.click();await p.getByRole('button',{name:'내 습관 리포트 보기',exact:true}).click();await ready(p);
    assert.equal(await p.locator('.pw-feature').getAttribute('data-feature'),'habit-analysis');assert.equal(await p.locator('dialog[open]').count(),0);
    await p.getByRole('button',{name:'이전 화면',exact:true}).click();await ready(p);
    assert.equal(await p.locator('.pw-home-ranking-person').count(),3);
    await p.evaluate(()=>PWDemo.toggle());await ready(p);
    assert.equal(await card.getAttribute('data-status'),'unavailable');assert.equal(await p.locator('.pw-home-ranking-person').count(),0);
    assert.match(await card.innerText(),/랭킹 연동 준비 중/);
    await p.screenshot({path:path.join(out,engine+'-live-unavailable.png')});
    report.checks.push(engine+' podium order/shape/prominence, all viewport bounds, demo disclosure, focus trap/restoration, report routing, and honest live state');
    await c.close();await browser.close();browser=null;
  }
  assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1;}finally{await browser?.close();fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:report.geometry.length,checks:report.checks,failure:report.failure},null,2));}})();
