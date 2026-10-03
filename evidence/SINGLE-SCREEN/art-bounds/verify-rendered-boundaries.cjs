const { chromium, webkit }=require('/Users/jeonghu/node_modules/playwright');
const fs=require('fs'),path=require('path'),vm=require('vm');
const project='/Users/jeonghu/포켓WON',out=path.join(project,'evidence/SINGLE-SCREEN/art-bounds');
const snapshot=fs.readFileSync(path.join(project,'preservation/PW-WOORI-01/original-index.html.txt'),'utf8');
const base=JSON.parse(JSON.stringify(vm.runInNewContext('('+snapshot.match(/const defaultState = (\{[\s\S]*?\n        \});/)[1]+')')));
const fixture={...base,goal:{title:'새 자전거',current:42000,target:100000,extra:'keep'},monthly:{...base.monthly,goal:100000}};
const sources=JSON.parse(fs.readFileSync(path.join(out,'source-alpha.json'),'utf8'));
const runs=JSON.parse(fs.readFileSync(path.join(out,'alpha-runs.json'),'utf8'));
const report={startedAt:new Date().toISOString(),method:'All alpha>0 pixels from every original 384x384 atlas cell and poster. Union projected through rendered player layer; per-row alpha runs test text intersections. Results include success union. Assigned card/panel containment allows 1 CSS px.',cases:[],findings:[],errors:[],screenshots:[]};
const executable=e=>'/Users/jeonghu/Library/Caches/ms-playwright/'+(e==='chromium'?'chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell':'webkit-2287/pw_run.sh');
const viewports=[[320,568],[360,640],[375,667],[390,844],[393,852],[412,915],[430,932]];
async function navTo(p,id){if(['home','record','all'].includes(id)){await p.locator(`.pw-nav-item[data-screen="${id}"]`).click();return;}await p.locator('.pw-nav-item[data-screen="all"]').click();await p.locator(`.pw-all-item[data-screen="${id}"]`).click();}
async function next(p){await p.locator('dialog[open]').getByRole('button',{name:'다음',exact:true}).click();}
function artRect(rect,b){return {left:rect.left+b[0]/384*rect.width,top:rect.top+b[1]/384*rect.height,right:rect.left+b[2]/384*rect.width,bottom:rect.top+b[3]/384*rect.height};}
function overlapPixels(profile,player,text){
 // Exclude only intersections within the accepted 1px edge tolerance.
 const left=(text.left+1-player.left)/player.width*384,right=(text.right-1-player.left)/player.width*384;
 const top=(text.top+1-player.top)/player.height*384,bottom=(text.bottom-1-player.top)/player.height*384;
 if(right<=left||bottom<=top)return false;
 for(let y=Math.max(0,Math.floor(top));y<Math.min(384,Math.ceil(bottom));y++)for(const [start,end] of runs[profile][y])if(end>left&&start<right)return true;
 return false;
}
async function inspect(p,engine,viewport,safe,screen){
 await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const data=await p.evaluate(()=>{
  const rect=n=>{const r=n.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const allocation='.pw-home-card,.pw-home-hero,.pw-all-item,.pw-record-summary,.pw-goal-hero,.pw-report-content > section,.pw-record-result-panel,.pw-goal-result';
  return [...document.querySelectorAll('.pw-content .pw-sprite')].filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(n).display!=='none';}).map(n=>{
   const panel=n.closest(allocation),walker=document.createTreeWalker(panel||document.querySelector('.pw-content'),NodeFilter.SHOW_TEXT),texts=[];
   while(walker.nextNode()){
    const t=walker.currentNode,el=t.parentElement;if(!t.textContent.trim()||el.closest('[aria-hidden="true"],.pw-sr-only')||!el.getClientRects().length||getComputedStyle(el).visibility==='hidden')continue;
    const range=document.createRange();range.selectNodeContents(t);
    for(const r of range.getClientRects())if(r.width>1&&r.height>1)texts.push({text:t.textContent.trim().slice(0,100),class:el.className,rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}});
   }
   const pr=rect(n),poster=n.querySelector('.pw-sprite-poster'),layer=n.querySelector('.pw-sprite-frames');
   return{profile:n.dataset.sprite,clip:n.dataset.spriteClip||null,state:n.dataset.spriteState,player:pr,layer:rect(layer),poster:rect(poster),posterNatural:[poster.naturalWidth,poster.naturalHeight],allocation:panel?.className||null,panel:panel?rect(panel):null,isResult:!!n.closest('.pw-record-result,.pw-goal[data-stage="result"]'),texts};
  });
 });
 const scene={engine,viewport,safe,screen,sprites:[],findings:[]};
 for(const sprite of data){
  const profiles=[sprite.profile,...(sprite.isResult?['success']:[])];const bounds=[Math.min(...profiles.map(p=>sources.profiles[p].bounds[0])),Math.min(...profiles.map(p=>sources.profiles[p].bounds[1])),Math.max(...profiles.map(p=>sources.profiles[p].bounds[2])),Math.max(...profiles.map(p=>sources.profiles[p].bounds[3]))];
  const opaque=artRect(sprite.layer,bounds),failures=[];
  if(!sprite.panel)failures.push({type:'missing-allocation'});
  else if(opaque.left<sprite.panel.left-1||opaque.top<sprite.panel.top-1||opaque.right>sprite.panel.right+1||opaque.bottom>sprite.panel.bottom+1)failures.push({type:'opaque-outside-allocated-card',overflow:{left:sprite.panel.left-opaque.left,top:sprite.panel.top-opaque.top,right:opaque.right-sprite.panel.right,bottom:opaque.bottom-sprite.panel.bottom}});
  const collisions=sprite.texts.filter(text=>profiles.some(profile=>overlapPixels(profile,sprite.layer,text.rect)));
  if(collisions.length)failures.push({type:'opaque-intersects-label-or-financial-text',collisions});
  const entry={profile:sprite.profile,testedProfiles:profiles,clip:sprite.clip,state:sprite.state,allocation:sprite.allocation,player:sprite.player,layer:sprite.layer,poster:sprite.poster,posterNatural:sprite.posterNatural,opaque,panel:sprite.panel,textRangesTested:sprite.texts.length,findings:failures};scene.sprites.push(entry);
  for(const failure of failures)scene.findings.push({profile:sprite.profile,allocation:sprite.allocation,opaque,panel:sprite.panel,...failure});
 }
 report.cases.push(scene);if(scene.findings.length)report.findings.push({engine,viewport,safe,screen,findings:scene.findings});
 if(scene.findings.length||(viewport[0]===320&&safe[0]===20&&['home','record-result','goal-result'].includes(screen))){const filename=`${engine}-${viewport.join('x')}-safe${safe.join('-')}-${screen}.png`;await p.screenshot({path:path.join(out,filename)});report.screenshots.push(filename);}
 if(scene.findings.length)console.log('FINDING',engine,viewport.join('x'),safe.join('/'),screen,JSON.stringify(scene.findings));
 return scene;
}
async function run(engine){
 const browser=await({chromium,webkit}[engine]).launch({executablePath:executable(engine),headless:true});
 for(const viewport of viewports)for(const safe of [[0,0],[20,34]]){
  const ctx=await browser.newContext({viewport:{width:viewport[0],height:viewport[1]},reducedMotion:'reduce',locale:'ko-KR',timezoneId:'Asia/Seoul'});
  await ctx.addInitScript(({state,safe})=>{localStorage.setItem('pocketwon_demo_v1',JSON.stringify(state));document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.setProperty('--pw-safe-top',safe[0]+'px');document.documentElement.style.setProperty('--pw-safe-bottom',safe[1]+'px');});},{state:fixture,safe});
  const p=await ctx.newPage();p.on('pageerror',e=>report.errors.push({engine,viewport,safe,error:e.message}));await p.goto('http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html');await p.evaluate(()=>document.fonts.ready);
  for(const screen of ['home','record','goal','report','all']){await navTo(p,screen);await inspect(p,engine,viewport,safe,screen);if(screen==='report')for(const segment of ['flow','goal']){await p.locator(`.pw-report-tab[data-segment="${segment}"]`).click();await inspect(p,engine,viewport,safe,'report-'+segment);}}
  await navTo(p,'goal');await p.getByRole('button',{name:'목표 수정',exact:true}).click();await p.locator('#pw-goal-title').fill('새 목표');await next(p);await p.locator('#pw-goal-target').fill('120000');await next(p);await p.getByRole('button',{name:'목표 저장',exact:true}).click();await inspect(p,engine,viewport,safe,'goal-result');
  await navTo(p,'record');await p.getByRole('button',{name:'새 기록 추가',exact:true}).click();await p.locator('dialog[open]').getByText('받은 돈',{exact:true}).click();await next(p);await p.locator('#pw-record-amount').fill('1000');await next(p);await p.getByRole('button',{name:'건너뛰기',exact:true}).click();await p.getByRole('button',{name:'기록 저장',exact:true}).click();await inspect(p,engine,viewport,safe,'record-result');
  await ctx.close();console.log('CONTEXT',engine,viewport.join('x'),'safe'+safe.join('/'));
 }
 await browser.close();
}
(async()=>{await Promise.all([run('chromium'),run('webkit')]);report.completedAt=new Date().toISOString();report.status=report.findings.length||report.errors.length?'FAIL':'PASS';report.summary={scenes:report.cases.length,sprites:report.cases.reduce((sum,c)=>sum+c.sprites.length,0),findings:report.findings.length,pageErrors:report.errors.length};fs.writeFileSync(path.join(out,'rendered-boundaries.json'),JSON.stringify(report,null,2));console.log('COMPLETE',report.status,JSON.stringify(report.summary));})().catch(e=>{report.fatal=e.message;fs.writeFileSync(path.join(out,'rendered-boundaries.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1});
