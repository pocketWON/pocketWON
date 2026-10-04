/* Real viewport bounds, route-stable navigation, and isolated public demo checks. */
const { launch, ready, fs, path, assert } = require('./product-test-utils.cjs');
const out = path.resolve(process.env.PW_EVIDENCE_ROOT || 'evidence/FULLSCREEN-DEMO/verification');
fs.mkdirSync(out, { recursive:true });
const report = { status:'RUNNING', geometry:[], errors:[] };
const url = 'http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html';
async function geometry(page, name, baseline) {
  await ready(page); await page.waitForTimeout(60);
  const result = await page.evaluate(() => {
    const rect = n => { const r=n.getBoundingClientRect(); return [r.x,r.y,r.width,r.height].map(v=>+v.toFixed(2)); };
    const nav=document.querySelector('.pw-bottom-navigation'),root=document.querySelector('.pw-content>.pw-screen');
    const arch=getComputedStyle(nav,'::before'),archTop=nav.getBoundingClientRect().top+parseFloat(arch.top),limit=archTop-8;
    const controls=[...root.querySelectorAll('button,input,select,summary')].filter(n=>n.getClientRects().length);
    const outside=controls.filter(n=>{const r=n.getBoundingClientRect();return r.top<-.5||r.bottom>limit+1||r.left<-.5||r.right>innerWidth+.5;}).map(n=>n.textContent||n.getAttribute('aria-label'));
    const scrollers=[...root.querySelectorAll('*')].filter(n=>n.getClientRects().length&&/auto|scroll/.test(getComputedStyle(n).overflowY)&&n.scrollHeight>n.clientHeight+2&&!['TEXTAREA','INPUT'].includes(n.tagName)).map(n=>n.className);
    return { nav:rect(nav),buttons:[...nav.querySelectorAll('button')].map(rect),arch:{top:archTop,width:parseFloat(arch.width),height:parseFloat(arch.height),clearance:archTop-document.querySelector('.pw-content').getBoundingClientRect().bottom},outside,scrollers,document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],viewport:[innerWidth,innerHeight],scale:root.dataset.viewportScale||'1' };
  });
  report.geometry.push({name,...result});
  if(result.outside.length||result.scrollers.length||result.document.some((v,i)=>v>result.viewport[i]+1))report.errors.push({name,...result});
  if(baseline)assert.deepEqual([result.nav,result.buttons],[baseline.nav,baseline.buttons],name+' navigation changed');
  assert.equal(result.nav[3],84,name+' fixed navigation height');
  assert(result.arch.clearance>=7.5,name+' content clears raised arch');
  assert.equal(result.arch.width,80,name+' arch width');
  assert.equal(result.arch.height,40,name+' semicircle height');
  const logo=result.buttons[2];
  assert.deepEqual(logo.slice(2),[60,60],name+' original logo button size');
  assert.equal(logo[1],result.nav[1]-14,name+' raised logo position');
  assert(Math.abs(logo[0]+logo[2]/2-(result.nav[0]+result.nav[2]/2))<.5,name+' centered logo');
  return result;
}
(async()=>{let browser;
  try {
    for(const engine of ['chromium','webkit']) {
      browser=await launch(engine);
      for(const [width,height] of [[320,568],[360,640],[375,667],[390,844],[430,932],[844,390],[1024,768],[1440,900]]) {
        const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();
        page.on('pageerror',e=>report.errors.push({engine,width,height,error:e.message}));
        await page.goto(url);await ready(page);
        assert.equal(await page.evaluate(()=>PWDemo.enabled),true);
        assert.match(await page.locator('.pw-home-money').innerText(),/32,000/);
        const baseline=await geometry(page,`${engine}-${width}x${height}-home`);
        for(const screen of ['report','goal','all','record','home']) {await page.evaluate(screen=>PWNavigation.go(screen),screen);await geometry(page,`${engine}-${width}x${height}-${screen}`,baseline);}
        await page.screenshot({path:path.join(out,`${engine}-${width}x${height}.png`)});
        if([390,844].includes(width)) {
          const ids=await page.evaluate(()=>Object.keys(PW_FEATURES).filter(id=>id!=='admin'));
          for(const featureId of ids){await page.evaluate(featureId=>PWNavigation.go({screen:'feature',featureId}),featureId);await geometry(page,`${engine}-${width}x${height}-${featureId}`,baseline);}
        }
        await context.close();
      }
      const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
      await page.goto(url);await page.addStyleTag({content:':root{--pw-safe-top:20px;--pw-safe-bottom:34px;--pw-safe-left:12px;--pw-safe-right:12px}'});
      let baseline=await geometry(page,engine+'-safe-home');
      await page.evaluate(()=>PWNavigation.go('report'));await geometry(page,engine+'-safe-report',baseline);
      await page.evaluate(()=>{document.documentElement.style.fontSize='32px';PWNavigation.go('home');});
      baseline=await geometry(page,engine+'-large-type-home');
      await page.evaluate(()=>PWNavigation.go('report'));await geometry(page,engine+'-large-type-report',baseline);
      await context.close();await browser.close();browser=null;
    }
    assert.deepEqual(report.errors,[]);
    report.status='PASS';
  } catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1;}
  finally{await browser?.close();fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:report.geometry.length,errors:report.errors,failure:report.failure},null,2));}
})();
