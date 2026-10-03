const {chromium,webkit}=require('/Users/jeonghu/node_modules/playwright');
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const project='/Users/jeonghu/포켓WON',out=path.join(project,'evidence/SINGLE-SCREEN/accessibility-record-pager-after-focus-fix');fs.mkdirSync(out,{recursive:true});
const snapshot=fs.readFileSync(path.join(project,'preservation/PW-WOORI-01/original-index.html.txt'),'utf8');const base=JSON.parse(JSON.stringify(vm.runInNewContext('('+snapshot.match(/const defaultState = (\{[\s\S]*?\n        \});/)[1]+')')));
const report={startedAt:new Date().toISOString(),cases:[],actions:[],findings:[],errors:[],screenshots:[]};
const MAX=String(Number.MAX_SAFE_INTEGER),memo='🚲'.repeat(50),money=new Intl.NumberFormat('ko-KR').format(Number.MAX_SAFE_INTEGER)+'원';
const executable=e=>'/Users/jeonghu/Library/Caches/ms-playwright/'+(e==='chromium'?'chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell':'webkit-2287/pw_run.sh');
const settle=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function check(p,engine,mode,type,label){
 await settle(p);const data=await p.evaluate(()=>{
  const root=document.querySelector('dialog[open]')||document.querySelector('.pw-record'),clip=[];
  for(const n of root.querySelectorAll('button,input,label,p,span,h2,h3')){
   const r=n.getBoundingClientRect();if(r.width<3||r.height<3||!n.textContent&&!n.matches('input')||n.closest('.pw-sprite,.pw-illustration-panel,.pw-sr-only'))continue;
   if(n.matches('.pw-record-row-title,.pw-record-row-date,.pw-record-row-money'))continue;
   for(let a=n.parentElement;a&&a!==document.body;a=a.parentElement){const s=getComputedStyle(a),ar=a.getBoundingClientRect();if(['hidden','clip'].includes(s.overflowX)&&(r.left<ar.left-1||r.right>ar.right+1)||['hidden','clip'].includes(s.overflowY)&&(r.top<ar.top-1||r.bottom>ar.bottom+1)){clip.push({type:'clipped',class:n.className,text:n.textContent?.slice(0,80),ancestor:a.className});break;}}
   if(n.matches('button'))for(const text of n.childNodes){if(text.nodeType!==Node.TEXT_NODE||!text.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(text);for(const tr of range.getClientRects())if(tr.left<r.left-1||tr.right>r.right+1||tr.top<r.top-1||tr.bottom>r.bottom+1)clip.push({type:'button-text-overflow',text:text.textContent,class:n.className});}
  }
  const pager=root.querySelector('.pw-record-confirm-summary'),page=pager?.querySelector('.pw-text-page');
  return{accessible:document.documentElement.classList.contains('pw-accessible'),rootFont:getComputedStyle(document.documentElement).fontSize,doc:[innerWidth,innerHeight,document.documentElement.scrollWidth,document.documentElement.scrollHeight],dialog:root.matches('dialog')?[root.clientWidth,root.clientHeight,root.scrollWidth,root.scrollHeight,root.scrollTop]:null,pager:page?[page.clientWidth,page.clientHeight,page.scrollWidth,page.scrollHeight]:null,clip};
 });
 const unreachable=[];const controls=p.locator('dialog[open] button,dialog[open] input[type="text"],.pw-record button').filter({visible:true});
 for(let i=0;i<await controls.count();i++){const n=controls.nth(i);if(await n.isDisabled()||await p.locator('dialog[open]').count()&&!await n.evaluate(e=>!!e.closest('dialog')))continue;try{await n.scrollIntoViewIfNeeded({timeout:1000});await n.focus();const reach=await n.evaluate(e=>{const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);return{label:e.getAttribute('aria-label')||e.textContent||e.id,visible:x>=0&&x<=innerWidth&&y>=0&&y<=innerHeight,hit:hit===e||e.contains(hit)};});if(!reach.visible||!reach.hit)unreachable.push(reach);}catch(e){unreachable.push({error:e.message.slice(0,80)});}}
 data.unreachable=unreachable;const item={engine,mode,type,label,data};report.cases.push(item);if(data.clip.length||unreachable.length||data.doc[2]>data.doc[0]+1||data.dialog&&data.dialog[2]>data.dialog[0]+1||data.pager&&(data.pager[2]>data.pager[0]+1||data.pager[3]>data.pager[1]+1))report.findings.push(item);
 const filename=`${engine}-${mode}-${type}-${label}.png`;await p.screenshot({path:path.join(out,filename),fullPage:!await p.locator('dialog[open]').count()});report.screenshots.push(filename);
}
async function wrap(p,engine,mode,type,label){
 const save=p.getByRole('button',{name:'기록 저장',exact:true}),back=p.getByRole('button',{name:'이전 단계',exact:true});
 await save.focus();await p.keyboard.press('Tab');let forward=await p.evaluate(()=>{const e=document.activeElement,r=e.getBoundingClientRect();return{label:e.getAttribute('aria-label')||e.textContent,rect:{top:r.top,bottom:r.bottom},visible:r.top>=0&&r.bottom<=innerHeight,scrollTop:e.closest('dialog')?.scrollTop};});
 await back.focus();await p.keyboard.press('Shift+Tab');let reverse=await p.evaluate(()=>{const e=document.activeElement,r=e.getBoundingClientRect();return{label:e.getAttribute('aria-label')||e.textContent,rect:{top:r.top,bottom:r.bottom},visible:r.top>=0&&r.bottom<=innerHeight,scrollTop:e.closest('dialog')?.scrollTop};});
 const a={engine,mode,type,label,forward,reverse};report.actions.push(a);if(!forward.visible||!reverse.visible){report.findings.push({type:'focus-wrap-offscreen',...a});console.log('WRAP FINDING',JSON.stringify(a));}
}
async function pages(p,engine,mode,type,label){
 const pager=p.locator('.pw-record-confirm-summary'),next=pager.getByRole('button',{name:'다음',exact:true}),prev=pager.getByRole('button',{name:'이전',exact:true});
 while(await prev.isVisible()&&!await prev.isDisabled())await prev.click();await settle(p);let content='',count=0;
 do{content+=await pager.locator('.pw-text-page').textContent();count++;if(!await next.isVisible()||await next.isDisabled())break;await next.click();await settle(p);assert(count<80,'infinite pages');}while(true);
 const expected=[['종류',type==='in'?'받은 돈':'쓴 돈'],['금액',money],['분류',type==='in'?'용돈':'교통'],['메모',memo]].map(([k,v])=>`${k}: ${v}`).join('\n');assert.equal(content,expected,'Every exact summary character must remain accessible');report.actions.push({engine,mode,type,label,pages:count,characters:Array.from(content).length,exactMatch:true});
 if(count>1){await prev.click();await settle(p);assert.equal(await pager.locator('.pw-text-page').textContent().then(t=>content.includes(t)),true);}
 await check(p,engine,mode,type,label);
}
async function run(engine){
 const browser=await({chromium,webkit}[engine]).launch({executablePath:executable(engine),headless:true});
 for(const [mode,viewport,font] of [['text200',{width:320,height:568},32],['zoomFallback',{width:480,height:360},16],['text200Landscape',{width:480,height:360},32]])for(const type of ['out','in']){
  const state={...base,balance:type==='out'?Number.MAX_SAFE_INTEGER:0,monthly:{...base.monthly,saving:0,spending:0},transactions:[]};
  const ctx=await browser.newContext({viewport,reducedMotion:'reduce',locale:'ko-KR',timezoneId:'Asia/Seoul'});await ctx.addInitScript(({state,font})=>{const set=Storage.prototype.setItem;set.call(localStorage,'pocketwon_demo_v1',JSON.stringify(state));window.__fail=false;window.__writes=0;Storage.prototype.setItem=function(...a){if(window.__fail)throw Error('quota');window.__writes++;return set.apply(this,a);};document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize=font+'px';document.documentElement.style.setProperty('--pw-safe-top','20px');document.documentElement.style.setProperty('--pw-safe-bottom','34px');});},{state,font});
  const p=await ctx.newPage();p.on('pageerror',e=>report.errors.push({engine,mode,type,error:e.message}));await p.goto('http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html');await p.locator('.pw-nav-item[data-screen="record"]').click();await p.getByRole('button',{name:'새 기록 추가',exact:true}).click();await p.locator('dialog[open]').getByText(type==='out'?'쓴 돈':'받은 돈',{exact:true}).click();const stepNext=()=>p.locator('.pw-flow-footer').getByRole('button',{name:'다음',exact:true}).click();await stepNext();await p.locator('#pw-record-amount').fill(MAX);await stepNext();if(type==='out'){await p.locator('dialog[open]').getByText('교통',{exact:true}).click();await stepNext();}await p.locator('#pw-record-memo').fill(memo);await stepNext();
  await wrap(p,engine,mode,type,'initial-confirm');await pages(p,engine,mode,type,'confirm');
  await p.getByRole('button',{name:'이전 단계',exact:true}).click();assert.equal(await p.locator('#pw-record-memo').inputValue(),memo);await stepNext();await pages(p,engine,mode,type,'confirm-return');assert.equal(await p.evaluate(()=>window.__writes),0);
  await p.evaluate(()=>window.__fail=true);await p.getByRole('button',{name:'기록 저장',exact:true}).click();await check(p,engine,mode,type,'quota-error');assert.match(await p.locator('#pw-record-save-error').textContent(),/저장하지 못/);assert.equal(await p.evaluate(()=>window.__writes),0);await wrap(p,engine,mode,type,'quota-error');
  await p.getByRole('button',{name:'이전 단계',exact:true}).click();assert.equal(await p.locator('#pw-record-memo').inputValue(),memo);await stepNext();await pages(p,engine,mode,type,'retry-confirm');await p.evaluate(()=>window.__fail=false);await p.getByRole('button',{name:'기록 저장',exact:true}).click();assert.equal(await p.locator('dialog[open]').count(),0);assert.equal(await p.evaluate(()=>window.__writes),1);await check(p,engine,mode,type,'result');await p.getByRole('button',{name:'기록 내역 보기',exact:true}).click();await p.getByRole('button',{name:'새 기록 추가',exact:true}).click();await p.getByRole('button',{name:'돈 기록하기 닫기',exact:true}).click();assert.equal(await p.locator('dialog[open]').count(),0);assert.equal(await p.evaluate(()=>document.activeElement?.classList.contains('pw-record-add')),true);report.actions.push({engine,mode,type,label:'save-retry-result-cancel-focus',passed:true});
  await ctx.close();console.log('CONTEXT',engine,mode,type);
 }
 await browser.close();
}
(async()=>{await Promise.all([run('chromium'),run('webkit')]);report.completedAt=new Date().toISOString();report.status=report.findings.length||report.errors.length?'FAIL':'PASS';fs.writeFileSync(path.join(out,'read-only-findings.json'),JSON.stringify(report,null,2));console.log('COMPLETE',report.status,report.cases.length,'cases',report.findings.length,'findings',report.errors.length,'errors');})().catch(e=>{report.fatal=e.message;fs.writeFileSync(path.join(out,'read-only-findings.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1});
