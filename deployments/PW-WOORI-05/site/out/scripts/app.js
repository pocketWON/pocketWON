/* Destinations retain their identities; child stages and drafts remain transient. */
(() => {
 const content=document.getElementById('pw-content'),context=document.getElementById('pw-header-context'),navigation=document.getElementById('pw-navigation-items');
 let currentScreen='home',currentView,currentMotion;const memory={record:{page:1},report:{segment:'habit'}};
 const navTabs=PW_TABS.filter(t=>['home','record','all'].includes(t.id));
 const buttons=navTabs.map(tab=>{const b=PWUI.button('',()=>showScreen(tab.id,true),'pw-nav-item');b.dataset.screen=tab.id;b.innerHTML=pwIcon(tab.id);b.append(PWUI.el('span','',tab.label));navigation.append(b);return b;});
 function saveUI(){if(!currentView)return;const r=currentView.element;if(currentScreen==='record'&&r.dataset.page)memory.record.page=Number(r.dataset.page);if(currentScreen==='report'&&r.dataset.segment)memory.report.segment=r.dataset.segment;}
 function mountMotion(entryMotion){currentMotion?.dispose();currentMotion=null;if(currentView&&typeof PocketWONMotion!=='undefined')currentMotion=PocketWONMotion.mount(currentView.element,{entryMotion});}
 function showScreen(target,moveFocus=false,entryMotion){
  const route=typeof target==='string'?{screen:target}:target;const tab=PW_TABS.find(t=>t.id===route?.screen);if(!tab)return;
  saveUI();currentMotion?.dispose();currentMotion=null;currentView?.dispose();currentView=null;currentScreen=tab.id;
  const opts={...(memory[tab.id]||{}),...route};const navigate=(next,motion)=>showScreen(next,true,motion);
  document.title=tab.label+' · 포켓WON';context.textContent=tab.label;
  if(tab.id==='home'){context.innerHTML='Pocket<span class="pw-brand-accent">WON</span>';context.setAttribute('aria-label','포켓WON');}else context.removeAttribute('aria-label');
  context.parentElement.querySelector('.pw-retry')?.remove();const loaded=loadPocketWONState();if(tab.id==='home'&&['invalid','unavailable'].includes(loaded.status)){const retry=PWUI.button('다시',()=>showScreen('home',true),'pw-icon-button pw-retry');retry.setAttribute('aria-label','잔액 다시 불러오기');context.parentElement.append(retry);}
  if(tab.id==='home')currentView=createHomeView(createHomeViewModel(loaded.state),navigate,loaded.status);
  if(tab.id==='record')currentView=createRecordView(loaded,navigate,opts);
  if(tab.id==='goal')currentView=createGoalView(loaded,navigate,opts);
  if(tab.id==='report')currentView=createReportView(loaded,navigate,opts);
  if(tab.id==='all')currentView=createAllView(navigate,opts);
  content.replaceChildren(currentView.element);mountMotion(entryMotion);currentView.mount();
  for(const b of buttons){if(b.dataset.screen===currentScreen)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
  if(moveFocus&&!document.querySelector('dialog[open]')){const view=currentView,restored=route.focusAction&&[...view.element.querySelectorAll('button[data-action]')].find(b=>b.dataset.action===route.focusAction);const h=restored||document.getElementById('pw-screen-title');const focus=()=>{if(h&&currentView===view&&h.isConnected&&!document.querySelector('dialog[open]')){if(!restored)h.tabIndex=-1;h.focus({preventScroll:!document.documentElement.classList.contains('pw-accessible')});}};if(restored)requestAnimationFrame(focus);else focus();}
 }
 content.addEventListener('pw:motion-refresh',event=>{if(currentView&&event.target===currentView.element)currentMotion?.refresh();});
 function accessibility(){document.documentElement.classList.toggle('pw-accessible',parseFloat(getComputedStyle(document.documentElement).fontSize)>20||innerWidth<300||innerHeight<320||(innerWidth<500&&innerHeight<480));}
 const probe=PWUI.el('span','pw-size-probe');probe.setAttribute('aria-hidden','true');document.body.append(probe);new ResizeObserver(accessibility).observe(probe);window.addEventListener('resize',accessibility);accessibility();showScreen('home');
})();
