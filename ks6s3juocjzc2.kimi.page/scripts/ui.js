/* Shared stage primitives. UI state never touches business storage. */
window.PWUI = (() => {
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(text,click,cls='pw-button')=>{const n=el('button',cls,text);n.type='button';if(click)n.addEventListener('click',event=>{if(event.detail<2)click(event);});return n;};
 const heading=text=>{const n=el('h1','pw-sr-only',text);n.id='pw-screen-title';return n;};
 const format=new Intl.NumberFormat('ko-KR'),compact=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:1});
 function money(value,cls='') {
  const n=el('div','pw-money '+cls);if(!Number.isSafeInteger(value)){n.append(el('span','pw-money-unknown','확인 안 됨'));return n;}
  const exact=format.format(value)+'원';n.setAttribute('role','group');n.setAttribute('aria-label',exact);
  let digits=format.format(value),unit='원';
  if(Math.abs(value)>=1e8){const s=Math.abs(value)>=1e16?[1e16,'경원']:Math.abs(value)>=1e12?[1e12,'조원']:[1e8,'억원'];digits=compact.format(value/s[0]);unit=s[1];}
  const line=el('div','pw-money-line');line.setAttribute('aria-hidden','true');line.append(el('span','pw-money-digits',digits),el('span','pw-money-unit',unit));n.append(line);
  if(unit!=='원'){const c=el('p','pw-money-exact pw-meta',exact);c.setAttribute('aria-hidden','true');n.append(c);}return n;
 }
 function createTextPager(text){
  const chars=Array.from(String(text||'')),element=el('div','pw-text-pager'),content=el('p','pw-text-page'),controls=el('div','pw-pagination');
  let starts=[0],ends=[chars.length],page=0,observer,frame,disposed=false;
  const label=el('span','pw-meta');label.setAttribute('role','status');
  const prev=button('이전',()=>{if(page>0){page--;paint();}},'pw-page-button'),next=button('다음',()=>{if(page+1<starts.length){page++;paint();}},'pw-page-button');
  controls.append(prev,label,next);element.append(content,controls);
  function paint(){controls.hidden=starts.length<=1;content.textContent=chars.slice(starts[page],ends[page]).join('');label.textContent=(page+1)+' / '+starts.length;prev.disabled=page===0;next.disabled=page===starts.length-1;}
  function measure(){
   if(disposed||!element.isConnected||content.clientHeight<1||content.clientWidth<1)return;
   controls.hidden=false;const anchor=starts[page]||0;starts=[];ends=[];let start=0;
   while(start<chars.length){let lo=start+1,hi=chars.length,end=lo;
    while(lo<=hi){const mid=Math.floor((lo+hi)/2);content.textContent=chars.slice(start,mid).join('');if(content.scrollHeight<=content.clientHeight+1&&content.scrollWidth<=content.clientWidth+1){end=mid;lo=mid+1;}else hi=mid-1;}
    starts.push(start);ends.push(end);start=end;
   }
   if(!starts.length){starts=[0];ends=[0];}page=Math.max(0,starts.findLastIndex(v=>v<=anchor));paint();
  }
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);}
  return {element,mount(){measure();observer=new ResizeObserver(schedule);observer.observe(element);document.fonts.ready.then(schedule);},dispose(){disposed=true;observer?.disconnect();cancelAnimationFrame(frame);}};
 }
 let serial=0;
 function flow(title,onCancel){
  const dialog=el('dialog','pw-flow'),header=el('header','pw-flow-header'),back=button('‹',null,'pw-icon-button'),caption=el('h2','pw-flow-title',title),close=button('×',onCancel,'pw-icon-button');
  back.setAttribute('aria-label','이전 단계');close.setAttribute('aria-label',title+' 닫기');caption.id='pw-flow-title-'+ ++serial;dialog.setAttribute('aria-labelledby',caption.id);dialog.setAttribute('aria-modal','true');header.append(back,caption,close);
  const progress=el('p','pw-flow-progress pw-meta'),body=el('div','pw-flow-body'),bodyViewport=el('div','pw-flow-body-viewport'),footer=el('div','pw-flow-footer');progress.setAttribute('aria-live','polite');bodyViewport.append(body);dialog.append(header,progress,bodyViewport,footer);
  let stopFitting;
  function fit(){const v=window.visualViewport,k=v&&v.scale===1;dialog.dataset.compact=String((k?v.height:innerHeight)<440);dialog.dataset.keyboard=String(!!(k&&innerHeight-v.height>100));dialog.style.setProperty('--pw-flow-height',(k?v.height:innerHeight)+'px');dialog.style.setProperty('--pw-flow-top',(k?v.offsetTop:0)+'px');}
  dialog.addEventListener('cancel',e=>{e.preventDefault();onCancel();});
  dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const nodes=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],summary,[tabindex]:not([tabindex="-1"])')].filter(n=>n.getClientRects().length&&(n.type!=='radio'||n.checked||!dialog.querySelector('input[name="'+n.name+'"]:checked')&&n===dialog.querySelector('input[name="'+n.name+'"]')));const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus({preventScroll:!document.documentElement.classList.contains('pw-accessible')});}if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus({preventScroll:!document.documentElement.classList.contains('pw-accessible')});}});
  window.visualViewport?.addEventListener('resize',fit);window.visualViewport?.addEventListener('scroll',fit);window.addEventListener('resize',fit);
  return {dialog,body,footer,back,close,progress,show(){if(!dialog.isConnected)document.body.append(dialog);fit();if(!dialog.open){dialog.showModal();window.PWNavigation?.openOverlay(onCancel);}stopFitting||=window.PWViewport?.observeDialog(dialog,bodyViewport,body);window.PWViewport?.schedule();},dismiss(){if(dialog.open)dialog.close();window.PWNavigation?.releaseOverlay(onCancel);},dispose(){stopFitting?.();if(dialog.open)dialog.close();window.PWNavigation?.releaseOverlay(onCancel);dialog.remove();window.visualViewport?.removeEventListener('resize',fit);window.visualViewport?.removeEventListener('scroll',fit);window.removeEventListener('resize',fit);}};
 }
 const refreshMotion=root=>root.dispatchEvent(new CustomEvent('pw:motion-refresh',{bubbles:true}));
 return Object.freeze({el,button,heading,money,createTextPager,flow,refreshMotion});
})();
